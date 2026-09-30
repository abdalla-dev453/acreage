"""Admin authentication hardening: attempt limits, MFA and session lifetime.

Applied to the shared /api/auth/login, but only the administrator path gets
the extra checks. An ordinary farmer's login is unaffected.

Three layers:

  Attempt throttling  consecutive failures per identifier and per source IP,
                      with a lockout window. Counted from admin_login_attempts
                      so it survives a restart, unlike an in-memory counter.
  IP blocking         BlockedIP rows are checked before any credential work, so
                      a blocked address cannot even reach the password check.
  Session lifetime    an absolute expiry and an idle timeout, both recorded on
                      admin_sessions. The idle check is what ends a session left
                      open on a shared machine.
"""

import ipaddress
import logging
from datetime import timedelta

from flask import current_app, request
from flask_jwt_extended import decode_token, get_jwt_identity
from sqlalchemy import func

from app import db
from app.models.rbac import AdminLoginAttempt, AdminSession, BlockedIP
from app.models.user import User
from app.utils import mfa
from app.utils.time import utcnow

logger = logging.getLogger(__name__)


def _in_request():
    from flask import has_request_context
    return has_request_context()


def client_ip():
    """The caller's address, honouring the proxy header Render sets.

    Returns None outside a request so CLI tooling and background jobs can call
    into this module without a request context.
    """
    if not _in_request():
        return None
    forwarded = request.headers.get('X-Forwarded-For', '')
    if forwarded:
        return forwarded.split(',')[0].strip()
    return request.remote_addr


def user_agent():
    if not _in_request():
        return None
    return (request.headers.get('User-Agent') or '')[:255]


# ── IP blocking ─────────────────────────────────────────────────────────

def is_ip_blocked(ip):
    if not ip:
        return None
    try:
        address = ipaddress.ip_address(ip)
    except ValueError:
        # Not an IP (a proxy may report a hostname); fall through to limits.
        return None

    for blocked in BlockedIP.query.all():
        if blocked.expires_at and blocked.expires_at <= utcnow():
            continue
        try:
            network = ipaddress.ip_network(blocked.cidr, strict=False)
        except ValueError:
            continue
        if address in network:
            blocked.hit_count = (blocked.hit_count or 0) + 1
            return blocked
    return None


# ── Attempt throttling ──────────────────────────────────────────────────

def _failures_since(identifier=None, ip=None, since=None):
    query = AdminLoginAttempt.query.filter(AdminLoginAttempt.was_successful.is_(False))
    if identifier:
        query = query.filter(AdminLoginAttempt.identifier == identifier)
    if ip:
        query = query.filter(AdminLoginAttempt.ip_address == ip)
    if since:
        query = query.filter(AdminLoginAttempt.created_at >= since)
    return query.count()


def lockout_state(identifier, ip):
    """Return (is_locked, seconds_remaining, reason) without raising."""
    max_attempts = current_app.config.get('ADMIN_MAX_LOGIN_ATTEMPTS', 5)
    window_minutes = current_app.config.get('ADMIN_LOGIN_WINDOW_MINUTES', 15)
    since = utcnow() - timedelta(minutes=window_minutes)

    for label, count in (
        ('account', _failures_since(identifier=identifier, since=since)),
        ('address', _failures_since(ip=ip, since=since)),
    ):
        if count >= max_attempts:
            # Find the oldest failure in the window to work out when the
            # window rolls forward far enough to admit one more attempt.
            oldest = (
                AdminLoginAttempt.query
                .filter(AdminLoginAttempt.was_successful.is_(False))
                .filter(AdminLoginAttempt.created_at >= since)
                .order_by(AdminLoginAttempt.created_at.asc())
                .first()
            )
            if oldest is not None:
                remaining = int(
                    (oldest.created_at + timedelta(minutes=window_minutes)
                     - utcnow()).total_seconds()
                )
                if remaining > 0:
                    return True, remaining, (
                        f'Too many failed attempts for this {label}. '
                        f'Try again in {remaining // 60 + 1} minute(s).'
                    )
    return False, 0, None


def record_attempt(identifier, success, user_id=None, reason=None):
    db.session.add(AdminLoginAttempt(
        identifier=identifier or '(missing)',
        user_id=user_id,
        ip_address=client_ip(),
        user_agent=user_agent(),
        was_successful=success,
        failure_reason=reason,
    ))
    db.session.commit()


# ── Sessions ────────────────────────────────────────────────────────────

def start_session(user, jti=None, mfa_verified=False, mfa_method=None):
    idle_minutes = current_app.config.get('ADMIN_SESSION_IDLE_MINUTES', 30)
    absolute_hours = current_app.config.get('ADMIN_SESSION_ABSOLUTE_HOURS', 8)
    session = AdminSession(
        user_id=user.id,
        jti=jti,
        ip_address=client_ip(),
        user_agent=user_agent(),
        mfa_verified=mfa_verified,
        mfa_method=mfa_method,
        expires_at=utcnow() + timedelta(hours=absolute_hours),
    )
    db.session.add(session)
    db.session.commit()
    return session


def current_admin_session():
    """The AdminSession for the token making this request, or None."""
    try:
        identity = get_jwt_identity()
        user_id = int(identity)
    except Exception:
        return None
    return (
        AdminSession.query
        .filter_by(user_id=user_id, ended_at=None)
        .order_by(AdminSession.started_at.desc())
        .first()
    )


def enforce_session(user):
    """Expire a session that has outlived its idle or absolute window.

    Returns None when the request may proceed, or a (response) tuple to short
    circuit with.
    """
    session = current_admin_session()
    if session is None:
        # No session record: this token predates the session table, or the
        # account was granted admin after signing in. Fall back to the JWT's
        # own expiry, which flask-jwt-extended already enforces.
        return None

    idle_minutes = current_app.config.get('ADMIN_SESSION_IDLE_MINUTES', 30)

    if session.expires_at <= utcnow():
        session.end('expired')
        db.session.commit()
        return _session_response('Your administrator session has expired. Sign in again.')

    if session.idle_seconds() > idle_minutes * 60:
        session.end('idle_timeout')
        # Bumping the token version ends every token for the account, so an
        # idle timeout cannot be side-stepped by replaying the old one.
        user.revoke_tokens()
        db.session.commit()
        return _session_response(
            f'Session ended after {idle_minutes} minutes of inactivity.'
        )

    session.touch()
    db.session.commit()
    return None


def _session_response(message):
    from flask import jsonify
    return jsonify({
        'message': message,
        'code': 'admin_session_ended',
    }), 401


def end_all_sessions(user, reason='signed_out'):
    """Terminate every live admin session for a user."""
    closed = 0
    for session in AdminSession.query.filter_by(user_id=user.id, ended_at=None).all():
        session.end(reason)
        closed += 1
    if closed:
        db.session.commit()
    return closed


def active_session_count(user_id):
    return AdminLoginAttempt.query.filter_by(user_id=user_id).filter(
        AdminLoginAttempt.was_successful.is_(True)).count()


def purge_old_records(days=90):
    """Housekeeping for login attempts, sessions and expired blocks."""
    cutoff = utcnow() - timedelta(days=days)
    deleted = {}
    deleted['login_attempts'] = AdminLoginAttempt.query.filter(
        AdminLoginAttempt.created_at < cutoff).delete()
    deleted['admin_sessions'] = AdminSession.query.filter(
        AdminSession.started_at < cutoff).delete()
    deleted['blocked_ips'] = BlockedIP.query.filter(
        BlockedIP.expires_at.isnot(None),
        BlockedIP.expires_at < utcnow()).delete()
    db.session.commit()
    return deleted