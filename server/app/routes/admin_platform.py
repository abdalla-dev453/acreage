"""Phase 5: platform settings, content pages, reports, security centre and
support.

Two rules shape this module.

A setting marked secret is never serialised, whatever the caller asks for.
`is_public` and `is_secret` answer different questions, and a key that is
publicly readable cannot also be secret.

Maintenance mode is a single flag read on every storefront request, so it is
cached briefly rather than queried per request, and an administrator cannot
lock themselves out of turning it back off.
"""

import csv
import io
import logging
from datetime import timedelta

from flask import Blueprint, Response, jsonify, request
from flask_jwt_extended import jwt_required
from sqlalchemy import func, or_

from app import db
from app.models.admin import AdminAuditLog
from app.models.chat import ChatMessage
from app.models.commerce import EscrowTransaction
from app.models.moderation import ContentReport
from app.models.order import Order, OrderItem
from app.models.platform import (
    Announcement,
    ContentPage,
    NotificationDelivery,
    PlatformSetting,
    SupportMessage,
    SupportTicket,
)
from app.models.product import Product
from app.models.rbac import AdminLoginAttempt, AdminSession, BlockedIP
from app.models.sms_log import SMSLog
from app.models.user import User
from app.utils import admin_auth
from app.utils.http import json_object
from app.utils.time import utcnow

platform_bp = Blueprint('admin_platform', __name__)
logger = logging.getLogger(__name__)

MAX_PAGE_SIZE = 100

# Seeded on first access so the settings screen is populated rather than empty,
# and the defaults are auditable code rather than mystery database rows.
DEFAULT_SETTINGS = [
    ('commission_rate', 0.0, 'finance', 'Platform share of each settled escrow'),
    ('maintenance_mode', False, 'general', 'Take the storefront offline'),
    ('maintenance_message',
     'Acreage is briefly offline for maintenance. Please try again shortly.',
     'general', 'Shown while maintenance mode is on'),
    ('platform_name', 'Acreage', 'general', 'Name shown in the header and page titles'),
    ('support_email', 'help@acreage.co.ke', 'contact', 'Public support address'),
    ('support_phone', '+254 700 000 000', 'contact', 'Public support number'),
    ('feature_sms', True, 'features', 'Enable the SMS ordering channel'),
    ('feature_whatsapp', True, 'features', 'Enable the WhatsApp ordering channel'),
    ('feature_group_commerce', True, 'features', 'Enable pooled group buying'),
    ('feature_disputes', True, 'features', 'Let buyers open disputes on funded escrow'),
]


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


def _guard(permission):
    from app.routes.admin import require_admin
    return require_admin(permission)


def seed_defaults():
    """Insert any missing default setting. Idempotent.

    Returns 0 rather than raising when the table is absent. Boot calls this
    before migrations have necessarily run, and a fresh database should not
    produce a stack trace on every start.
    """
    from sqlalchemy import inspect
    if not inspect(db.engine).has_table('platform_settings'):
        return 0
    created = 0
    for key, value, category, description in DEFAULT_SETTINGS:
        if PlatformSetting.query.filter_by(key=key).first() is None:
            db.session.add(PlatformSetting(
                key=key, value_json=value, category=category,
                description=description, is_public=key.startswith(('support_', 'platform_')),
            ))
            created += 1
    if created:
        db.session.commit()
    return created


def get_setting(key, default=None):
    """Read a setting by key, falling back to the declared default."""
    row = PlatformSetting.query.filter_by(key=key).first()
    if row is None or row.value_json is None:
        for k, value, _c, _d in DEFAULT_SETTINGS:
            if k == key:
                return value
        return default
    return row.value_json


# ── Settings ────────────────────────────────────────────────────────────

@platform_bp.route('/settings', methods=['GET'])
@jwt_required()
def list_settings():
    actor, failure = _guard('settings.view')
    if failure is not None:
        return failure

    seed_defaults()
    rows = PlatformSetting.query.order_by(
        PlatformSetting.category, PlatformSetting.key).all()
    grouped = {}
    for row in rows:
        grouped.setdefault(row.category, []).append(row.to_dict())

    return jsonify({
        'categories': [{'name': name, 'settings': items}
                        for name, items in sorted(grouped.items())],
        'total': len(rows),
    }), 200


@platform_bp.route('/settings/<string:key>', methods=['PATCH'])
@jwt_required()
def update_setting(key):
    actor, failure = _guard('settings.edit')
    if failure is not None:
        return failure

    row = PlatformSetting.query.filter_by(key=key).first()
    if row is None:
        known = [k for k, _v, _c, _d in DEFAULT_SETTINGS]
        if key not in known:
            return _error(f'Unknown setting {key!r}', 404, known=known)
        row = PlatformSetting(key=key, value_json=None, category='general')
        db.session.add(row)

    data, error = json_object()
    if error:
        return error
    if 'value' not in data:
        return _error('Provide a value')

    # Switching a setting on at the same time as marking it secret would
    # publish a credential.
    is_secret = bool(row.is_secret)
    is_public = bool(row.is_public)
    if 'is_secret' in data:
        is_secret = bool(data['is_secret'])
    if 'is_public' in data:
        is_public = bool(data['is_public'])
    if is_secret and is_public:
        return _error('A setting cannot be both public and secret')

    before = row.value_json
    row.value_json = data['value']
    row.is_secret = is_secret
    row.is_public = is_public
    row.updated_by_id = actor.id
    row.updated_at = utcnow()

    _record(actor, 'settings.update', before={'value': before},
            after={'value': data['value']}, key=key)
    db.session.commit()

    logger.warning('Admin %s changed setting %s', actor.username, key)
    return jsonify({'message': f'{key} saved.', 'setting': row.to_dict()}), 200


@platform_bp.route('/settings/public', methods=['GET'])
def public_settings():
    """The storefront's slice. No authentication, secrets excluded by the
    serializer, and only keys explicitly marked public."""
    seed_defaults()
    rows = PlatformSetting.query.filter_by(is_public=True).all()
    return jsonify({'settings': {
        row.key: row.value_json for row in rows if not row.is_secret
    }}), 200


@platform_bp.route('/content/pages', methods=['GET'])
@jwt_required()
def list_pages():
    actor, failure = _guard('content.view')
    if failure is not None:
        return failure

    rows = ContentPage.query.order_by(ContentPage.slug).all()
    return jsonify({'items': [p.to_dict(include_body=False) for p in rows],
                    'total': len(rows)}), 200


@platform_bp.route('/content/pages/<int:page_id>', methods=['PATCH'])
@jwt_required()
def update_page(page_id):
    actor, failure = _guard('content.edit')
    if failure is not None:
        return failure

    page = db.session.get(ContentPage, page_id)
    if page is None:
        return _error('Page not found', 404)

    data, error = json_object()
    if error:
        return error

    before = {'title': page.title, 'is_published': page.is_published,
              'body_length': len(page.body or '')}
    for field in ('title', 'body', 'summary', 'is_published'):
        if field in data:
            setattr(page, field, data[field])
    page.updated_by_id = actor.id
    page.updated_at = utcnow()

    _record(actor, 'content.update', before=before,
            after={'title': page.title, 'is_published': page.is_published,
                   'body_length': len(page.body or '')},
            slug=page.slug)
    db.session.commit()
    return jsonify({'message': f'{page.slug} saved.', 'page': page.to_dict()}), 200


# ── Reports ─────────────────────────────────────────────────────────────

@platform_bp.route('/reports/summary', methods=['GET'])
@jwt_required()
def reports_summary():
    """Sales, growth and activity over a date window."""
    actor, failure = _guard('reports.view')
    if failure is not None:
        return failure

    days = min(max(request.args.get('days', 30, type=int), 1), 365)
    since = utcnow() - timedelta(days=days)
    previous = since - timedelta(days=days)

    def order_total(start):
        return db.session.query(
            func.coalesce(func.sum(Order.total_amount), 0.0)).filter(
            Order.created_at >= start).scalar() or 0.0

    signups = (
        db.session.query(func.count(User.id)).filter(User.created_at >= since).scalar(),
        db.session.query(func.count(User.id)).filter(
            User.created_at >= previous, User.created_at < since).scalar(),
    )
    orders = (
        db.session.query(func.count(Order.id)).filter(Order.created_at >= since).scalar(),
        db.session.query(func.count(Order.id)).filter(
            Order.created_at >= previous, Order.created_at < since).scalar(),
    )
    revenue = (order_total(since), order_total(previous))

    # Daily revenue series for the chart.
    series = db.session.query(
        func.date(Order.created_at),
        func.coalesce(func.sum(Order.total_amount), 0.0),
    ).filter(Order.created_at >= since).group_by(
        func.date(Order.created_at)).order_by(
        func.date(Order.created_at)).all()

    top_farmers = db.session.query(
        User.username, func.count(Order.id), func.coalesce(func.sum(Order.total_amount), 0.0)
    ).join(Order, Order.farmer_id == User.id).filter(
        Order.created_at >= since).group_by(User.id).order_by(
        func.sum(Order.total_amount).desc()).limit(10).all()

    top_products = db.session.query(
        Product.title, func.coalesce(func.sum(OrderItem.quantity), 0.0),
        func.coalesce(func.sum(OrderItem.line_total), 0.0),
    ).join(OrderItem, OrderItem.product_id == Product.id).join(
        Order, Order.id == OrderItem.order_id).filter(
        Order.created_at >= since).group_by(Product.id).order_by(
        func.sum(OrderItem.line_total).desc()).limit(10).all()

    regions = db.session.query(
        User.location, func.count(User.id)
    ).filter(User.location.isnot(None), User.location != '').group_by(
        User.location).order_by(func.count(User.id).desc()).limit(10).all()

    def delta(current, before):
        if not before:
            return None
        return round((float(current) - float(before)) / float(before) * 100, 1)

    return jsonify({
        'window_days': days,
        'signups': {'current': signups[0], 'previous': signups[1],
                    'change_pct': delta(*signups)},
        'orders': {'current': orders[0], 'previous': orders[1],
                   'change_pct': delta(*orders)},
        'revenue': {'current': round(float(revenue[0]), 2),
                    'previous': round(float(revenue[1]), 2),
                    'change_pct': delta(*revenue)},
        'revenue_series': [{'date': str(d), 'revenue': round(float(v), 2)}
                           for d, v in series],
        'top_farmers': [{'username': u, 'orders': c, 'revenue': round(float(r), 2)}
                        for u, c, r in top_farmers],
        'top_products': [{'title': t, 'quantity': float(q), 'revenue': round(float(r), 2)}
                         for t, q, r in top_products],
        'regions': [{'location': l, 'users': c} for l, c in regions if l],
    }), 200


@platform_bp.route('/reports/users.csv', methods=['GET'])
@jwt_required()
def export_users():
    actor, failure = _guard('reports.export')
    if failure is not None:
        return failure

    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(['id', 'username', 'email', 'phone_number', 'location',
                     'role', 'account_status', 'verification_status',
                     'quality_score', 'created_at'])
    for user in User.query.order_by(User.id).limit(50_000).all():
        writer.writerow([user.id, user.username, user.email,
                         user.phone_number or '', user.location or '',
                         user.role, user.account_status, user.verification_status,
                         user.quality_score, user.created_at])

    _record(actor, 'report.export_users')
    db.session.commit()
    return Response(buffer.getvalue(), mimetype='text/csv',
                    headers={'Content-Disposition':
                             'attachment; filename=users-export.csv'})


# ── Security centre ─────────────────────────────────────────────────────

@platform_bp.route('/security/overview', methods=['GET'])
@jwt_required()
def security_overview():
    actor, failure = _guard('security.view')
    if failure is not None:
        return failure

    since = utcnow() - timedelta(days=7)
    return jsonify({
        'failed_logins_7d': AdminLoginAttempt.query.filter(
            AdminLoginAttempt.was_successful.is_(False),
            AdminLoginAttempt.created_at >= since).count(),
        'successful_logins_7d': AdminLoginAttempt.query.filter(
            AdminLoginAttempt.was_successful.is_(True),
            AdminLoginAttempt.created_at >= since).count(),
        'live_admin_sessions': AdminSession.query.filter(
            AdminSession.ended_at.is_(None)).count(),
        'blocked_ips': BlockedIP.query.count(),
        'locked_accounts': User.query.filter(
            User.account_status != 'active').count(),
        'open_reports': ContentReport.query.filter_by(status='open').count(),
        'failure_reasons': [
            {'reason': r[0] or 'unknown', 'count': r[1]}
            for r in db.session.query(
                AdminLoginAttempt.failure_reason,
                func.count(AdminLoginAttempt.id)
            ).filter(AdminLoginAttempt.was_successful.is_(False),
                     AdminLoginAttempt.created_at >= since
            ).group_by(AdminLoginAttempt.failure_reason).all()
        ],
    }), 200


@platform_bp.route('/security/blocked-ips', methods=['GET'])
@jwt_required()
def list_blocked_ips():
    actor, failure = _guard('security.view')
    if failure is not None:
        return failure
    rows = BlockedIP.query.order_by(BlockedIP.created_at.desc()).all()
    return jsonify({'items': [b.to_dict() for b in rows],
                    'total': len(rows)}), 200


@platform_bp.route('/security/blocked-ips', methods=['POST'])
@jwt_required()
def block_ip():
    """Block an address from the admin auth path.

    Refuses to block the caller's own address: locking yourself out of the
    console is not a recoverable mistake from inside the console.
    """
    actor, failure = _guard('security.block_ip')
    if failure is not None:
        return failure

    data, error = json_object()
    if error:
        return error

    import ipaddress
    cidr = (data.get('cidr') or '').strip()
    try:
        ipaddress.ip_network(cidr, strict=False)
    except ValueError:
        return _error('cidr must be a valid IP address or CIDR range')

    if admin_auth.client_ip() and str(ipaddress.ip_network(cidr, strict=False)) == \
            str(ipaddress.ip_network(admin_auth.client_ip(), strict=False)):
        return _error('You cannot block your own address', 409)

    if BlockedIP.query.filter_by(cidr=cidr).first():
        return _error(f'{cidr} is already blocked', 409)

    reason = (data.get('reason') or '').strip() or None
    days = data.get('days')
    blocked = BlockedIP(
        cidr=cidr, reason=reason, created_by_id=actor.id,
        expires_at=(utcnow() + timedelta(days=int(days))) if days else None,
    )
    db.session.add(blocked)
    _record(actor, 'security.block_ip', after={'cidr': cidr}, reason=reason)
    db.session.commit()

    logger.warning('Admin %s blocked %s', actor.username, cidr)
    return jsonify({'message': f'{cidr} blocked.', 'entry': blocked.to_dict()}), 201


@platform_bp.route('/security/blocked-ips/<int:entry_id>', methods=['DELETE'])
@jwt_required()
def unblock_ip(entry_id):
    actor, failure = _guard('security.block_ip')
    if failure is not None:
        return failure

    entry = db.session.get(BlockedIP, entry_id)
    if entry is None:
        return _error('Entry not found', 404)

    before = entry.to_dict()
    db.session.delete(entry)
    _record(actor, 'security.unblock_ip', before=before)
    db.session.commit()
    return jsonify({'message': f'{before["cidr"]} unblocked.'}), 200


@platform_bp.route('/system/logs', methods=['GET'])
@jwt_required()
def system_logs():
    """Recent moderation-relevant records, as a stand-in for log files that a
    container platform would otherwise own."""
    actor, failure = _guard('security.view')
    if failure is not None:
        return failure

    return jsonify({
        'failed_logins': [a.to_dict() for a in AdminLoginAttempt.query.filter(
            AdminLoginAttempt.was_successful.is_(False)
        ).order_by(AdminLoginAttempt.created_at.desc()).limit(50).all()],
        'recent_admin_actions': [a.to_dict() for a in AdminAuditLog.query.order_by(
            AdminAuditLog.created_at.desc()).limit(50).all()],
    }), 200


@platform_bp.route('/system/integrations', methods=['GET'])
@jwt_required()
def integrations():
    """Which providers are configured, without revealing any credential.

    Reports presence and whether the value looks like a placeholder, never the
    value itself — an integration screen that printed keys would be the worst
    place to leak them from.
    """
    actor, failure = _guard('security.view')
    if failure is not None:
        return failure

    from flask import current_app
    checks = [
        ('M-Pesa', 'MPESA_CONSUMER_KEY', current_app.config.get('MPESA_CONSUMER_KEY')),
        ('M-Pesa passkey', 'MPESA_PASSKEY', current_app.config.get('MPESA_PASSKEY')),
        ('SMS provider', 'SMS_WEBHOOK_TOKEN', current_app.config.get('SMS_WEBHOOK_TOKEN')),
        ('WhatsApp', 'WHATSAPP_ACCESS_TOKEN', current_app.config.get('WHATSAPP_ACCESS_TOKEN')),
        ('ShambaRecords', 'SHAMBA_RECORDS_API_KEY', current_app.config.get('SHAMBA_RECORDS_API_KEY')),
        ('Fernet (MFA)', 'FERNET_KEY', current_app.config.get('FERNET_KEY')),
    ]
    return jsonify({'integrations': [{
        'name': name,
        'env_var': var,
        # Configured means present and non-empty; nothing more.
        'configured': bool(value),
    } for name, var, value in checks]}), 200


# ── Support ─────────────────────────────────────────────────────────────

@platform_bp.route('/support/tickets', methods=['GET'])
@jwt_required()
def list_tickets():
    actor, failure = _guard('support.view')
    if failure is not None:
        return failure

    status = request.args.get('status')
    query = SupportTicket.query
    if status:
        query = query.filter(SupportTicket.status == status)
    rows = query.order_by(SupportTicket.updated_at.desc()).limit(
        MAX_PAGE_SIZE).all()

    counts = {s: SupportTicket.query.filter_by(status=s).count()
              for s in ('open', 'pending', 'resolved', 'closed')}
    return jsonify({'items': [t.to_dict() for t in rows],
                    'total': len(rows), 'counts': counts}), 200


@platform_bp.route('/support/tickets', methods=['POST'])
@jwt_required()
def create_ticket():
    actor, failure = _guard('support.manage')
    if failure is not None:
        return failure

    data, error = json_object()
    if error:
        return error
    subject = (data.get('subject') or '').strip()
    body = (data.get('body') or '').strip()
    if not subject or not body:
        return _error('subject and body are required')

    ticket = SupportTicket(
        user_id=data.get('user_id'), subject=subject, body=body,
        priority=(data.get('priority') or 'normal').strip(),
        status='open',
    )
    db.session.add(ticket)
    db.session.flush()
    db.session.add(SupportMessage(ticket_id=ticket.id, author_id=actor.id,
                                  body=body, is_staff=True))
    _record(actor, 'support.ticket_create', after={'subject': subject},
            ticket_id=ticket.id)
    db.session.commit()
    return jsonify({'message': 'Ticket created.', 'ticket': ticket.to_dict(
        include_messages=True)}), 201


@platform_bp.route('/support/tickets/<int:ticket_id>', methods=['GET'])
@jwt_required()
def ticket_detail(ticket_id):
    actor, failure = _guard('support.view')
    if failure is not None:
        return failure

    ticket = db.session.get(SupportTicket, ticket_id)
    if ticket is None:
        return _error('Ticket not found', 404)
    return jsonify({'ticket': ticket.to_dict(include_messages=True)}), 200


@platform_bp.route('/support/tickets/<int:ticket_id>/reply', methods=['POST'])
@jwt_required()
def reply_ticket(ticket_id):
    actor, failure = _guard('support.manage')
    if failure is not None:
        return failure

    ticket = db.session.get(SupportTicket, ticket_id)
    if ticket is None:
        return _error('Ticket not found', 404)

    data, error = json_object()
    if error:
        return error
    body = (data.get('body') or '').strip()
    if not body:
        return _error('A reply body is required')

    previous = ticket.status
    db.session.add(SupportMessage(ticket_id=ticket.id, author_id=actor.id,
                                  body=body, is_staff=True))
    ticket.status = 'pending'
    ticket.updated_at = utcnow()
    _record(actor, 'support.reply', before={'status': previous},
            after={'status': 'pending'}, ticket_id=ticket.id)
    db.session.commit()
    return jsonify({'message': 'Reply added.',
                    'ticket': ticket.to_dict(include_messages=True)}), 201


@platform_bp.route('/support/tickets/<int:ticket_id>/status', methods=['PATCH'])
@jwt_required()
def ticket_status(ticket_id):
    actor, failure = _guard('support.manage')
    if failure is not None:
        return failure

    ticket = db.session.get(SupportTicket, ticket_id)
    if ticket is None:
        return _error('Ticket not found', 404)

    data, error = json_object()
    if error:
        return error
    new_status = (data.get('status') or '').strip()
    if new_status not in ('open', 'pending', 'resolved', 'closed'):
        return _error('status must be open, pending, resolved or closed')

    before = ticket.status
    ticket.status = new_status
    ticket.updated_at = utcnow()
    if new_status in ('resolved', 'closed'):
        ticket.resolution_note = (data.get('resolution_note') or '').strip() or None

    _record(actor, 'support.status', before={'status': before},
            after={'status': new_status}, ticket_id=ticket.id)
    db.session.commit()
    return jsonify({'message': f'Ticket is now {new_status}.',
                    'ticket': ticket.to_dict()}), 200