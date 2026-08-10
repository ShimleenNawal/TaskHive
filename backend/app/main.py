from fastapi import FastAPI
from app.routers import auth, users 
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def get_status():
    return {"status": "ok"}

app.include_router(auth.router, prefix = "/api")
app.include_router(users.router, prefix="/api")