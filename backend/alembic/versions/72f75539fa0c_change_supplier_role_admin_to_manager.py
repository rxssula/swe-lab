"""change_supplier_role_admin_to_manager

Revision ID: 72f75539fa0c
Revises: 2038a62eee57
Create Date: 2025-11-23 15:10:42.511188

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '72f75539fa0c'
down_revision: Union[str, Sequence[str], None] = '2038a62eee57'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Update all existing ADMIN roles to MANAGER in supplier_staff table
    op.execute(
        "UPDATE supplier_staff SET role = 'MANAGER' WHERE role = 'ADMIN'"
    )


def downgrade() -> None:
    """Downgrade schema."""
    # Revert MANAGER roles back to ADMIN in supplier_staff table
    op.execute(
        "UPDATE supplier_staff SET role = 'ADMIN' WHERE role = 'MANAGER'"
    )
