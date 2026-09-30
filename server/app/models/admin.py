from app import db
from app.utils.time import utcnow


class AdminAuditLog(db.Model):
    """Every consequential admin action, recorded before the response returns.

    A superadmin can change other people's accounts, so the platform needs a
    tamper-evident-ish trail of who did what to whom. This is append-only from
    the application's point of view: no route updates or deletes these rows.
    """

    __tablename__ = 'admin_audit_logs'

    id = db.Column(db.Integer, primary_key=True)

    # The admin who performed the action.
    actor_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    # The account that was acted upon. Nullable because some actions
    # (platform stats, a global search) target nobody in particular.
    target_user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)

    # 'user.freeze', 'user.unfreeze', 'user.role_change', 'user.delete',
    # 'user.revoke_sessions', 'login', ...
    action = db.Column(db.String(60), nullable=False)

    # Human-readable detail: the reason, the before/after state, the query.
    detail_json = db.Column(db.JSON, nullable=False, default=dict)
    # Field-level before/after values. Kept separate from detail_json so a
    # reviewer can see exactly what changed without parsing prose, and so an
    # exporter can diff columns mechanically.
    before_json = db.Column(db.JSON, nullable=True)
    after_json = db.Column(db.JSON, nullable=True)

    # Request context, useful when investigating a disputed action.
    ip_address = db.Column(db.String(45), nullable=True)
    user_agent = db.Column(db.String(255), nullable=True)

    created_at = db.Column(db.DateTime, default=utcnow, nullable=False)

    actor = db.relationship(
        'User', foreign_keys=[actor_id], backref='admin_actions', lazy=True
    )
    target_user = db.relationship(
        'User', foreign_keys=[target_user_id], backref='admin_actions_received', lazy=True
    )

    def to_dict(self):
        return {
            'id': self.id,
            'actor_id': self.actor_id,
            'actor_username': self.actor.username if self.actor else None,
            'target_user_id': self.target_user_id,
            'target_username': self.target_user.username if self.target_user else None,
            'action': self.action,
            'detail': self.detail_json or {},
            'before': self.before_json,
            'after': self.after_json,
            'ip_address': self.ip_address,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class SuperadminSession(db.Model):
    """Sign-in events for privileged accounts.

    Kept apart from the generic audit log so that reviewing "who has been
    logging in as admin" does not require trusting the same table an admin can
    append to freely.
    """

    __tablename__ = 'superadmin_sessions'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    ip_address = db.Column(db.String(45), nullable=True)
    user_agent = db.Column(db.String(255), nullable=True)
    was_successful = db.Column(db.Boolean, nullable=False, default=True)
    failure_reason = db.Column(db.String(120), nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow, nullable=False)

    user = db.relationship('User', backref='superadmin_sessions', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'username': self.user.username if self.user else None,
            'ip_address': self.ip_address,
            'was_successful': self.was_successful,
            'failure_reason': self.failure_reason,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
