from datetime import datetime, timedelta
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app.auth.auth import get_current_user
from app.core.db import get_db
from app.models.enums import ConsumerRole
from app.models.user import Consumer, ConsumerStaff, User, StaffInvitation

router = APIRouter(prefix="/consumers", tags=["consumers"])


# Request schema for staff invitation
class StaffInviteRequest(BaseModel):
    email: EmailStr
    role: ConsumerRole


# @router.post("/", response_model=ConsumerRead, status_code=status.HTTP_201_CREATED)
# def create_consumer(
#     consumer_data: ConsumerCreate,
#     db: Session = Depends(get_db),
#     current_user: User = Depends(get_current_user)
# ):
#     """Create a new consumer business"""
#     consumer = Consumer(
#         business_name=consumer_data.business_name,
#         business_type=consumer_data.business_type,
#         address=consumer_data.address,
#         city=consumer_data.city,
#         country=consumer_data.country
#     )
#     db.add(consumer)
#     db.commit()
#     db.refresh(consumer)
#     return consumer


# @router.get("/{consumer_id}", response_model=ConsumerRead)
# def get_consumer(
#     consumer_id: UUID,
#     db: Session = Depends(get_db),
#     current_user: User = Depends(get_current_user)
# ):
#     """Get consumer by ID"""
#     consumer = db.query(Consumer).filter(Consumer.id == consumer_id).first()
#     if not consumer:
#         raise HTTPException(status_code=404, detail="Consumer not found")
#     return consumer


# @router.get("/", response_model=List[ConsumerRead])
# def list_consumers(
#     skip: int = 0,
#     limit: int = 100,
#     db: Session = Depends(get_db),
#     current_user: User = Depends(get_current_user)
# ):
#     """List all consumers"""
#     consumers = db.query(Consumer).offset(skip).limit(limit).all()
#     return consumers


@router.post("/{consumer_id}/staff/invite")
def invite_consumer_staff(
  consumer_id: UUID,
  invite_data: StaffInviteRequest,
  db: Session = Depends(get_db),
  current_user: User = Depends(get_current_user)
):

  staff = db.query(ConsumerStaff).filter(
      ConsumerStaff.consumer_id == consumer_id,
      ConsumerStaff.user_id == current_user.id,
      ConsumerStaff.role == ConsumerRole.OWNER.value
  ).first()

  if not staff:
      raise HTTPException(status_code=403, detail="Only owner can invite staff")

  existing_user = db.query(User).filter(User.email == invite_data.email).first()
  if existing_user:
      raise HTTPException(status_code=400, detail="User already exists")

  existing_invite = db.query(StaffInvitation).filter(
      StaffInvitation.email == invite_data.email,
      StaffInvitation.consumer_id == consumer_id,
      StaffInvitation.status == "pending"
  ).first()

  if existing_invite:
      raise HTTPException(status_code=400, detail="Invitation already sent")

  import secrets
  token = secrets.token_urlsafe(32)

  invitation = StaffInvitation(
      email=str(invite_data.email),
      token=token,
      consumer_id=consumer_id,
      role=invite_data.role.value,
      invited_by=current_user.id,
      expires_at=datetime.now() + timedelta(days=7)
  )
  db.add(invitation)
  db.commit()

  invitation_link = f"https://yourapp.com/accept-invitation?token={token}"

  # TODO: Send actual email using email service
  # send_email(
  #     to=email,
  #     subject="You're invited to join {business_name}",
  #     body=f"Click here to accept: {invitation_link}"
  # )

  return {
      "message": "Invitation sent",
      "invitation_link": invitation_link,  # Return for testing
      "expires_at": invitation.expires_at
  }
