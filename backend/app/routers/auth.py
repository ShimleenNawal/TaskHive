from fastapi import Depends
from fastapi import APIRouter, HTTPException
from app.core.database import get_db
from app.core.security import create_access_token
from app.core.email import send_verification_email, send_magic_login_email
from app.core.rate_limit import resend_verification_limiter, forgot_password_limiter
from app.models.user import User
from app.schemas.user import (
    UserCreate,
    UserOut,
    LoginRequest,
    LoginResponse,
    ResendRequest,
    EmailLookupRequest,
    CheckEmailResponse,
    ForgotPasswordRequest,
)
from app.services.auth_service import hash_password, verify_password
from app.core.config import settings
import logging
import secrets
from datetime import datetime, timedelta, timezone


logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])


def _as_utc(dt: datetime | None) -> datetime | None:
    """Normalize DB datetimes that may be naive (TIMESTAMP WITHOUT TIME ZONE)."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def _token_expiry() -> datetime:
    return datetime.now(timezone.utc) + timedelta(
        hours=settings.VERIFICATION_TOKEN_EXPIRE_HOURS
    )


def _login_link_expiry() -> datetime:
    return datetime.now(timezone.utc) + timedelta(
        minutes=settings.LOGIN_LINK_EXPIRE_MINUTES
    )


@router.post("/signup", response_model=UserOut)
async def signup(user_data: UserCreate, db=Depends(get_db)):
    # Check if email already exists in db
    if db.query(User).filter(User.email == user_data.email).first():
        raise HTTPException(status_code=409, detail="Email already exists")

    # Otherwise, create user
    verification_token = secrets.token_urlsafe(32)
    token_expires_at = _token_expiry()

    new_user = User(
        name=user_data.name,
        email=user_data.email,
        hashed_password=hash_password(user_data.password),
        is_verified=False,
        verification_token=verification_token,
        token_expires_at=token_expires_at,
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # User row is already committed; do not fail signup if SMTP is down.
    # Client can use /resend-verification to get the link later.
    try:
        await send_verification_email(user_data.email, verification_token)
    except Exception:
        logger.exception(
            "Failed to send verification email after signup for %s",
            user_data.email,
        )

    return new_user


@router.get("/verify")
def verify_email(token: str, db=Depends(get_db)):
    user = db.query(User).filter(User.verification_token == token).first()
    if not user:
        raise HTTPException(status_code=404, detail="Token not found")

    expires_at = _as_utc(user.token_expires_at)
    if expires_at is None or datetime.now(timezone.utc) > expires_at:
        raise HTTPException(status_code=400, detail="Token expired")

    user.is_verified = True
    user.verification_token = None
    user.token_expires_at = None
    db.commit()

    access_token = create_access_token({"sub": str(user.id)})
    return {
        "status": "verified",
        "access_token": access_token,
        "token_type": "bearer",
    }


@router.post("/resend-verification")
async def resend_verification(body: ResendRequest, db=Depends(get_db)):
    user = db.query(User).filter(User.email == body.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.is_verified:
        raise HTTPException(status_code=409, detail="User already verified")

    email_key = body.email.strip().lower()
    if not resend_verification_limiter.is_allowed(email_key):
        raise HTTPException(
            status_code=429,
            detail="Please wait before requesting another verification email",
        )

    # Generate new token
    user.verification_token = secrets.token_urlsafe(32)
    user.token_expires_at = _token_expiry()
    db.commit()

    try:
        await send_verification_email(user.email, user.verification_token)
    except Exception:
        logger.exception(
            "Failed to send verification email on resend for %s",
            user.email,
        )
        raise HTTPException(
            status_code=503,
            detail="Failed to send verification email. Please try again later.",
        )

    return {"status": "new token sent"}


@router.post("/check-email", response_model=CheckEmailResponse)
def check_email(body: EmailLookupRequest, db=Depends(get_db)):
    user = db.query(User).filter(User.email == body.email).first()
    if not user:
        return CheckEmailResponse(exists=False, is_verified=None)
    return CheckEmailResponse(exists=True, is_verified=user.is_verified)


@router.post("/forgot-password")
async def forgot_password(body: ForgotPasswordRequest, db=Depends(get_db)):
    email_key = body.email.strip().lower()
    if not forgot_password_limiter.is_allowed(email_key):
        raise HTTPException(
            status_code=429,
            detail="Please wait before requesting another email",
        )

    user = db.query(User).filter(User.email == body.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Email does not exist")

    if not user.is_verified:
        user.verification_token = secrets.token_urlsafe(32)
        user.token_expires_at = _token_expiry()
        db.commit()
        try:
            await send_verification_email(user.email, user.verification_token)
        except Exception:
            logger.exception(
                "Failed to send verification email on forgot-password for %s",
                user.email,
            )
            raise HTTPException(
                status_code=503,
                detail="Failed to send email. Please try again later.",
            )
        return {"status": "verification email sent"}

    user.login_link_token = secrets.token_urlsafe(32)
    user.login_link_expires_at = _login_link_expiry()
    db.commit()
    try:
        await send_magic_login_email(user.email, user.login_link_token)
    except Exception:
        logger.exception(
            "Failed to send one-time login link on forgot-password for %s",
            user.email,
        )
        raise HTTPException(
            status_code=503,
            detail="Failed to send email. Please try again later.",
        )
    return {"status": "sign-in email sent"}


@router.get("/email-login", response_model=LoginResponse)
def email_login(token: str, db=Depends(get_db)):
    user = db.query(User).filter(User.login_link_token == token).first()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired sign-in link")

    expires_at = _as_utc(user.login_link_expires_at)
    if expires_at is None or datetime.now(timezone.utc) > expires_at:
        raise HTTPException(status_code=400, detail="Invalid or expired sign-in link")

    if not user.is_verified:
        raise HTTPException(status_code=400, detail="Invalid or expired sign-in link")

    user.login_link_token = None
    user.login_link_expires_at = None
    db.commit()

    access_token = create_access_token({"sub": str(user.id)})
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/login", response_model=LoginResponse)
def login(credentials: LoginRequest, db=Depends(get_db)):
    user = db.query(User).filter(User.email == credentials.email).first()
    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not user.is_verified:
        raise HTTPException(status_code=403, detail="Please verify your email first")

    access_token = create_access_token({"sub": str(user.id)})
    return {"access_token": access_token, "token_type": "bearer"}
