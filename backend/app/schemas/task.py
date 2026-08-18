from pydantic import BaseModel, Field
from datetime import datetime
from typing import Literal

TaskStatus = Literal["TODO", "IN_PROGRESS", "DONE"]
TaskPriority = Literal["LOW", "MEDIUM", "HIGH"]
TaskSort = Literal["due_date", "created_at", "priority", "status", "title"]

class TaskCreate(BaseModel):
    title: str = Field(..., min_length = 1, max_length = 255)
    description: str | None = Field(None, max_length = 255)
    status: TaskStatus = "TODO"
    priority: TaskPriority = "MEDIUM"
    due_date: datetime | None = None
    assignee_id: int | None = None

class TaskUpdate(BaseModel):
    title: str | None = Field(None, min_length = 1, max_length = 255)
    description: str | None = Field(None, max_length = 255)
    status: TaskStatus | None = None
    priority: TaskPriority | None = None
    due_date: datetime | None = None
    assignee_id: int | None = None

class TaskOut(BaseModel):
    id: int
    project_id: int
    title: str
    description: str | None
    status: str
    priority: str
    due_date: datetime | None
    assignee_id: int | None
    created_at: datetime

    class Config:
        from_attributes = True
