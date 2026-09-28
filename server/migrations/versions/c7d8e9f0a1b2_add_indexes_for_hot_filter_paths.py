"""Add indexes for hot filter paths that had none

Revision ID: c7d8e9f0a1b2
Revises: f1a2b3c4d5e6
Create Date: 2026-09-28 21:30:00.000000

The earlier performance migration covered orders, order_items, products,
chat_messages, reviews, farm_logs, payouts, users.email and users.role. These
are the columns the code filters on that it did not cover.

The two that matter most:

  users.phone_number            Every inbound SMS and WhatsApp message resolves
                                its sender with a filter on this column, so the
                                webhooks were doing a sequential scan of the
                                users table on every message.
  escrow_transactions(farmer_id, status)
                                The payout balance sums released escrow per
                                farmer, filtered on both columns. Neither had
                                an index despite escrow_transactions.farmer_id
                                being a foreign key.

chat_messages(receiver_id, is_read) backs the unread badge and the per
conversation unread counts, and receipts/price observations are filtered and
ordered on every page of their respective lists.
"""
from alembic import op

# revision identifiers, used by Alembic.
revision = 'c7d8e9f0a1b2'
down_revision = 'f1a2b3c4d5e6'
branch_labels = None
depends_on = None

_INDEXES = [
    ('ix_users_phone_number', 'users', ['phone_number']),
    ('ix_users_location', 'users', ['location']),
    ('ix_escrow_transactions_farmer_id_status', 'escrow_transactions',
     ['farmer_id', 'status']),
    ('ix_escrow_transactions_status', 'escrow_transactions', ['status']),
    ('ix_escrow_transactions_buyer_id', 'escrow_transactions', ['buyer_id']),
    ('ix_escrow_events_escrow_transaction_id', 'escrow_events',
     ['escrow_transaction_id']),
    ('ix_chat_messages_receiver_is_read', 'chat_messages',
     ['receiver_id', 'is_read']),
    ('ix_reviews_created_at', 'reviews', ['created_at']),
    ('ix_receipts_buyer_id', 'receipts', ['buyer_id']),
    ('ix_receipts_farmer_id', 'receipts', ['farmer_id']),
    ('ix_market_price_observations_lookup', 'market_price_observations',
     ['category', 'market', 'observed_at']),
    ('ix_market_price_observations_observed_at', 'market_price_observations',
     ['observed_at']),
    ('ix_sms_commands_phone_direction', 'sms_commands', ['phone', 'direction']),
    ('ix_group_orders_farmer_id', 'group_orders', ['farmer_id']),
    ('ix_group_orders_status', 'group_orders', ['status']),
    ('ix_harvest_plans_farmer_id', 'harvest_plans', ['farmer_id']),
    ('ix_harvest_plans_visibility', 'harvest_plans', ['visibility']),
    ('ix_review_comments_review_id', 'review_comments', ['review_id']),
    ('ix_verification_requests_user_id', 'verification_requests', ['user_id']),
    ('ix_media_assets_uploaded_by_id', 'media_assets', ['uploaded_by_id']),
    ('ix_orders_farmer_status_created', 'orders',
     ['farmer_id', 'status', 'created_at']),
    ('ix_orders_buyer_status_created', 'orders',
     ['buyer_id', 'status', 'created_at']),
]


def upgrade():
    for name, table, columns in _INDEXES:
        op.create_index(name, table, columns)


def downgrade():
    for name, table, columns in reversed(_INDEXES):
        op.drop_index(name, table_name=table)
