from enum import Enum

class AdminRole(Enum):
    FINANCE = "finance"
    COMPLIANCE = "compliance"
    SUPERADMIN = "superadmin"


class SupplierRole(Enum):
    OWNER = "owner"
    ADMIN = "admin"
    SALES = "sales"

class IncidentStatus(Enum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"

class LinkStatus(Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    REMOVED = "removed"
    BLOCKED = "blocked"

