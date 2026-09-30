"""Add RBAC, super_admin role, MFA, admin sessions and audit before/after

Revision ID: e1f2a3b4c5d6
Revises: d9e0f1a2b3c4
Create Date: 2026-09-30 19:00:00.000000

Adds the `super_admin` role value alongside the existing is_superadmin flag.
The flag is kept so accounts created before this revision keep working; both
resolve through User.is_super_admin_role.

The `before_json` / `after_json` pair on admin_audit_logs is what lets a
reviewer see what a moderation action actually changed, rather than inferring
it from a prose detail blob.
"""
from alembic import op
import sqlalchemy as sa

revision = 'e1f2a3b4c5d6'
down_revision = 'd9e0f1a2b3c4'
branch_labels = None
depends_on = None


def upgrade():
    # ── users ────────────────────────────────────────────────────────────
    op.add_column('users', sa.Column('suspension_reason', sa.String(length=255), nullable=True))
    op.add_column('users', sa.Column('suspended_until', sa.DateTime(), nullable=True))
    # admin_role_id is added after admin_roles exists, below.
    op.add_column('users', sa.Column('admin_role_id', sa.Integer(), nullable=True))

    # Existing is_superadmin holders become the new super_admin role string so
    # the two representations agree from here on.
    op.execute(
        "UPDATE users SET role = 'super_admin' WHERE is_superadmin = 1"
    )

    # ── audit before/after ───────────────────────────────────────────────
    op.add_column('admin_audit_logs', sa.Column('before_json', sa.JSON(), nullable=True))
    op.add_column('admin_audit_logs', sa.Column('after_json', sa.JSON(), nullable=True))

    # ── RBAC ─────────────────────────────────────────────────────────────
    op.create_table(
        'admin_roles',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('key', sa.String(length=50), nullable=False),
        sa.Column('name', sa.String(length=80), nullable=False),
        sa.Column('description', sa.String(length=255), nullable=True),
        sa.Column('is_system', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('key', name='uq_admin_roles_key'),
    )

    op.create_table(
        'admin_permissions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('key', sa.String(length=80), nullable=False),
        sa.Column('module', sa.String(length=40), nullable=False),
        sa.Column('action', sa.String(length=40), nullable=False),
        sa.Column('description', sa.String(length=255), nullable=True),
        sa.Column('is_delegable', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('key', name='uq_admin_permissions_key'),
    )
    op.create_index('ix_admin_permissions_module', 'admin_permissions', ['module'])

    op.create_table(
        'admin_role_permissions',
        sa.Column('role_id', sa.Integer(), nullable=False),
        sa.Column('permission_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['role_id'], ['admin_roles.id']),
        sa.ForeignKeyConstraint(['permission_id'], ['admin_permissions.id']),
        sa.PrimaryKeyConstraint('role_id', 'permission_id'),
    )

    with op.batch_alter_table('users') as batch_op:
        batch_op.create_foreign_key(
            'fk_users_admin_role_id', 'admin_roles', ['admin_role_id'], ['id'])
    op.create_index('ix_users_admin_role_id', 'users', ['admin_role_id'])
    op.create_index('ix_users_role', 'users', ['role'])

    # ── admin sessions, MFA, throttling ──────────────────────────────────
    op.create_table(
        'admin_sessions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('jti', sa.String(length=64), nullable=True),
        sa.Column('ip_address', sa.String(length=45), nullable=True),
        sa.Column('user_agent', sa.String(length=255), nullable=True),
        sa.Column('mfa_verified', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('mfa_method', sa.String(length=20), nullable=True),
        sa.Column('started_at', sa.DateTime(), nullable=False),
        sa.Column('last_seen_at', sa.DateTime(), nullable=False),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
        sa.Column('ended_at', sa.DateTime(), nullable=True),
        sa.Column('end_reason', sa.String(length=40), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_admin_sessions_user_id', 'admin_sessions', ['user_id'])
    op.create_index('ix_admin_sessions_jti', 'admin_sessions', ['jti'])

    op.create_table(
        'admin_login_attempts',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('identifier', sa.String(length=120), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('ip_address', sa.String(length=45), nullable=True),
        sa.Column('user_agent', sa.String(length=255), nullable=True),
        sa.Column('was_successful', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('failure_reason', sa.String(length=60), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_admin_login_attempts_identifier', 'admin_login_attempts',
                    ['identifier'])
    op.create_index('ix_admin_login_attempts_created_at', 'admin_login_attempts',
                    ['created_at'])

    op.create_table(
        'user_mfa',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('secret_encrypted', sa.Text(), nullable=False),
        sa.Column('is_enabled', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('last_used_code_hash', sa.String(length=64), nullable=True),
        sa.Column('recovery_codes', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('confirmed_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', name='uq_user_mfa_user_id'),
    )

    op.create_table(
        'blocked_ips',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('cidr', sa.String(length=64), nullable=False),
        sa.Column('reason', sa.String(length=255), nullable=True),
        sa.Column('created_by_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('expires_at', sa.DateTime(), nullable=True),
        sa.Column('hit_count', sa.Integer(), nullable=False, server_default='0'),
        sa.ForeignKeyConstraint(['created_by_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('cidr', name='uq_blocked_ips_cidr'),
    )


def downgrade():
    op.drop_table('blocked_ips')
    op.drop_table('user_mfa')
    op.drop_table('admin_login_attempts')
    op.drop_table('admin_sessions')

    op.drop_index('ix_users_role', table_name='users')
    op.drop_index('ix_users_admin_role_id', table_name='users')
    with op.batch_alter_table('users') as batch_op:
        batch_op.drop_constraint('fk_users_admin_role_id', type_='foreignkey')

    op.drop_table('admin_role_permissions')
    op.drop_index('ix_admin_permissions_module', table_name='admin_permissions')
    op.drop_table('admin_permissions')
    op.drop_table('admin_roles')

    op.drop_column('admin_audit_logs', 'after_json')
    op.drop_column('admin_audit_logs', 'before_json')

    op.drop_column('users', 'admin_role_id')
    op.drop_column('users', 'suspended_until')
    op.drop_column('users', 'suspension_reason')
    op.execute("UPDATE users SET role = 'admin' WHERE role = 'super_admin'")