"""Add superadmin, account status, token versioning and the admin audit tables

Revision ID: d9e0f1a2b3c4
Revises: c7d8e9f0a1b2
Create Date: 2026-09-28 23:00:00.000000

token_version is the important one. JWTs are stateless and live for an hour,
so freezing an account by flipping account_status alone left a frozen user
fully authenticated until their token expired. Every token now carries a 'ver'
claim and every authenticated request compares it against this column, so a
freeze or a session revocation takes effect immediately.
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'd9e0f1a2b3c4'
down_revision = 'c7d8e9f0a1b2'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('users', sa.Column(
        'is_superadmin', sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column('users', sa.Column(
        'account_status', sa.String(length=20), nullable=False, server_default='active'))
    op.add_column('users', sa.Column('frozen_reason', sa.String(length=255), nullable=True))
    op.add_column('users', sa.Column('frozen_at', sa.DateTime(), nullable=True))
    op.add_column('users', sa.Column('frozen_by_id', sa.Integer(), nullable=True))
    op.add_column('users', sa.Column(
        'token_version', sa.Integer(), nullable=False, server_default='1'))
    op.add_column('users', sa.Column('last_login_at', sa.DateTime(), nullable=True))

    with op.batch_alter_table('users') as batch_op:
        batch_op.create_foreign_key(
            'fk_users_frozen_by_id', 'users', ['frozen_by_id'], ['id'])

    # Every moderation path filters or reports on these.
    op.create_index('ix_users_account_status', 'users', ['account_status'])
    op.create_index('ix_users_is_superadmin', 'users', ['is_superadmin'])
    op.create_index('ix_users_frozen_by_id', 'users', ['frozen_by_id'])

    op.create_table(
        'admin_audit_logs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('actor_id', sa.Integer(), nullable=False),
        sa.Column('target_user_id', sa.Integer(), nullable=True),
        sa.Column('action', sa.String(length=60), nullable=False),
        sa.Column('detail_json', sa.JSON(), nullable=False),
        sa.Column('ip_address', sa.String(length=45), nullable=True),
        sa.Column('user_agent', sa.String(length=255), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['actor_id'], ['users.id']),
        sa.ForeignKeyConstraint(['target_user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_admin_audit_logs_actor_id', 'admin_audit_logs', ['actor_id'])
    op.create_index('ix_admin_audit_logs_target_user_id', 'admin_audit_logs',
                    ['target_user_id'])
    op.create_index('ix_admin_audit_logs_action', 'admin_audit_logs', ['action'])
    op.create_index('ix_admin_audit_logs_created_at', 'admin_audit_logs', ['created_at'])

    op.create_table(
        'superadmin_sessions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('ip_address', sa.String(length=45), nullable=True),
        sa.Column('user_agent', sa.String(length=255), nullable=True),
        sa.Column('was_successful', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('failure_reason', sa.String(length=120), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_superadmin_sessions_user_id', 'superadmin_sessions', ['user_id'])
    op.create_index('ix_superadmin_sessions_created_at', 'superadmin_sessions',
                    ['created_at'])


def downgrade():
    op.drop_table('superadmin_sessions')
    op.drop_table('admin_audit_logs')

    op.drop_index('ix_users_frozen_by_id', table_name='users')
    op.drop_index('ix_users_is_superadmin', table_name='users')
    op.drop_index('ix_users_account_status', table_name='users')

    with op.batch_alter_table('users') as batch_op:
        batch_op.drop_constraint('fk_users_frozen_by_id', type_='foreignkey')

    for column in ('last_login_at', 'token_version', 'frozen_by_id', 'frozen_at',
                   'frozen_reason', 'account_status', 'is_superadmin'):
        op.drop_column('users', column)
