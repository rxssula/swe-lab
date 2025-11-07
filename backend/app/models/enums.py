from enum import Enum

class AdminRole(Enum):
    FINANCE = "finance"
    COMPLIANCE = "compliance"
    SUPERADMIN = "superadmin"


class SupplierRole(Enum):
    OWNER = "owner"
    ADMIN = "admin"
    SALES = "sales"

class ConsumerRole(Enum):
    OWNER = "owner"
    MANAGER = "manager"
    STAFF = "staff"

class IncidentStatus(Enum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"

class LinkStatus(Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    DECLINED = "declined"
    REMOVED = "removed"
    BLOCKED = "blocked"

class OrderStatus(Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

