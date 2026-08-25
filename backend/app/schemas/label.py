from datetime import datetime
from pydantic import BaseModel, Field, field_validator
import re

HEX_COLOR = re.compile(r"^#[0-9A-Fa-f]{6}$")


class LabelCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=50)
    color: str | None = Field(None, max_length=7)

    @field_validator("name")
    @classmethod
    def trim_name(cls, value: str) -> str:
        trimmed = value.strip()
        if not trimmed:
            raise ValueError("Label name must not be empty")
        return trimmed

    @field_validator("color")
    @classmethod
    def validate_color(cls, value: str | None) -> str | None:
        if value is None:
            return value
        if not HEX_COLOR.match(value):
            raise ValueError("Color must be a hex string like #6B7280")
        return value


class LabelUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=50)
    color: str | None = Field(None, max_length=7)

    @field_validator("name")
    @classmethod
    def trim_name(cls, value: str | None) -> str | None:
        if value is None:
            return value
        trimmed = value.strip()
        if not trimmed:
            raise ValueError("Label name must not be empty")
        return trimmed

    @field_validator("color")
    @classmethod
    def validate_color(cls, value: str | None) -> str | None:
        if value is None:
            return value
        if not HEX_COLOR.match(value):
            raise ValueError("Color must be a hex string like #6B7280")
        return value


class LabelOut(BaseModel):
    id: int
    project_id: int
    name: str
    color: str
    created_by: int
    created_at: datetime | None = None

    class Config:
        from_attributes = True


class LabelSummary(BaseModel):
    id: int
    name: str
    color: str

    class Config:
        from_attributes = True


class TaskLabelCreate(BaseModel):
    label_id: int
