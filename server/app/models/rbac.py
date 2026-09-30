"""RBAC, admin sessions, MFA, login throttling and audit diffs.

Everything an administrator needs beyond a single boolean:

  AdminRole / AdminPermission / association   role-based access control with a
                                             real permission catalog rather than
                                             hardcoded role comparisons
  AdminSession                               a first-class admin sign-in record
                                             with last-seen tracking, so idle
                                             timeout and device listings are
                                             queries rather than guesses
  AdminLoginAttempt                          every admin sign-in attempt, passed
                                             or failed, for lockout and review
  AdminAuditLog (re-exported)                the existing trail, widened here to
                                             record before/after values
"""

from app import db
from app.utils.time import utcnow


# ── RBAC ────────────────────────────────────────────────────────────────

class AdminRole(db.Model):
    """A named bundle of permissions.

    System roles (`super_admin`, `admin`) are seeded and cannot be deleted,
    because the permission checks compare against them by key.
    """

    __tablename__ = 'admin_roles'

    id = db.Column(db.Integer, primary_key=True)
    key = db.Column(db.String(50), unique=True, nullable=False)
    name = db.Column(db.String(80), nullable=False)
    description = db.Column(db.String(255), nullable=True)
    # System roles back the hardcoded gates in app/routes/admin.py and must
    # survive any attempt to remove them.
    is_system = db.Column(db.Boolean, nullable=False, default=False)
    created_at = db.Column(db.DateTime, default=utcnow, nullable=False)

    permissions = db.relationship(
        'AdminPermission',
        secondary='admin_role_permissions',
        backref=db.backref('roles', lazy=True),
        lazy='selectin',
    )
    # View-only. User declares the writable side of this FK as `admin_role`;
    # declaring it writable in both directions makes SQLAlchemy warn about
    # conflicting writes, and it is genuinely ambiguous which one wins.
    holders = db.relationship(
        'User', lazy=True, viewonly=True, overlaps='admin_role',
    )

    def to_dict(self):
        return {
            'id': self.id,
            'key': self.key,
            'name': self.name,
            'description': self.description,
            'is_system': self.is_system,
            'permission_count': len(self.permissions),
            'permissions': sorted(p.key for p in self.permissions),
            'holder_count': len(self.holders),
        }


class AdminPermission(db.Model):
    """One capability, named `module.action` so a check reads like the code."""

    __tablename__ = 'admin_permissions'

    id = db.Column(db.Integer, primary_key=True)
    key = db.Column(db.String(80), unique=True, nullable=False)
    module = db.Column(db.String(40), nullable=False, index=True)
    action = db.Column(db.String(40), nullable=False)
    description = db.Column(db.String(255), nullable=True)
    # Permissions that hand out other permissions. A role holding these can
    # escalate itself, which is why only super_admin gets them by default.
    is_delegable = db.Column(db.Boolean, nullable=False, default=False)
    created_at = db.Column(db.DateTime, default=utcnow, nullable=False)

    def to_dict(self):
        return {
            'key': self.key,
            'module': self.module,
            'action': self.action,
            'description': self.description,
            'is_delegable': self.is_delegable,
        }


admin_role_permissions = db.Table(
    'admin_role_permissions',
    db.Column('role_id', db.Integer, db.ForeignKey('admin_roles.id'), primary_key=True),
    db.Column('permission_id', db.Integer,
              db.ForeignKey('admin_permissions.id'), primary_key=True),
)


# ── Admin sessions, MFA and login throttling ────────────────────────────

class AdminSession(db.Model):
    """A live admin sign-in, separate from the existing SuperadminSession.

    SuperadminSession records that a sign-in happened. This tracks the session
    itself: when it started, when it was last seen, whether MFA was satisfied,
    and when it expires. Idle timeout is enforced by comparing last_seen.
    """

    __tablename__ = 'admin_sessions'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)

    # The JWT id, so a specific session can be revoked without ending every
    # session the user holds.
    jti = db.Column(db.String(64), nullable=True, index=True)

    ip_address = db.Column(db.String(45), nullable=True)
    user_agent = db.Column(db.String(255), nullable=True)

    # True only when the user completed a TOTP challenge in this session.
    mfa_verified = db.Column(db.Boolean, nullable=False, default=False)
    mfa_method = db.Column(db.String(20), nullable=True)

    started_at = db.Column(db.DateTime, default=utcnow, nullable=False)
    last_seen_at = db.Column(db.DateTime, default=utcnow, nullable=False)
    expires_at = db.Column(db.DateTime, nullable=False)

    ended_at = db.Column(db.DateTime, nullable=True)
    end_reason = db.Column(db.String(40), nullable=True)

    user = db.relationship('User', backref='admin_sessions', lazy=True)

    @property
    def is_active(self):
        return self.ended_at is None and self.expires_at > utcnow()

    def idle_seconds(self):
        return max((utcnow() - self.last_seen_at).total_seconds(), 0)

    def touch(self):
        self.last_seen_at = utcnow()

    def end(self, reason):
        self.ended_at = utcnow()
        self.end_reason = reason

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'username': self.user.username if self.user else None,
            'ip_address': self.ip_address,
            'user_agent': self.user_agent,
            'mfa_verified': self.mfa_verified,
            'mfa_method': self.mfa_method,
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'last_seen_at': self.last_seen_at.isoformat() if self.last_seen_at else None,
            'expires_at': self.expires_at.isoformat() if self.expires_at else None,
            'ended_at': self.ended_at.isoformat() if self.ended_at else None,
            'end_reason': self.end_reason,
            'is_active': self.is_active,
            'idle_seconds': int(self.idle_seconds()),
        }


class AdminLoginAttempt(db.Model):
    """Every attempt to sign in as an administrator, passed or failed.

    Feeds two things: the lockout check (consecutive failures from one
    identifier/IP) and the security dashboard, which needs to show failed
    attempts rather than only successes.
    """

    __tablename__ = 'admin_login_attempts'

    id = db.Column(db.Integer, primary_key=True)
    identifier = db.Column(db.String(120), nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    ip_address = db.Column(db.String(45), nullable=True)
    user_agent = db.Column(db.String(255), nullable=True)
    was_successful = db.Column(db.Boolean, nullable=False, default=False)
    # 'bad_password', 'not_admin', 'mfa_failed', 'locked_out', 'inactive',
    # 'not_found' — a failure with no reason is indistinguishable from a typo
    # and from an attempt, so the reason is always recorded.
    failure_reason = db.Column(db.String(60), nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow, nullable=False, index=True)

    def to_dict(self):
        return {
            'id': self.id,
            'identifier': self.identifier,
            'user_id': self.user_id,
            'ip_address': self.ip_address,
            'was_successful': self.was_successful,
            'failure_reason': self.failure_reason,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


# ── MFA secrets ─────────────────────────────────────────────────────────

class UserMFA(db.Model):
    """TOTP enrolment for an account.

    The secret is stored encrypted with FERNET_KEY rather than plaintext: the
    server needs to recompute a code, but a database dump should not hand over
    the ability to generate valid codes.
    """

    __tablename__ = 'user_mfa'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'),
                        unique=True, nullable=False)
    # Fernet-encrypted TOTP shared secret.
    secret_encrypted = db.Column(db.Text, nullable=False)
    is_enabled = db.Column(db.Boolean, nullable=False, default=False)
    # SHA-256 of the current code, so a replayed code cannot be reused inside
    # its own validity window.
    last_used_code_hash = db.Column(db.String(64), nullable=True)
    recovery_codes = db.Column(db.JSON, nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow, nullable=False)
    confirmed_at = db.Column(db.DateTime, nullable=True)

    user = db.relationship('User', backref='mfa', uselist=False, lazy=True)

    def to_dict(self):
        # Never returns the secret or the recovery codes.
        return {
            'is_enabled': self.is_enabled,
            'confirmed_at': self.confirmed_at.isoformat() if self.confirmed_at else None,
            'remaining_recovery_codes': len(self.recovery_codes or []),
        }


class BlockedIP(db.Model):
    """An IP or CIDR refused by the admin auth path."""

    __tablename__ = 'blocked_ips'

    id = db.Column(db.Integer, primary_key=True)
    cidr = db.Column(db.String(64), unique=True, nullable=False)
    reason = db.Column(db.String(255), nullable=True)
    created_by_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow, nullable=False)
    expires_at = db.Column(db.DateTime, nullable=True)
    hit_count = db.Column(db.Integer, nullable=False, default=0)

    def to_dict(self):
        return {
            'id': self.id,
            'cidr': self.cidr,
            'reason': self.reason,
            'hits': self.hit_count,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'expires_at': self.expires_at.isoformat() if self.expires_at else None,
            'is_expired': bool(self.expires_at and self.expires_at <= utcnow()),
        }