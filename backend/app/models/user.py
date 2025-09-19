import datetime

from sqlalchemy import Column, Integer, String, DateTime
from app.core.db import Base


class User(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True)
    email = Column(String, unique=True)
    password = Column(String)
    name = Column(String)
    phone_number = Column(String)
    role = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.now(datetime.timezone.utc))
    updated_at = Column(DateTime, onupdate=datetime.datetime.now(datetime.timezone.utc))

