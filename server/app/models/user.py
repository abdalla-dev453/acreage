from app import db
from werkzeug.security import generate_password_hash, check_password_hash
from app.utils.time import utcnow

class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    # Werkzeug's current scrypt hashes can exceed 128 characters.
    password_hash = db.Column(db.String(256), nullable=False)
    role = db.Column(db.String(50), nullable=False, default='farmer')  # 'buyer', 'farmer', 'admin' or 'super_admin'
    phone_number = db.Column(db.String(20), nullable=True)
    location = db.Column(db.String(255), nullable=True)
    avatar_url = db.Column(db.String(255), nullable=True)
    verification_status = db.Column(db.String(20), nullable=False, default='unverified')
    verification_badge = db.Column(db.String(50), nullable=True)
    sms_opt_in = db.Column(db.Boolean, nullable=False, default=False)
    sms_phone_verified = db.Column(db.Boolean, nullable=False, default=False)
    quality_score = db.Column(db.Float, nullable=True)
    preferences_json = db.Column(db.JSON, nullable=False, default=dict)
    created_at = db.Column(db.DateTime, default=utcnow)
    email_verified = db.Column(db.Boolean, nullable=False, default=False)
    verification_token_hash = db.Column(db.String(64), nullable=True)
    verification_token_expires_at = db.Column(db.DateTime, nullable=True)
    reset_token_hash = db.Column(db.String(64), nullable=True)
    reset_token_expires_at = db.Column(db.DateTime, nullable=True)
    cooperative_id = db.Column(db.Integer, db.ForeignKey('cooperatives.id'), nullable=True)

    # ── Platform administration ────────────────────────────────────────────
    # Kept separate from `role` on purpose. `role` drives product permissions
    # (farmer / buyer) and is copied into plenty of UI conditionals; `admin` as
    # a role value meant "may review verifications" and was reachable by any
    # row that happened to carry it. A superadmin is a distinct, explicit grant.
    is_superadmin = db.Column(db.Boolean, nullable=False, default=False)

    # 'active' | 'frozen' | 'suspended'
    # Frozen accounts keep their data but cannot authenticate; suspended
    # accounts are the same but are expected to be deleted once reviewed.
    account_status = db.Column(db.String(20), nullable=False, default='active')
    frozen_reason = db.Column(db.String(255), nullable=True)
    frozen_at = db.Column(db.DateTime, nullable=True)
    frozen_by_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)

    # Bumped on any action that must invalidate outstanding access tokens.
    # JWTs are stateless and live for an hour, so freezing a user has nothing
    # else to act on; the token's embedded version is compared against this on
    # every authenticated request (see admin_required / app/__init__.py).
    token_version = db.Column(db.Integer, nullable=False, default=1)
    last_login_at = db.Column(db.DateTime, nullable=True)

    # Which RBAC bundle applies. NULL for non-admin accounts; an admin with no
    # role is denied everything, because RBAC is deny-by-default.
    admin_role_id = db.Column(db.Integer, db.ForeignKey('admin_roles.id'), nullable=True)
    admin_role = db.relationship(
        'AdminRole',
        foreign_keys=[admin_role_id],
        # Loaded eagerly on every admin request: the permission check runs on
        # each one, so a lazy load here would be a query per request.
        lazy='selectin',
    )
    # 'suspended' is reversible, 'banned' is not intended to be.
    suspension_reason = db.Column(db.String(255), nullable=True)
    suspended_until = db.Column(db.DateTime, nullable=True)

    # relationships
    products = db.relationship('Product', backref='farmer', lazy=True)
    farm_orders = db.relationship('Order', foreign_keys='Order.farmer_id', back_populates='farmer', lazy=True)
    buyer_orders = db.relationship('Order', foreign_keys='Order.buyer_id', back_populates='buyer', lazy=True)
    farm_logs = db.relationship('FarmLog', backref='farmer', lazy=True)
    reviews_written = db.relationship('Review', foreign_keys='Review.reviewer_id', backref='author', lazy=True)
    verification_requests = db.relationship(
        'VerificationRequest', foreign_keys='VerificationRequest.user_id',
        back_populates='user', lazy=True
    )
    reviewed_verifications = db.relationship(
        'VerificationRequest', foreign_keys='VerificationRequest.reviewer_id',
        back_populates='reviewer', lazy=True
    )
    escrow_transactions_as_buyer = db.relationship(
        'EscrowTransaction', foreign_keys='EscrowTransaction.buyer_id', lazy=True
    )
    escrow_transactions_as_farmer = db.relationship(
        'EscrowTransaction', foreign_keys='EscrowTransaction.farmer_id', lazy=True
    )
    cooperative = db.relationship('Cooperative', backref='members')

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    @property
    def can_authenticate(self):
        """Frozen and suspended accounts are refused at the login boundary."""
        return self.account_status == 'active'

    def freeze(self, actor, reason=None):
        """Suspend sign-in and invalidate every outstanding access token.

        JWTs are stateless and last an hour, so flipping account_status alone
        would leave a frozen user fully operational until the token expired.
        Bumping token_version is what actually cuts them off.
        """
        self.account_status = 'frozen'
        self.frozen_reason = reason
        self.frozen_at = utcnow()
        self.frozen_by_id = getattr(actor, 'id', None)
        self.token_version = (self.token_version or 1) + 1

    def unfreeze(self):
        self.account_status = 'active'
        self.frozen_reason = None
        self.frozen_at = None
        self.frozen_by_id = None
        # Also bumped so a token issued before the freeze cannot be replayed
        # after the account is restored.
        self.token_version = (self.token_version or 1) + 1

    def revoke_tokens(self):
        """Invalidate outstanding tokens without changing account status."""
        self.token_version = (self.token_version or 1) + 1

    @property
    def is_privileged(self):
        return bool(self.is_superadmin) or self.role in ('admin', 'super_admin')

    @property
    def is_super_admin_role(self):
        """True for the top tier, whether expressed as the role string or the
        legacy flag. The flag is kept so accounts created before `super_admin`
        existed keep working."""
        return bool(self.is_superadmin) or self.role == 'super_admin'

    @property
    def can_authenticate_admin(self):
        return self.is_privileged and self.can_authenticate