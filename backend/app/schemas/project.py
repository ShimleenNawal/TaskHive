from pydantic import BaseModel, EmailStr, Field
from datetime import datetime

class ProjectCreate(BaseModel):
    name: str = Field(..., min_length = 1, max_length = 255)
    description: str | None = Field(None, max_length = 255)
    deadline: datetime | None = None

class ProjectUpdate(BaseModel):
    name: str | None = Field(None, min_length = 1, max_length = 255)
    description: str | None = Field(None, max_length = 255)
    deadline: datetime | None = None

class ProjectOut(BaseModel):
    id: int
    name: str
    description: str | None
    owner_id: int
    deadline: datetime | None
    created_at: datetime

    class Config:
        from_attributes = True

class MemberInvite(BaseModel):
    email: EmailStr