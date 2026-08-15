from pydantic import BaseModel, EmailStr, Field, field_validator  

class UserCreate(BaseModel): # Sign-up
    name: str
    email: EmailStr # Email format validation
    password: str = Field(..., min_length = 8) # min 8 chars

    @field_validator('password') # custom pydantic password validation 
    @classmethod
    def validate_password(cls, v):
        # Check for at least 1 letter
        if not any(c.isalpha() for c in v):
            raise ValueError('Password must contain at least 1 letter')
        
        # Check for at least 1 digit
        if not any(c.isdigit() for c in v):
            raise ValueError('Password must contain at least 1 digit')
        
        return v

class UserOut(BaseModel):
    id: int
    name: str
    email: str # email already validated 
    is_verified: bool

    class Config:
        from_attributes = True  

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer" # default for JWT 

class ResendRequest(BaseModel): 
    email: EmailStr