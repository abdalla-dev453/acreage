"""The permission catalog and the checks that consume it.

`PERMISSION_CATALOG` is the single list of everything an administrator can do.
It is seeded into the `admin_permissions` table and grouped by module, so the
UI can render a permission matrix and a new capability only has to be added
here plus to the route that enforces it.

Permission keys are `module.action`. A check reads as prose:
`require_permission('users.freeze')`.
"""

from app import db
from app.models.rbac import AdminPermission, AdminRole

# ── The catalog ─────────────────────────────────────────────────────────
# (module, action, description, delegable)
PERMISSION_CATALOG = [
    # Dashboard & reporting
    ('dashboard', 'view', 'See platform statistics and the admin home', False),
    ('reports', 'view', 'Run sales, growth and fraud reports', False),
    ('reports', 'export', 'Export report data as CSV', False),

    # Users
    ('users', 'view', 'Browse the user directory and profiles', False),
    ('users', 'suspend', 'Suspend, ban and restore an account', False),
    ('users', 'delete', 'Permanently delete an account', False),
    ('users', 'edit', 'Edit a user profile or contact details', False),
    ('users', 'reset_password', 'Force a password reset', False),
    ('users', 'revoke_sessions', 'Force a user to sign out everywhere', False),
    ('users', 'verify', 'Approve registrations and grant verified badges', False),

    # Administrators and roles
    ('admins', 'view', 'List administrators and their roles', False),
    ('admins', 'manage', 'Create, edit and deactivate administrators', False),
    ('roles', 'manage', 'Create roles and change what they can do', True),

    # Marketplace
    ('products', 'view', 'Browse every listing including hidden ones', False),
    ('products', 'moderate', 'Approve, reject, edit or remove a listing', False),
    ('products', 'categorise', 'Manage categories, units and featured items', False),

    # Orders
    ('orders', 'view', 'Browse every order', False),
    ('orders', 'intervene', 'Change an order status out of band', False),
    ('orders', 'cancel', 'Cancel an order on behalf of a party', False),

    # Money
    ('escrow', 'view', 'See every escrow transaction', False),
    ('escrow', 'release', 'Release held funds to a farmer', False),
    ('escrow', 'refund', 'Refund held funds to a buyer', False),
    ('payouts', 'view', 'See farmer payouts and failures', False),
    ('payouts', 'manage', 'Approve, retry or reverse a payout', False),
    ('finance', 'settings', 'Change commission rates and platform fees', True),
    ('finance', 'export', 'Export financial data', False),

    # Disputes
    ('disputes', 'view', 'See the dispute queue and evidence', False),
    ('disputes', 'resolve', 'Decide a dispute and move the money', False),

    # Conversations
    ('chat', 'view', 'Read user conversations', False),
    ('chat', 'moderate', 'Delete messages, mute or block a user', False),
    ('chat', 'keywords', 'Manage the scam and abuse keyword list', False),

    # Messaging
    ('sms', 'view', 'See SMS usage and delivery logs', False),
    ('sms', 'send', 'Send an announcement to users', False),

    # Trust
    ('trust', 'view', 'See verification requests and trust scores', False),
    ('trust', 'moderate', 'Approve verification, edit badges and reviews', False),
    ('trust', 'scores', 'Override a trust score', False),

    # Content and configuration
    ('content', 'view', 'Read editable site content', False),
    ('content', 'edit', 'Change legal pages, FAQs and safety content', False),
    ('settings', 'view', 'Read platform settings', False),
    ('settings', 'edit', 'Change platform settings and feature toggles', True),
    ('settings', 'maintenance', 'Put the site into maintenance mode', True),

    # Security and support
    ('security', 'view', 'See the audit log, sessions and login attempts', False),
    ('security', 'block_ip', 'Block or unblock an IP', True),
    ('security', 'backup', 'Trigger a backup or a restore', True),
    ('support', 'view', 'Read support tickets and complaints', False),
    ('support', 'manage', 'Reply to and close tickets', False),
]

# Convenience groupings for seeding roles.
_ALL = [f'{m}.{a}' for m, a, _d, _g in PERMISSION_CATALOG]

# `admin` is the day-to-day operator: everything except the actions that can
# escalate privilege, move large sums of money, or change the platform itself.
ADMIN_DEFAULT_PERMISSIONS = [
    k for k in _ALL
    if k not in {
        'roles.manage',
        'admins.manage',
        'finance.settings',
        'finance.export',
        'escrow.release',
        'escrow.refund',
        'payouts.manage',
        'settings.edit',
        'settings.maintenance',
        'security.block_ip',
        'security.backup',
        'users.delete',
        'disputes.resolve',
        # A campaign is an irreversible broadcast that spends the provider's
        # balance and reaches every matched user at once, so it belongs with
        # the other high-impact powers rather than with day-to-day operations.
        'sms.send',
        # Overriding a trust score decides a user's reputation by hand, and
        # nothing records what it was before except the audit log.
        'trust.scores',
    }
]


def seed_permissions(db_session=None):
    """Idempotently insert the catalog and the two system roles.

    Safe to call on every boot: existing rows are updated rather than
    duplicated, so adding a permission to PERMISSION_CATALOG and restarting is
    enough to introduce it.
    """
    session = db_session or db.session

    for module, action, description, delegable in PERMISSION_CATALOG:
        key = f'{module}.{action}'
        existing = AdminPermission.query.filter_by(key=key).first()
        if existing is None:
            session.add(AdminPermission(
                key=key, module=module, action=action,
                description=description, is_delegable=delegable,
            ))
        else:
            # Keep the catalogue authoritative for description and grouping.
            existing.module = module
            existing.action = action
            existing.description = description
            existing.is_delegable = delegable

    session.flush()

    def ensure_role(key, name, description, permission_keys):
        role = AdminRole.query.filter_by(key=key).first()
        if role is None:
            role = AdminRole(key=key, name=name, description=description,
                             is_system=True)
            session.add(role)
            session.flush()
        wanted = set(permission_keys)
        role.permissions = [
            p for p in AdminPermission.query.all() if p.key in wanted
        ]
        return role

    ensure_role('super_admin', 'Super Admin',
                'Unrestricted access, including privilege management.',
                _ALL)
    ensure_role('admin', 'Administrator',
                'Day-to-day operations across the marketplace.',
                ADMIN_DEFAULT_PERMISSIONS)

    # Two read-only roles so a support desk can be granted sight without
    # moderation power.
    ensure_role(
        'support_agent', 'Support Agent',
        'Read user profiles and handle support tickets only.',
        ['dashboard.view', 'users.view', 'orders.view', 'support.view',
         'support.manage', 'chat.view'],
    )
    ensure_role(
        'auditor', 'Auditor',
        'Read-only access to the audit trail and financial reporting.',
        # No reports.export: a read-only role that can download the whole user
        # table is not read-only, it is exfiltration with extra steps.
        ['dashboard.view', 'reports.view', 'escrow.view', 'payouts.view',
         'users.view', 'security.view', 'trust.view', 'content.view'],
    )
    session.commit()


def permissions_for(user):
    """The effective permission set for a user.

    `super_admin` short-circuits to the full catalog so a permission added
    later is never accidentally withheld from the top tier.
    """
    if user is None:
        return set()
    if user.is_super_admin_role:
        return {f'{m}.{a}' for m, a, _d, _g in PERMISSION_CATALOG}

    role = getattr(user, 'admin_role', None)
    if role is None:
        return set()
    return {p.key for p in role.permissions}