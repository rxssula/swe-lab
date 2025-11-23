"""drop_staff_invitations_table

Revision ID: 584f8e5c491d
Revises: 
Create Date: 2025-11-23 12:42:35.810138

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '584f8e5c491d'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Drop staff_invitations table - no longer needed with direct staff creation."""
    op.drop_table('staff_invitations')


def downgrade() -> None:
    """Recreate staff_invitations table if needed."""
    op.create_table(
        'staff_invitations',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('email', sa.String(), nullable=False),
        sa.Column('token', sa.String(), nullable=False),
        sa.Column('consumer_id', sa.UUID(), nullable=True),
        sa.Column('supplier_id', sa.UUID(), nullable=True),
        sa.Column('role', sa.String(), nullable=False),
        sa.Column('status', sa.String(), nullable=False),
        sa.Column('invited_by', sa.UUID(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
        sa.Column('accepted_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['consumer_id'], ['consumers.id']),
        sa.ForeignKeyConstraint(['supplier_id'], ['suppliers.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('token')
    )
