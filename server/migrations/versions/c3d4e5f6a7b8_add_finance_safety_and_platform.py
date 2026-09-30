"""Finance, trust & safety, and platform configuration for phases 3-5

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-09-30 21:00:000000

One migration for the remaining phases so the whole console is coherent rather
than three parallel schema changes.

  disputes            a contested escrow, with the decision and who made it
  platform_settings   key/value configuration: commission, maintenance mode,
                      feature toggles. Values are JSON so a rate can be stored
                      without a column per knob.
  content_pages       editable legal and marketing copy, so changing a privacy
                      policy is an admin action rather than a redeploy
  announcements       outbound campaigns with segment targeting
  notification_deliveries
                      per-recipient delivery outcome, so a campaign reports
                      real delivery rather than a single success flag
  moderation_keywords the scam and abuse word list
  user_mutes          blocks a user from messaging without deleting history
  support_tickets / support_messages
                      the complaints inbox
"""
from alembic import op
import sqlalchemy as sa

revision = 'c3d4e5f6a7b8'
down_revision = 'b2c3d4e5f6a7'
branch_labels = None
depends_on = None


def upgrade():
    # ── Disputes ──────────────────────────────────────────────────────────
    op.create_table(
        'disputes',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('escrow_transaction_id', sa.Integer(), nullable=True),
        sa.Column('order_id', sa.Integer(), nullable=True),
        sa.Column('opened_by_id', sa.Integer(), nullable=True),
        sa.Column('against_user_id', sa.Integer(), nullable=True),
        sa.Column('reason', sa.String(length=255), nullable=False),
        sa.Column('details', sa.Text(), nullable=True),
        # 'open' | 'awaiting_evidence' | 'resolved'
        sa.Column('status', sa.String(length=30), nullable=False,
                  server_default='open'),
        # 'refund_buyer' | 'release_farmer' | 'split' | 'no_action'
        sa.Column('decision', sa.String(length=30), nullable=True),
        # Amount to the farmer when the decision is a split. Null otherwise,
        # so the column never disagrees with `decision`.
        sa.Column('resolution_amount', sa.Float(), nullable=True),
        sa.Column('resolution_note', sa.Text(), nullable=True),
        sa.Column('evidence_json', sa.JSON(), nullable=True),
        sa.Column('resolved_by_id', sa.Integer(), nullable=True),
        sa.Column('resolved_at', sa.DateTime(), nullable=True),
        sa.Column('opened_at', sa.DateTime(), nullable=False,
                  server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['escrow_transaction_id'],
                                ['escrow_transactions.id']),
        sa.ForeignKeyConstraint(['order_id'], ['orders.id']),
        sa.ForeignKeyConstraint(['opened_by_id'], ['users.id']),
        sa.ForeignKeyConstraint(['against_user_id'], ['users.id']),
        sa.ForeignKeyConstraint(['resolved_by_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    # The queue filters on status and orders by age.
    op.create_index('ix_disputes_status', 'disputes', ['status'])
    op.create_index('ix_disputes_escrow_transaction_id', 'disputes',
                    ['escrow_transaction_id'])
    op.create_index('ix_disputes_against_user_id', 'disputes', ['against_user_id'])

    # ── Platform settings ─────────────────────────────────────────────────
    op.create_table(
        'platform_settings',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('key', sa.String(length=80), unique=True, nullable=False),
        # JSON, because a single table holds rates, flags and strings and a
        # column per knob would be unmaintainable.
        sa.Column('value_json', sa.JSON(), nullable=True),
        sa.Column('category', sa.String(length=40), nullable=False,
                  server_default='general'),
        sa.Column('description', sa.String(length=255), nullable=True),
        # Public settings are safe to expose to the storefront; the rest must
        # never leave the admin API.
        sa.Column('is_public', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('is_secret', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('updated_by_id', sa.Integer(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['updated_by_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_platform_settings_category', 'platform_settings',
                    ['category'])

    # ── Content pages ─────────────────────────────────────────────────────
    op.create_table(
        'content_pages',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('slug', sa.String(length=60), unique=True, nullable=False),
        sa.Column('title', sa.String(length=160), nullable=False),
        # Markdown. Rendering is the storefront's business; storing the source
        # keeps formatting round-trippable.
        sa.Column('body', sa.Text(), nullable=False),
        sa.Column('summary', sa.String(length=255), nullable=True),
        sa.Column('is_published', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('updated_by_id', sa.Integer(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['updated_by_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )

    # ── Campaigns ─────────────────────────────────────────────────────────
    op.create_table(
        'announcements',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(length=160), nullable=False),
        sa.Column('body', sa.Text(), nullable=False),
        # 'in_app' | 'sms' | 'email'
        sa.Column('channel', sa.String(length=20), nullable=False,
                  server_default='in_app'),
        # {"roles": ["farmer"], "location": "Nakuru", "unverified_only": true}
        sa.Column('segment_json', sa.JSON(), nullable=True),
        # 'draft' | 'scheduled' | 'sending' | 'sent' | 'cancelled'
        sa.Column('status', sa.String(length=20), nullable=False,
                  server_default='draft'),
        sa.Column('scheduled_at', sa.DateTime(), nullable=True),
        sa.Column('sent_at', sa.DateTime(), nullable=True),
        sa.Column('recipient_count', sa.Integer(), nullable=False,
                  server_default='0'),
        sa.Column('delivered_count', sa.Integer(), nullable=False,
                  server_default='0'),
        sa.Column('failed_count', sa.Integer(), nullable=False,
                  server_default='0'),
        sa.Column('created_by_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['created_by_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_announcements_status', 'announcements', ['status'])

    op.create_table(
        'notification_deliveries',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('announcement_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('phone_number', sa.String(length=20), nullable=True),
        # 'queued' | 'sent' | 'delivered' | 'failed'
        sa.Column('status', sa.String(length=20), nullable=False,
                  server_default='queued'),
        sa.Column('error_message', sa.String(length=255), nullable=True),
        sa.Column('cost', sa.Float(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['announcement_id'], ['announcements.id']),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
        # One delivery per recipient per campaign; sending twice must not
        # create two rows.
        sa.UniqueConstraint('announcement_id', 'user_id',
                            name='uq_notification_deliveries_campaign_user'),
    )
    op.create_index('ix_notification_deliveries_status', 'notification_deliveries',
                    ['status'])

    # ── Moderation ────────────────────────────────────────────────────────
    op.create_table(
        'moderation_keywords',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('phrase', sa.String(length=120), nullable=False),
        # 'scam' | 'abuse' | 'off_platform' | 'spam'
        sa.Column('category', sa.String(length=30), nullable=False,
                  server_default='scam'),
        # 'low' | 'medium' | 'high' — 'high' escalates to the top of the queue.
        sa.Column('severity', sa.String(length=20), nullable=False,
                  server_default='medium'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('hit_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_by_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['created_by_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('phrase', name='uq_moderation_keywords_phrase'),
    )

    op.create_table(
        'user_mutes',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('reason', sa.String(length=255), nullable=True),
        sa.Column('created_by_id', sa.Integer(), nullable=True),
        sa.Column('expires_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.ForeignKeyConstraint(['created_by_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_user_mutes_user_id', 'user_mutes', ['user_id'])

    # ── Support ─────────────────────────────────────────────────────────
    op.create_table(
        'support_tickets',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('subject', sa.String(length=160), nullable=False),
        sa.Column('body', sa.Text(), nullable=False),
        sa.Column('priority', sa.String(length=20), nullable=False,
                  server_default='normal'),
        sa.Column('status', sa.String(length=20), nullable=False,
                  server_default='open'),
        sa.Column('assigned_to_id', sa.Integer(), nullable=True),
        sa.Column('resolution_note', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.ForeignKeyConstraint(['assigned_to_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    # The inbox filters on status and orders by recency.
    op.create_index('ix_support_tickets_status', 'support_tickets', ['status'])
    op.create_index('ix_support_tickets_updated_at', 'support_tickets',
                    ['updated_at'])

    op.create_table(
        'support_messages',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('ticket_id', sa.Integer(), nullable=False),
        sa.Column('author_id', sa.Integer(), nullable=True),
        sa.Column('body', sa.Text(), nullable=False),
        sa.Column('is_staff', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['ticket_id'], ['support_tickets.id']),
        sa.ForeignKeyConstraint(['author_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    # Messages are always read in order within one ticket.
    op.create_index('ix_support_messages_ticket_id', 'support_messages',
                    ['ticket_id'])


def downgrade():
    op.drop_index('ix_support_messages_ticket_id', table_name='support_messages')
    op.drop_table('support_messages')
    op.drop_index('ix_support_tickets_updated_at', table_name='support_tickets')
    op.drop_index('ix_support_tickets_status', table_name='support_tickets')
    op.drop_table('support_tickets')
    op.drop_index('ix_user_mutes_user_id', table_name='user_mutes')
    op.drop_table('user_mutes')
    op.drop_table('moderation_keywords')
    op.drop_index('ix_notification_deliveries_status',
                  table_name='notification_deliveries')
    op.drop_table('notification_deliveries')
    op.drop_index('ix_announcements_status', table_name='announcements')
    op.drop_table('announcements')
    op.drop_table('content_pages')
    op.drop_index('ix_platform_settings_category', table_name='platform_settings')
    op.drop_table('platform_settings')
    op.drop_index('ix_disputes_against_user_id', table_name='disputes')
    op.drop_index('ix_disputes_escrow_transaction_id', table_name='disputes')
    op.drop_index('ix_disputes_status', table_name='disputes')
    op.drop_table('disputes')