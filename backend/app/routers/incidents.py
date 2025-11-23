from datetime import datetime
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.auth.auth import get_current_user
from app.core.db import get_db
from app.models.user import (
    User, Consumer, Supplier, ConsumerStaff, SupplierStaff,
    ConsumerSupplierLink, Incident, IncidentLog, Order
)
from app.models.enums import IncidentStatus, LinkStatus, SupplierRole

router = APIRouter(prefix="/incidents", tags=["incidents"])


# Request/Response Models

class IncidentCreateRequest(BaseModel):
    link_id: UUID
    order_id: UUID | None = None
    description: str


class IncidentLogResponse(BaseModel):
    id: UUID
    incident_id: UUID
    user_id: UUID
    user_name: str | None
    user_role: str | None
    action: str
    notes: str
    timestamp: datetime

    class Config:
        from_attributes = True


class UserInfo(BaseModel):
    user_id: UUID
    name: str | None
    email: str
    role: str | None


class IncidentDetailResponse(BaseModel):
    id: UUID
    link_id: UUID
    order_id: UUID | None
    reported_by: UserInfo
    assigned_to: UserInfo | None
    status: str
    description: str
    created_at: datetime
    resolved_at: datetime | None
    consumer_name: str | None
    supplier_name: str | None
    logs: List[IncidentLogResponse] = []

    class Config:
        from_attributes = True


class IncidentSummaryResponse(BaseModel):
    id: UUID
    link_id: UUID
    order_id: UUID | None
    status: str
    description: str
    created_at: datetime
    resolved_at: datetime | None
    consumer_name: str | None
    supplier_name: str | None
    assigned_to_name: str | None

    class Config:
        from_attributes = True


class EscalateRequest(BaseModel):
    reason: str
    escalate_to_role: str  # "MANAGER" or "OWNER"


class ResolveRequest(BaseModel):
    resolution_notes: str


class AddLogRequest(BaseModel):
    action: str
    notes: str


class AssignRequest(BaseModel):
    assign_to_user_id: UUID


# Helper Functions

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


def get_supplier_for_user(db: Session, user: User) -> Supplier | None:
    """Get supplier entity for current user"""
    supplier_staff = db.query(SupplierStaff).filter(
        SupplierStaff.user_id == user.id
    ).first()

    if not supplier_staff:
        return None

    return db.query(Supplier).filter(
        Supplier.id == supplier_staff.supplier_id
    ).first()


def get_supplier_staff_for_user(db: Session, user: User) -> SupplierStaff | None:
    """Get supplier staff record for current user"""
    return db.query(SupplierStaff).filter(
        SupplierStaff.user_id == user.id
    ).first()


def get_user_info(db: Session, user_id: UUID) -> UserInfo | None:
    """Get user information with role"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return None

    # Try to get role from supplier staff
    supplier_staff = db.query(SupplierStaff).filter(
        SupplierStaff.user_id == user_id
    ).first()

    if supplier_staff:
        return UserInfo(
            user_id=user.id,
            name=getattr(user, 'name', None),
            email=user.email,
            role=supplier_staff.role
        )

    # Try consumer staff
    consumer_staff = db.query(ConsumerStaff).filter(
        ConsumerStaff.user_id == user_id
    ).first()

    if consumer_staff:
        return UserInfo(
            user_id=user.id,
            name=getattr(user, 'name', None),
            email=user.email,
            role=consumer_staff.role
        )

    return UserInfo(
        user_id=user.id,
        name=getattr(user, 'name', None),
        email=user.email,
        role=None
    )


def auto_assign_to_sales_rep(db: Session, supplier_id: UUID) -> UUID | None:
    """Auto-assign incident to a Sales Representative from the supplier"""
    sales_rep = db.query(SupplierStaff).filter(
        SupplierStaff.supplier_id == supplier_id,
        SupplierStaff.role == SupplierRole.SALES.value
    ).first()

    if sales_rep:
        return sales_rep.user_id

    # If no sales rep, assign to any staff member
    any_staff = db.query(SupplierStaff).filter(
        SupplierStaff.supplier_id == supplier_id
    ).first()

    return any_staff.user_id if any_staff else None


def build_incident_detail_response(
    db: Session,
    incident: Incident
) -> IncidentDetailResponse:
    """Build detailed incident response with all related data"""
    # Get link information
    link = db.query(ConsumerSupplierLink).filter(
        ConsumerSupplierLink.id == incident.link_id
    ).first()

    consumer_name = None
    supplier_name = None

    if link:
        consumer = db.query(Consumer).filter(Consumer.id == link.consumer_id).first()
        supplier = db.query(Supplier).filter(Supplier.id == link.supplier_id).first()
        consumer_name = consumer.business_name if consumer else None
        supplier_name = supplier.business_name if supplier else None

    # Get reporter info
    reported_by_info = get_user_info(db, incident.reported_by)

    # Get assigned to info
    assigned_to_info = None
    if incident.assigned_to:
        assigned_to_info = get_user_info(db, incident.assigned_to)

    # Get logs
    logs = db.query(IncidentLog).filter(
        IncidentLog.incident_id == incident.id
    ).order_by(IncidentLog.timestamp.asc()).all()

    log_responses = []
    for log in logs:
        user_info = get_user_info(db, log.user_id)
        log_responses.append(IncidentLogResponse(
            id=log.id,
            incident_id=log.incident_id,
            user_id=log.user_id,
            user_name=user_info.name if user_info else None,
            user_role=user_info.role if user_info else None,
            action=log.action,
            notes=log.notes,
            timestamp=log.timestamp
        ))

    return IncidentDetailResponse(
        id=incident.id,
        link_id=incident.link_id,
        order_id=incident.order_id,
        reported_by=reported_by_info,
        assigned_to=assigned_to_info,
        status=incident.status.value,
        description=incident.description,
        created_at=incident.created_at,
        resolved_at=incident.resolved_at,
        consumer_name=consumer_name,
        supplier_name=supplier_name,
        logs=log_responses
    )


# Endpoints

@router.post("/", response_model=IncidentDetailResponse, status_code=status.HTTP_201_CREATED)
def create_incident(
    data: IncidentCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new incident/complaint.
    Only consumers can create incidents.
    Automatically assigns to a Sales Representative from the supplier.
    """
    # Verify user is a consumer
    consumer = get_consumer_for_user(db, current_user)
    if not consumer:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only consumers can create incidents"
        )

    # Verify link exists and is accepted
    link = db.query(ConsumerSupplierLink).filter(
        ConsumerSupplierLink.id == data.link_id,
        ConsumerSupplierLink.consumer_id == consumer.id
    ).first()

    if not link:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Link not found"
        )

    if link.status != LinkStatus.ACCEPTED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Can only create incidents for accepted links"
        )

    # Verify order exists if provided
    if data.order_id:
        order = db.query(Order).filter(
            Order.id == data.order_id,
            Order.consumer_id == consumer.id,
            Order.supplier_id == link.supplier_id
        ).first()

        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Order not found or doesn't belong to this consumer-supplier relationship"
            )

    # Auto-assign to Sales Representative
    assigned_to = auto_assign_to_sales_rep(db, link.supplier_id)

    # Create incident
    incident = Incident(
        link_id=data.link_id,
        order_id=data.order_id,
        reported_by=current_user.id,
        assigned_to=assigned_to,
        status=IncidentStatus.OPEN,
        description=data.description,
        created_at=datetime.utcnow(),
        resolved_at=None
    )
    db.add(incident)
    db.flush()

    # Create initial log entry
    log = IncidentLog(
        incident_id=incident.id,
        user_id=current_user.id,
        action="created",
        notes=f"Incident created: {data.description[:100]}",
        timestamp=datetime.utcnow()
    )
    db.add(log)

    if assigned_to:
        assign_log = IncidentLog(
            incident_id=incident.id,
            user_id=current_user.id,
            action="assigned",
            notes=f"Auto-assigned to Sales Representative",
            timestamp=datetime.utcnow()
        )
        db.add(assign_log)

    db.commit()
    db.refresh(incident)

    return build_incident_detail_response(db, incident)


@router.get("/my-complaints", response_model=List[IncidentSummaryResponse])
def get_my_complaints(
    status_filter: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all incidents reported by the current consumer.
    Optional filter by status: open, in_progress, resolved
    """
    consumer = get_consumer_for_user(db, current_user)
    if not consumer:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only consumers can view their complaints"
        )

    query = db.query(Incident).filter(
        Incident.reported_by == current_user.id
    )

    if status_filter:
        try:
            status_enum = IncidentStatus(status_filter.lower())
            query = query.filter(Incident.status == status_enum)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status. Must be one of: {[s.value for s in IncidentStatus]}"
            )

    incidents = query.order_by(Incident.created_at.desc()).all()

    result = []
    for incident in incidents:
        link = db.query(ConsumerSupplierLink).filter(
            ConsumerSupplierLink.id == incident.link_id
        ).first()

        consumer_name = None
        supplier_name = None
        assigned_to_name = None

        if link:
            consumer_obj = db.query(Consumer).filter(Consumer.id == link.consumer_id).first()
            supplier = db.query(Supplier).filter(Supplier.id == link.supplier_id).first()
            consumer_name = consumer_obj.business_name if consumer_obj else None
            supplier_name = supplier.business_name if supplier else None

        if incident.assigned_to:
            assigned_user = db.query(User).filter(User.id == incident.assigned_to).first()
            assigned_to_name = getattr(assigned_user, 'name', assigned_user.email) if assigned_user else None

        result.append(IncidentSummaryResponse(
            id=incident.id,
            link_id=incident.link_id,
            order_id=incident.order_id,
            status=incident.status.value,
            description=incident.description,
            created_at=incident.created_at,
            resolved_at=incident.resolved_at,
            consumer_name=consumer_name,
            supplier_name=supplier_name,
            assigned_to_name=assigned_to_name
        ))

    return result


@router.get("/my-assigned", response_model=List[IncidentSummaryResponse])
def get_my_assigned_incidents(
    status_filter: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all incidents assigned to the current user (Sales Rep, Manager, or Owner).
    Optional filter by status: open, in_progress, resolved
    """
    supplier = get_supplier_for_user(db, current_user)
    if not supplier:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only supplier staff can view assigned incidents"
        )

    query = db.query(Incident).filter(
        Incident.assigned_to == current_user.id
    )

    if status_filter:
        try:
            status_enum = IncidentStatus(status_filter.lower())
            query = query.filter(Incident.status == status_enum)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status. Must be one of: {[s.value for s in IncidentStatus]}"
            )

    incidents = query.order_by(Incident.created_at.desc()).all()

    result = []
    for incident in incidents:
        link = db.query(ConsumerSupplierLink).filter(
            ConsumerSupplierLink.id == incident.link_id
        ).first()

        consumer_name = None
        supplier_name = None

        if link:
            consumer_obj = db.query(Consumer).filter(Consumer.id == link.consumer_id).first()
            supplier_obj = db.query(Supplier).filter(Supplier.id == link.supplier_id).first()
            consumer_name = consumer_obj.business_name if consumer_obj else None
            supplier_name = supplier_obj.business_name if supplier_obj else None

        result.append(IncidentSummaryResponse(
            id=incident.id,
            link_id=incident.link_id,
            order_id=incident.order_id,
            status=incident.status.value,
            description=incident.description,
            created_at=incident.created_at,
            resolved_at=incident.resolved_at,
            consumer_name=consumer_name,
            supplier_name=supplier_name,
            assigned_to_name=getattr(current_user, 'name', current_user.email)
        ))

    return result


@router.get("/my-supplier", response_model=List[IncidentSummaryResponse])
def get_supplier_incidents(
    status_filter: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all incidents for the current supplier (for Managers and Owners).
    Shows all incidents regardless of assignment.
    Optional filter by status: open, in_progress, resolved
    """
    supplier = get_supplier_for_user(db, current_user)
    if not supplier:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only supplier staff can view supplier incidents"
        )

    # Get supplier staff record to check role
    supplier_staff = get_supplier_staff_for_user(db, current_user)
    if not supplier_staff:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Staff record not found"
        )

    # Only Managers and Owners can view all supplier incidents
    if supplier_staff.role not in [SupplierRole.MANAGER.value, SupplierRole.OWNER.value]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Managers and Owners can view all supplier incidents"
        )

    # Get all links for this supplier
    links = db.query(ConsumerSupplierLink).filter(
        ConsumerSupplierLink.supplier_id == supplier.id
    ).all()

    link_ids = [link.id for link in links]

    query = db.query(Incident).filter(
        Incident.link_id.in_(link_ids)
    )

    if status_filter:
        try:
            status_enum = IncidentStatus(status_filter.lower())
            query = query.filter(Incident.status == status_enum)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status. Must be one of: {[s.value for s in IncidentStatus]}"
            )

    incidents = query.order_by(Incident.created_at.desc()).all()

    result = []
    for incident in incidents:
        link = db.query(ConsumerSupplierLink).filter(
            ConsumerSupplierLink.id == incident.link_id
        ).first()

        consumer_name = None
        assigned_to_name = None

        if link:
            consumer_obj = db.query(Consumer).filter(Consumer.id == link.consumer_id).first()
            consumer_name = consumer_obj.business_name if consumer_obj else None

        if incident.assigned_to:
            assigned_user = db.query(User).filter(User.id == incident.assigned_to).first()
            assigned_to_name = getattr(assigned_user, 'name', assigned_user.email) if assigned_user else None

        result.append(IncidentSummaryResponse(
            id=incident.id,
            link_id=incident.link_id,
            order_id=incident.order_id,
            status=incident.status.value,
            description=incident.description,
            created_at=incident.created_at,
            resolved_at=incident.resolved_at,
            consumer_name=consumer_name,
            supplier_name=supplier.business_name,
            assigned_to_name=assigned_to_name
        ))

    return result


@router.get("/{incident_id}", response_model=IncidentDetailResponse)
def get_incident_detail(
    incident_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get detailed information about a specific incident including logs.
    Accessible by the reporter or supplier staff handling the incident.
    """
    incident = db.query(Incident).filter(Incident.id == incident_id).first()

    if not incident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Incident not found"
        )

    # Check access permissions
    consumer = get_consumer_for_user(db, current_user)
    supplier = get_supplier_for_user(db, current_user)

    # Get link to verify access
    link = db.query(ConsumerSupplierLink).filter(
        ConsumerSupplierLink.id == incident.link_id
    ).first()

    if not link:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Link not found"
        )

    has_access = False
    if consumer and link.consumer_id == consumer.id:
        has_access = True
    elif supplier and link.supplier_id == supplier.id:
        has_access = True

    if not has_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this incident"
        )

    return build_incident_detail_response(db, incident)


@router.post("/{incident_id}/logs", response_model=IncidentLogResponse, status_code=status.HTTP_201_CREATED)
def add_incident_log(
    incident_id: UUID,
    data: AddLogRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Add a log entry (comment or update) to an incident.
    Accessible by reporter or supplier staff.
    """
    incident = db.query(Incident).filter(Incident.id == incident_id).first()

    if not incident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Incident not found"
        )

    # Check access
    consumer = get_consumer_for_user(db, current_user)
    supplier = get_supplier_for_user(db, current_user)

    link = db.query(ConsumerSupplierLink).filter(
        ConsumerSupplierLink.id == incident.link_id
    ).first()

    if not link:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Link not found"
        )

    has_access = False
    if consumer and link.consumer_id == consumer.id:
        has_access = True
    elif supplier and link.supplier_id == supplier.id:
        has_access = True

    if not has_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this incident"
        )

    # Create log entry
    log = IncidentLog(
        incident_id=incident_id,
        user_id=current_user.id,
        action=data.action,
        notes=data.notes,
        timestamp=datetime.utcnow()
    )
    db.add(log)
    db.commit()
    db.refresh(log)

    user_info = get_user_info(db, current_user.id)

    return IncidentLogResponse(
        id=log.id,
        incident_id=log.incident_id,
        user_id=log.user_id,
        user_name=user_info.name if user_info else None,
        user_role=user_info.role if user_info else None,
        action=log.action,
        notes=log.notes,
        timestamp=log.timestamp
    )


@router.put("/{incident_id}/escalate", response_model=IncidentDetailResponse)
def escalate_incident(
    incident_id: UUID,
    data: EscalateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Escalate incident to Manager or Owner.
    Sales can escalate to Manager.
    Manager can escalate to Owner.
    """
    incident = db.query(Incident).filter(Incident.id == incident_id).first()

    if not incident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Incident not found"
        )

    # Verify user is supplier staff
    supplier_staff = get_supplier_staff_for_user(db, current_user)
    if not supplier_staff:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only supplier staff can escalate incidents"
        )

    # Get link to verify supplier
    link = db.query(ConsumerSupplierLink).filter(
        ConsumerSupplierLink.id == incident.link_id
    ).first()

    if not link or link.supplier_id != supplier_staff.supplier_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this incident"
        )

    # Check escalation permissions
    target_role = data.escalate_to_role.upper()

    if supplier_staff.role == SupplierRole.SALES.value:
        if target_role not in ["MANAGER", "OWNER"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Sales can only escalate to MANAGER or OWNER"
            )
    elif supplier_staff.role == SupplierRole.MANAGER.value:
        if target_role != "OWNER":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Managers can only escalate to OWNER"
            )
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Owners cannot escalate further"
        )

    # Find staff member with target role
    target_staff = db.query(SupplierStaff).filter(
        SupplierStaff.supplier_id == supplier_staff.supplier_id,
        SupplierStaff.role == target_role
    ).first()

    if not target_staff:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No {target_role} found for this supplier"
        )

    # Update incident
    old_assigned_to = incident.assigned_to
    incident.assigned_to = target_staff.user_id
    incident.status = IncidentStatus.IN_PROGRESS

    # Create log entry
    log = IncidentLog(
        incident_id=incident_id,
        user_id=current_user.id,
        action="escalated",
        notes=f"Escalated to {target_role}: {data.reason}",
        timestamp=datetime.utcnow()
    )
    db.add(log)

    db.commit()
    db.refresh(incident)

    return build_incident_detail_response(db, incident)


@router.put("/{incident_id}/resolve", response_model=IncidentDetailResponse)
def resolve_incident(
    incident_id: UUID,
    data: ResolveRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Mark incident as resolved.
    Only the assigned staff member can resolve.
    """
    incident = db.query(Incident).filter(Incident.id == incident_id).first()

    if not incident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Incident not found"
        )

    # Verify user is supplier staff
    supplier_staff = get_supplier_staff_for_user(db, current_user)
    if not supplier_staff:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only supplier staff can resolve incidents"
        )

    # Verify user is assigned to this incident or is Manager/Owner
    if incident.assigned_to != current_user.id:
        if supplier_staff.role not in [SupplierRole.MANAGER.value, SupplierRole.OWNER.value]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the assigned staff or Manager/Owner can resolve this incident"
            )

    # Verify supplier access
    link = db.query(ConsumerSupplierLink).filter(
        ConsumerSupplierLink.id == incident.link_id
    ).first()

    if not link or link.supplier_id != supplier_staff.supplier_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this incident"
        )

    # Update incident
    incident.status = IncidentStatus.RESOLVED
    incident.resolved_at = datetime.utcnow()

    # Create log entry
    log = IncidentLog(
        incident_id=incident_id,
        user_id=current_user.id,
        action="resolved",
        notes=data.resolution_notes,
        timestamp=datetime.utcnow()
    )
    db.add(log)

    db.commit()
    db.refresh(incident)

    return build_incident_detail_response(db, incident)


@router.put("/{incident_id}/assign", response_model=IncidentDetailResponse)
def assign_incident(
    incident_id: UUID,
    data: AssignRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Reassign incident to another staff member.
    Only Managers and Owners can reassign.
    """
    incident = db.query(Incident).filter(Incident.id == incident_id).first()

    if not incident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Incident not found"
        )

    # Verify user is supplier staff with Manager or Owner role
    supplier_staff = get_supplier_staff_for_user(db, current_user)
    if not supplier_staff:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only supplier staff can reassign incidents"
        )

    if supplier_staff.role not in [SupplierRole.MANAGER.value, SupplierRole.OWNER.value]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Managers and Owners can reassign incidents"
        )

    # Verify supplier access
    link = db.query(ConsumerSupplierLink).filter(
        ConsumerSupplierLink.id == incident.link_id
    ).first()

    if not link or link.supplier_id != supplier_staff.supplier_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this incident"
        )

    # Verify target user is staff of this supplier
    target_staff = db.query(SupplierStaff).filter(
        SupplierStaff.user_id == data.assign_to_user_id,
        SupplierStaff.supplier_id == supplier_staff.supplier_id
    ).first()

    if not target_staff:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Target user is not staff of this supplier"
        )

    # Update incident
    old_assigned_to = incident.assigned_to
    incident.assigned_to = data.assign_to_user_id
    incident.status = IncidentStatus.IN_PROGRESS

    # Create log entry
    target_user_info = get_user_info(db, data.assign_to_user_id)
    log = IncidentLog(
        incident_id=incident_id,
        user_id=current_user.id,
        action="reassigned",
        notes=f"Reassigned to {target_user_info.name or target_user_info.email} ({target_staff.role})",
        timestamp=datetime.utcnow()
    )
    db.add(log)

    db.commit()
    db.refresh(incident)

    return build_incident_detail_response(db, incident)
