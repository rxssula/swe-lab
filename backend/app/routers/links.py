from datetime import datetime
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.auth import get_current_user
from app.core.db import get_db
from app.models.user import (
    User, Consumer, Supplier, ConsumerStaff, SupplierStaff,
    ConsumerSupplierLink
)
from app.models.enums import LinkStatus, ConsumerRole, SupplierRole
from app.schemas import ConsumerSupplierLinkRead
from pydantic import BaseModel

router = APIRouter(prefix="/links", tags=["links"])



class LinkRequestCreate(BaseModel):
    supplier_id: UUID


class LinkResponse(BaseModel):
    id: UUID
    consumer_id: UUID
    supplier_id: UUID
    status: str
    requested_at: datetime
    responded_at: datetime | None
    responded_by: UUID | None

    supplier_name: str | None = None
    consumer_name: str | None = None

    class Config:
        from_attributes = True



def get_consumer_for_user(db: Session, user: User) -> Consumer | None:
    """Get consumer entity for current user"""
    """Get consumer entity for current user"""
    consumer_staff = db.query(ConsumerStaff).filter(
        ConsumerStaff.user_id == user.id
    ).first()

    if not consumer_staff:
        return None

    return db.query(Consumer).filter(
        Consumer.id == consumer_staff.consumer_id
    ).first()


def get_supplier_for_user(db: Session, user: User) -> Supplier | None:
    """Get supplier entity for current user"""
    """Get supplier entity for current user"""
    supplier_staff = db.query(SupplierStaff).filter(
        SupplierStaff.user_id == user.id
    ).first()

    if not supplier_staff:
        return None

    return db.query(Supplier).filter(
        Supplier.id == supplier_staff.supplier_id
    ).first()


def has_supplier_permission(db: Session, user: User, supplier_id: UUID, allowed_roles: List[str]) -> bool:
    """Check if user has permission for supplier actions"""
    """Check if user has permission for supplier actions"""
    staff = db.query(SupplierStaff).filter(
        SupplierStaff.user_id == user.id,
        SupplierStaff.supplier_id == supplier_id
    ).first()

    if not staff:
        return False

    return staff.role in allowed_roles



@router.post("/request", response_model=LinkResponse, status_code=status.HTTP_201_CREATED)
def request_link_to_supplier(
    data: LinkRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Consumer requests a link to a supplier.
    Only consumers can make this request.
    """
    consumer = get_consumer_for_user(db, current_user)
    if not consumer:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only consumers can request supplier links"
        )

    supplier = db.query(Supplier).filter(Supplier.id == data.supplier_id).first()
    if not supplier:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Supplier not found"
        )

    existing_link = db.query(ConsumerSupplierLink).filter(
        ConsumerSupplierLink.consumer_id == consumer.id,
        ConsumerSupplierLink.supplier_id == data.supplier_id
    ).first()

    if existing_link:
        if existing_link.status == LinkStatus.PENDING:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Link request already pending"
            )
        elif existing_link.status == LinkStatus.ACCEPTED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Already linked to this supplier"
            )
        elif existing_link.status == LinkStatus.BLOCKED:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You have been blocked by this supplier"
            )
        existing_link.status = LinkStatus.PENDING
        existing_link.requested_at = datetime.now()
        existing_link.responded_at = None
        existing_link.responded_by = None
        db.commit()
        db.refresh(existing_link)

        return LinkResponse(
            id=existing_link.id,
            consumer_id=existing_link.consumer_id,
            supplier_id=existing_link.supplier_id,
            status=existing_link.status.value,
            requested_at=existing_link.requested_at,
            responded_at=existing_link.responded_at,
            responded_by=existing_link.responded_by,
            supplier_name=supplier.business_name,
            consumer_name=consumer.business_name
        )

    link = ConsumerSupplierLink(
        consumer_id=consumer.id,
        supplier_id=data.supplier_id,
        status=LinkStatus.PENDING,
        requested_at=datetime.now()
    )
    db.add(link)
    db.commit()
    db.refresh(link)

    return LinkResponse(
        id=link.id,
        consumer_id=link.consumer_id,
        supplier_id=link.supplier_id,
        status=link.status.value,
        requested_at=link.requested_at,
        responded_at=link.responded_at,
        responded_by=link.responded_by,
        supplier_name=supplier.business_name,
        consumer_name=consumer.business_name
    )


@router.get("/my-links", response_model=List[LinkResponse])
def get_my_links(
    status_filter: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all links for the current consumer.
    Optional filter by status: pending, accepted, declined, removed, blocked
    """
    consumer = get_consumer_for_user(db, current_user)
    if not consumer:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only consumers can view their links"
        )

    query = db.query(ConsumerSupplierLink).filter(
        ConsumerSupplierLink.consumer_id == consumer.id
    )

    if status_filter:
        try:
            status_enum = LinkStatus(status_filter.lower())
            query = query.filter(ConsumerSupplierLink.status == status_enum)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status. Must be one of: {[s.value for s in LinkStatus]}"
            )

    links = query.all()

    result = []
    for link in links:
        supplier = db.query(Supplier).filter(Supplier.id == link.supplier_id).first()
        result.append(LinkResponse(
            id=link.id,
            consumer_id=link.consumer_id,
            supplier_id=link.supplier_id,
            status=link.status.value,
            requested_at=link.requested_at,
            responded_at=link.responded_at,
            responded_by=link.responded_by,
            supplier_name=supplier.business_name if supplier else None,
            consumer_name=consumer.business_name
        ))

    return result



@router.get("/requests", response_model=List[LinkResponse])
def get_link_requests(
    status_filter: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all link requests for the current supplier.
    Only Owner, Manager, and Sales can view requests.
    Optional filter by status.
    """
    supplier = get_supplier_for_user(db, current_user)
    if not supplier:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only supplier staff can view link requests"
        )

    query = db.query(ConsumerSupplierLink).filter(
        ConsumerSupplierLink.supplier_id == supplier.id
    )

    if status_filter:
        try:
            status_enum = LinkStatus(status_filter.lower())
            query = query.filter(ConsumerSupplierLink.status == status_enum)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status. Must be one of: {[s.value for s in LinkStatus]}"
            )

    links = query.all()

    result = []
    for link in links:
        consumer = db.query(Consumer).filter(Consumer.id == link.consumer_id).first()
        result.append(LinkResponse(
            id=link.id,
            consumer_id=link.consumer_id,
            supplier_id=link.supplier_id,
            status=link.status.value,
            requested_at=link.requested_at,
            responded_at=link.responded_at,
            responded_by=link.responded_by,
            supplier_name=supplier.business_name,
            consumer_name=consumer.business_name if consumer else None
        ))

    return result


@router.post("/requests/{link_id}/accept", response_model=LinkResponse)
def accept_link_request(
    link_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Supplier accepts a link request from a consumer.
    Only Owner and Manager can accept links.
    """
    link = db.query(ConsumerSupplierLink).filter(
        ConsumerSupplierLink.id == link_id
    ).first()

    if not link:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Link request not found"
        )

    if not has_supplier_permission(
        db, current_user, link.supplier_id,
        [SupplierRole.OWNER.value, SupplierRole.MANAGER.value]
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Owner or Manager can accept link requests"
        )

    if link.status != LinkStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Link request is not pending (current status: {link.status.value})"
        )

    link.status = LinkStatus.ACCEPTED
    link.responded_at = datetime.now()
    link.responded_by = current_user.id
    db.commit()
    db.refresh(link)

    supplier = db.query(Supplier).filter(Supplier.id == link.supplier_id).first()
    consumer = db.query(Consumer).filter(Consumer.id == link.consumer_id).first()

    return LinkResponse(
        id=link.id,
        consumer_id=link.consumer_id,
        supplier_id=link.supplier_id,
        status=link.status.value,
        requested_at=link.requested_at,
        responded_at=link.responded_at,
        responded_by=link.responded_by,
        supplier_name=supplier.business_name if supplier else None,
        consumer_name=consumer.business_name if consumer else None
    )


@router.post("/requests/{link_id}/reject", response_model=LinkResponse)
def reject_link_request(
    link_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Supplier rejects a link request from a consumer.
    Only Owner and Manager can reject links.
    """
    link = db.query(ConsumerSupplierLink).filter(
        ConsumerSupplierLink.id == link_id
    ).first()

    if not link:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Link request not found"
        )

    if not has_supplier_permission(
        db, current_user, link.supplier_id,
        [SupplierRole.OWNER.value, SupplierRole.MANAGER.value]
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Owner or Manager can reject link requests"
        )

    if link.status != LinkStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Link request is not pending (current status: {link.status.value})"
        )

    link.status = LinkStatus.DECLINED
    link.responded_at = datetime.now()
    link.responded_by = current_user.id
    db.commit()
    db.refresh(link)

    supplier = db.query(Supplier).filter(Supplier.id == link.supplier_id).first()
    consumer = db.query(Consumer).filter(Consumer.id == link.consumer_id).first()

    return LinkResponse(
        id=link.id,
        consumer_id=link.consumer_id,
        supplier_id=link.supplier_id,
        status=link.status.value,
        requested_at=link.requested_at,
        responded_at=link.responded_at,
        responded_by=link.responded_by,
        supplier_name=supplier.business_name if supplier else None,
        consumer_name=consumer.business_name if consumer else None
    )


@router.delete("/requests/{link_id}")
def remove_or_block_link(
    link_id: UUID,
    block: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Supplier removes or blocks a consumer link.
    Only Owner and Manager can remove/block links.
    Use block=true to block the consumer (prevents future requests).
    """
    link = db.query(ConsumerSupplierLink).filter(
        ConsumerSupplierLink.id == link_id
    ).first()

    if not link:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Link not found"
        )

    if not has_supplier_permission(
        db, current_user, link.supplier_id,
        [SupplierRole.OWNER.value, SupplierRole.MANAGER.value]
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Owner or Manager can remove/block links"
        )

    if block:
        link.status = LinkStatus.BLOCKED
    else:
        link.status = LinkStatus.REMOVED

    link.responded_at = datetime.now()
    link.responded_by = current_user.id
    db.commit()

    return {
        "message": f"Link {'blocked' if block else 'removed'} successfully",
        "link_id": link_id,
        "status": link.status.value
    }


@router.get("/check/{supplier_id}")
def check_link_status(
    supplier_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Check if current consumer has a link with specified supplier.
    Returns link status or null if no link exists.
    """
    consumer = get_consumer_for_user(db, current_user)
    if not consumer:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only consumers can check link status"
        )

    link = db.query(ConsumerSupplierLink).filter(
        ConsumerSupplierLink.consumer_id == consumer.id,
        ConsumerSupplierLink.supplier_id == supplier_id
    ).first()

    if not link:
        return {
            "linked": False,
            "status": None,
            "message": "No link exists with this supplier"
        }

    return {
        "linked": link.status == LinkStatus.ACCEPTED,
        "status": link.status.value,
        "link_id": link.id,
        "requested_at": link.requested_at,
        "responded_at": link.responded_at
    }
