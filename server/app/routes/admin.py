"""Platform administration API.

Everything here is gated on `is_superadmin`, not on `role == 'admin'`. The
role value has always been a product permission (farmer / buyer) with 'admin'
tacked on for verification review; conflating the two meant a single string
comparison granted broad access in several unrelated places. A superadmin is
an explicit, separate grant that can be audited and revoked independently.

Two rules shape the design:

1. No action is silent. Every consequential action writes an AdminAuditLog row
   in the same transaction as its effect, so a disputed action always has a
   record of who performed it, when, from where, and why.
2. Privilege is not inherited implicitly. A superadmin cannot freeze, delete
   or demote another superadmin, and cannot lock themselves out.
"""

import logging
from datetime import timedelta
from functools import wraps

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from sqlalchemy import func, or_
from sqlalchemy.orm import selectinload

from app import db
from app.models.admin import AdminAuditLog, SuperadminSession
from app.models.commerce import EscrowTransaction
from app.models.payout import Payout
from app.models.sms_log import SMSLog
from app.models.trust import VerificationRequest
from app.models.order import Order
from app.models.product import Product
from app.models.review import Review
from app.models.user import User
from app.utils import admin_auth
from app.utils.rbac import permissions_for
from app.utils.time import utcnow

admin_bp = Blueprint('admin', __name__)
logger = logging.getLogger(__name__)

# Longest page a caller may request. An admin listing "every user" on a
# production database is a real query, not a free one.
MAX_PAGE_SIZE = 100


def _error(message, status=400, **extra):
    payload = {'message': message}
    payload.update(extra)
    return jsonify(payload), status


def _record(actor, action, target=None, before=None, after=None, **detail):
    """Append an audit row. Called inside the action's own transaction.

    `before` and `after` are the field-level snapshots, kept separate from
    `detail` so a reviewer can read what changed without parsing prose and an
    exporter can diff columns mechanically.
    """
    entry = AdminAuditLog(
        actor_id=actor.id,
        target_user_id=getattr(target, 'id', None),
        action=action,
        detail_json=detail,
        before_json=before,
        after_json=after,
        ip_address=request.headers.get('X-Forwarded-For', request.remote_addr),
        user_agent=(request.headers.get('User-Agent') or '')[:255],
    )
    db.session.add(entry)
    return entry


def _snapshot(obj, fields):
    """Take a before/after snapshot of named attributes.

    Only the listed fields are captured. Snapshotting a whole model would put
    password hashes and token digests into the audit table.
    """
    out = {}
    for field in fields:
        value = getattr(obj, field, None)
        out[field] = value.isoformat() if hasattr(value, 'isoformat') else value
    return out


def require_admin(permission=None):
    """Resolve the caller and check one permission.

    Returns (user, None) on success or (None, response) on failure. A frozen,
    deleted or downgraded account fails here even with a syntactically valid
    token, which is what makes freezing and role revocation take effect before
    the JWT would have expired.
    """
    identity = get_jwt_identity()
    try:
        user_id = int(identity)
    except (TypeError, ValueError):
        return None, _error('Invalid credentials', 401)

    user = db.session.get(User, user_id)
    if user is None or not user.can_authenticate:
        return None, _error('Account is not active', 403)
    if not user.is_privileged:
        # Do not leak that the account exists at all.
        return None, _error('Administrator access required', 403)

    if permission:
        granted = permissions_for(user)
        if permission not in granted:
            logger.warning(
                'Admin %s denied %s (role=%s)',
                user.username, permission,
                getattr(getattr(user, 'admin_role', None), 'key', None),
            )
            return None, _error(
                f'Missing permission: {permission}', 403,
                required_permission=permission,
            )
    return user, None


def admin_required(view):
    """Decorator form. Annotate with @permission_required('users.freeze')."""

    @wraps(view)
    def wrapper(*args, **kwargs):
        actor, failure = require_admin(getattr(view, 'required_permission', None))
        if failure is not None:
            return failure
        # Idle and absolute session lifetime. Only meaningful once the account
        # actually has a session row; a token issued before this feature falls
        # back to the JWT expiry that flask-jwt-extended already enforces.
        expired = admin_auth.enforce_session(actor)
        if expired is not None:
            return expired
        return view(actor, *args, **kwargs)

    return wrapper


def permission_required(permission):
    """Bind a required permission to a view, for use with @admin_required."""

    def decorate(view):
        view.required_permission = permission
        return admin_required(view)

    return decorate


# ── Platform overview ─────────────────────────────────────────────────────

@admin_bp.route('/stats', methods=['GET'])
@jwt_required()
@permission_required('dashboard.view')
def platform_stats(actor):
    """Headline numbers for the admin dashboard."""
    counts = {
        'users': db.session.query(func.count(User.id)).scalar(),
        'active_users': db.session.query(func.count(User.id)).filter(
            User.account_status == 'active').scalar(),
        'frozen_users': db.session.query(func.count(User.id)).filter(
            User.account_status != 'active').scalar(),
        'verified_users': db.session.query(func.count(User.id)).filter(
            User.email_verified.is_(True)).scalar(),
        'farms': db.session.query(func.count(User.id)).filter(User.role == 'farmer').scalar(),
        'buyers': db.session.query(func.count(User.id)).filter(User.role == 'buyer').scalar(),
        'products': db.session.query(func.count(Product.id)).scalar(),
        'orders': db.session.query(func.count(Order.id)).scalar(),
        'reviews': db.session.query(func.count(Review.id)).scalar(),
        'escrow_funded': db.session.query(func.count(EscrowTransaction.id)).filter(
            EscrowTransaction.status == 'funded').scalar(),
    }
    # Total value still held in escrow — the number that matters most if an
    # admin is reviewing the platform's financial health.
    held = db.session.query(func.coalesce(func.sum(EscrowTransaction.amount), 0.0)).filter(
        EscrowTransaction.status.in_(['funded', 'disputed'])).scalar()
    volume = db.session.query(func.coalesce(func.sum(Order.total_amount), 0.0)).scalar()

    # Alerts: things a human has to look at, not just counters.
    alerts = []
    frozen = counts.get('frozen_users') or 0
    if frozen:
        alerts.append({
            'level': 'warning', 'module': 'users',
            'message': f'{frozen} account(s) are frozen and need a decision.',
            'link': '/admin/users?status=frozen',
        })
    pending_payouts = db.session.query(func.count(Payout.id)).filter(
        Payout.status.in_(['Pending', 'pending'])).scalar()
    if pending_payouts:
        alerts.append({
            'level': 'info', 'module': 'payouts',
            'message': f'{pending_payouts} payout(s) are awaiting settlement.',
            'link': '/admin/payouts',
        })
    failed_sms = db.session.query(func.count(SMSLog.id)).filter(
        SMSLog.status == 'failed').scalar()
    if failed_sms:
        alerts.append({
            'level': 'warning', 'module': 'sms',
            'message': f'{failed_sms} SMS message(s) failed to deliver.',
            'link': '/admin/sms',
        })
    open_verifications = db.session.query(
        func.count(VerificationRequest.id)).filter(
        VerificationRequest.status == 'pending').scalar()
    if open_verifications:
        alerts.append({
            'level': 'info', 'module': 'trust',
            'message': f'{open_verifications} verification request(s) awaiting review.',
            'link': '/admin/trust',
        })
    disputed = db.session.query(func.count(EscrowTransaction.id)).filter(
        EscrowTransaction.status == 'disputed').scalar()
    if disputed:
        alerts.append({
            'level': 'critical', 'module': 'disputes',
            'message': f'{disputed} escrow transaction(s) are disputed.',
            'link': '/admin/disputes',
        })

    # 14-day signup series for the dashboard chart.
    series = (
        db.session.query(func.date(User.created_at), func.count(User.id))
        .filter(User.created_at >= utcnow() - timedelta(days=14))
        .group_by(func.date(User.created_at))
        .order_by(func.date(User.created_at))
        .all()
    )

    return jsonify({
        'counts': counts,
        'escrow_held_value': round(float(held or 0), 2),
        'gross_order_volume': round(float(volume or 0), 2),
        'signups_series': [{'date': str(d), 'count': int(c)} for d, c in series],
        'alerts': alerts,
    }), 200


@admin_bp.route('/activity', methods=['GET'])
@jwt_required()
@permission_required('dashboard.view')
def platform_activity(actor):
    """A cross-user activity feed: who joined, who ordered, what was reviewed.

    This is the overview an admin reads to answer "what has been happening on
    the platform", scoped by a day window so it stays a summary rather than a
    replay of the whole ledger.
    """
    days = min(max(request.args.get('days', 7, type=int), 1), 90)
    since = utcnow() - timedelta(days=days)

    new_users = db.session.query(User).filter(User.created_at >= since).order_by(
        User.created_at.desc()).limit(25).all()
    recent_orders = db.session.query(Order).options(
        selectinload(Order.buyer), selectinload(Order.farmer)
    ).filter(Order.created_at >= since).order_by(Order.created_at.desc()).limit(25).all()
    recent_reviews = db.session.query(Review).order_by(
        Review.created_at.desc()).limit(15).all()

    return jsonify({
        'window_days': days,
        'new_users': [{
            'id': u.id, 'username': u.username, 'role': u.role,
            'account_status': u.account_status,
            'created_at': u.created_at.isoformat() if u.created_at else None,
        } for u in new_users],
        'orders': [{
            'id': o.id,
            'order_code': o.order_code,
            'buyer': o.buyer.username if o.buyer else None,
            'farmer': o.farmer.username if o.farmer else None,
            'status': o.status,
            'payment_status': o.payment_status,
            'total_amount': o.total_amount,
            'created_at': o.created_at.isoformat() if o.created_at else None,
        } for o in recent_orders],
        'reviews': [{
            'id': r.id,
            'rating': r.rating,
            'comment': (r.comment or '')[:140],
            'created_at': r.created_at.isoformat() if r.created_at else None,
        } for r in recent_reviews],
    }), 200


# ── User management ───────────────────────────────────────────────────────

@admin_bp.route('/users', methods=['GET'])
@jwt_required()
@permission_required('users.view')
def list_users(actor):
    """Searchable, filterable, paginated user list."""
    page = request.args.get('page', 1, type=int)
    per_page = min(request.args.get('per_page', 25, type=int), MAX_PAGE_SIZE)
    search = (request.args.get('q') or '').strip()
    role = request.args.get('role')
    status = request.args.get('status')
    order = request.args.get('order', 'newest')

    query = db.session.query(User)

    if search:
        # Bound parameters; the wildcard is supplied as data, not as SQL.
        like = f'%{search}%'
        query = query.filter(
            or_(User.username.ilike(like), User.email.ilike(like),
                User.phone_number.ilike(like), User.location.ilike(like))
        )
    if role in ('farmer', 'buyer', 'admin'):
        query = query.filter(User.role == role)
    if status in ('active', 'frozen', 'suspended'):
        query = query.filter(User.account_status == status)
    if status == 'unverified':
        query = query.filter(User.email_verified.is_(False))

    if order == 'oldest':
        query = query.order_by(User.created_at.asc())
    elif order == 'name':
        query = query.order_by(User.username.asc())
    else:
        query = query.order_by(User.created_at.desc())

    pagination = query.paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        'items': [{
            'id': u.id,
            'username': u.username,
            'email': u.email,
            'phone_number': u.phone_number,
            'location': u.location,
            'role': u.role,
            'account_status': u.account_status,
            'is_superadmin': u.is_superadmin,
            'email_verified': u.email_verified,
            'verification_status': u.verification_status,
            'frozen_reason': u.frozen_reason,
            'frozen_at': u.frozen_at.isoformat() if u.frozen_at else None,
            'created_at': u.created_at.isoformat() if u.created_at else None,
            'last_login_at': u.last_login_at.isoformat() if u.last_login_at else None,
            'is_self': u.id == actor.id,
        } for u in pagination.items],
        'total': pagination.total,
        'page': pagination.page,
        'pages': pagination.pages,
        'has_next': pagination.has_next,
    }), 200


@admin_bp.route('/users/<int:user_id>', methods=['GET'])
@jwt_required()
@permission_required('users.view')
def user_detail(actor, user_id):
    """Full profile plus whatever activity the platform holds for that account."""
    user = db.session.get(User, user_id)
    if user is None:
        return _error('User not found', 404)

    farm_orders = Order.query.filter(Order.farmer_id == user.id)
    buyer_orders = Order.query.filter(Order.buyer_id == user.id)

    return jsonify({
        'user': {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'phone_number': user.phone_number,
            'location': user.location,
            'role': user.role,
            'account_status': user.account_status,
            'is_superadmin': user.is_superadmin,
            'email_verified': user.email_verified,
            'verification_status': user.verification_status,
            'verification_badge': user.verification_badge,
            'quality_score': user.quality_score,
            'frozen_reason': user.frozen_reason,
            'frozen_at': user.frozen_at.isoformat() if user.frozen_at else None,
            'created_at': user.created_at.isoformat() if user.created_at else None,
            'last_login_at': user.last_login_at.isoformat() if user.last_login_at else None,
            'sms_opt_in': user.sms_opt_in,
        },
        'activity': {
            'products': db.session.query(func.count(Product.id)).filter(
                Product.farmer_id == user.id).scalar(),
            'orders_as_farmer': farm_orders.count(),
            'orders_as_buyer': buyer_orders.count(),
            'reviews_written': db.session.query(func.count(Review.id)).filter(
                Review.reviewer_id == user.id).scalar(),
            'reviews_received': db.session.query(func.count(Review.id)).filter(
                Review.farmer_id == user.id).scalar(),
            'escrow_as_farmer': db.session.query(func.count(EscrowTransaction.id)).filter(
                EscrowTransaction.farmer_id == user.id).scalar(),
            'gross_sales': round(float(farm_orders.with_entities(
                func.coalesce(func.sum(Order.total_amount), 0.0)).scalar() or 0), 2),
            'gross_purchases': round(float(buyer_orders.with_entities(
                func.coalesce(func.sum(Order.total_amount), 0.0)).scalar() or 0), 2),
        },
        'recent_orders': [{
            'id': o.id,
            'order_code': o.order_code,
            'status': o.status,
            'payment_status': o.payment_status,
            'total_amount': o.total_amount,
            'created_at': o.created_at.isoformat() if o.created_at else None,
        } for o in db.session.query(Order).options(
            selectinload(Order.buyer), selectinload(Order.farmer)
        ).filter(or_(Order.buyer_id == user.id, Order.farmer_id == user.id)
        ).order_by(Order.created_at.desc()).limit(10)],
        'admin_history': [e.to_dict() for e in AdminAuditLog.query.filter(
            AdminAuditLog.target_user_id == user.id
        ).order_by(AdminAuditLog.created_at.desc()).limit(20)],
    }), 200


@admin_bp.route('/users/<int:user_id>/status', methods=['PATCH'])
@jwt_required()
@permission_required('users.suspend')
def set_account_status(actor, user_id):
    """Freeze, suspend, or restore an account.

    Freezing also revokes the target's outstanding JWTs. Without that a frozen
    account keeps full access until its token expires, which is up to an hour.
    """
    target = db.session.get(User, user_id)
    if target is None:
        return _error('User not found', 404)

    data = request.get_json(silent=True) or {}
    new_status = data.get('account_status')
    reason = (data.get('reason') or '').strip() or None

    if new_status not in ('active', 'frozen', 'suspended'):
        return _error("account_status must be 'active', 'frozen' or 'suspended'")

    if target.id == actor.id:
        return _error('You cannot change the status of your own account', 409)

    # A superadmin is not moderatable by another superadmin through this
    # endpoint. Privilege changes need a deliberate, separate flow.
    if target.is_superadmin:
        return _error('Superadmin accounts cannot be modified by another admin', 403)

    previous = target.account_status
    if previous == new_status:
        return _error(f"Account is already '{new_status}'", 409)

    before = _snapshot(target, ['role', 'account_status', 'email', 'username', 'email_verified', 'is_superadmin'])

    if new_status == 'active':
        target.unfreeze()
    else:
        target.freeze(actor, reason=reason)

    _record(actor, f'user.{new_status}', target=target,
            before=before, after=_snapshot(target, ['role', 'account_status', 'email', 'username', 'email_verified', 'is_superadmin']),
            previous_status=previous, new_status=new_status,
            reason=reason)

    db.session.commit()

    logger.info('Admin %s set user %s from %s to %s',
                actor.username, target.username, previous, new_status)
    return jsonify({
        'message': f'{target.username} is now {new_status}.',
        'user': {'id': target.id, 'account_status': target.account_status,
                 'is_superadmin': target.is_superadmin},
    }), 200


@admin_bp.route('/users/<int:user_id>/role', methods=['PATCH'])
@jwt_required()
@permission_required('users.edit')
def set_user_role(actor, user_id):
    """Change a user's product role. Admin and superadmin are not assignable."""
    target = db.session.get(User, user_id)
    if target is None:
        return _error('User not found', 404)

    data = request.get_json(silent=True) or {}
    new_role = data.get('role')

    # Deliberately excludes 'admin'. This endpoint must not be a privilege
    # escalation path into either the admin role or superadmin.
    if new_role not in ('farmer', 'buyer'):
        return _error("role must be 'farmer' or 'buyer'", 400)

    if target.id == actor.id:
        return _error('You cannot change your own role', 409)
    if target.is_superadmin:
        return _error('Superadmin accounts cannot be modified by another admin', 403)

    previous = target.role
    if previous == new_role:
        return _error(f'User is already a {new_role}', 409)

    before = _snapshot(target, ['role', 'account_status', 'email', 'username', 'email_verified', 'is_superadmin'])
    target.role = new_role
    _record(actor, 'user.role_change', target=target,
            before=before, after=_snapshot(target, ['role', 'account_status', 'email', 'username', 'email_verified', 'is_superadmin']),
            previous_role=previous, new_role=new_role)
    db.session.commit()

    return jsonify({'message': f'{target.username} is now a {new_role}.'}), 200


@admin_bp.route('/users/<int:user_id>/revoke-sessions', methods=['POST'])
@jwt_required()
@permission_required('users.revoke_sessions')
def revoke_sessions(actor, user_id):
    """Force a sign-out without changing the account's standing."""
    target = db.session.get(User, user_id)
    if target is None:
        return _error('User not found', 404)
    if target.id == actor.id:
        return _error('Use the sign-out button to end your own session', 400)
    if target.is_superadmin:
        return _error('Superadmin accounts cannot be modified by another admin', 403)

    before = _snapshot(target, ['token_version'])
    target.revoke_tokens()
    _record(actor, 'user.revoke_sessions', target=target,
            before=before, after=_snapshot(target, ['token_version']))
    db.session.commit()

    return jsonify({
        'message': f'All sessions for {target.username} have been ended. '
                   'They will need to sign in again.'
    }), 200


@admin_bp.route('/users/<int:user_id>', methods=['DELETE'])
@jwt_required()
@permission_required('users.delete')
def delete_user(actor, user_id):
    """Delete an account.

    Refuses when the account still has trading history, because orders and
    escrow rows reference it and orphaning them would corrupt the financial
    ledger. Demote or freeze instead, or clear the blockers listed in the
    response.
    """
    target = db.session.get(User, user_id)
    if target is None:
        return _error('User not found', 404)

    if target.id == actor.id:
        return _error('You cannot delete your own account', 409)
    if target.is_superadmin:
        return _error('Superadmin accounts cannot be deleted by another admin', 403)

    blockers = {
        'orders_as_farmer': Order.query.filter(Order.farmer_id == target.id).count(),
        'orders_as_buyer': Order.query.filter(Order.buyer_id == target.id).count(),
        'escrow_records': EscrowTransaction.query.filter(
            or_(EscrowTransaction.farmer_id == target.id,
                EscrowTransaction.buyer_id == target.id)).count(),
    }
    blockers = {k: v for k, v in blockers.items() if v}

    if blockers:
        return _error(
            'This account has trading history and cannot be deleted. '
            'Freeze it instead to block sign-in while preserving the ledger.',
            409, blockers=blockers,
        )

    # An administrator is not deleted through this route. Removing the account
    # that owns the audit trail would make previously recorded actions
    # unattributable; deactivate it instead so the history stays readable.
    if target.is_privileged:
        return _error(
            'Administrator accounts cannot be deleted. Suspend the account '
            'instead so the audit trail remains attributable.', 403,
        )

    username, email = target.username, target.email
    _record(actor, 'user.delete', target=target,
            username=username, email=email, blockers='none')

    # Purge rows that hold a NOT NULL reference to the user. Leaving them
    # makes SQLAlchemy try to null the FK and the delete fails with a 500
    # instead of succeeding.
    from app.models.rbac import AdminLoginAttempt, AdminSession, UserMFA
    AdminSession.query.filter_by(user_id=target.id).delete()
    AdminLoginAttempt.query.filter_by(user_id=target.id).delete()
    UserMFA.query.filter_by(user_id=target.id).delete()
    db.session.flush()

    db.session.delete(target)
    db.session.commit()

    logger.warning('Admin %s deleted user %s', actor.username, username)
    return jsonify({'message': f'{username} has been deleted.'}), 200


# ── Audit trail ───────────────────────────────────────────────────────────

@admin_bp.route('/audit', methods=['GET'])
@jwt_required()
@permission_required('security.view')
def audit_log(actor):
    """Every recorded admin action, newest first."""
    page = request.args.get('page', 1, type=int)
    per_page = min(request.args.get('per_page', 50, type=int), MAX_PAGE_SIZE)
    action = request.args.get('action')

    query = AdminAuditLog.query
    if action:
        query = query.filter(AdminAuditLog.action == action)
    if request.args.get('target_user_id', type=int):
        query = query.filter(
            AdminAuditLog.target_user_id == request.args.get('target_user_id', type=int))

    pagination = query.order_by(AdminAuditLog.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False)

    return jsonify({
        'items': [e.to_dict() for e in pagination.items],
        'total': pagination.total,
        'page': pagination.page,
        'pages': pagination.pages,
        'has_next': pagination.has_next,
    }), 200


@admin_bp.route('/admin-sessions', methods=['GET'])
@jwt_required()
@permission_required('security.view')
def admin_sessions(actor):
    """Sign-in history for privileged accounts, successful and failed."""
    page = request.args.get('page', 1, type=int)
    per_page = min(request.args.get('per_page', 50, type=int), MAX_PAGE_SIZE)

    pagination = SuperadminSession.query.order_by(
        SuperadminSession.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False)

    return jsonify({
        'items': [s.to_dict() for s in pagination.items],
        'total': pagination.total,
        'page': pagination.page,
        'pages': pagination.pages,
    }), 200


@admin_bp.route('/self', methods=['GET'])
@jwt_required()
@admin_required
def current_admin(actor):
    """What the signed-in admin is allowed to do, so the UI can adapt."""
    return jsonify({
        'id': actor.id,
        'username': actor.username,
        'email': actor.email,
        'is_superadmin': actor.is_superadmin,
        'role': actor.role,
        'account_status': actor.account_status,
        'permissions': [
            'users.view', 'users.freeze', 'users.unfreeze', 'users.delete',
            'users.change_role', 'users.revoke_sessions',
            'platform.stats', 'audit.view', 'admin_sessions.view',
        ],
    }), 200
