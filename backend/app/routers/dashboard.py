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

    row = (
        db.query(
            func.count(Task.id).label("total"),
            func.count(case((Task.status == "IN_PROGRESS", 1))).label("in_progress"),
            func.count(case((Task.status == "DONE", 1))).label("completed"),
        )
        .filter(Task.project_id.in_(member_projects))
        .one()
    )

    return {"total": row.total, "in_progress": row.in_progress, "completed": row.completed}

    return {
        "total": total,
        "in_progress": in_progress,
        "completed": completed,
    }
