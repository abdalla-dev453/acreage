"""Add preferences_json to User model

Revision ID: a9a38f136f9c
Revises: 7d2f4a9b1c3e
Create Date: 2026-09-21 00:49:36.626784

"""
from alembic import op
import sqlalchemy as sa


revision = 'a9a38f136f9c'
down_revision = '7d2f4a9b1c3e'
branch_labels = None
depends_on = None


def _index_exists(table_name, index_name):
    inspector = sa.inspect(op.get_bind())
    indexes = inspector.get_indexes(table_name)
    return any(idx['name'] == index_name for idx in indexes)


def upgrade():
    # Add preferences_json to users with a server default for existing rows
    if not _column_exists('users', 'preferences_json'):
        op.add_column('users', sa.Column('preferences_json', sa.JSON(), nullable=False, server_default='{}'))

    # Create indexes that may have been missed by the partially-applied premium migration
    table_index_pairs = [
        ('media_assets', 'ix_media_assets_uploaded_by_id', ['uploaded_by_id']),
        ('verification_requests', 'ix_verification_requests_user_id', ['user_id']),
        ('verification_requests', 'ix_verification_requests_reviewer_id', ['reviewer_id']),
        ('verification_requests', 'ix_verification_requests_evidence_media_id', ['evidence_media_id']),
        ('review_evidence', 'ix_review_evidence_review_id', ['review_id']),
        ('review_evidence', 'ix_review_evidence_media_id', ['media_id']),
        ('escrow_transactions', 'ix_escrow_transactions_buyer_id', ['buyer_id']),
        ('escrow_transactions', 'ix_escrow_transactions_farmer_id', ['farmer_id']),
        ('escrow_events', 'ix_escrow_events_transaction_id', ['escrow_transaction_id']),
        ('sms_commands', 'ix_sms_commands_phone', ['phone']),
        ('market_price_observations', 'ix_market_price_observations_product_id', ['product_id']),
        ('market_price_observations', 'ix_market_price_observations_current', ['is_current']),
        ('group_orders', 'ix_group_orders_farmer_id', ['farmer_id']),
        ('group_order_commitments', 'ix_group_order_commitments_buyer_id', ['buyer_id']),
        ('harvest_plans', 'ix_harvest_plans_farmer_id', ['farmer_id']),
        ('harvest_preorders', 'ix_harvest_preorders_buyer_id', ['buyer_id']),
        ('receipts', 'ix_receipts_buyer_id', ['buyer_id']),
        ('receipts', 'ix_receipts_farmer_id', ['farmer_id']),
    ]
    for table_name, index_name, columns in table_index_pairs:
        if _index_exists(table_name, index_name):
            op.drop_index(index_name, table_name=table_name)
        op.create_index(index_name, table_name, columns)

    # Fix allows_group_buying nullable for existing rows
    with op.batch_alter_table('products', schema=None) as batch_op:
        batch_op.alter_column('allows_group_buying',
                              existing_type=sa.BOOLEAN(),
                              nullable=True,
                              server_default=sa.text("'0'"))


def _column_exists(table_name, column_name):
    inspector = sa.inspect(op.get_bind())
    columns = [c['name'] for c in inspector.get_columns(table_name)]
    return column_name in columns


def downgrade():
    with op.batch_alter_table('users', schema=None) as batch_op:
        if _column_exists('users', 'preferences_json'):
            batch_op.drop_column('preferences_json')

    indexes_to_drop = [
        ('media_assets', 'ix_media_assets_uploaded_by_id'),
        ('verification_requests', 'ix_verification_requests_user_id'),
        ('verification_requests', 'ix_verification_requests_reviewer_id'),
        ('verification_requests', 'ix_verification_requests_evidence_media_id'),
        ('review_evidence', 'ix_review_evidence_review_id'),
        ('review_evidence', 'ix_review_evidence_media_id'),
        ('escrow_transactions', 'ix_escrow_transactions_buyer_id'),
        ('escrow_transactions', 'ix_escrow_transactions_farmer_id'),
        ('escrow_events', 'ix_escrow_events_transaction_id'),
        ('sms_commands', 'ix_sms_commands_phone'),
        ('market_price_observations', 'ix_market_price_observations_product_id'),
        ('market_price_observations', 'ix_market_price_observations_current'),
        ('group_orders', 'ix_group_orders_farmer_id'),
        ('group_order_commitments', 'ix_group_order_commitments_buyer_id'),
        ('harvest_plans', 'ix_harvest_plans_farmer_id'),
        ('harvest_preorders', 'ix_harvest_preorders_buyer_id'),
        ('receipts', 'ix_receipts_buyer_id'),
        ('receipts', 'ix_receipts_farmer_id'),
    ]
    for table_name, index_name in indexes_to_drop:
        if _index_exists(table_name, index_name):
            op.drop_index(index_name, table_name=table_name)

    with op.batch_alter_table('products', schema=None) as batch_op:
        batch_op.alter_column('allows_group_buying',
                              existing_type=sa.BOOLEAN(),
                              nullable=False,
                              server_default=sa.text("'0'"))
