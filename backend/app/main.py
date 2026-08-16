from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.routers.routes import api_router

app = FastAPI(title="TaskHive API",
    version="0.1.0",
    description="API for the TaskHive project task management application.")

app.add_middleware(
    CORSMiddleware,
    allow_origins= settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

@app.get("/health")
def get_status():
    return {"status": "ok"}

app.include_router(api_router)