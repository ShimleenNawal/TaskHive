from fastapi import FastAPI

app = FastAPI()

@app.get("/")
def get_status():
    return {"status": "ok"}