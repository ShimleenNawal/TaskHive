from fastapi import Depends
from fastapi import APIRouter, HTTPException
from app.core.database import get_db
from app.core.security import create_access_token
from app.models.user import User 
from app.schemas.user import UserCreate, UserOut, LoginRequest, LoginResponse
from app.services.auth_service import hash_password, verify_password 
import secrets
from datetime import datetime, timedelta, timezone 
 

router = APIRouter(prefix = "/auth", tags = ["auth"])

@router.post("/signup", response_model = UserOut)
def signup(user_data: UserCreate, db = Depends(get_db)):
    # Check if email already exists in db
    if db.query(User).filter(User.email == user_data.email).first(): 
        raise HTTPException(status_code = 409, detail = "Email already exists")

    # Otherwise, create user
    verification_token = secrets.token_urlsafe(32)
    token_expires_at = datetime.now(timezone.utc) + timedelta(hours=24)

    new_user = User(
        name = user_data.name,
        email = user_data.email,
        hashed_password = hash_password(user_data.password),
        is_verified = False,
        verification_token = verification_token,
        token_expires_at = token_expires_at,
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user) 
    return new_user

@router.get("/verify")
def verify_email(token: str, db = Depends(get_db)):
    user = db.query(User).filter(User.verification_token == token).first() 
    if not user:
        raise HTTPException(status_code = 404, detail = "Token not found")

    if datetime.now(timezone.utc) > user.token_expires_at:
            raise HTTPException(status_code = 400, detail = "Token expired")

    user.is_verified = True
    user.verification_token = None
    user.token_expires_at = None
    db.commit()
    return {"status": "verified"}

@router.post("/resend-verification")
def resend_verification(body: dict, db = Depends(get_db)):
    email = body.get("email")
    user = db.query(User).filter(User.email == email).first() 
    if not user:
        raise HTTPException(status_code = 404, detail = "User not found")

    if user.is_verified:
        raise HTTPException(status_code = 409, detail = "User already verified")

    # Generate new token
    user.verification_token = secrets.token_urlsafe(32)
    user.token_expires_at = datetime.now(timezone.utc) + timedelta(hours=24)
    db.commit()
    return {"status": "new token sent"}

@router.post("/login", response_model = LoginResponse)
def login(credentials: LoginRequest, db = Depends(get_db)):
    user = db.query(User).filter(User.email == credentials.email).first() 
    print("USER:", user)
    print("PASSWORD MATCH:", verify_password(credentials.password, user.hashed_password) if user else None)
    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(status_code = 401, detail = "Invalid credentials")

    if not user.is_verified:
        raise HTTPException(status_code = 403, detail = "Please verify your email first")

    access_token = create_access_token({"sub": str(user.id)})
    return {"access_token": access_token, "token_type": "bearer"}

