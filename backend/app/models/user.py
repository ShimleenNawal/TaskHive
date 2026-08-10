from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.sql import func
from app.core.database import Base

class User(Base):

    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False, server_default="false")
    verification_token = Column(String, nullable = True) # needs to be emailed 
    token_expires_at = Column(DateTime(timezone=True), nullable = True) # when token expires 
    created_at = Column(DateTime(timezone=True), default = func.now()) # auto-timestamp on creation 