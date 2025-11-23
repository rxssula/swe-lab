import uuid
from decimal import Decimal
from typing import Annotated, Optional
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import case
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.auth.auth import create_access_token, authenticate_user, get_current_user, get_password_hash
from app.core.db import get_db
from app.models import User
from app.models.user import Consumer, ConsumerStaff, Supplier, SupplierStaff, Subscription
from app.models.enums import ConsumerRole, SupplierRole
from app.schemas import ConsumerSignup, SupplierSignup, SignupResponse, UserRead, UserMeResponse, ConsumerAssociation, SupplierAssociation, ManagerInfo, ConsumerRead, SupplierRead

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
            name=data.name,
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

        token = create_access_token(
            data={"sub": str(consumer.id)},
            user_type="consumer",
            role=ConsumerRole.OWNER.value
        )
        return SignupResponse(
            access_token=token.access_token,
            token_type=token.token_type,
            consumer_id=consumer.id,
            user=UserRead.model_validate(user),
            user_type=token.user_type,
            role=token.role,
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
            name=data.name,
            last_login_at=datetime.now(),
        )
        db.add(user)
        db.flush()

        supplier = Supplier(
            business_name=data.business_name,
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
            end_date=datetime.now() + timedelta(days=14),
            status="active",
            amount=Decimal(0),
        )
        db.add(subscription)

        db.commit()
        db.refresh(user)

        token = create_access_token(
            data={"sub": str(supplier.id)},
            user_type="supplier",
            role=SupplierRole.OWNER.value
        )

        return SignupResponse(
            access_token=token.access_token,
            token_type=token.token_type,
            user=UserRead.model_validate(user),
            user_type=token.user_type,
            role=token.role,
            supplier_id=supplier.id
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

    user_type = None
    role = None
    consumer_id = None
    supplier_id = None

    consumer_staff = db.query(ConsumerStaff).filter(ConsumerStaff.user_id == user.id).first()
    if consumer_staff:
        user_type = "consumer"
        role = consumer_staff.role
        consumer_id = consumer_staff.consumer_id

    supplier_staff = db.query(SupplierStaff).filter(SupplierStaff.user_id == user.id).first()
    if supplier_staff:
        user_type = "supplier"
        role = supplier_staff.role
        supplier_id = supplier_staff.supplier_id

    if not user_type:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is not associated with any business entity"
        )

    user.last_login_at = datetime.now()
    db.commit()

    token = create_access_token(
        data={"sub": str(user.id)},
        user_type=user_type,
        role=role
    )

    return SignupResponse(
        access_token=token.access_token,
        token_type=token.token_type,
        user=UserRead.model_validate(user),
        user_type=token.user_type,
        role=token.role,
        consumer_id=consumer_id,
        supplier_id=supplier_id
    )



@router.get("/me", response_model=UserMeResponse)
async def read_users_me(
    current_user: Annotated[UserRead, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    """
    Get current user information including all company associations and manager details.
    For staff/sales users, includes information about their managers (owners/admins).
    """
    # Fetch the full user from database
    user = db.query(User).filter(User.id == current_user.id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    consumer_associations = []
    supplier_associations = []

    # Get all consumer associations
    consumer_staff_records = db.query(ConsumerStaff).filter(
        ConsumerStaff.user_id == user.id
    ).all()

    for cs in consumer_staff_records:
        # Get the consumer company
        consumer = db.query(Consumer).filter(Consumer.id == cs.consumer_id).first()
        if not consumer:
            continue

        # Find manager (owner or manager role) for this consumer
        manager_staff = db.query(ConsumerStaff).join(User).filter(
            ConsumerStaff.consumer_id == cs.consumer_id,
            ConsumerStaff.role.in_(['MANAGER']),
            ConsumerStaff.user_id != user.id  # Exclude current user
        ).first()

        manager_name = None
        if manager_staff and cs.role == 'STAFF':
            manager_user = db.query(User).filter(User.id == manager_staff.user_id).first()
            if manager_user:
                manager_name = manager_user.name

        consumer_associations.append(ConsumerAssociation(
            consumer=ConsumerRead.model_validate(consumer),
            role=cs.role,
            manager=manager_name
        ))

    # Get all supplier associations
    supplier_staff_records = db.query(SupplierStaff).filter(
        SupplierStaff.user_id == user.id
    ).all()

    for ss in supplier_staff_records:
        # Get the supplier company
        supplier = db.query(Supplier).filter(Supplier.id == ss.supplier_id).first()
        if not supplier:
            continue

        # Find manager (owner or manager role) for this supplier
        manager_staff = db.query(SupplierStaff).join(User).filter(
            SupplierStaff.supplier_id == ss.supplier_id,
            SupplierStaff.role.in_(['MANAGER']),
            SupplierStaff.user_id != user.id  # Exclude current user
        ).first()

        manager_name = None
        if manager_staff and ss.role == 'SALES':
            manager_user = db.query(User).filter(User.id == manager_staff.user_id).first()
            if manager_user:
                manager_name = manager_user.name

        supplier_associations.append(SupplierAssociation(
            supplier=SupplierRead.model_validate(supplier),
            role=ss.role,
            manager=manager_name
        ))

    return UserMeResponse(
        id=user.id,
        email=user.email,
        phone_number=user.phone_number,
        name=user.name,
        created_at=user.created_at,
        last_login_at=user.last_login_at,
        consumer_associations=consumer_associations,
        supplier_associations=supplier_associations
    )