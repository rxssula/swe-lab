import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth.auth import get_password_hash, create_access_token
from app.core.db import get_db
from app.models.enums import InvitationStatus
from app.models.user import ConsumerStaff, User, StaffInvitation, SupplierStaff
from app.schemas import SignupResponse, UserRead

router = APIRouter(prefix="/suppliers", tags=["suppliers"])

@router.post("/auth/accept-invitation")
def accept_invitation(
        token: str,
        password: str,
        phone_number: Optional[str] = None,
        db: Session = Depends(get_db)
):
    """Staff member accepts invitation and creates account"""

    invitation = db.query(StaffInvitation).filter(
        StaffInvitation.token == token,
        StaffInvitation.status == "PENDING"
    ).first()
    print(invitation)
    print(token)
    print("I am here")
    if not invitation:
        raise HTTPException(status_code=404, detail="Invalid or expired invitation")
    print("I am here")
    if invitation.expires_at < datetime.now():
        invitation.status = "expired"
        db.commit()
        raise HTTPException(status_code=400, detail="Invitation has expired")

    existing_user = db.query(User).filter(User.email == invitation.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="User already exists")

    try:
        user = User(
            email=str(invitation.email),
            password_hash=get_password_hash(password),
            phone_number=phone_number,
            created_at=datetime.now(),
            last_login_at=datetime.now(),
        )
        db.add(user)
        db.flush()
        user_type = ""
        # 5. Link to consumer or supplier
        if invitation.consumer_id:
            consumer_staff = ConsumerStaff(
                user_id=user.id,
                consumer_id=uuid.UUID(str(invitation.consumer_id)),
                role=str(invitation.role)
            )
            db.add(consumer_staff)
            user_type = "consumer"

        elif invitation.supplier_id:
            supplier_staff = SupplierStaff(
                user_id=user.id,
                supplier_id=uuid.UUID(str(invitation.supplier_id)),
                role=str(invitation.role)
            )
            db.add(supplier_staff)
            user_type = "supplier"

        # invitation.status = InvitationStatus.ACCEPTED.value
        invitation.status = "ACCEPTED"
        invitation.accepted_at = datetime.now()

        db.commit()
        db.refresh(user)

        access_token = create_access_token(data={"sub": str(user.id)})

        return SignupResponse(
            access_token=access_token.access_token,
            token_type=access_token.token_type,
            user=UserRead.model_validate(user),
            user_type=user_type,
            role=str(invitation.role)
        )

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to accept invitation: {str(e)}")
