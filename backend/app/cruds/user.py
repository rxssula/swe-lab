from sqlalchemy.orm import Session
from app import schemas, models


def create_user(db: Session, user: schemas.UserCreate):
    user = models.User(name=user.name, email=user.email)
    db.add(user)
    db.commit()
    db.refresh(user)
    print("User created successfully")
    return user



