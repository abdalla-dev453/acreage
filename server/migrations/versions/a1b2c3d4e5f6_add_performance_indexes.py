"""Add performance indexes and delivery location fields to orders

Revision ID: a1b2c3d4e5f6
Revises: f36070783bbb
Create Date: 2026-09-18 19:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'a1b2c3d4e5f6'
down_revision = 'f36070783bbb'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('orders', sa.Column('delivery_lat', sa.Float(), nullable=True))
    op.add_column('orders', sa.Column('delivery_lng', sa.Float(), nullable=True))
    op.create_index('ix_orders_farmer_id', 'orders', ['farmer_id'])
    op.create_index('ix_orders_buyer_id', 'orders', ['buyer_id'])
    op.create_index('ix_orders_status', 'orders', ['status'])
    op.create_index('ix_orders_payment_status', 'orders', ['payment_status'])
    op.create_index('ix_orders_created_at', 'orders', ['created_at'])
    op.create_index('ix_order_items_order_id', 'order_items', ['order_id'])
    op.create_index('ix_order_items_product_id', 'order_items', ['product_id'])
    op.create_index('ix_products_farmer_id', 'products', ['farmer_id'])
    op.create_index('ix_products_category', 'products', ['category'])
    op.create_index('ix_products_is_available', 'products', ['is_available'])
    op.create_index('ix_products_created_at', 'products', ['created_at'])
    op.create_index('ix_chat_messages_sender_id', 'chat_messages', ['sender_id'])
    op.create_index('ix_chat_messages_receiver_id', 'chat_messages', ['receiver_id'])
    op.create_index('ix_chat_messages_created_at', 'chat_messages', ['created_at'])
    op.create_index('ix_reviews_reviewer_id', 'reviews', ['reviewer_id'])
    op.create_index('ix_reviews_farmer_id', 'reviews', ['farmer_id'])
    op.create_index('ix_farm_logs_farmer_id', 'farm_logs', ['farmer_id'])
    op.create_index('ix_farm_logs_log_date', 'farm_logs', ['log_date'])
    op.create_index('ix_payouts_farmer_id', 'payouts', ['farmer_id'])
    op.create_index('ix_payouts_created_at', 'payouts', ['created_at'])
    op.create_index('ix_users_email', 'users', ['email'])
    op.create_index('ix_users_role', 'users', ['role'])


def downgrade():
    op.drop_index('ix_users_role', table_name='users')
    op.drop_index('ix_users_email', table_name='users')
    op.drop_index('ix_payouts_created_at', table_name='payouts')
    op.drop_index('ix_payouts_farmer_id', table_name='payouts')
    op.drop_index('ix_farm_logs_log_date', table_name='farm_logs')
    op.drop_index('ix_farm_logs_farmer_id', table_name='farm_logs')
    op.drop_index('ix_reviews_farmer_id', table_name='reviews')
    op.drop_index('ix_reviews_reviewer_id', table_name='reviews')
    op.drop_index('ix_chat_messages_created_at', table_name='chat_messages')
    op.drop_index('ix_chat_messages_receiver_id', table_name='chat_messages')
    op.drop_index('ix_chat_messages_sender_id', table_name='chat_messages')
    op.drop_index('ix_products_created_at', table_name='products')
    op.drop_index('ix_products_is_available', table_name='products')
    op.drop_index('ix_products_category', table_name='products')
    op.drop_index('ix_products_farmer_id', table_name='products')
    op.drop_index('ix_order_items_product_id', table_name='order_items')
    op.drop_index('ix_order_items_order_id', table_name='order_items')
    op.drop_index('ix_orders_created_at', table_name='orders')
    op.drop_index('ix_orders_payment_status', table_name='orders')
    op.drop_index('ix_orders_status', table_name='orders')
    op.drop_index('ix_orders_buyer_id', table_name='orders')
    op.drop_index('ix_orders_farmer_id', table_name='orders')
    op.drop_column('orders', 'delivery_lng')
    op.drop_column('orders', 'delivery_lat')
