from fastapi import APIRouter
from app.routers import auth, user, project, task

api_router = APIRouter(prefix="/api")

api_router.include_router(auth.router)
api_router.include_router(user.router)
api_router.include_router(project.router)
api_router.include_router(task.router)
