"""Add the phone number field used by user registration and profiles.

Revision ID: 5c0d8f7a2b1e
Revises: 32fe7b1c9a4d
"""

from alembic import op
import sqlalchemy as sa


revision = '5c0d8f7a2b1e'
down_revision = '32fe7b1c9a4d'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('users') as batch_op:
        batch_op.add_column(sa.Column('phone_number', sa.String(length=20), nullable=True))


def downgrade():
    with op.batch_alter_table('users') as batch_op:
        batch_op.drop_column('phone_number')
