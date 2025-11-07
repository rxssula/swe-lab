from fastapi import FastAPI

from app.routers import users, auth, consumer
from app.core.db import engine
from app import models

models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="B2B Marketplace API",
    description="Backend API for B2B marketplace connecting consumers and suppliers",
    version="1.0.0"
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(consumer.router)