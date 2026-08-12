"""Add email-verification and password-reset fields.

Revision ID: 32fe7b1c9a4d
Revises: 4fdc894b6fee
"""
from alembic import op
import sqlalchemy as sa


revision = '32fe7b1c9a4d'
down_revision = '4fdc894b6fee'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('users') as batch_op:
        batch_op.alter_column('password_hash', existing_type=sa.String(128), type_=sa.String(256))
        batch_op.add_column(sa.Column('email_verified', sa.Boolean(), nullable=False, server_default=sa.false()))
        batch_op.add_column(sa.Column('verification_token_hash', sa.String(length=64), nullable=True))
        batch_op.add_column(sa.Column('verification_token_expires_at', sa.DateTime(), nullable=True))
        batch_op.add_column(sa.Column('reset_token_hash', sa.String(length=64), nullable=True))
        batch_op.add_column(sa.Column('reset_token_expires_at', sa.DateTime(), nullable=True))


def downgrade():
    with op.batch_alter_table('users') as batch_op:
        batch_op.drop_column('reset_token_expires_at')
        batch_op.drop_column('reset_token_hash')
        batch_op.drop_column('verification_token_expires_at')
        batch_op.drop_column('verification_token_hash')
        batch_op.drop_column('email_verified')
        batch_op.alter_column('password_hash', existing_type=sa.String(256), type_=sa.String(128))
