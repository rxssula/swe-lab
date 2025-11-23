from datetime import datetime
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.auth import get_current_user
from app.core.db import get_db
from app.models.user import (
    User, Consumer, Supplier, ConsumerStaff, SupplierStaff
)
from app.models.enums import ConsumerRole, SupplierRole
from pydantic import BaseModel

router = APIRouter(prefix="/staff", tags=["staff"])



class StaffMemberResponse(BaseModel):
    id: UUID
    user_id: UUID
    role: str
    email: str
    phone_number: str | None
    created_at: datetime
    last_login_at: datetime | None

    class Config:
        from_attributes = True


class RoleUpdate(BaseModel):
    role: str



def get_supplier_staff(db: Session, user: User) -> SupplierStaff | None:
    """Get supplier staff record for user"""
    """Get supplier staff record for user"""
    return db.query(SupplierStaff).filter(
        SupplierStaff.user_id == user.id
    ).first()


def get_consumer_staff(db: Session, user: User) -> ConsumerStaff | None:
    """Get consumer staff record for user"""
    """Get consumer staff record for user"""
    return db.query(ConsumerStaff).filter(
        ConsumerStaff.user_id == user.id
    ).first()



@router.get("/supplier/list", response_model=List[StaffMemberResponse])
def list_supplier_staff(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List all staff members for the supplier.
    All supplier staff can view the list.
    """
    staff_record = get_supplier_staff(db, current_user)
    if not staff_record:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only supplier staff can view staff list"
        )

    all_staff = db.query(SupplierStaff).filter(
        SupplierStaff.supplier_id == staff_record.supplier_id
    ).all()

    result = []
    for staff in all_staff:
        user = db.query(User).filter(User.id == staff.user_id).first()
        if user:
            result.append(StaffMemberResponse(
                id=staff.id,
                user_id=user.id,
                role=staff.role,
                email=user.email,
                phone_number=user.phone_number,
                created_at=user.created_at,
                last_login_at=user.last_login_at
            ))

    return result


@router.delete("/supplier/{staff_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_supplier_staff(
    staff_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Remove a staff member from supplier.
    Only Owner can remove staff.
    Owner cannot remove themselves.
    """
    current_staff = get_supplier_staff(db, current_user)
    if not current_staff:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only supplier staff can remove staff members"
        )

    if current_staff.role != SupplierRole.OWNER.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Owner can remove staff members"
        )

    target_staff = db.query(SupplierStaff).filter(
        SupplierStaff.id == staff_id,
        SupplierStaff.supplier_id == current_staff.supplier_id
    ).first()

    if not target_staff:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Staff member not found"
        )

    if target_staff.user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot remove yourself. Transfer ownership first or delete the supplier account."
        )

    db.delete(target_staff)
    db.commit()

    return None


@router.patch("/supplier/{staff_id}/role", response_model=StaffMemberResponse)
def update_supplier_staff_role(
    staff_id: UUID,
    data: RoleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update a staff member's role.
    Only Owner can update roles.
    Cannot change Owner role (must be transferred).
    """
    current_staff = get_supplier_staff(db, current_user)
    if not current_staff:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only supplier staff can update roles"
        )

    if current_staff.role != SupplierRole.OWNER.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Owner can update staff roles"
        )

    try:
        new_role = SupplierRole(data.role.lower())
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role. Must be one of: {[r.value for r in SupplierRole]}"
        )

    if new_role == SupplierRole.OWNER:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot assign Owner role. Use ownership transfer endpoint instead."
        )

    target_staff = db.query(SupplierStaff).filter(
        SupplierStaff.id == staff_id,
        SupplierStaff.supplier_id == current_staff.supplier_id
    ).first()

    if not target_staff:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Staff member not found"
        )

    if target_staff.role == SupplierRole.OWNER.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot change Owner role. Use ownership transfer endpoint instead."
        )

    target_staff.role = new_role.value
    db.commit()
    db.refresh(target_staff)

    user = db.query(User).filter(User.id == target_staff.user_id).first()

    return StaffMemberResponse(
        id=target_staff.id,
        user_id=target_staff.user_id,
        role=target_staff.role,
        email=user.email,
        phone_number=user.phone_number,
        created_at=user.created_at,
        last_login_at=user.last_login_at
    )


@router.get("/consumer/list", response_model=List[StaffMemberResponse])
def list_consumer_staff(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List all staff members for the consumer.
    All consumer staff can view the list.
    """
    staff_record = get_consumer_staff(db, current_user)
    if not staff_record:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only consumer staff can view staff list"
        )

    all_staff = db.query(ConsumerStaff).filter(
        ConsumerStaff.consumer_id == staff_record.consumer_id
    ).all()

    result = []
    for staff in all_staff:
        user = db.query(User).filter(User.id == staff.user_id).first()
        if user:
            result.append(StaffMemberResponse(
                id=staff.id,
                user_id=user.id,
                role=staff.role,
                email=user.email,
                phone_number=user.phone_number,
                created_at=user.created_at,
                last_login_at=user.last_login_at
            ))

    return result


@router.delete("/consumer/{staff_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_consumer_staff(
    staff_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Remove a staff member from consumer.
    Only Owner can remove staff.
    Owner cannot remove themselves.
    """
    current_staff = get_consumer_staff(db, current_user)
    if not current_staff:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only consumer staff can remove staff members"
        )

    if current_staff.role != ConsumerRole.OWNER.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Owner can remove staff members"
        )

    target_staff = db.query(ConsumerStaff).filter(
        ConsumerStaff.id == staff_id,
        ConsumerStaff.consumer_id == current_staff.consumer_id
    ).first()

    if not target_staff:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Staff member not found"
        )

    if target_staff.user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot remove yourself. Transfer ownership first or delete the consumer account."
        )

    db.delete(target_staff)
    db.commit()

    return None


@router.patch("/consumer/{staff_id}/role", response_model=StaffMemberResponse)
def update_consumer_staff_role(
    staff_id: UUID,
    data: RoleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update a staff member's role.
    Only Owner can update roles.
    Cannot change Owner role (must be transferred).
    """
    current_staff = get_consumer_staff(db, current_user)
    if not current_staff:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only consumer staff can update roles"
        )

    if current_staff.role != ConsumerRole.OWNER.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Owner can update staff roles"
        )

    try:
        new_role = ConsumerRole(data.role.lower())
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role. Must be one of: {[r.value for r in ConsumerRole]}"
        )

    if new_role == ConsumerRole.OWNER:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot assign Owner role. Use ownership transfer endpoint instead."
        )

    target_staff = db.query(ConsumerStaff).filter(
        ConsumerStaff.id == staff_id,
        ConsumerStaff.consumer_id == current_staff.consumer_id
    ).first()

    if not target_staff:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Staff member not found"
        )

    if target_staff.role == ConsumerRole.OWNER.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot change Owner role. Use ownership transfer endpoint instead."
        )

    target_staff.role = new_role.value
    db.commit()
    db.refresh(target_staff)

    user = db.query(User).filter(User.id == target_staff.user_id).first()

    return StaffMemberResponse(
        id=target_staff.id,
        user_id=target_staff.user_id,
        role=target_staff.role,
        email=user.email,
        phone_number=user.phone_number,
        created_at=user.created_at,
        last_login_at=user.last_login_at
    )