from fastapi import FastAPI
from app.config import settings
from app.routers import health

app = FastAPI(title=settings.PROJECT_NAME)

app.include_router(health.router)

@app.get("/")
def read_root():
    return {"message": "Welcome to the API"}
