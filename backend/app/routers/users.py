from contextvars import Token

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.auth.auth import decode_token, create_access_token
from app.core.db import get_db
from app.models import User
from app.schemas import UserCreate, UserRead
from uuid import UUID
from datetime import datetime

router = APIRouter(prefix="/users", tags=["users"])


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")


@router.post("/", response_model=UserRead)
def create_user(data: UserCreate, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        email=data.email,
        password_hash=data.password,  # later replace with hash_password(data.password)
        phone_number=data.phone_number,
        last_login_at=datetime.now(),
        created_at=datetime.now()
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/token", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user:
        raise HTTPException(status_code=400, detail="Incorrect username")
    access_token = create_access_token(data={"sub": user.id})
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", response_model=UserRead)
def get_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    user_id = decode_token(token)
    return user_id

    # user = db.get(User, user_id)
    # if not user:
    #     raise HTTPException(status_code=404, detail="User not found")
    # return user

@router.patch("/{user_id}", response_model=UserRead)
def update_user(user_id: UUID, user_data: UserCreate, db: Session = Depends(get_db)):
    # pass
    print(user_id)
    # user = db.get(User, user_id)
    # print("Current")
    # print(user)
    # if not user:
    #     raise HTTPException(status_code=404, detail="User not found")
