# from contextvars import Token
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.auth.auth import create_access_token, authenticate_user, Token, get_current_user, get_password_hash
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
        password_hash=get_password_hash(data.password),
        phone_number=data.phone_number,
        last_login_at=datetime.now(),
        created_at=datetime.now()
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/token")
async def login_for_access_token(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
        db: Session = Depends(get_db),
) -> Token:
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return create_access_token(data={"sub": str(user.id)})



@router.get("/me", response_model=UserRead)
async def read_users_me(
    current_user: Annotated[User, Depends(get_current_user)],
):
    return current_user


@router.patch("/{user_id}", response_model=UserRead)
def update_user(user_id: UUID, user_data: UserCreate, db: Session = Depends(get_db)):
    pass

