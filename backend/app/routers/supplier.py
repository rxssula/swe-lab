import uuid
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app.auth.auth import get_password_hash, create_access_token, get_current_user
from app.core.db import get_db
from app.models.enums import InvitationStatus, SupplierRole
from app.models.user import ConsumerStaff, User, StaffInvitation, SupplierStaff
from app.schemas import SignupResponse, UserRead

router = APIRouter(prefix="/suppliers", tags=["suppliers"])


class StaffInviteRequest(BaseModel):
    email: EmailStr
    role: SupplierRole



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


