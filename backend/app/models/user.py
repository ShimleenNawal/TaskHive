from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.sql import func
from app.core.database import Base

class User(Base):

    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    email = Column(String, unique = True, index = True)
    hashed_password = Column(String)
    is_verified = Column(Boolean, default = False)
    verification_token = Column(String, nullable = True) # needs to be emailed 
    token_expires_at = Column(DateTime, nullable = True) # when token expires 
    created_at = Column(DateTime, default = func.now()) # auto-timestamp on creation 