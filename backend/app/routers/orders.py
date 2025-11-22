from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_

from app.auth.auth import get_current_user
from app.core.db import get_db
from app.models.user import (
    User, Consumer, Supplier, ConsumerStaff, SupplierStaff,
    Order, OrderItem, Product, ConsumerSupplierLink
)
from app.models.enums import OrderStatus, LinkStatus, SupplierRole, ConsumerRole
from app.schemas import OrderCreate, OrderRead, OrderUpdate, OrderItemRead

router = APIRouter(prefix="/orders", tags=["orders"])


def get_consumer_for_user(user: User, db: Session) -> Consumer:
    """Get the consumer entity for the current user"""
    """Get the consumer entity for the current user"""
    consumer_staff = db.query(ConsumerStaff).filter(
        ConsumerStaff.user_id == user.id
    ).first()

    if not consumer_staff:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is not associated with any consumer business"
        )

    consumer = db.query(Consumer).filter(
        Consumer.id == consumer_staff.consumer_id
    ).first()

    if not consumer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Consumer business not found"
        )

    return consumer


def get_supplier_for_user(user: User, db: Session) -> Supplier:
    """Get the supplier entity for the current user"""
    """Get the supplier entity for the current user"""
    supplier_staff = db.query(SupplierStaff).filter(
        SupplierStaff.user_id == user.id
    ).first()

    if not supplier_staff:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is not associated with any supplier business"
        )

    supplier = db.query(Supplier).filter(
        Supplier.id == supplier_staff.supplier_id
    ).first()

    if not supplier:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Supplier business not found"
        )

    return supplier


def has_consumer_permission(user: User, consumer_id: UUID, db: Session) -> bool:
    """Check if user has permission for this consumer"""
    """Check if user has permission for this consumer"""
    consumer_staff = db.query(ConsumerStaff).filter(
        and_(
            ConsumerStaff.user_id == user.id,
            ConsumerStaff.consumer_id == consumer_id
        )
    ).first()
    return consumer_staff is not None


def has_supplier_permission(user: User, supplier_id: UUID, db: Session) -> bool:
    """Check if user has permission for this supplier"""
    """Check if user has permission for this supplier"""
    supplier_staff = db.query(SupplierStaff).filter(
        and_(
            SupplierStaff.user_id == user.id,
            SupplierStaff.supplier_id == supplier_id
        )
    ).first()
    return supplier_staff is not None


def verify_link_exists(consumer_id: UUID, supplier_id: UUID, db: Session):
    """Verify that an active link exists between consumer and supplier"""
    """Verify that an active link exists between consumer and supplier"""
    link = db.query(ConsumerSupplierLink).filter(
        and_(
            ConsumerSupplierLink.consumer_id == consumer_id,
            ConsumerSupplierLink.supplier_id == supplier_id,
            ConsumerSupplierLink.status == LinkStatus.ACCEPTED
        )
    ).first()

    if not link:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active link exists between consumer and supplier"
        )
    return link


@router.post("/", response_model=OrderRead, status_code=status.HTTP_201_CREATED)
def create_order(
    order_data: OrderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new order with multiple products"""
    """Create a new order with multiple products"""
    consumer = get_consumer_for_user(current_user, db)
    verify_link_exists(consumer.id, order_data.supplier_id, db)

    total_amount = Decimal('0.00')
    order_items_data = []

    for item in order_data.items:
        product = db.query(Product).filter(
            and_(
                Product.id == item.product_id,
                Product.supplier_id == order_data.supplier_id,
                Product.is_active == True
            )
        ).first()

        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product {item.product_id} not found or not available from this supplier"
            )

        if item.quantity < product.minimum_order_quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Product {product.name} requires minimum order quantity of {product.minimum_order_quantity}"
            )

        if item.quantity > product.stock_level:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Insufficient stock for {product.name}. Available: {product.stock_level}, Requested: {item.quantity}"
            )

        subtotal = product.price_per_unit * item.quantity
        total_amount += subtotal

        order_items_data.append({
            "product_id": item.product_id,
            "quantity": item.quantity,
            "unit_price": product.price_per_unit,
            "subtotal": subtotal
        })

    new_order = Order(
        consumer_id=consumer.id,
        supplier_id=order_data.supplier_id,
        status=OrderStatus.PENDING,
        total_amount=total_amount,
        delivery_notes=order_data.delivery_notes,
        delivery_option=order_data.delivery_option
    )

    db.add(new_order)
    db.flush()

    for item_data in order_items_data:
        order_item = OrderItem(
            order_id=new_order.id,
            **item_data
        )
        db.add(order_item)

    db.commit()
    db.refresh(new_order)

    return new_order


@router.get("/consumer/history", response_model=List[OrderRead])
def get_consumer_order_history(
    status: Optional[OrderStatus] = None,
    supplier_id: Optional[UUID] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get order history for consumer with optional filtering"""
    """Get order history for consumer with optional filtering"""
    consumer = get_consumer_for_user(current_user, db)
    query = db.query(Order).filter(Order.consumer_id == consumer.id)

    if status:
        query = query.filter(Order.status == status)

    if supplier_id:
        query = query.filter(Order.supplier_id == supplier_id)

    orders = query.order_by(Order.created_at.desc()).offset(skip).limit(limit).all()
    return orders


@router.post("/{order_id}/cancel", response_model=OrderRead)
def cancel_order(
    order_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Cancel a pending or accepted order"""
    """Cancel a pending or accepted order"""
    consumer = get_consumer_for_user(current_user, db)
    order = db.query(Order).filter(
        and_(
            Order.id == order_id,
            Order.consumer_id == consumer.id
        )
    ).first()

    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )

    if order.status not in [OrderStatus.PENDING, OrderStatus.ACCEPTED]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot cancel order with status: {order.status.value}"
        )

    order.status = OrderStatus.CANCELLED
    order.cancelled_at = datetime.utcnow()
    db.commit()
    db.refresh(order)
    return order


@router.get("/supplier/incoming", response_model=List[OrderRead])
def get_incoming_orders(
    status: Optional[OrderStatus] = None,
    consumer_id: Optional[UUID] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """View incoming orders for supplier with optional filtering"""
    """View incoming orders for supplier with optional filtering"""
    supplier = get_supplier_for_user(current_user, db)
    query = db.query(Order).filter(Order.supplier_id == supplier.id)

    if status:
        query = query.filter(Order.status == status)

    if consumer_id:
        query = query.filter(Order.consumer_id == consumer_id)

    orders = query.order_by(Order.created_at.desc()).offset(skip).limit(limit).all()
    return orders


@router.post("/{order_id}/accept", response_model=OrderRead)
def accept_order(
    order_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Accept a pending order"""
    """Accept a pending order"""
    supplier = get_supplier_for_user(current_user, db)
    order = db.query(Order).filter(
        and_(
            Order.id == order_id,
            Order.supplier_id == supplier.id
        )
    ).first()

    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )

    if order.status != OrderStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot accept order with status: {order.status.value}"
        )

    order.status = OrderStatus.ACCEPTED
    order.accepted_at = datetime.utcnow()
    db.commit()
    db.refresh(order)
    return order


@router.post("/{order_id}/reject", response_model=OrderRead)
def reject_order(
    order_id: UUID,
    rejection_reason: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Reject a pending order with reason"""
    """Reject a pending order with reason"""
    supplier = get_supplier_for_user(current_user, db)
    order = db.query(Order).filter(
        and_(
            Order.id == order_id,
            Order.supplier_id == supplier.id
        )
    ).first()

    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )

    if order.status != OrderStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot reject order with status: {order.status.value}"
        )

    if not rejection_reason or not rejection_reason.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Rejection reason is required"
        )

    order.status = OrderStatus.REJECTED
    order.rejection_reason = rejection_reason
    db.commit()
    db.refresh(order)
    return order


@router.post("/{order_id}/complete", response_model=OrderRead)
def complete_order(
    order_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Mark an accepted order as completed"""
    """Mark an accepted order as completed"""
    supplier = get_supplier_for_user(current_user, db)
    order = db.query(Order).filter(
        and_(
            Order.id == order_id,
            Order.supplier_id == supplier.id
        )
    ).first()

    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )

    if order.status != OrderStatus.ACCEPTED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot complete order with status: {order.status.value}. Order must be accepted first."
        )

    order.status = OrderStatus.COMPLETED
    order.completed_at = datetime.utcnow()
    db.commit()
    db.refresh(order)
    return order


@router.get("/{order_id}", response_model=OrderRead)
def get_order_details(
    order_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get order details with items"""
    """Get order details with items"""
    order = db.query(Order).filter(Order.id == order_id).first()

    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )

    has_permission = (
        has_consumer_permission(current_user, order.consumer_id, db) or
        has_supplier_permission(current_user, order.supplier_id, db)
    )

    if not has_permission:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to view this order"
        )

    return order


@router.post("/{order_id}/reorder", response_model=OrderRead, status_code=status.HTTP_201_CREATED)
def reorder(
    order_id: UUID,
    delivery_notes: Optional[str] = None,
    delivery_option: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new order based on a previous order"""
    """Create a new order based on a previous order"""
    consumer = get_consumer_for_user(current_user, db)
    original_order = db.query(Order).filter(
        and_(
            Order.id == order_id,
            Order.consumer_id == consumer.id
        )
    ).first()

    if not original_order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Original order not found"
        )

    verify_link_exists(consumer.id, original_order.supplier_id, db)

    total_amount = Decimal('0.00')
    new_order_items_data = []

    for item in original_order.items:
        product = db.query(Product).filter(
            and_(
                Product.id == item.product_id,
                Product.supplier_id == original_order.supplier_id,
                Product.is_active == True
            )
        ).first()

        if not product:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Product {item.product_id} is no longer available"
            )

        if item.quantity > product.stock_level:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Insufficient stock for {product.name}. Available: {product.stock_level}, Requested: {item.quantity}"
            )

        subtotal = product.price_per_unit * item.quantity
        total_amount += subtotal

        new_order_items_data.append({
            "product_id": item.product_id,
            "quantity": item.quantity,
            "unit_price": product.price_per_unit,
            "subtotal": subtotal
        })

    new_order = Order(
        consumer_id=consumer.id,
        supplier_id=original_order.supplier_id,
        status=OrderStatus.PENDING,
        total_amount=total_amount,
        delivery_notes=delivery_notes or original_order.delivery_notes,
        delivery_option=delivery_option or original_order.delivery_option
    )

    db.add(new_order)
    db.flush()

    for item_data in new_order_items_data:
        order_item = OrderItem(
            order_id=new_order.id,
            **item_data
        )
        db.add(order_item)

    db.commit()
    db.refresh(new_order)
    return new_order
