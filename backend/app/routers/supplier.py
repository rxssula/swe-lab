import uuid
from datetime import datetime, timedelta
from typing import Optional, List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.auth.auth import get_password_hash, create_access_token, get_current_user
from app.core.db import get_db
from app.models.enums import SupplierRole, LinkStatus
from app.models.user import (
    ConsumerStaff, User, SupplierStaff,
    Supplier, Consumer, Product, Category, ConsumerSupplierLink
)
from app.schemas import SignupResponse, UserRead, StaffCreateRequest, StaffCreateResponse

router = APIRouter(prefix="/suppliers", tags=["suppliers"])


class SupplierByCategoryResponse(BaseModel):
    supplier_id: UUID
    business_name: str
    business_type: str | None
    city: str | None
    country: str | None
    product_count_in_category: int
    total_active_products: int
    is_linked: bool
    link_status: str | None

    class Config:
        from_attributes = True


def get_consumer_for_user(db: Session, user: User) -> Consumer | None:
    """Get consumer entity for current user"""
    consumer_staff = db.query(ConsumerStaff).filter(
        ConsumerStaff.user_id == user.id
    ).first()

    if not consumer_staff:
        return None

    return db.query(Consumer).filter(
        Consumer.id == consumer_staff.consumer_id
    ).first()



@router.post("/{supplier_id}/staff", response_model=StaffCreateResponse)
def create_supplier_staff(
    supplier_id: uuid.UUID,
    staff_data: StaffCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new staff member for a supplier directly.
    - OWNERs can create all roles (OWNER, MANAGER, SALES)
    - MANAGERs can only create SALES roles
    """
    # Get current user's staff record to check permissions
    current_staff = db.query(SupplierStaff).filter(
        SupplierStaff.supplier_id == supplier_id,
        SupplierStaff.user_id == current_user.id
    ).first()

    if not current_staff:
        raise HTTPException(status_code=403, detail="You are not a staff member of this supplier")

    # Check authorization based on role
    if current_staff.role == SupplierRole.OWNER.value:
        # Owners can create any role
        pass
    elif current_staff.role == SupplierRole.MANAGER.value:
        # Managers can only create SALES
        if staff_data.role != SupplierRole.SALES.value:
            raise HTTPException(
                status_code=403,
                detail="Managers can only create SALES staff members"
            )
    else:
        raise HTTPException(status_code=403, detail="Only owners and managers can create staff")

    # Validate the role value
    try:
        SupplierRole(staff_data.role)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid role. Must be one of: {[r.value for r in SupplierRole]}"
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
            name=staff_data.name,
            created_at=datetime.now(),
            last_login_at=datetime.now()
        )
        db.add(user)
        db.flush()

        # Create supplier staff association
        supplier_staff = SupplierStaff(
            user_id=user.id,
            supplier_id=supplier_id,
            role=staff_data.role
        )
        db.add(supplier_staff)

        db.commit()
        db.refresh(user)

        return StaffCreateResponse(
            user=UserRead.model_validate(user),
            role=staff_data.role,
            supplier_id=supplier_id
        )

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create staff member: {str(e)}")


@router.get("/by-category/{category_id}", response_model=List[SupplierByCategoryResponse])
def get_suppliers_by_category(
    category_id: UUID,
    linked_only: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get list of suppliers that have products in a specific category.
    Only consumers can use this endpoint.

    Parameters:
    - category_id: The category to search for
    - linked_only: If True, only return suppliers the consumer is linked to

    Returns list of suppliers with:
    - Supplier information
    - Product count in the specified category
    - Total active products
    - Link status with current consumer
    """
    # Verify user is a consumer
    consumer = get_consumer_for_user(db, current_user)
    if not consumer:
        raise HTTPException(
            status_code=403,
            detail="Only consumers can search suppliers by category"
        )

    # Verify category exists
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(
            status_code=404,
            detail="Category not found"
        )

    # Get all suppliers that have active products in this category
    suppliers_with_products = db.query(
        Supplier.id,
        func.count(Product.id).label('product_count')
    ).join(
        Product, Product.supplier_id == Supplier.id
    ).filter(
        Product.category_id == category_id,
        Product.is_active == True
    ).group_by(Supplier.id).all()

    if not suppliers_with_products:
        return []

    # Get link information for this consumer
    links = db.query(ConsumerSupplierLink).filter(
        ConsumerSupplierLink.consumer_id == consumer.id
    ).all()

    link_map = {
        link.supplier_id: link.status.value
        for link in links
    }

    result = []
    for supplier_id, product_count in suppliers_with_products:
        supplier = db.query(Supplier).filter(Supplier.id == supplier_id).first()
        if not supplier:
            continue

        # Check link status
        is_linked = link_map.get(supplier_id) == LinkStatus.ACCEPTED.value
        link_status = link_map.get(supplier_id)

        # If linked_only filter is on, skip non-linked suppliers
        if linked_only and not is_linked:
            continue

        # Get total active products for this supplier
        total_products = db.query(func.count(Product.id)).filter(
            Product.supplier_id == supplier_id,
            Product.is_active == True
        ).scalar()

        result.append(SupplierByCategoryResponse(
            supplier_id=supplier.id,
            business_name=supplier.business_name,
            business_type=supplier.business_type,
            city=supplier.city,
            country=supplier.country,
            product_count_in_category=product_count,
            total_active_products=total_products or 0,
            is_linked=is_linked,
            link_status=link_status
        ))

    # Sort by linked status first, then by product count
    result.sort(key=lambda x: (not x.is_linked, -x.product_count_in_category))

    return result


