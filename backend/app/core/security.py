from datetime import datetime,timedelta
from app.core.config import settings
from jose import jwt


# Creates a login token (JWT) when user logs in successfully.
def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now() + timedelta(hours=settings.TOKEN_EXPIRE_HOURS)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

# Decodes and validates a JWT token when user makes a protected request.
def verify_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=settings.ALGORITHM)
        return payload
    except jwt.JWTError:
        return None

# Creates a verification token for email verification (signup flow).
def create_verification_token() -> str:
    to_encode = {"sub": "verification"}
    expire = datetime.now() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

# Checks if a datetime is in the past (token expired).
def is_token_expired(expiry: datetime) -> bool:
    return expiry < datetime.now()
