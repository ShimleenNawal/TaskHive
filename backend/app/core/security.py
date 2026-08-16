from datetime import datetime,timedelta, timezone
from app.core.config import settings
from jose import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.database import get_db
from app.models.user import User

security = HTTPBearer()

# Creates a login token (JWT) when user logs in successfully.
def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(hours=settings.TOKEN_EXPIRE_HOURS)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY.get_secret_value(), algorithm=settings.ALGORITHM)
    return encoded_jwt

# Decodes and validates a JWT token when user makes a protected request.
def verify_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY.get_secret_value(), algorithms=[settings.ALGORITHM])
        return payload
    except jwt.JWTError:
        return None
        
# Extract the user from the JWT token in the request header for protected routes
def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), db = Depends(get_db)):
    token = credentials.credentials
    payload = verify_token(token)  # raises exception if invalid/expired
    if not payload:
        raise HTTPException(status_code = 401, detail = "Invalid or expired token")
    try:
        user_id = int(payload.get("sub"))
    except (TypeError, ValueError):
        raise HTTPException(status_code = 401, detail = "Invalid token")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code = 401, detail = "User not found")
    return user