from fastapi import APIRouter
from app.routers import auth, user, project 

api_router = APIRouter(prefix="/api")

api_router.include_router(auth.router)
api_router.include_router(user.router)
api_router.include_router(project.router)
