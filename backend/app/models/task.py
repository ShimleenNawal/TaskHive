from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.core.database import Base

class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(String(255), nullable=True)
    due_date = Column(DateTime(timezone=True), nullable=True)
    status = Column(String(20), default="TODO", nullable=False)  # TODO, IN_PROGRESS, DONE
    priority = Column(String(20), default="MEDIUM", nullable=False)  # LOW, MEDIUM, HIGH
    assignee_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=func.now())
