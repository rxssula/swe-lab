from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.auth import get_current_user
from app.core.db import get_db
from app.models.user import Consumer, ConsumerStaff, User
from app.schemas import ConsumerCreate, ConsumerRead, ConsumerStaffCreate, ConsumerStaffRead

router = APIRouter(prefix="/consumers", tags=["consumers"])


@router.post("/", response_model=ConsumerRead, status_code=status.HTTP_201_CREATED)
def create_consumer(
    consumer_data: ConsumerCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new consumer business"""
    consumer = Consumer(
        business_name=consumer_data.business_name,
        business_type=consumer_data.business_type,
        address=consumer_data.address,
        city=consumer_data.city,
        country=consumer_data.country
    )
    db.add(consumer)
    db.commit()
    db.refresh(consumer)
    return consumer


@router.get("/{consumer_id}", response_model=ConsumerRead)
def get_consumer(
    consumer_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get consumer by ID"""
    consumer = db.query(Consumer).filter(Consumer.id == consumer_id).first()
    if not consumer:
        raise HTTPException(status_code=404, detail="Consumer not found")
    return consumer


@router.get("/", response_model=List[ConsumerRead])
def list_consumers(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all consumers"""
    consumers = db.query(Consumer).offset(skip).limit(limit).all()
    return consumers


@router.post("/{consumer_id}/staff", response_model=ConsumerStaffRead, status_code=status.HTTP_201_CREATED)
def add_consumer_staff(
    consumer_id: UUID,
    staff_data: ConsumerStaffCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Add a staff member to a consumer business"""
    # Check if consumer exists
    consumer = db.query(Consumer).filter(Consumer.id == consumer_id).first()
    if not consumer:
        raise HTTPException(status_code=404, detail="Consumer not found")

    # Check if user exists
    user = db.query(User).filter(User.id == staff_data.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Create staff relationship
    staff = ConsumerStaff(
        consumer_id=consumer_id,
        user_id=staff_data.user_id,
        role=staff_data.role
    )
    db.add(staff)
    db.commit()
    db.refresh(staff)
    return staff
