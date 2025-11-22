from datetime import datetime
from decimal import Decimal

from uuid import UUID as PyUUID, uuid4

from sqlalchemy import (
    String, DateTime, Numeric, Boolean, ForeignKey, Integer, Enum as SQLEnum
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base
from app.models.enums import IncidentStatus, LinkStatus, AdminRole, SupplierRole, InvitationStatus, OrderStatus


class User(Base):
    __tablename__ = "users"

    id: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    email: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String, nullable=False)
    phone_number: Mapped[str] = mapped_column(String)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    last_login_at: Mapped[datetime] = mapped_column(DateTime)
    locale: Mapped[str] = mapped_column(String, default="en")

    consumer_staff: Mapped[list["ConsumerStaff"]] = relationship(back_populates="user")
    supplier_staff: Mapped[list["SupplierStaff"]] = relationship(back_populates="user")
    platform_admin: Mapped[list["PlatformAdmin"]] = relationship(back_populates="user")


class Consumer(Base):
    __tablename__ = "consumers"

    id: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    business_name: Mapped[str] = mapped_column(String, nullable=False)
    business_type: Mapped[str] = mapped_column(String)
    address: Mapped[str] = mapped_column(String)
    city: Mapped[str] = mapped_column(String)
    country: Mapped[str] = mapped_column(String)

    staff: Mapped[list["ConsumerStaff"]] = relationship(back_populates="consumer")
    links: Mapped[list["ConsumerSupplierLink"]] = relationship(back_populates="consumer")
    orders: Mapped[list["Order"]] = relationship(back_populates="consumer", foreign_keys="Order.consumer_id")


class ConsumerStaff(Base):
    __tablename__ = "consumer_staff"

    id: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    consumer_id: Mapped[PyUUID] = mapped_column(ForeignKey("consumers.id"))
    user_id: Mapped[PyUUID] = mapped_column(ForeignKey("users.id"))
    role: Mapped[str] = mapped_column(String)

    consumer: Mapped["Consumer"] = relationship(back_populates="staff")
    user: Mapped["User"] = relationship(back_populates="consumer_staff")


class Supplier(Base):
    __tablename__ = "suppliers"

    id: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    company_name: Mapped[str] = mapped_column(String, nullable=False)
    business_type: Mapped[str] = mapped_column(String)
    address: Mapped[str] = mapped_column(String)
    city: Mapped[str] = mapped_column(String)
    country: Mapped[str] = mapped_column(String)
    subscription_status: Mapped[str] = mapped_column(String)

    staff: Mapped[list["SupplierStaff"]] = relationship(back_populates="supplier")
    subscription: Mapped["Subscription"] = relationship(back_populates="supplier", uselist=False)
    products: Mapped[list["Product"]] = relationship(back_populates="supplier")
    links: Mapped[list["ConsumerSupplierLink"]] = relationship(back_populates="supplier")
    analytics: Mapped[list["SupplierAnalytics"]] = relationship(back_populates="supplier")
    orders: Mapped[list["Order"]] = relationship(back_populates="supplier", foreign_keys="Order.supplier_id")


class SupplierStaff(Base):
    __tablename__ = "supplier_staff"

    id: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    supplier_id: Mapped[PyUUID] = mapped_column(ForeignKey("suppliers.id"))
    user_id: Mapped[PyUUID] = mapped_column(ForeignKey("users.id"))
    role: Mapped[str] = mapped_column(String)

    supplier: Mapped["Supplier"] = relationship(back_populates="staff")
    user: Mapped["User"] = relationship(back_populates="supplier_staff")


class Subscription(Base):
    __tablename__ = "subscriptions"

    id: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    supplier_id: Mapped[PyUUID] = mapped_column(ForeignKey("suppliers.id"))
    tier: Mapped[str] = mapped_column(String)
    start_date: Mapped[datetime] = mapped_column(DateTime)
    end_date: Mapped[datetime] = mapped_column(DateTime)
    status: Mapped[str] = mapped_column(String)
    amount: Mapped[Decimal] = mapped_column(Numeric(10, 2))

    supplier: Mapped["Supplier"] = relationship(back_populates="subscription")


class Category(Base):
    __tablename__ = "categories"

    id: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    name: Mapped[str] = mapped_column(String)
    description: Mapped[str] = mapped_column(String)
    parent_category_id: Mapped[UUID | None] = mapped_column(ForeignKey("categories.id"))

    products: Mapped[list["Product"]] = relationship(back_populates="category")


class Product(Base):
    __tablename__ = "products"

    id: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    supplier_id: Mapped[PyUUID] = mapped_column(ForeignKey("suppliers.id"))
    category_id: Mapped[PyUUID] = mapped_column(ForeignKey("categories.id"))
    name: Mapped[str] = mapped_column(String)
    description: Mapped[str] = mapped_column(String)
    unit: Mapped[str] = mapped_column(String)
    price_per_unit: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    stock_level: Mapped[int] = mapped_column(Integer)
    minimum_order_quantity: Mapped[int] = mapped_column(Integer)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    supplier: Mapped["Supplier"] = relationship(back_populates="products")
    category: Mapped["Category"] = relationship(back_populates="products")
    images: Mapped[list["ProductImage"]] = relationship(back_populates="product")
    order_items: Mapped[list["OrderItem"]] = relationship(back_populates="product")


class ProductImage(Base):
    __tablename__ = "product_images"

    id: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    product_id: Mapped[PyUUID] = mapped_column(ForeignKey("products.id"))
    image_url: Mapped[str] = mapped_column(String)
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False)

    product: Mapped["Product"] = relationship(back_populates="images")


class ConsumerSupplierLink(Base):
    __tablename__ = "consumer_supplier_links"

    id: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    consumer_id: Mapped[PyUUID] = mapped_column(ForeignKey("consumers.id"))
    supplier_id: Mapped[PyUUID] = mapped_column(ForeignKey("suppliers.id"))
    status: Mapped[LinkStatus] = mapped_column(SQLEnum(LinkStatus))
    requested_at: Mapped[datetime] = mapped_column(DateTime)
    responded_at: Mapped[datetime | None] = mapped_column(DateTime)
    responded_by: Mapped[UUID | None] = mapped_column(UUID(as_uuid=True))

    consumer: Mapped["Consumer"] = relationship(back_populates="links")
    supplier: Mapped["Supplier"] = relationship(back_populates="links")
    chat_thread: Mapped["ChatThread"] = relationship(back_populates="link", uselist=False)
    incidents: Mapped[list["Incident"]] = relationship(back_populates="link")


class ChatThread(Base):
    __tablename__ = "chat_threads"

    id: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    link_id: Mapped[PyUUID] = mapped_column(ForeignKey("consumer_supplier_links.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    last_message_at: Mapped[datetime] = mapped_column(DateTime)

    link: Mapped["ConsumerSupplierLink"] = relationship(back_populates="chat_thread")
    messages: Mapped[list["ChatMessage"]] = relationship(back_populates="thread")


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    thread_id: Mapped[PyUUID] = mapped_column(ForeignKey("chat_threads.id"))
    sender_id: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True))
    sender_type: Mapped[str] = mapped_column(String)
    message_text: Mapped[str] = mapped_column(String)
    sent_at: Mapped[datetime] = mapped_column(DateTime)
    read_at: Mapped[datetime | None] = mapped_column(DateTime)
    message_type: Mapped[str] = mapped_column(String)
    product_id: Mapped[UUID | None] = mapped_column(ForeignKey("products.id"), nullable=True)

    thread: Mapped["ChatThread"] = relationship(back_populates="messages")
    attachments: Mapped[list["ChatAttachment"]] = relationship(back_populates="message")
    product: Mapped["Product"] = relationship()


class ChatAttachment(Base):
    __tablename__ = "chat_attachments"

    id: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    message_id: Mapped[PyUUID] = mapped_column(ForeignKey("chat_messages.id"))
    file_url: Mapped[str] = mapped_column(String)
    file_type: Mapped[str] = mapped_column(String)
    file_name: Mapped[str] = mapped_column(String)

    message: Mapped["ChatMessage"] = relationship(back_populates="attachments")


class Incident(Base):
    __tablename__ = "incidents"

    id: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    link_id: Mapped[PyUUID] = mapped_column(ForeignKey("consumer_supplier_links.id"))
    order_id: Mapped[UUID | None] = mapped_column(UUID(as_uuid=True))
    reported_by: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True))
    assigned_to: Mapped[UUID | None] = mapped_column(UUID(as_uuid=True))
    status: Mapped[IncidentStatus] = mapped_column(SQLEnum(IncidentStatus))
    description: Mapped[str] = mapped_column(String)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime)

    link: Mapped["ConsumerSupplierLink"] = relationship(back_populates="incidents")
    logs: Mapped[list["IncidentLog"]] = relationship(back_populates="incident")


class IncidentLog(Base):
    __tablename__ = "incident_logs"

    id: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    incident_id: Mapped[PyUUID] = mapped_column(ForeignKey("incidents.id"))
    user_id: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True))
    action: Mapped[str] = mapped_column(String)
    notes: Mapped[str] = mapped_column(String)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    incident: Mapped["Incident"] = relationship(back_populates="logs")


class PlatformAdmin(Base):
    __tablename__ = "platform_admins"

    id: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id: Mapped[PyUUID] = mapped_column(ForeignKey("users.id"))
    role: Mapped[AdminRole] = mapped_column(SQLEnum(AdminRole))

    user: Mapped["User"] = relationship(back_populates="platform_admin")


class SupplierAnalytics(Base):
    __tablename__ = "supplier_analytics"

    id: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    supplier_id: Mapped[PyUUID] = mapped_column(ForeignKey("suppliers.id"))
    period: Mapped[str] = mapped_column(String)
    order_count: Mapped[int] = mapped_column(Integer)
    gmv: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    average_order_value: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    reorder_rate: Mapped[Decimal] = mapped_column(Numeric(5, 2))
    top_skus: Mapped[str] = mapped_column(String)
    first_response_time: Mapped[int] = mapped_column(Integer)

    supplier: Mapped["Supplier"] = relationship(back_populates="analytics")

class StaffInvitation(Base):
    __tablename__ = "staff_invitations"

    id: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    email: Mapped[str] = mapped_column(String, nullable=False)
    token: Mapped[str] = mapped_column(String, unique=True, nullable=False)

    consumer_id: Mapped[PyUUID | None] = mapped_column(ForeignKey("consumers.id"), nullable=True)
    supplier_id: Mapped[PyUUID | None] = mapped_column(ForeignKey("suppliers.id"), nullable=True)

    role: Mapped[str] = mapped_column(String)

    status: Mapped[str] = mapped_column(SQLEnum(InvitationStatus), default=InvitationStatus.PENDING)
    invited_by: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True))

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    expires_at: Mapped[datetime] = mapped_column(DateTime)
    accepted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class Order(Base):
    __tablename__ = "orders"

    id: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    consumer_id: Mapped[PyUUID] = mapped_column(ForeignKey("consumers.id"))
    supplier_id: Mapped[PyUUID] = mapped_column(ForeignKey("suppliers.id"))
    status: Mapped[OrderStatus] = mapped_column(SQLEnum(OrderStatus), default=OrderStatus.PENDING)
    total_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    delivery_notes: Mapped[str | None] = mapped_column(String, nullable=True)
    delivery_option: Mapped[str] = mapped_column(String)
    rejection_reason: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    accepted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    cancelled_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    consumer: Mapped["Consumer"] = relationship(back_populates="orders", foreign_keys=[consumer_id])
    supplier: Mapped["Supplier"] = relationship(back_populates="orders", foreign_keys=[supplier_id])
    items: Mapped[list["OrderItem"]] = relationship(back_populates="order", cascade="all, delete-orphan")


class OrderItem(Base):
    __tablename__ = "order_items"

    id: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    order_id: Mapped[PyUUID] = mapped_column(ForeignKey("orders.id"))
    product_id: Mapped[PyUUID] = mapped_column(ForeignKey("products.id"))
    quantity: Mapped[int] = mapped_column(Integer)
    unit_price: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    subtotal: Mapped[Decimal] = mapped_column(Numeric(10, 2))

    order: Mapped["Order"] = relationship(back_populates="items")
    product: Mapped["Product"] = relationship(back_populates="order_items")


class CannedReply(Base):
    __tablename__ = "canned_replies"

    id: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    supplier_id: Mapped[PyUUID] = mapped_column(ForeignKey("suppliers.id"))
    title: Mapped[str] = mapped_column(String)
    content: Mapped[str] = mapped_column(String)
    created_by: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    supplier: Mapped["Supplier"] = relationship()

