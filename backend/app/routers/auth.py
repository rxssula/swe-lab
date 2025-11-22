import uuid
from decimal import Decimal
from typing import Annotated, Optional
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.auth.auth import create_access_token, authenticate_user, get_current_user, get_password_hash
from app.core.db import get_db
from app.models import User
from app.models.user import Consumer, ConsumerStaff, Supplier, SupplierStaff, Subscription, StaffInvitation
from app.models.enums import ConsumerRole, SupplierRole
from app.schemas import ConsumerSignup, SupplierSignup, SignupResponse, UserRead

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/signup/consumer", response_model=SignupResponse, status_code=status.HTTP_201_CREATED)
def signup_consumer(data: ConsumerSignup, db: Session = Depends(get_db)):
    """
    Register a new consumer (restaurant/hotel) with their first user as owner.
    Returns JWT token for immediate login.
    """
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    try:
        user = User(
            email=str(data.email),
            password_hash=get_password_hash(data.password),
            phone_number=data.phone_number,
            created_at=datetime.now(),
            last_login_at=datetime.now(),
        )
        db.add(user)
        db.flush()

        consumer = Consumer(
            business_name=data.business_name,
            business_type=data.business_type,
            address=data.address,
            city=data.city,
            country=data.country,
        )
        db.add(consumer)
        db.flush()

        consumer_staff = ConsumerStaff(
            user_id=user.id,
            consumer_id=consumer.id,
            role=ConsumerRole.OWNER.value
        )
        db.add(consumer_staff)

        db.commit()
        db.refresh(user)

        token = create_access_token(data={"sub": str(user.id)})

        return SignupResponse(
            access_token=token.access_token,
            token_type=token.token_type,
            user=UserRead.model_validate(user),
            user_type="consumer",
            role=ConsumerRole.OWNER.value
        )

    except IntegrityError as e:
        db.rollback()
        print("Error here")
        print(e)
        raise HTTPException(
            status_code=400,
            detail="Database constraint violation. Email may already exist."
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Signup failed: {str(e)}")


@router.post("/signup/supplier", response_model=SignupResponse, status_code=status.HTTP_201_CREATED)
def signup_supplier(data: SupplierSignup, db: Session = Depends(get_db)):
    """
    Register a new supplier (farmer/producer) with their first user as owner.
    Creates initial subscription and returns JWT token for immediate login.
    """
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    try:
        user = User(
            email=str(data.email),
            password_hash=get_password_hash(data.password),
            phone_number=data.phone_number,
            created_at=datetime.now(),
            last_login_at=datetime.now(),
        )
        db.add(user)
        db.flush()

        supplier = Supplier(
            company_name=data.company_name,
            business_type=data.business_type,
            address=data.address,
            city=data.city,
            country=data.country,
            subscription_status=data.subscription_tier
        )
        db.add(supplier)
        db.flush()

        supplier_staff = SupplierStaff(
            user_id=user.id,
            supplier_id=supplier.id,
            role=SupplierRole.OWNER.value
        )
        db.add(supplier_staff)

        subscription = Subscription(
            supplier_id=supplier.id,
            tier=data.subscription_tier,
            start_date=datetime.now(),
            end_date=datetime.now() + timedelta(days=14),  # 14 day trial
            status="active",
            amount=Decimal(0),
        )
        db.add(subscription)

        db.commit()
        db.refresh(user)

        token = create_access_token(data={"sub": str(user.id)})

        return SignupResponse(
            access_token=token.access_token,
            token_type=token.token_type,
            user=UserRead.model_validate(user),
            user_type="supplier",
            role=SupplierRole.OWNER.value
        )

    except IntegrityError as e:
        db.rollback()
        print(e)
        raise HTTPException(
            status_code=400,
            detail="Database constraint violation. Email may already exist."
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Signup failed: {str(e)}")


@router.post("/token", response_model=SignupResponse)
async def login_for_access_token(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
        db: Session = Depends(get_db),
) -> SignupResponse:
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Determine user type and role
    user_type = None
    role = None

    # Check if user is a consumer staff
    consumer_staff = db.query(ConsumerStaff).filter(ConsumerStaff.user_id == user.id).first()
    if consumer_staff:
        user_type = "consumer"
        role = consumer_staff.role

    # Check if user is a supplier staff
    supplier_staff = db.query(SupplierStaff).filter(SupplierStaff.user_id == user.id).first()
    if supplier_staff:
        user_type = "supplier"
        role = supplier_staff.role

    if not user_type:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is not associated with any business entity"
        )

    # Update last login time
    user.last_login_at = datetime.now()
    db.commit()

    token = create_access_token(data={"sub": str(user.id)})

    return SignupResponse(
        access_token=token.access_token,
        token_type=token.token_type,
        user=UserRead.model_validate(user),
        user_type=user_type,
        role=role
    )



@router.get("/me", response_model=UserRead)
async def read_users_me(
    current_user: Annotated[UserRead, Depends(get_current_user)],
):
    return current_user


@router.post("/accept-invitation")
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
    if not invitation:
        raise HTTPException(status_code=404, detail="Invalid or expired invitation")
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
