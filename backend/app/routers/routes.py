from fastapi import APIRouter
from app.routers import auth, user, project, task, label, comment, dashboard

api_router = APIRouter(prefix="/api")

api_router.include_router(auth.router)
api_router.include_router(user.router)
api_router.include_router(project.router)
api_router.include_router(task.router)
api_router.include_router(label.router)
api_router.include_router(comment.router)
api_router.include_router(dashboard.router)
