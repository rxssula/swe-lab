from datetime import datetime
from decimal import Decimal
from uuid import UUID
from typing import List, Optional

from pydantic import BaseModel, EmailStr
from app.models.enums import IncidentStatus, LinkStatus, AdminRole, SupplierRole, ConsumerRole



class UserBase(BaseModel):
    email: str
    phone_number: Optional[str] = None

    model_config = {"from_attributes": True}


class UserCreate(UserBase):
    password: str


class UserRead(UserBase):
    id: UUID
    created_at: datetime
    last_login_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# Signup Schemas
class ConsumerSignup(BaseModel):
    """Schema for consumer (restaurant/hotel) signup"""
    # Business info
    business_name: str
    business_type: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None

    # Owner user info
    email: EmailStr
    password: str
    phone_number: Optional[str] = None


class SupplierSignup(BaseModel):
    """Schema for supplier (farmer/producer) signup"""
    # Company info
    company_name: str
    business_type: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None

    # Owner user info
    email: EmailStr
    password: str
    phone_number: Optional[str] = None

    # Optional subscription tier
    subscription_tier: Optional[str] = "trial"


class SignupResponse(BaseModel):
    """Response after successful signup with auto-login"""
    access_token: str
    token_type: str
    user: UserRead
    user_type: str  # "consumer", "supplier", "admin"
    role: str  # "owner", "admin", "sales", etc.


class ConsumerBase(BaseModel):
    business_name: str
    business_type: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None


class ConsumerCreate(ConsumerBase):
    pass


class ConsumerRead(ConsumerBase):
    id: UUID

    class Config:
        from_attributes = True


class ConsumerStaffBase(BaseModel):
    role: Optional[str] = None


class ConsumerStaffCreate(ConsumerStaffBase):
    consumer_id: UUID
    user_id: UUID


class ConsumerStaffRead(ConsumerStaffBase):
    id: UUID
    consumer_id: UUID
    user_id: UUID

    class Config:
        from_attributes = True



class SupplierBase(BaseModel):
    company_name: str
    business_type: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    subscription_status: Optional[str] = None


class SupplierCreate(SupplierBase):
    pass


class SupplierRead(SupplierBase):
    id: UUID

    class Config:
        from_attributes = True


class SupplierStaffBase(BaseModel):
    role: SupplierRole


class SupplierStaffCreate(SupplierStaffBase):
    supplier_id: UUID
    user_id: UUID


class SupplierStaffRead(SupplierStaffBase):
    id: UUID
    supplier_id: UUID
    user_id: UUID

    class Config:
        from_attributes = True



class SubscriptionBase(BaseModel):
    tier: str
    start_date: datetime
    end_date: datetime
    status: str
    amount: Decimal


class SubscriptionCreate(SubscriptionBase):
    supplier_id: UUID


class SubscriptionRead(SubscriptionBase):
    id: UUID
    supplier_id: UUID

    class Config:
        from_attributes = True



class CategoryBase(BaseModel):
    name: str
    description: Optional[str] = None
    parent_category_id: Optional[UUID] = None


class CategoryCreate(CategoryBase):
    pass


class CategoryRead(CategoryBase):
    id: UUID

    class Config:
        from_attributes = True


class ProductBase(BaseModel):
    name: str
    description: Optional[str] = None
    unit: str
    price_per_unit: Decimal
    stock_level: int
    minimum_order_quantity: int
    is_active: Optional[bool] = True


class ProductCreate(ProductBase):
    supplier_id: UUID
    category_id: UUID


class ProductRead(ProductBase):
    id: UUID
    supplier_id: UUID
    category_id: UUID

    class Config:
        from_attributes = True


class ProductImageBase(BaseModel):
    image_url: str
    is_primary: Optional[bool] = False


class ProductImageCreate(ProductImageBase):
    product_id: UUID


class ProductImageRead(ProductImageBase):
    id: UUID
    product_id: UUID

    class Config:
        from_attributes = True


class ConsumerSupplierLinkBase(BaseModel):
    status: LinkStatus
    requested_at: datetime
    responded_at: Optional[datetime] = None
    responded_by: Optional[UUID] = None


class ConsumerSupplierLinkCreate(ConsumerSupplierLinkBase):
    consumer_id: UUID
    supplier_id: UUID


class ConsumerSupplierLinkRead(ConsumerSupplierLinkBase):
    id: UUID
    consumer_id: UUID
    supplier_id: UUID

    class Config:
        from_attributes = True


class ChatAttachmentBase(BaseModel):
    file_url: str
    file_type: str
    file_name: str


class ChatAttachmentCreate(ChatAttachmentBase):
    message_id: UUID


class ChatAttachmentRead(ChatAttachmentBase):
    id: UUID
    message_id: UUID

    class Config:
        from_attributes = True


class ChatMessageBase(BaseModel):
    sender_id: UUID
    sender_type: str
    message_text: str
    message_type: Optional[str] = "TEXT"
    sent_at: datetime
    read_at: Optional[datetime] = None


class ChatMessageCreate(ChatMessageBase):
    thread_id: UUID


class ChatMessageRead(ChatMessageBase):
    id: UUID
    thread_id: UUID
    attachments: Optional[List[ChatAttachmentRead]] = []

    class Config:
        from_attributes = True


class ChatThreadBase(BaseModel):
    created_at: datetime
    last_message_at: Optional[datetime] = None


class ChatThreadCreate(ChatThreadBase):
    link_id: UUID


class ChatThreadRead(ChatThreadBase):
    id: UUID
    link_id: UUID
    messages: Optional[List[ChatMessageRead]] = []

    class Config:
        from_attributes = True


class IncidentLogBase(BaseModel):
    action: str
    notes: Optional[str] = None
    timestamp: datetime


class IncidentLogCreate(IncidentLogBase):
    incident_id: UUID
    user_id: UUID


class IncidentLogRead(IncidentLogBase):
    id: UUID
    incident_id: UUID
    user_id: UUID

    class Config:
        from_attributes = True


class IncidentBase(BaseModel):
    order_id: Optional[UUID] = None
    reported_by: UUID
    assigned_to: Optional[UUID] = None
    status: IncidentStatus
    description: str
    created_at: datetime
    resolved_at: Optional[datetime] = None


class IncidentCreate(IncidentBase):
    link_id: UUID


class IncidentRead(IncidentBase):
    id: UUID
    link_id: UUID
    logs: Optional[List[IncidentLogRead]] = []

    class Config:
        from_attributes = True


class PlatformAdminBase(BaseModel):
    role: AdminRole


class PlatformAdminCreate(PlatformAdminBase):
    user_id: UUID


class PlatformAdminRead(PlatformAdminBase):
    id: UUID
    user_id: UUID

    class Config:
        from_attributes = True


class SupplierAnalyticsBase(BaseModel):
    period: str
    order_count: int
    gmv: Decimal
    average_order_value: Decimal
    reorder_rate: Decimal
    top_skus: Optional[str] = None
    first_response_time: int


class SupplierAnalyticsCreate(SupplierAnalyticsBase):
    supplier_id: UUID


class SupplierAnalyticsRead(SupplierAnalyticsBase):
    id: UUID
    supplier_id: UUID

    class Config:
        from_attributes = True
