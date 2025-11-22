from itertools import product

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.routers import users, auth, consumer, supplier, links, products, staff, categories, orders, chat
from app.core.db import engine
from app.core.config import settings
from app import models

models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="B2B Marketplace API",
    description="Backend API for B2B marketplace connecting consumers and suppliers",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(consumer.router)
app.include_router(supplier.router)
app.include_router(links.router)
app.include_router(products.router)
app.include_router(staff.router)
app.include_router(categories.router)
app.include_router(orders.router)
app.include_router(chat.router)

# Mount static files for uploads
import os
upload_dir = settings.UPLOAD_DIR
if not os.path.exists(upload_dir):
    os.makedirs(upload_dir)
app.mount("/uploads", StaticFiles(directory=upload_dir), name="uploads")

@app.get("/")
async def root():
    """Root endpoint - API is alive"""
    """Root endpoint - API is alive"""
    return {"status": "ok", "message": "B2B Marketplace API is running"}

@app.get("/health")
async def health_check():
    """Health check endpoint for monitoring and keeping service awake"""
    """Health check endpoint for monitoring and keeping service awake"""
    return {
        "status": "healthy",
        "service": "B2B Marketplace API",
        "version": "1.0.0"
    }