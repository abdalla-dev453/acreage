"""Admin self-service, role administration and MFA enrolment.

Split from routes/admin.py because these are the endpoints an administrator
uses about *themselves* and about *other administrators* — a different blast
radius from the moderation surface, and different permissions.
"""

import logging

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from sqlalchemy import func

from app import db
from app.models.admin import AdminAuditLog
from app.models.rbac import (
    AdminLoginAttempt,
    AdminPermission,
    AdminRole,
    AdminSession,
    UserMFA,
)
from app.models.user import User
from app.utils import admin_auth, mfa
from app.utils.rbac import permissions_for

admin_self_bp = Blueprint('admin_self', __name__)
logger = logging.getLogger(__name__)


def _error(message, status=400, **extra):
    payload = {'message': message}
    payload.update(extra)
    return jsonify(payload), status


def _record(actor, action, target=None, before=None, after=None, **detail):
    entry = AdminAuditLog(
        actor_id=actor.id,
        target_user_id=getattr(target, 'id', None),
        action=action,
        detail_json=detail,
        before_json=before,
        after_json=after,
        ip_address=admin_auth.client_ip(),
        user_agent=(admin_auth.user_agent() or '')[:255],
    )
    db.session.add(entry)
    return entry


@admin_self_bp.route('/me', methods=['GET'])
@jwt_required()
def whoami():
    """Everything the shell needs in one round trip."""
    from app.routes.admin import require_admin
    actor, failure = require_admin()
    if failure is not None:
        return failure

    granted = permissions_for(actor)
    session = admin_auth.current_admin_session()
    return jsonify({
        'id': actor.id,
        'username': actor.username,
        'email': actor.email,
        'role': actor.role,
        'admin_role': actor.admin_role.key if actor.admin_role else None,
        'admin_role_name': actor.admin_role.name if actor.admin_role else None,
        'is_super_admin': actor.is_super_admin_role,
        'permissions': sorted(granted),
        'mfa_enabled': mfa.is_enabled(actor),
        'mfa_recovery_codes_left': mfa.remaining_recovery_codes(actor),
        'session': session.to_dict() if session else None,
        'account_status': actor.account_status,
    }), 200


@admin_self_bp.route('/permissions', methods=['GET'])
@jwt_required()
def permission_catalog():
    """The full catalog, grouped by module, for a permission matrix UI."""
    actor = db.session.get(User, int(_identity()))
    if actor is None or not actor.is_privileged:
        return _error('Administrator access required', 403)

    rows = AdminPermission.query.order_by(
        AdminPermission.module, AdminPermission.action).all()
    grouped = {}
    for row in rows:
        grouped.setdefault(row.module, []).append(row.to_dict())
    return jsonify({
        'modules': [{'name': name, 'permissions': items}
                    for name, items in sorted(grouped.items())],
        'total': len(rows),
    }), 200


@admin_self_bp.route('/roles', methods=['GET'])
@jwt_required()
def list_roles():
    from app.routes.admin import require_admin
    actor, failure = require_admin('admins.view')
    if failure is not None:
        return failure
    roles = AdminRole.query.order_by(AdminRole.key).all()
    return jsonify({'items': [r.to_dict() for r in roles]}), 200


@admin_self_bp.route('/roles', methods=['POST'])
@jwt_required()
def create_role():
    """Create a custom role. `roles.manage` is delegable, so only a holder of
    that permission can add capabilities beyond their own."""
    from app.routes.admin import require_admin
    actor, failure = require_admin('roles.manage')
    if failure is not None:
        return failure

    data = request.get_json(silent=True) or {}
    key = (data.get('key') or '').strip().lower()
    name = (data.get('name') or '').strip()
    if not key or not name:
        return _error('key and name are required')
    if not key.replace('_', '').replace('-', '').isalnum():
        return _error('key may only contain letters, digits, dashes and underscores')
    if AdminRole.query.filter_by(key=key).first():
        return _error(f'A role with key {key!r} already exists', 409)

    wanted = set(data.get('permissions') or [])
    known = {p.key for p in AdminPermission.query.all()}
    unknown = wanted - known
    if unknown:
        return _error('Unknown permissions', 400, unknown=sorted(unknown))

    # A role may never grant more than the creator already holds, otherwise
    # `roles.manage` is a privilege-escalation button.
    held = permissions_for(actor)
    escalation = wanted - held
    if escalation:
        return _error(
            'You cannot grant permissions you do not hold yourself', 403,
            escalation=sorted(escalation),
        )

    role = AdminRole(key=key, name=name,
                     description=(data.get('description') or '').strip() or None,
                     is_system=False)
    role.permissions = [p for p in AdminPermission.query.all() if p.key in wanted]
    db.session.add(role)
    _record(actor, 'role.create', after={'key': key, 'name': name,
                                         'permissions': sorted(wanted)})
    db.session.commit()
    return jsonify({'message': f'Role {key} created.', 'role': role.to_dict()}), 201


@admin_self_bp.route('/roles/<int:role_id>', methods=['PATCH'])
@jwt_required()
def update_role(role_id):
    from app.routes.admin import require_admin
    actor, failure = require_admin('roles.manage')
    if failure is not None:
        return failure

    role = db.session.get(AdminRole, role_id)
    if role is None:
        return _error('Role not found', 404)

    data = request.get_json(silent=True) or {}

    if 'permissions' in data:
        # A system role defines the hardcoded gates, so rewriting its
        # permissions would silently disagree with the code.
        if role.is_system:
            return _error(
                f'{role.key} is a system role and its permissions are defined in '
                'code. Create a custom role instead.', 409,
            )
        wanted = set(data['permissions'] or [])
        known = {p.key for p in AdminPermission.query.all()}
        if wanted - known:
            return _error('Unknown permissions', 400, unknown=sorted(wanted - known))
        escalation = wanted - permissions_for(actor)
        if escalation:
            return _error(
                'You cannot grant permissions you do not hold yourself', 403,
                escalation=sorted(escalation),
            )
        before = sorted(p.key for p in role.permissions)
        role.permissions = [p for p in AdminPermission.query.all() if p.key in wanted]
        _record(actor, 'role.permissions_change',
                before={'permissions': before},
                after={'permissions': sorted(wanted)}, role=role.key)
    else:
        _record(actor, 'role.update', role=role.key, changed=sorted(data.keys()))

    db.session.commit()
    return jsonify({'message': f'Role {role.key} updated.', 'role': role.to_dict()}), 200


@admin_self_bp.route('/roles/<int:role_id>', methods=['DELETE'])
@jwt_required()
def delete_role(role_id):
    from app.routes.admin import require_admin
    actor, failure = require_admin('roles.manage')
    if failure is not None:
        return failure

    role = db.session.get(AdminRole, role_id)
    if role is None:
        return _error('Role not found', 404)
    if role.is_system:
        return _error('System roles cannot be deleted', 409)
    if role.holders:
        return _error(
            f'{len(role.holders)} account(s) still hold this role. '
            'Reassign them first.', 409, holders=[u.username for u in role.holders],
        )

    key = role.key
    _record(actor, 'role.delete', before={'key': key})
    db.session.delete(role)
    db.session.commit()
    return jsonify({'message': f'Role {key} deleted.'}), 200


@admin_self_bp.route('/administrators', methods=['GET'])
@jwt_required()
def list_administrators():
    from app.routes.admin import require_admin
    actor, failure = require_admin('admins.view')
    if failure is not None:
        return failure

    admins = User.query.filter(
        (User.is_superadmin.is_(True)) | (User.role.in_(['admin', 'super_admin']))
    ).order_by(User.username).all()

    items = []
    for row in admins:
        sessions = AdminSession.query.filter_by(
            user_id=row.id, ended_at=None).order_by(
            AdminSession.started_at.desc()).all()
        items.append({
            'id': row.id,
            'username': row.username,
            'email': row.email,
            'role': row.role,
            'is_super_admin': row.is_super_admin_role,
            'admin_role': row.admin_role.key if row.admin_role else None,
            'account_status': row.account_status,
            'mfa_enabled': mfa.is_enabled(row),
            'active_sessions': sum(1 for x in sessions if x.is_active),
            'last_login_at': row.last_login_at.isoformat() if row.last_login_at else None,
        })
    return jsonify({'items': items, 'total': len(items)}), 200


@admin_self_bp.route('/administrators', methods=['POST'])
@jwt_required()
def create_administrator():
    """Create a sub-admin with an explicit RBAC role."""
    from app.routes.admin import require_admin
    actor, failure = require_admin('admins.manage')
    if failure is not None:
        return failure

    data = request.get_json(silent=True) or {}
    username = (data.get('username') or '').strip()
    email = (data.get('email') or '').strip().lower()
    password = data.get('password') or ''
    role_key = (data.get('admin_role') or 'admin').strip()

    from app.utils.validators import validate_email, validate_password
    if not username or len(username) < 3:
        return _error('username must be at least 3 characters')
    if not validate_email(email):
        return _error('A valid email address is required')
    ok, why = validate_password(password)
    if not ok:
        return _error(f'Password rejected: {why}')
    if User.query.filter((User.username == username) | (User.email == email)).first():
        return _error('That username or email is already taken', 409)

    role = AdminRole.query.filter_by(key=role_key).first()
    if role is None:
        return _error(f'Unknown role {role_key!r}', 400)
    # Granting a role with capabilities you do not hold is escalation.
    escalation = {p.key for p in role.permissions} - permissions_for(actor)
    if escalation:
        return _error(
            'You cannot grant a role with permissions you do not hold', 403,
            escalation=sorted(escalation),
        )

    account = User(
        username=username, email=email, role='admin', email_verified=True,
        verification_status='verified', admin_role=role,
    )
    account.set_password(password)
    db.session.add(account)
    db.session.flush()
    _record(actor, 'admin.create', target=account,
            after={'username': username, 'admin_role': role_key})
    db.session.commit()

    logger.warning('Administrator %s created by %s', username, actor.username)
    return jsonify({
        'message': f'{username} can now sign in at /login and reach /admin.',
        'admin': {'id': account.id, 'username': account.username,
                  'admin_role': role_key},
    }), 201


@admin_self_bp.route('/administrators/<int:user_id>/role', methods=['PATCH'])
@jwt_required()
def assign_admin_role(user_id):
    from app.routes.admin import require_admin
    actor, failure = require_admin('admins.manage')
    if failure is not None:
        return failure

    target = db.session.get(User, user_id)
    if target is None or not target.is_privileged:
        return _error('Administrator not found', 404)
    if target.id == actor.id:
        return _error('You cannot change your own role', 409)
    if target.is_super_admin_role and not actor.is_super_admin_role:
        return _error('Only a super admin can change a super admin', 403)

    data = request.get_json(silent=True) or {}
    role_key = (data.get('admin_role') or '').strip()
    role = AdminRole.query.filter_by(key=role_key).first()
    if role is None:
        return _error(f'Unknown role {role_key!r}', 400)
    escalation = {p.key for p in role.permissions} - permissions_for(actor)
    if escalation:
        return _error('You cannot grant a role with permissions you do not hold',
                      403, escalation=sorted(escalation))

    before = target.admin_role.key if target.admin_role else None
    target.admin_role = role
    # Changing what someone can do must not wait for their token to expire.
    target.revoke_tokens()
    _record(actor, 'admin.role_assign', target=target,
            before={'admin_role': before}, after={'admin_role': role_key})
    db.session.commit()
    return jsonify({'message': f'{target.username} now holds {role_key}. '
                              'They must sign in again.'}), 200


# ── MFA enrolment ───────────────────────────────────────────────────────

@admin_self_bp.route('/mfa/setup', methods=['POST'])
@jwt_required()
def mfa_setup():
    """Begin enrolment. Returns the otpauth URI and recovery codes.

    The codes are returned exactly once. They are stored hashed, so they
    cannot be shown again — a lost code means using another one.
    """
    from app.routes.admin import require_admin
    actor, failure = require_admin()
    if failure is not None:
        return failure

    record, uri, recovery = mfa.provision(actor)
    db.session.commit()
    logger.warning('MFA enrolment started for %s', actor.username)
    return jsonify({
        'provisioning_uri': uri,
        'recovery_codes': recovery,
        'message': 'Scan the URI, then confirm with a generated code to activate.',
        'is_enabled': False,
    }), 200


@admin_self_bp.route('/mfa/confirm', methods=['POST'])
@jwt_required()
def mfa_confirm():
    from app.routes.admin import require_admin
    actor, failure = require_admin()
    if failure is not None:
        return failure

    data = request.get_json(silent=True) or {}
    code = (data.get('code') or '').strip()
    record = UserMFA.query.filter_by(user_id=actor.id).first()
    if record is None:
        return _error('Start enrolment first', 409)
    if not mfa.confirm(record, code):
        return _error('That code was not valid', 400)
    _record(actor, 'mfa.enable', target=actor, after={'mfa_enabled': True})
    db.session.commit()
    return jsonify({'message': 'Two-factor authentication is now active.',
                    'is_enabled': True}), 200


@admin_self_bp.route('/mfa/disable', methods=['POST'])
@jwt_required()
def mfa_disable():
    """Turn MFA off. Requires a current code, so a hijacked session cannot
    quietly downgrade its own protection."""
    from app.routes.admin import require_admin
    actor, failure = require_admin()
    if failure is not None:
        return failure

    data = request.get_json(silent=True) or {}
    if mfa.is_enabled(actor):
        outcome = mfa.verify(actor, (data.get('code') or '').strip())
        if outcome == 'invalid':
            return _error('A valid current code is required to disable MFA', 403)
        _record(actor, 'mfa.disable', target=actor,
                before={'mfa_enabled': True}, after={'mfa_enabled': False})
    mfa.disable(actor)
    db.session.commit()
    logger.warning('MFA disabled for %s', actor.username)
    return jsonify({'message': 'Two-factor authentication disabled.'}), 200


# ── Sessions and login history ──────────────────────────────────────────

@admin_self_bp.route('/sessions', methods=['GET'])
@jwt_required()
def live_sessions():
    from app.routes.admin import require_admin
    actor, failure = require_admin('security.view')
    if failure is not None:
        return failure

    only_active = request.args.get('active', 'true').lower() != 'false'
    query = AdminSession.query.order_by(AdminSession.started_at.desc())
    if only_active:
        query = query.filter(AdminSession.ended_at.is_(None))
    rows = query.limit(200).all()
    return jsonify({
        'items': [s.to_dict() for s in rows],
        'total': len(rows),
    }), 200


@admin_self_bp.route('/sessions/<int:session_id>/end', methods=['POST'])
@jwt_required()
def end_session(session_id):
    from app.routes.admin import require_admin
    actor, failure = require_admin('security.view')
    if failure is not None:
        return failure

    session = db.session.get(AdminSession, session_id)
    if session is None:
        return _error('Session not found', 404)
    if session.ended_at is not None:
        return _error('That session has already ended', 409)

    session.end('ended_by_admin')
    target = db.session.get(User, session.user_id)
    if target:
        # Revoking the account's tokens is what actually ends it; the session
        # row only records why.
        target.revoke_tokens()
    _record(actor, 'session.end', target=target,
            before={'session_id': session_id}, after={'ended': True})
    db.session.commit()
    return jsonify({'message': 'Session ended.'}), 200


@admin_self_bp.route('/login-attempts', methods=['GET'])
@jwt_required()
def login_attempts():
    from app.routes.admin import require_admin
    actor, failure = require_admin('security.view')
    if failure is not None:
        return failure

    page = request.args.get('page', 1, type=int)
    per_page = min(request.args.get('per_page', 50, type=int), 200)
    only_failed = request.args.get('failed', 'false').lower() == 'true'

    query = AdminLoginAttempt.query
    if only_failed:
        query = query.filter(AdminLoginAttempt.was_successful.is_(False))
    rows = query.order_by(AdminLoginAttempt.created_at.desc()).limit(per_page).offset(
        (page - 1) * per_page).all()

    total = query.count()
    failed_total = AdminLoginAttempt.query.filter(
        AdminLoginAttempt.was_successful.is_(False)).count()

    return jsonify({
        'items': [a.to_dict() for a in rows],
        'total': total,
        'failed_total': failed_total,
        'page': page,
        'pages': max(1, -(-total // per_page)),
    }), 200


@admin_self_bp.route('/purge', methods=['POST'])
@jwt_required()
def purge():
    """Housekeeping: drop login attempts, sessions and expired IP blocks."""
    from app.routes.admin import require_admin
    actor, failure = require_admin('security.backup')
    if failure is not None:
        return failure

    data = request.get_json(silent=True) or {}
    days = min(max(int(data.get('days', 90)), 1), 365)
    deleted = admin_auth.purge_old_records(days)
    _record(actor, 'security.purge', after=deleted, days=days)
    logger.warning('Admin %s purged %s older than %s days',
                   actor.username, deleted, days)
    return jsonify({'message': f'Purged records older than {days} days.',
                    'deleted': deleted}), 200


def _identity():
    from flask_jwt_extended import get_jwt_identity
    return get_jwt_identity()