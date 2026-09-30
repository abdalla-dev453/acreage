"""Add marketplace moderation, categories, flags and content reports

Revision ID: b2c3d4e5f6a7
Revises: e1f2a3b4c5d6
Create Date: 2026-09-30 20:00:00.000000

Products had no moderation state at all: `is_available` is the farmer's own
switch, so a listing could not be held for review without the farmer noticing
and un-hiding it. `moderation_status` is separate and admin-owned, so a listing
can be quarantined independently of whether the farmer still offers it.

'flagged' is the state that blocks publication. That matters because a listing
suspended by moderation is a statement about trust, not availability.
"""
from alembic import op
import sqlalchemy as sa

revision = 'b2c3d4e5f6a7'
down_revision = 'e1f2a3b4c5d6'
branch_labels = None
depends_on = None


def upgrade():
    # ── products ──────────────────────────────────────────────────────────
    # 'draft' | 'pending' | 'approved' | 'rejected' | 'flagged'
    op.add_column('products', sa.Column(
        'moderation_status', sa.String(length=20), nullable=False,
        server_default='approved'))
    op.add_column('products', sa.Column('is_featured', sa.Boolean(),
                                        nullable=False, server_default=sa.false()))
    op.add_column('products', sa.Column('moderation_note', sa.Text(), nullable=True))
    op.add_column('products', sa.Column('moderated_by_id', sa.Integer(), nullable=True))
    op.add_column('products', sa.Column('moderated_at', sa.DateTime(), nullable=True))
    op.add_column('products', sa.Column('view_count', sa.Integer(),
                                        nullable=False, server_default='0'))
    op.add_column('products', sa.Column('report_count', sa.Integer(),
                                        nullable=False, server_default='0'))
    with op.batch_alter_table('products') as batch_op:
        batch_op.create_foreign_key(
            'fk_products_moderated_by_id', 'users', ['moderated_by_id'], ['id'])

    # Every admin listing view filters and sorts on these.
    op.create_index('ix_products_moderation_status', 'products', ['moderation_status'])
    op.create_index('ix_products_is_featured', 'products', ['is_featured'])
    op.create_index('ix_products_farmer_moderation', 'products',
                    ['farmer_id', 'moderation_status'])

    # Existing listings predate moderation and were all live and acceptable.
    op.execute("UPDATE products SET moderation_status = 'approved' "
               "WHERE moderation_status = 'pending'")

    # ── categories ────────────────────────────────────────────────────────
    op.create_table(
        'product_categories',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('slug', sa.String(length=60), nullable=False),
        sa.Column('name', sa.String(length=60), nullable=False),
        sa.Column('description', sa.String(length=255), nullable=True),
        sa.Column('default_unit', sa.String(length=20), nullable=True),
        sa.Column('icon', sa.String(length=40), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('sort_order', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('slug', name='uq_product_categories_slug'),
    )

    # ── flags and reports ─────────────────────────────────────────────────
    op.create_table(
        'user_flags',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('category', sa.String(length=40), nullable=False),
        sa.Column('reason', sa.String(length=255), nullable=False),
        sa.Column('severity', sa.String(length=20), nullable=False,
                  server_default='medium'),
        sa.Column('raised_by_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('cleared_by_id', sa.Integer(), nullable=True),
        sa.Column('cleared_at', sa.DateTime(), nullable=True),
        sa.Column('cleared_reason', sa.String(length=255), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.ForeignKeyConstraint(['raised_by_id'], ['users.id']),
        sa.ForeignKeyConstraint(['cleared_by_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_user_flags_user_id', 'user_flags', ['user_id'])
    op.create_index('ix_user_flags_cleared_at', 'user_flags', ['cleared_at'])

    op.create_table(
        'content_reports',
        sa.Column('id', sa.Integer(), nullable=False),
        # 'product' | 'user' | 'review' | 'chat_message'
        sa.Column('target_type', sa.String(length=20), nullable=False),
        sa.Column('target_id', sa.Integer(), nullable=False),
        sa.Column('reason', sa.String(length=255), nullable=False),
        sa.Column('category', sa.String(length=40), nullable=False,
                  server_default='other'),
        sa.Column('details', sa.Text(), nullable=True),
        # 'open' | 'actioned' | 'dismissed'
        sa.Column('status', sa.String(length=20), nullable=False,
                  server_default='open'),
        sa.Column('reporter_user_id', sa.Integer(), nullable=True),
        sa.Column('resolved_by_id', sa.Integer(), nullable=True),
        sa.Column('resolved_at', sa.DateTime(), nullable=True),
        sa.Column('resolution_note', sa.String(length=255), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['reporter_user_id'], ['users.id']),
        sa.ForeignKeyConstraint(['resolved_by_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    # The moderation queue filters on status and orders by age.
    op.create_index('ix_content_reports_status', 'content_reports', ['status'])
    op.create_index('ix_content_reports_target', 'content_reports',
                    ['target_type', 'target_id'])
    op.create_index('ix_content_reports_created_at', 'content_reports', ['created_at'])

    # ── order intervention ────────────────────────────────────────────────
    op.add_column('orders', sa.Column('admin_note', sa.Text(), nullable=True))
    op.add_column('orders', sa.Column('intervened_by_id', sa.Integer(), nullable=True))
    op.add_column('orders', sa.Column('intervened_at', sa.DateTime(), nullable=True))
    with op.batch_alter_table('orders') as batch_op:
        batch_op.create_foreign_key(
            'fk_orders_intervened_by_id', 'users', ['intervened_by_id'], ['id'])
    op.create_index('ix_orders_status_created', 'orders', ['status', 'created_at'])
    op.create_index('ix_orders_payment_status', 'orders', ['payment_status'])


def downgrade():
    with op.batch_alter_table('orders') as batch_op:
        batch_op.drop_constraint('fk_orders_intervened_by_id', type_='foreignkey')
    op.drop_index('ix_orders_payment_status', table_name='orders')
    op.drop_index('ix_orders_status_created', table_name='orders')
    op.drop_column('orders', 'intervened_at')
    op.drop_column('orders', 'intervened_by_id')
    op.drop_column('orders', 'admin_note')

    op.drop_index('ix_content_reports_created_at', table_name='content_reports')
    op.drop_index('ix_content_reports_target', table_name='content_reports')
    op.drop_index('ix_content_reports_status', table_name='content_reports')
    op.drop_table('content_reports')

    op.drop_index('ix_user_flags_cleared_at', table_name='user_flags')
    op.drop_index('ix_user_flags_user_id', table_name='user_flags')
    op.drop_table('user_flags')

    op.drop_table('product_categories')

    with op.batch_alter_table('products') as batch_op:
        batch_op.drop_constraint('fk_products_moderated_by_id', type_='foreignkey')
    op.drop_index('ix_products_farmer_moderation', table_name='products')
    op.drop_index('ix_products_is_featured', table_name='products')
    op.drop_index('ix_products_moderation_status', table_name='products')
    for column in ('report_count', 'view_count', 'moderated_at',
                   'moderated_by_id', 'moderation_note', 'is_featured',
                   'moderation_status'):
        op.drop_column('products', column)