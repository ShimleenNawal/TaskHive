from datetime import datetime
from pydantic import BaseModel, Field, field_validator


class CommentCreate(BaseModel):
    body: str = Field(..., min_length=1)

    @field_validator("body")
    @classmethod
    def trim_body(cls, value: str) -> str:
        trimmed = value.strip()
        if not trimmed:
            raise ValueError("Comment body must not be empty")
        return trimmed


class CommentUpdate(BaseModel):
    body: str = Field(..., min_length=1)

    @field_validator("body")
    @classmethod
    def trim_body(cls, value: str) -> str:
        trimmed = value.strip()
        if not trimmed:
            raise ValueError("Comment body must not be empty")
        return trimmed


class CommentOut(BaseModel):
    id: int
    task_id: int
    author_id: int
    author_name: str
    body: str
    created_at: datetime
    updated_at: datetime | None = None

    class Config:
        from_attributes = True
