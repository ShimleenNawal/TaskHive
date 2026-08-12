from fastapi import FastAPI
from app.routers import auth 

app = FastAPI()

@app.get("/health")
def get_status():
    return {"status": "ok"}

app.include_router(auth.router, prefix = "/api")