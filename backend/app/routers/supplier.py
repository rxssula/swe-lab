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
from app.models.enums import InvitationStatus, SupplierRole, LinkStatus
from app.models.user import (
    ConsumerStaff, User, StaffInvitation, SupplierStaff,
    Supplier, Consumer, Product, Category, ConsumerSupplierLink
)
from app.schemas import SignupResponse, UserRead

router = APIRouter(prefix="/suppliers", tags=["suppliers"])


class StaffInviteRequest(BaseModel):
    email: EmailStr
    role: SupplierRole


class SupplierByCategoryResponse(BaseModel):
    supplier_id: UUID
    company_name: str
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



@router.post("/{supplier_id}/staff/invite")
def invite_supplier_staff(
  supplier_id: uuid.UUID,
  invite_data: StaffInviteRequest,
  db: Session = Depends(get_db),
  current_user: User = Depends(get_current_user)
):

  staff = db.query(SupplierStaff).filter(
      SupplierStaff.supplier_id == supplier_id,
      SupplierStaff.user_id == current_user.id,
      SupplierStaff.role == SupplierRole.OWNER.value
  ).first()

  if not staff:
      raise HTTPException(status_code=403, detail="Only owner can invite staff")

  existing_user = db.query(User).filter(User.email == invite_data.email).first()
  if existing_user:
      raise HTTPException(status_code=400, detail="User already exists")

  existing_invite = db.query(StaffInvitation).filter(
      StaffInvitation.email == invite_data.email,
      StaffInvitation.supplier_id == supplier_id,
      StaffInvitation.status == "pending"
  ).first()

  if existing_invite:
      raise HTTPException(status_code=400, detail="Invitation already sent")

  import secrets
  token = secrets.token_urlsafe(32)

  invitation = StaffInvitation(
      email=str(invite_data.email),
      token=token,
      supplier_id=supplier_id,
      role=invite_data.role.value,
      invited_by=current_user.id,
      expires_at=datetime.now() + timedelta(days=7)
  )
  db.add(invitation)
  db.commit()

  invitation_link = f"https://yourapp.com/accept-invitation?token={token}"


  return {
      "message": "Invitation sent",
      "invitation_link": invitation_link,
      "expires_at": invitation.expires_at
  }


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
            company_name=supplier.company_name,
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


