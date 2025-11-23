from datetime import datetime, timedelta
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app.auth.auth import get_current_user, get_password_hash
from app.core.db import get_db
from app.models.enums import ConsumerRole
from app.models.user import Consumer, ConsumerStaff, User
from app.schemas import StaffCreateRequest, StaffCreateResponse, UserRead

router = APIRouter(prefix="/consumers", tags=["consumers"])


@router.post("/{consumer_id}/staff", response_model=StaffCreateResponse)
def create_consumer_staff(
    consumer_id: UUID,
    staff_data: StaffCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new staff member for a consumer directly.
    - OWNERs can create all roles (owner, manager, staff)
    - MANAGERs can only create STAFF roles
    """
    # Get current user's staff record to check permissions
    current_staff = db.query(ConsumerStaff).filter(
        ConsumerStaff.consumer_id == consumer_id,
        ConsumerStaff.user_id == current_user.id
    ).first()

    if not current_staff:
        raise HTTPException(status_code=403, detail="You are not a staff member of this consumer")

    # Check authorization based on role
    if current_staff.role == ConsumerRole.OWNER.value:
        # Owners can create any role
        pass
    elif current_staff.role == ConsumerRole.MANAGER.value:
        # Managers can only create STAFF
        if staff_data.role != ConsumerRole.STAFF.value:
            raise HTTPException(
                status_code=403,
                detail="Managers can only create STAFF members"
            )
    else:
        raise HTTPException(status_code=403, detail="Only owners and managers can create staff")

    # Validate the role value
    try:
        ConsumerRole(staff_data.role)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid role. Must be one of: {[r.value for r in ConsumerRole]}"
        )

    # Check if user already exists
    existing_user = db.query(User).filter(User.email == staff_data.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="User with this email already exists")

    try:
        # Create new user
        user = User(
            email=str(staff_data.email),
            password_hash=get_password_hash(staff_data.password),
            phone_number=staff_data.phone_number,
            created_at=datetime.now(),
            last_login_at=datetime.now()
        )
        db.add(user)
        db.flush()

        # Create consumer staff association
        consumer_staff = ConsumerStaff(
            user_id=user.id,
            consumer_id=consumer_id,
            role=staff_data.role
        )
        db.add(consumer_staff)

        db.commit()
        db.refresh(user)

        return StaffCreateResponse(
            user=UserRead.model_validate(user),
            role=staff_data.role,
            consumer_id=consumer_id
        )

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create staff member: {str(e)}")
