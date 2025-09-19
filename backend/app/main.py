from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session

from app.schemas import UserBase, UserCreate
from app.cruds.user import create_user as create_user_crud
from app.core.db import get_db, engine
from app import models

models.Base.metadata.create_all(bind=engine)

app = FastAPI()

@app.get("/")
def read_root():
    return {"Hello": "World"}

@app.post("/user", response_model=UserBase)
def create_user(user: UserCreate, db: Session = Depends(get_db)):
    return create_user_crud(db, user)
