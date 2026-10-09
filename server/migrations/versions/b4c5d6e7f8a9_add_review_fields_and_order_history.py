"""Add review dimensions and order status history.

Revision ID: b4c5d6e7f8a9
Revises: c3d4e5f6a7b8
Create Date: 2026-10-09
"""
from alembic import op
import sqlalchemy as sa


revision = 'b4c5d6e7f8a9'
down_revision = 'c3d4e5f6a7b8'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('reviews', sa.Column('quality_honesty', sa.Integer(), nullable=True))
    op.add_column('reviews', sa.Column('quality_fulfillment', sa.Integer(), nullable=True))
    op.add_column('verification_requests', sa.Column('county', sa.String(length=100), nullable=True))
    op.add_column('verification_requests', sa.Column('farm_size_acres', sa.Float(), nullable=True))
    op.add_column('verification_requests', sa.Column('cooperative_name', sa.String(length=100), nullable=True))

    op.create_table(
        'order_status_history',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('order_id', sa.Integer(), nullable=False),
        sa.Column('previous_status', sa.String(length=30), nullable=False),
        sa.Column('new_status', sa.String(length=30), nullable=False),
        sa.Column('changed_by_id', sa.Integer(), nullable=False),
        sa.Column('changed_at', sa.DateTime(), nullable=False),
        sa.Column('reason', sa.String(length=255), nullable=True),
        sa.Column('request_id', sa.String(length=100), nullable=True),
        sa.ForeignKeyConstraint(['order_id'], ['orders.id']),
        sa.ForeignKeyConstraint(['changed_by_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_order_status_history_order_id', 'order_status_history', ['order_id'])


def downgrade():
    op.drop_index('ix_order_status_history_order_id', table_name='order_status_history')
    op.drop_table('order_status_history')
    op.drop_column('verification_requests', 'cooperative_name')
    op.drop_column('verification_requests', 'farm_size_acres')
    op.drop_column('verification_requests', 'county')
    op.drop_column('reviews', 'quality_fulfillment')
    op.drop_column('reviews', 'quality_honesty')
