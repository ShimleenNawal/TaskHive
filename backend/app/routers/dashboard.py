from fastapi import APIRouter, Depends
from sqlalchemy import func
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.project import ProjectMember
from app.models.task import Task
from app.schemas.dashboard import DashboardStatsOut

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/stats", response_model=DashboardStatsOut)
def get_dashboard_stats(
    current_user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    member_projects = (
        db.query(ProjectMember.project_id)
        .filter(ProjectMember.user_id == current_user.id)
        .subquery()
    )

    total = (
        db.query(func.count(Task.id))
        .filter(Task.project_id.in_(member_projects))
        .scalar()
        or 0
    )
    in_progress = (
        db.query(func.count(Task.id))
        .filter(
            Task.project_id.in_(member_projects),
            Task.status == "IN_PROGRESS",
        )
        .scalar()
        or 0
    )
    completed = (
        db.query(func.count(Task.id))
        .filter(
            Task.project_id.in_(member_projects),
            Task.status == "DONE",
        )
        .scalar()
        or 0
    )

    return {
        "total": total,
        "in_progress": in_progress,
        "completed": completed,
    }
