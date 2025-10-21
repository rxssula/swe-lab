import datetime

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum
from app.core.db import Base
from app.models.enums import AdminRole


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


class Consumer(Base):
    __tablename__ = 'consumers'
    id = Column(Integer, primary_key=True)
    businessName = Column(String)
    businessType = Column(String)
    address = Column(String)
    city = Column(String)
    country = Column(String)

class Supplier(Base):
    __tablename__ = 'suppliers'
    id = Column(Integer, primary_key=True)
    companyName = Column(String)
    businessType = Column(String)
    address = Column(String)
    city = Column(String)
    country = Column(String)
    subscriptionStatus = Column(String)


class PlatformAdmin(Base):
    __tablename__ = 'platform_admins'
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'))
    role = Column(Enum(AdminRole), nullable=True)