"""Add premium commerce and trust schema

Revision ID: 7d2f4a9b1c3e
Revises: c6aaa71a121f
Create Date: 2026-09-20 19:55:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = '7d2f4a9b1c3e'
down_revision = 'c6aaa71a121f'
branch_labels = None
depends_on = None


def _inspector():
    return sa.inspect(op.get_bind())


def _table_exists(table_name):
    inspector = _inspector()
    table_names = inspector.get_table_names()
    return table_name in table_names


def _column_exists(table_name, column_name):
    inspector = _inspector()
    columns = [c['name'] for c in inspector.get_columns(table_name)]
    return column_name in columns


def _foreign_key_exists(table_name, constraint_name):
    inspector = _inspector()
    fks = inspector.get_foreign_keys(table_name)
    return any(fk.get('name') == constraint_name for fk in fks)


def _index_exists(table_name, index_name):
    inspector = _inspector()
    indexes = inspector.get_indexes(table_name)
    return any(idx['name'] == index_name for idx in indexes)


def upgrade():
    if not _table_exists('media_assets'):
        op.create_table(
            'media_assets',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('owner_type', sa.String(length=40), nullable=False),
            sa.Column('owner_id', sa.Integer(), nullable=False),
            sa.Column('kind', sa.String(length=20), nullable=False),
            sa.Column('url', sa.String(length=512), nullable=False),
            sa.Column('mime_type', sa.String(length=100), nullable=False),
            sa.Column('size_bytes', sa.Integer(), nullable=False, server_default='0'),
            sa.Column('duration_seconds', sa.Integer(), nullable=True),
            sa.Column('checksum', sa.String(length=64), nullable=True),
            sa.Column('status', sa.String(length=20), nullable=False, server_default='active'),
            sa.Column('uploaded_by_id', sa.Integer(), nullable=False),
            sa.Column('created_at', sa.DateTime(), nullable=True),
            sa.ForeignKeyConstraint(['uploaded_by_id'], ['users.id']),
            sa.PrimaryKeyConstraint('id'),
        )

    if not _table_exists('transport_quotes'):
        op.create_table(
            'transport_quotes',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('provider', sa.String(length=40), nullable=False),
            sa.Column('provider_quote_id', sa.String(length=100), nullable=True),
            sa.Column('origin', sa.String(length=255), nullable=False),
            sa.Column('destination', sa.String(length=255), nullable=False),
            sa.Column('weight_kg', sa.Float(), nullable=False),
            sa.Column('package_count', sa.Integer(), nullable=False, server_default='1'),
            sa.Column('mode', sa.String(length=30), nullable=False),
            sa.Column('carrier', sa.String(length=100), nullable=True),
            sa.Column('cost', sa.Float(), nullable=False),
            sa.Column('currency', sa.String(length=3), nullable=False, server_default='KES'),
            sa.Column('eta_minutes', sa.Integer(), nullable=True),
            sa.Column('expires_at', sa.DateTime(), nullable=True),
            sa.Column('status', sa.String(length=20), nullable=False, server_default='quoted'),
            sa.Column('metadata_json', sa.JSON(), nullable=False, server_default='{}'),
            sa.Column('created_at', sa.DateTime(), nullable=True),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('provider_quote_id'),
        )

    if not _table_exists('sms_commands'):
        op.create_table(
            'sms_commands',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('provider', sa.String(length=40), nullable=False),
            sa.Column('direction', sa.String(length=10), nullable=False, server_default='inbound'),
            sa.Column('phone', sa.String(length=20), nullable=False),
            sa.Column('command', sa.Text(), nullable=False),
            sa.Column('normalized_command', sa.String(length=255), nullable=False),
            sa.Column('idempotency_key', sa.String(length=100), nullable=False),
            sa.Column('raw_payload', sa.JSON(), nullable=False, server_default='{}'),
            sa.Column('status', sa.String(length=20), nullable=False, server_default='received'),
            sa.Column('error_message', sa.Text(), nullable=True),
            sa.Column('received_at', sa.DateTime(), nullable=False),
            sa.Column('processed_at', sa.DateTime(), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=True),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('idempotency_key'),
        )

    if not _table_exists('market_price_observations'):
        op.create_table(
            'market_price_observations',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('product_id', sa.Integer(), nullable=True),
            sa.Column('category', sa.String(length=80), nullable=True),
            sa.Column('market', sa.String(length=100), nullable=False),
            sa.Column('location', sa.String(length=255), nullable=True),
            sa.Column('price_per_unit', sa.Float(), nullable=False),
            sa.Column('unit', sa.String(length=20), nullable=False, server_default='kg'),
            sa.Column('currency', sa.String(length=3), nullable=False, server_default='KES'),
            sa.Column('source', sa.String(length=100), nullable=False),
            sa.Column('provider', sa.String(length=40), nullable=False),
            sa.Column('observed_at', sa.DateTime(), nullable=False),
            sa.Column('freshness_minutes', sa.Integer(), nullable=False, server_default='60'),
            sa.Column('is_current', sa.Boolean(), nullable=False, server_default='1'),
            sa.Column('metadata_json', sa.JSON(), nullable=False, server_default='{}'),
            sa.Column('created_at', sa.DateTime(), nullable=True),
            sa.ForeignKeyConstraint(['product_id'], ['products.id']),
            sa.PrimaryKeyConstraint('id'),
        )

    if not _table_exists('group_orders'):
        op.create_table(
            'group_orders',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('product_id', sa.Integer(), nullable=False),
            sa.Column('farmer_id', sa.Integer(), nullable=False),
            sa.Column('title', sa.String(length=150), nullable=False),
            sa.Column('description', sa.Text(), nullable=True),
            sa.Column('target_quantity', sa.Float(), nullable=False),
            sa.Column('min_quantity', sa.Float(), nullable=False),
            sa.Column('committed_quantity', sa.Float(), nullable=False, server_default='0'),
            sa.Column('unit', sa.String(length=20), nullable=False, server_default='kg'),
            sa.Column('price_per_unit', sa.Float(), nullable=False),
            sa.Column('deposit_percent', sa.Float(), nullable=False, server_default='0'),
            sa.Column('deadline', sa.DateTime(), nullable=False),
            sa.Column('status', sa.String(length=20), nullable=False, server_default='open'),
            sa.Column('delivery_location', sa.String(length=255), nullable=True),
            sa.Column('transport_mode', sa.String(length=30), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=True),
            sa.Column('updated_at', sa.DateTime(), nullable=True),
            sa.ForeignKeyConstraint(['farmer_id'], ['users.id']),
            sa.ForeignKeyConstraint(['product_id'], ['products.id']),
            sa.PrimaryKeyConstraint('id'),
        )

    if not _table_exists('harvest_plans'):
        op.create_table(
            'harvest_plans',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('farmer_id', sa.Integer(), nullable=False),
            sa.Column('product_id', sa.Integer(), nullable=True),
            sa.Column('field_name', sa.String(length=100), nullable=False),
            sa.Column('crop_name', sa.String(length=100), nullable=False),
            sa.Column('planting_date', sa.Date(), nullable=True),
            sa.Column('harvest_start', sa.Date(), nullable=False),
            sa.Column('harvest_end', sa.Date(), nullable=True),
            sa.Column('expected_quantity', sa.Float(), nullable=False),
            sa.Column('unit', sa.String(length=20), nullable=False, server_default='kg'),
            sa.Column('unit_weight_kg', sa.Float(), nullable=True),
            sa.Column('price_per_unit', sa.Float(), nullable=True),
            sa.Column('status', sa.String(length=20), nullable=False, server_default='planned'),
            sa.Column('visibility', sa.String(length=20), nullable=False, server_default='buyers'),
            sa.Column('notes', sa.Text(), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=True),
            sa.Column('updated_at', sa.DateTime(), nullable=True),
            sa.ForeignKeyConstraint(['farmer_id'], ['users.id']),
            sa.ForeignKeyConstraint(['product_id'], ['products.id']),
            sa.PrimaryKeyConstraint('id'),
        )

    if not _table_exists('harvest_preorders'):
        op.create_table(
            'harvest_preorders',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('harvest_plan_id', sa.Integer(), nullable=False),
            sa.Column('buyer_id', sa.Integer(), nullable=False),
            sa.Column('quantity', sa.Float(), nullable=False),
            sa.Column('unit', sa.String(length=20), nullable=False, server_default='kg'),
            sa.Column('deposit_amount', sa.Float(), nullable=False, server_default='0'),
            sa.Column('status', sa.String(length=20), nullable=False, server_default='pending'),
            sa.Column('created_at', sa.DateTime(), nullable=True),
            sa.Column('updated_at', sa.DateTime(), nullable=True),
            sa.ForeignKeyConstraint(['buyer_id'], ['users.id']),
            sa.ForeignKeyConstraint(['harvest_plan_id'], ['harvest_plans.id']),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('harvest_plan_id', 'buyer_id', name='uq_harvest_preorder_buyer'),
        )

    if not _table_exists('escrow_transactions'):
        op.create_table(
            'escrow_transactions',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('order_id', sa.Integer(), nullable=False),
            sa.Column('buyer_id', sa.Integer(), nullable=False),
            sa.Column('farmer_id', sa.Integer(), nullable=False),
            sa.Column('amount', sa.Float(), nullable=False),
            sa.Column('currency', sa.String(length=3), nullable=False, server_default='KES'),
            sa.Column('status', sa.String(length=30), nullable=False, server_default='pending'),
            sa.Column('provider', sa.String(length=30), nullable=False, server_default='mpesa'),
            sa.Column('provider_transaction_id', sa.String(length=100), nullable=True),
            sa.Column('checkout_request_id', sa.String(length=100), nullable=True),
            sa.Column('mpesa_receipt_number', sa.String(length=100), nullable=True),
            sa.Column('funded_at', sa.DateTime(), nullable=True),
            sa.Column('release_requested_at', sa.DateTime(), nullable=True),
            sa.Column('released_at', sa.DateTime(), nullable=True),
            sa.Column('refunded_at', sa.DateTime(), nullable=True),
            sa.Column('dispute_reason', sa.Text(), nullable=True),
            sa.Column('metadata_json', sa.JSON(), nullable=False, server_default='{}'),
            sa.Column('created_at', sa.DateTime(), nullable=True),
            sa.Column('updated_at', sa.DateTime(), nullable=True),
            sa.ForeignKeyConstraint(['buyer_id'], ['users.id']),
            sa.ForeignKeyConstraint(['farmer_id'], ['users.id']),
            sa.ForeignKeyConstraint(['order_id'], ['orders.id']),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('checkout_request_id', name='uq_escrow_checkout_request_id'),
            sa.UniqueConstraint('mpesa_receipt_number', name='uq_escrow_mpesa_receipt'),
            sa.UniqueConstraint('order_id'),
        )

    if not _table_exists('escrow_events'):
        op.create_table(
            'escrow_events',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('escrow_transaction_id', sa.Integer(), nullable=False),
            sa.Column('actor_id', sa.Integer(), nullable=True),
            sa.Column('event_type', sa.String(length=40), nullable=False),
            sa.Column('amount', sa.Float(), nullable=True),
            sa.Column('metadata_json', sa.JSON(), nullable=False, server_default='{}'),
            sa.Column('created_at', sa.DateTime(), nullable=True),
            sa.ForeignKeyConstraint(['actor_id'], ['users.id']),
            sa.ForeignKeyConstraint(['escrow_transaction_id'], ['escrow_transactions.id']),
            sa.PrimaryKeyConstraint('id'),
        )

    if not _table_exists('group_order_commitments'):
        op.create_table(
            'group_order_commitments',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('group_order_id', sa.Integer(), nullable=False),
            sa.Column('buyer_id', sa.Integer(), nullable=False),
            sa.Column('quantity', sa.Float(), nullable=False),
            sa.Column('status', sa.String(length=20), nullable=False, server_default='pending'),
            sa.Column('amount', sa.Float(), nullable=False, server_default='0'),
            sa.Column('order_id', sa.Integer(), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=True),
            sa.Column('updated_at', sa.DateTime(), nullable=True),
            sa.ForeignKeyConstraint(['buyer_id'], ['users.id']),
            sa.ForeignKeyConstraint(['group_order_id'], ['group_orders.id']),
            sa.ForeignKeyConstraint(['order_id'], ['orders.id']),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('group_order_id', 'buyer_id', name='uq_group_order_buyer'),
        )

    if not _table_exists('verification_requests'):
        op.create_table(
            'verification_requests',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('user_id', sa.Integer(), nullable=False),
            sa.Column('request_type', sa.String(length=30), nullable=False),
            sa.Column('status', sa.String(length=20), nullable=False, server_default='pending'),
            sa.Column('id_number_last4', sa.String(length=4), nullable=True),
            sa.Column('id_number_hash', sa.String(length=64), nullable=True),
            sa.Column('farm_location', sa.String(length=255), nullable=True),
            sa.Column('evidence_media_id', sa.Integer(), nullable=True),
            sa.Column('reviewer_id', sa.Integer(), nullable=True),
            sa.Column('rejection_reason', sa.Text(), nullable=True),
            sa.Column('metadata_json', sa.JSON(), nullable=False, server_default='{}'),
            sa.Column('submitted_at', sa.DateTime(), nullable=True),
            sa.Column('reviewed_at', sa.DateTime(), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=True),
            sa.ForeignKeyConstraint(['evidence_media_id'], ['media_assets.id']),
            sa.ForeignKeyConstraint(['reviewer_id'], ['users.id']),
            sa.ForeignKeyConstraint(['user_id'], ['users.id']),
            sa.PrimaryKeyConstraint('id'),
        )

    if not _table_exists('review_evidence'):
        op.create_table(
            'review_evidence',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('review_id', sa.Integer(), nullable=False),
            sa.Column('media_id', sa.Integer(), nullable=False),
            sa.Column('kind', sa.String(length=20), nullable=False, server_default='photo'),
            sa.Column('created_at', sa.DateTime(), nullable=True),
            sa.ForeignKeyConstraint(['media_id'], ['media_assets.id']),
            sa.ForeignKeyConstraint(['review_id'], ['reviews.id']),
            sa.PrimaryKeyConstraint('id'),
        )

    if not _table_exists('receipts'):
        op.create_table(
            'receipts',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('order_id', sa.Integer(), nullable=False),
            sa.Column('receipt_number', sa.String(length=40), nullable=False),
            sa.Column('buyer_id', sa.Integer(), nullable=False),
            sa.Column('farmer_id', sa.Integer(), nullable=False),
            sa.Column('currency', sa.String(length=3), nullable=False, server_default='KES'),
            sa.Column('subtotal', sa.Float(), nullable=False),
            sa.Column('transport_cost', sa.Float(), nullable=False, server_default='0'),
            sa.Column('processing_fee', sa.Float(), nullable=False, server_default='0'),
            sa.Column('discount', sa.Float(), nullable=False, server_default='0'),
            sa.Column('total_amount', sa.Float(), nullable=False),
            sa.Column('payment_reference', sa.String(length=100), nullable=True),
            sa.Column('escrow_transaction_id', sa.Integer(), nullable=True),
            sa.Column('status', sa.String(length=20), nullable=False, server_default='issued'),
            sa.Column('snapshot_json', sa.JSON(), nullable=False, server_default='{}'),
            sa.Column('issued_at', sa.DateTime(), nullable=True),
            sa.ForeignKeyConstraint(['buyer_id'], ['users.id']),
            sa.ForeignKeyConstraint(['escrow_transaction_id'], ['escrow_transactions.id']),
            sa.ForeignKeyConstraint(['farmer_id'], ['users.id']),
            sa.ForeignKeyConstraint(['order_id'], ['orders.id']),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('order_id'),
            sa.UniqueConstraint('receipt_number'),
        )

    with op.batch_alter_table('orders', schema=None) as batch_op:
        if not _column_exists('orders', 'origin_location'):
            batch_op.add_column(sa.Column('origin_location', sa.String(length=255), nullable=True))
        if not _column_exists('orders', 'quality_status'):
            batch_op.add_column(sa.Column('quality_status', sa.String(length=30), nullable=True))
        if not _column_exists('orders', 'transport_quote_id'):
            batch_op.add_column(sa.Column('transport_quote_id', sa.Integer(), nullable=True))
        if not _column_exists('orders', 'transport_cost'):
            batch_op.add_column(sa.Column('transport_cost', sa.Float(), nullable=True))
        if not _column_exists('orders', 'sms_command_id'):
            batch_op.add_column(sa.Column('sms_command_id', sa.Integer(), nullable=True))
        if not _column_exists('orders', 'group_order_id'):
            batch_op.add_column(sa.Column('group_order_id', sa.Integer(), nullable=True))
        if not _column_exists('orders', 'harvest_preorder_id'):
            batch_op.add_column(sa.Column('harvest_preorder_id', sa.Integer(), nullable=True))
        if not _column_exists('orders', 'price_snapshot_json'):
            batch_op.add_column(sa.Column('price_snapshot_json', sa.JSON(), nullable=True))
        if not _foreign_key_exists('orders', 'fk_orders_transport_quote_id'):
            batch_op.create_foreign_key('fk_orders_transport_quote_id', 'transport_quotes', ['transport_quote_id'], ['id'])
        if not _foreign_key_exists('orders', 'fk_orders_sms_command_id'):
            batch_op.create_foreign_key('fk_orders_sms_command_id', 'sms_commands', ['sms_command_id'], ['id'])
        if not _foreign_key_exists('orders', 'fk_orders_group_order_id'):
            batch_op.create_foreign_key('fk_orders_group_order_id', 'group_orders', ['group_order_id'], ['id'])
        if not _foreign_key_exists('orders', 'fk_orders_harvest_preorder_id'):
            batch_op.create_foreign_key('fk_orders_harvest_preorder_id', 'harvest_preorders', ['harvest_preorder_id'], ['id'])

    with op.batch_alter_table('order_items', schema=None) as batch_op:
        if not _column_exists('order_items', 'unit'):
            batch_op.add_column(sa.Column('unit', sa.String(length=20), nullable=True))
        if not _column_exists('order_items', 'unit_weight_kg'):
            batch_op.add_column(sa.Column('unit_weight_kg', sa.Float(), nullable=True))
        if not _column_exists('order_items', 'line_total'):
            batch_op.add_column(sa.Column('line_total', sa.Float(), nullable=True))

    with op.batch_alter_table('payouts', schema=None) as batch_op:
        if not _column_exists('payouts', 'escrow_transaction_id'):
            batch_op.add_column(sa.Column('escrow_transaction_id', sa.Integer(), nullable=True))
        if not _foreign_key_exists('payouts', 'fk_payouts_escrow_transaction_id'):
            batch_op.create_foreign_key('fk_payouts_escrow_transaction_id', 'escrow_transactions', ['escrow_transaction_id'], ['id'])

    with op.batch_alter_table('products', schema=None) as batch_op:
        if not _column_exists('products', 'unit_weight_kg'):
            batch_op.add_column(sa.Column('unit_weight_kg', sa.Float(), nullable=True))
        if not _column_exists('products', 'reserved_quantity'):
            batch_op.add_column(sa.Column('reserved_quantity', sa.Float(), nullable=False, server_default='0'))
        if not _column_exists('products', 'video_url'):
            batch_op.add_column(sa.Column('video_url', sa.String(length=512), nullable=True))
        if not _column_exists('products', 'video_duration_seconds'):
            batch_op.add_column(sa.Column('video_duration_seconds', sa.Integer(), nullable=True))
        if not _column_exists('products', 'allows_group_buying'):
            batch_op.add_column(sa.Column('allows_group_buying', sa.Boolean(), nullable=False, server_default='0'))
        if not _column_exists('products', 'quality_score'):
            batch_op.add_column(sa.Column('quality_score', sa.Float(), nullable=True))

    with op.batch_alter_table('reviews', schema=None) as batch_op:
        if not _column_exists('reviews', 'order_id'):
            batch_op.add_column(sa.Column('order_id', sa.Integer(), nullable=True))
        if not _foreign_key_exists('reviews', 'fk_reviews_order_id'):
            batch_op.create_foreign_key('fk_reviews_order_id', 'orders', ['order_id'], ['id'])
        if not _column_exists('reviews', 'quality_freshness'):
            batch_op.add_column(sa.Column('quality_freshness', sa.Integer(), nullable=True))
        if not _column_exists('reviews', 'quality_accuracy'):
            batch_op.add_column(sa.Column('quality_accuracy', sa.Integer(), nullable=True))
        if not _column_exists('reviews', 'quality_packaging'):
            batch_op.add_column(sa.Column('quality_packaging', sa.Integer(), nullable=True))
        if not _column_exists('reviews', 'quality_delivery'):
            batch_op.add_column(sa.Column('quality_delivery', sa.Integer(), nullable=True))
        if not _column_exists('reviews', 'quality_communication'):
            batch_op.add_column(sa.Column('quality_communication', sa.Integer(), nullable=True))
        if not _column_exists('reviews', 'quality_score'):
            batch_op.add_column(sa.Column('quality_score', sa.Float(), nullable=True))
        if not _column_exists('reviews', 'verified_purchase'):
            batch_op.add_column(sa.Column('verified_purchase', sa.Boolean(), nullable=False, server_default='0'))

    with op.batch_alter_table('users', schema=None) as batch_op:
        if not _column_exists('users', 'verification_status'):
            batch_op.add_column(sa.Column('verification_status', sa.String(length=20), nullable=False, server_default='unverified'))
        if not _column_exists('users', 'verification_badge'):
            batch_op.add_column(sa.Column('verification_badge', sa.String(length=50), nullable=True))
        if not _column_exists('users', 'sms_opt_in'):
            batch_op.add_column(sa.Column('sms_opt_in', sa.Boolean(), nullable=False, server_default='0'))
        if not _column_exists('users', 'sms_phone_verified'):
            batch_op.add_column(sa.Column('sms_phone_verified', sa.Boolean(), nullable=False, server_default='0'))
        if not _column_exists('users', 'quality_score'):
            batch_op.add_column(sa.Column('quality_score', sa.Float(), nullable=True))

    with op.batch_alter_table('farm_logs', schema=None) as batch_op:
        if not _column_exists('farm_logs', 'harvest_plan_id'):
            batch_op.add_column(sa.Column('harvest_plan_id', sa.Integer(), nullable=True))
        if not _foreign_key_exists('farm_logs', 'fk_farm_logs_harvest_plan_id'):
            batch_op.create_foreign_key('fk_farm_logs_harvest_plan_id', 'harvest_plans', ['harvest_plan_id'], ['id'])

    if _table_exists('media_assets') and not _index_exists('media_assets', 'ix_media_assets_uploaded_by_id'):
        op.create_index('ix_media_assets_uploaded_by_id', 'media_assets', ['uploaded_by_id'])
    if _table_exists('verification_requests') and not _index_exists('verification_requests', 'ix_verification_requests_user_id'):
        op.create_index('ix_verification_requests_user_id', 'verification_requests', ['user_id'])
    if _table_exists('verification_requests') and not _index_exists('verification_requests', 'ix_verification_requests_reviewer_id'):
        op.create_index('ix_verification_requests_reviewer_id', 'verification_requests', ['reviewer_id'])
    if _table_exists('verification_requests') and not _index_exists('verification_requests', 'ix_verification_requests_evidence_media_id'):
        op.create_index('ix_verification_requests_evidence_media_id', 'verification_requests', ['evidence_media_id'])
    if _table_exists('review_evidence') and not _index_exists('review_evidence', 'ix_review_evidence_review_id'):
        op.create_index('ix_review_evidence_review_id', 'review_evidence', ['review_id'])
    if _table_exists('review_evidence') and not _index_exists('review_evidence', 'ix_review_evidence_media_id'):
        op.create_index('ix_review_evidence_media_id', 'review_evidence', ['media_id'])
    if _table_exists('escrow_transactions') and not _index_exists('escrow_transactions', 'ix_escrow_transactions_buyer_id'):
        op.create_index('ix_escrow_transactions_buyer_id', 'escrow_transactions', ['buyer_id'])
    if _table_exists('escrow_transactions') and not _index_exists('escrow_transactions', 'ix_escrow_transactions_farmer_id'):
        op.create_index('ix_escrow_transactions_farmer_id', 'escrow_transactions', ['farmer_id'])
    if _table_exists('escrow_events') and not _index_exists('escrow_events', 'ix_escrow_events_transaction_id'):
        op.create_index('ix_escrow_events_transaction_id', 'escrow_events', ['escrow_transaction_id'])
    if _table_exists('sms_commands') and not _index_exists('sms_commands', 'ix_sms_commands_phone'):
        op.create_index('ix_sms_commands_phone', 'sms_commands', ['phone'])
    if _table_exists('market_price_observations') and not _index_exists('market_price_observations', 'ix_market_price_observations_product_id'):
        op.create_index('ix_market_price_observations_product_id', 'market_price_observations', ['product_id'])
    if _table_exists('market_price_observations') and not _index_exists('market_price_observations', 'ix_market_price_observations_current'):
        op.create_index('ix_market_price_observations_current', 'market_price_observations', ['is_current'])
    if _table_exists('group_orders') and not _index_exists('group_orders', 'ix_group_orders_farmer_id'):
        op.create_index('ix_group_orders_farmer_id', 'group_orders', ['farmer_id'])
    if _table_exists('group_order_commitments') and not _index_exists('group_order_commitments', 'ix_group_order_commitments_buyer_id'):
        op.create_index('ix_group_order_commitments_buyer_id', 'group_order_commitments', ['buyer_id'])
    if _table_exists('harvest_plans') and not _index_exists('harvest_plans', 'ix_harvest_plans_farmer_id'):
        op.create_index('ix_harvest_plans_farmer_id', 'harvest_plans', ['farmer_id'])
    if _table_exists('harvest_preorders') and not _index_exists('harvest_preorders', 'ix_harvest_preorders_buyer_id'):
        op.create_index('ix_harvest_preorders_buyer_id', 'harvest_preorders', ['buyer_id'])
    if _table_exists('receipts') and not _index_exists('receipts', 'ix_receipts_buyer_id'):
        op.create_index('ix_receipts_buyer_id', 'receipts', ['buyer_id'])
    if _table_exists('receipts') and not _index_exists('receipts', 'ix_receipts_farmer_id'):
        op.create_index('ix_receipts_farmer_id', 'receipts', ['farmer_id'])


def downgrade():
    if _index_exists('receipts', 'ix_receipts_farmer_id'):
        op.drop_index('ix_receipts_farmer_id', table_name='receipts')
    if _index_exists('receipts', 'ix_receipts_buyer_id'):
        op.drop_index('ix_receipts_buyer_id', table_name='receipts')
    if _index_exists('harvest_preorders', 'ix_harvest_preorders_buyer_id'):
        op.drop_index('ix_harvest_preorders_buyer_id', table_name='harvest_preorders')
    if _index_exists('harvest_plans', 'ix_harvest_plans_farmer_id'):
        op.drop_index('ix_harvest_plans_farmer_id', table_name='harvest_plans')
    if _index_exists('group_order_commitments', 'ix_group_order_commitments_buyer_id'):
        op.drop_index('ix_group_order_commitments_buyer_id', table_name='group_order_commitments')
    if _index_exists('group_orders', 'ix_group_orders_farmer_id'):
        op.drop_index('ix_group_orders_farmer_id', table_name='group_orders')
    if _index_exists('market_price_observations', 'ix_market_price_observations_current'):
        op.drop_index('ix_market_price_observations_current', table_name='market_price_observations')
    if _index_exists('market_price_observations', 'ix_market_price_observations_product_id'):
        op.drop_index('ix_market_price_observations_product_id', table_name='market_price_observations')
    if _index_exists('sms_commands', 'ix_sms_commands_phone'):
        op.drop_index('ix_sms_commands_phone', table_name='sms_commands')
    if _index_exists('escrow_events', 'ix_escrow_events_transaction_id'):
        op.drop_index('ix_escrow_events_transaction_id', table_name='escrow_events')
    if _index_exists('escrow_transactions', 'ix_escrow_transactions_farmer_id'):
        op.drop_index('ix_escrow_transactions_farmer_id', table_name='escrow_transactions')
    if _index_exists('escrow_transactions', 'ix_escrow_transactions_buyer_id'):
        op.drop_index('ix_escrow_transactions_buyer_id', table_name='escrow_transactions')
    if _index_exists('review_evidence', 'ix_review_evidence_media_id'):
        op.drop_index('ix_review_evidence_media_id', table_name='review_evidence')
    if _index_exists('review_evidence', 'ix_review_evidence_review_id'):
        op.drop_index('ix_review_evidence_review_id', table_name='review_evidence')
    if _index_exists('verification_requests', 'ix_verification_requests_evidence_media_id'):
        op.drop_index('ix_verification_requests_evidence_media_id', table_name='verification_requests')
    if _index_exists('verification_requests', 'ix_verification_requests_reviewer_id'):
        op.drop_index('ix_verification_requests_reviewer_id', table_name='verification_requests')
    if _index_exists('verification_requests', 'ix_verification_requests_user_id'):
        op.drop_index('ix_verification_requests_user_id', table_name='verification_requests')
    if _index_exists('media_assets', 'ix_media_assets_uploaded_by_id'):
        op.drop_index('ix_media_assets_uploaded_by_id', table_name='media_assets')

    with op.batch_alter_table('orders', schema=None) as batch_op:
        if _foreign_key_exists('orders', 'fk_orders_harvest_preorder_id'):
            batch_op.drop_constraint('fk_orders_harvest_preorder_id', type_='foreignkey')
        if _foreign_key_exists('orders', 'fk_orders_group_order_id'):
            batch_op.drop_constraint('fk_orders_group_order_id', type_='foreignkey')
        if _foreign_key_exists('orders', 'fk_orders_sms_command_id'):
            batch_op.drop_constraint('fk_orders_sms_command_id', type_='foreignkey')
        if _foreign_key_exists('orders', 'fk_orders_transport_quote_id'):
            batch_op.drop_constraint('fk_orders_transport_quote_id', type_='foreignkey')
        if _column_exists('orders', 'price_snapshot_json'):
            batch_op.drop_column('price_snapshot_json')
        if _column_exists('orders', 'harvest_preorder_id'):
            batch_op.drop_column('harvest_preorder_id')
        if _column_exists('orders', 'group_order_id'):
            batch_op.drop_column('group_order_id')
        if _column_exists('orders', 'sms_command_id'):
            batch_op.drop_column('sms_command_id')
        if _column_exists('orders', 'transport_cost'):
            batch_op.drop_column('transport_cost')
        if _column_exists('orders', 'transport_quote_id'):
            batch_op.drop_column('transport_quote_id')
        if _column_exists('orders', 'quality_status'):
            batch_op.drop_column('quality_status')
        if _column_exists('orders', 'origin_location'):
            batch_op.drop_column('origin_location')

    with op.batch_alter_table('order_items', schema=None) as batch_op:
        if _column_exists('order_items', 'line_total'):
            batch_op.drop_column('line_total')
        if _column_exists('order_items', 'unit_weight_kg'):
            batch_op.drop_column('unit_weight_kg')
        if _column_exists('order_items', 'unit'):
            batch_op.drop_column('unit')

    with op.batch_alter_table('payouts', schema=None) as batch_op:
        if _foreign_key_exists('payouts', 'fk_payouts_escrow_transaction_id'):
            batch_op.drop_constraint('fk_payouts_escrow_transaction_id', type_='foreignkey')
        if _column_exists('payouts', 'escrow_transaction_id'):
            batch_op.drop_column('escrow_transaction_id')

    with op.batch_alter_table('products', schema=None) as batch_op:
        if _column_exists('products', 'quality_score'):
            batch_op.drop_column('quality_score')
        if _column_exists('products', 'allows_group_buying'):
            batch_op.drop_column('allows_group_buying')
        if _column_exists('products', 'video_duration_seconds'):
            batch_op.drop_column('video_duration_seconds')
        if _column_exists('products', 'video_url'):
            batch_op.drop_column('video_url')
        if _column_exists('products', 'reserved_quantity'):
            batch_op.drop_column('reserved_quantity')
        if _column_exists('products', 'unit_weight_kg'):
            batch_op.drop_column('unit_weight_kg')

    with op.batch_alter_table('reviews', schema=None) as batch_op:
        if _foreign_key_exists('reviews', 'fk_reviews_order_id'):
            batch_op.drop_constraint('fk_reviews_order_id', type_='foreignkey')
        if _column_exists('reviews', 'verified_purchase'):
            batch_op.drop_column('verified_purchase')
        if _column_exists('reviews', 'quality_score'):
            batch_op.drop_column('quality_score')
        if _column_exists('reviews', 'quality_communication'):
            batch_op.drop_column('quality_communication')
        if _column_exists('reviews', 'quality_delivery'):
            batch_op.drop_column('quality_delivery')
        if _column_exists('reviews', 'quality_packaging'):
            batch_op.drop_column('quality_packaging')
        if _column_exists('reviews', 'quality_accuracy'):
            batch_op.drop_column('quality_accuracy')
        if _column_exists('reviews', 'quality_freshness'):
            batch_op.drop_column('quality_freshness')
        if _column_exists('reviews', 'order_id'):
            batch_op.drop_column('order_id')

    with op.batch_alter_table('users', schema=None) as batch_op:
        if _column_exists('users', 'quality_score'):
            batch_op.drop_column('quality_score')
        if _column_exists('users', 'sms_phone_verified'):
            batch_op.drop_column('sms_phone_verified')
        if _column_exists('users', 'sms_opt_in'):
            batch_op.drop_column('sms_opt_in')
        if _column_exists('users', 'verification_badge'):
            batch_op.drop_column('verification_badge')
        if _column_exists('users', 'verification_status'):
            batch_op.drop_column('verification_status')

    with op.batch_alter_table('farm_logs', schema=None) as batch_op:
        if _foreign_key_exists('farm_logs', 'fk_farm_logs_harvest_plan_id'):
            batch_op.drop_constraint('fk_farm_logs_harvest_plan_id', type_='foreignkey')
        if _column_exists('farm_logs', 'harvest_plan_id'):
            batch_op.drop_column('harvest_plan_id')

    if _table_exists('receipts'):
        op.drop_table('receipts')
    if _table_exists('review_evidence'):
        op.drop_table('review_evidence')
    if _table_exists('verification_requests'):
        op.drop_table('verification_requests')
    if _table_exists('group_order_commitments'):
        op.drop_table('group_order_commitments')
    if _table_exists('escrow_events'):
        op.drop_table('escrow_events')
    if _table_exists('escrow_transactions'):
        op.drop_table('escrow_transactions')
    if _table_exists('harvest_preorders'):
        op.drop_table('harvest_preorders')
    if _table_exists('harvest_plans'):
        op.drop_table('harvest_plans')
    if _table_exists('group_orders'):
        op.drop_table('group_orders')
    if _table_exists('market_price_observations'):
        op.drop_table('market_price_observations')
    if _table_exists('sms_commands'):
        op.drop_table('sms_commands')
    if _table_exists('transport_quotes'):
        op.drop_table('transport_quotes')
    if _table_exists('media_assets'):
        op.drop_table('media_assets')
