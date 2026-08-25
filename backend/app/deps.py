from fastapi import HTTPException
from app.models.project import Project, ProjectMember
from app.models.task import Task
from sqlalchemy.orm import Session


def require_project_member(project_id: int, user_id: int, db: Session) -> ProjectMember:
    membership = (
        db.query(ProjectMember)
        .filter(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == user_id,
        )
        .first()
    )

    if not membership:
        raise HTTPException(status_code=404, detail="Project not found")

    return membership


def get_task_in_project(project_id: int, task_id: int, db):
    task = (
        db.query(Task)
        .filter(
            Task.id == task_id,
            Task.project_id == project_id,
        )
        .first()
    )

    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    return task


def get_project_or_404(project_id: int, db):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project
