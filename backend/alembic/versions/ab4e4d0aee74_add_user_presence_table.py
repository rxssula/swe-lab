"""add_user_presence_table

Revision ID: ab4e4d0aee74
Revises: 72f75539fa0c
Create Date: 2025-11-23 15:57:56.599538

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ab4e4d0aee74'
down_revision: Union[str, Sequence[str], None] = '72f75539fa0c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Create user_presence table
    op.create_table(
        'user_presence',
        sa.Column('id', sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', sa.dialects.postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('link_id', sa.dialects.postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('is_online', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('last_seen', sa.DateTime(), nullable=False),
        sa.Column('connected_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['link_id'], ['consumer_supplier_links.id'], ),
        sa.UniqueConstraint('user_id', 'link_id', name='uq_user_link_presence')
    )

    # Create indexes for efficient queries
    op.create_index('ix_user_presence_user_id', 'user_presence', ['user_id'])
    op.create_index('ix_user_presence_link_id', 'user_presence', ['link_id'])
    op.create_index('ix_user_presence_is_online', 'user_presence', ['is_online'])


def downgrade() -> None:
    """Downgrade schema."""
    # Drop indexes
    op.drop_index('ix_user_presence_is_online', table_name='user_presence')
    op.drop_index('ix_user_presence_link_id', table_name='user_presence')
    op.drop_index('ix_user_presence_user_id', table_name='user_presence')

    # Drop table
    op.drop_table('user_presence')
