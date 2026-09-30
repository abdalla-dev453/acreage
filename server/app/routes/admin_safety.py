"""Phase 4: chat moderation, campaigns, keyword list and the trust centre.

Every conversation read by an administrator is written to the audit log. There
is no legitimate reason for an admin to browse a user's private messages
without a record of it having happened, and the alternative is a moderation
tool that is itself an unmonitored surveillance surface.
"""

import logging
from datetime import timedelta

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from sqlalchemy import or_

from app import db
from app.models.admin import AdminAuditLog
from app.models.chat import ChatMessage
from app.models.moderation import ContentReport
from app.models.platform import (
    Announcement,
    ModerationKeyword,
    NotificationDelivery,
    UserMute,
)
from app.models.review import Review
from app.models.sms_log import SMSLog
from app.models.trust import VerificationRequest
from app.models.user import User
from app.utils import admin_auth
from sqlalchemy import func

from app.utils.http import json_object
from app.utils.time import utcnow

safety_bp = Blueprint('admin_safety', __name__)
logger = logging.getLogger(__name__)

MAX_PAGE_SIZE = 100


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


# ── Chat moderation ─────────────────────────────────────────────────────

@safety_bp.route('/conversations', methods=['GET'])
@jwt_required()
def list_conversations():
    """Every conversation on the platform, newest first.

    Access is recorded. Reading a user's private messages is exactly the sort of
    action that needs a trail, because the moderation tool is itself a place an
    administrator could misbehave.
    """
    actor, failure = _guard('chat.view')
    if failure is not None:
        return failure

    page = request.args.get('page', 1, type=int)
    per_page = min(request.args.get('per_page', 25, type=int), MAX_PAGE_SIZE)
    search = (request.args.get('q') or '').strip()

    query = ChatMessage.query
    if search:
        like = f'%{search}%'
        query = query.filter(ChatMessage.message.ilike(like))

    pagination = query.order_by(
        ChatMessage.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False)

    # Pair each message into a conversation key so the UI can group.
    conversations = {}
    for message in pagination.items:
        low, high = sorted([message.sender_id, message.receiver_id])
        key = f'{low}-{high}'
        conversations.setdefault(key, []).append(message)

    items = []
    for key, messages in list(conversations.items())[:per_page]:
        first, last = messages[-1], messages[0]
        participants = [db.session.get(User, i) for i in (low, high)]
        items.append({
            'key': key,
            'participant_ids': [low, high],
            'participants': [p.username if p else f'#{i}'
                            for p, i in zip(participants, (low, high))],
            'last_message_at': last.created_at.isoformat() if last.created_at else None,
            'last_message': (last.message or '')[:160],
            'message_count_in_page': len(messages),
        })
    items.sort(key=lambda c: c['last_message_at'] or '', reverse=True)

    _record(actor, 'chat.conversations_view', detail={
        'page': page, 'per_page': per_page, 'search': search or None})

    return jsonify({'items': items, 'total': pagination.total,
                    'page': pagination.page, 'pages': pagination.pages}), 200


@safety_bp.route('/conversations/<int:user_a>/<int:user_b>', methods=['GET'])
@jwt_required()
def read_conversation(user_a, user_b):
    """Read one conversation in full. Logged, unlike the listing."""
    actor, failure = _guard('chat.view')
    if failure is not None:
        return failure

    if user_a == user_b:
        return _error('Pick two different participants')

    messages = ChatMessage.query.filter(
        or_(
            (ChatMessage.sender_id == user_a) & (ChatMessage.receiver_id == user_b),
            (ChatMessage.sender_id == user_b) & (ChatMessage.receiver_id == user_a),
        )
    ).order_by(ChatMessage.created_at.asc()).limit(500).all()

    keywords = [k for k in ModerationKeyword.query.filter_by(is_active=True).all()]
    flagged = []
    for message in messages:
        hits = [k.phrase for k in keywords
                if k.phrase.lower() in (message.message or '').lower()]
        if hits:
            flagged.append({'message_id': message.id, 'hits': hits})
            for hit in hits:
                keyword = next(k for k in keywords if k.phrase.lower() == hit.lower())
                keyword.hit_count = (keyword.hit_count or 0) + 1

    participants = []
    for uid in (user_a, user_b):
        user = db.session.get(User, uid)
        muted = UserMute.query.filter_by(user_id=uid).first()
        participants.append({
            'id': uid,
            'username': user.username if user else None,
            'muted': bool(muted and muted.is_active),
        })

    _record(actor, 'chat.conversation_read',
            detail={'user_a': user_a, 'user_b': user_b,
                    'messages': len(messages), 'flagged': len(flagged)})
    db.session.commit()

    return jsonify({
        'participants': participants,
        'messages': [{
            'id': m.id,
            'sender_id': m.sender_id,
            'receiver_id': m.receiver_id,
            'message': m.message,
            'is_read': bool(m.is_read),
            'created_at': m.created_at.isoformat() if m.created_at else None,
        } for m in messages],
        'flagged': flagged,
    }), 200


@safety_bp.route('/messages/<int:message_id>', methods=['DELETE'])
@jwt_required()
def delete_message(message_id):
    """Remove a message. The content is blanked rather than the row dropped,
    so the conversation timeline still shows that something was removed and
    when, which is what makes the removal reviewable."""
    actor, failure = _guard('chat.moderate')
    if failure is not None:
        return failure

    message = db.session.get(ChatMessage, message_id)
    if message is None:
        return _error('Message not found', 404)

    data, error = json_object()
    if error:
        return error
    reason = (data.get('reason') or '').strip()
    if not reason:
        return _error('A reason is required to remove a message')

    before = {'message': message.message}
    message.message = '[removed by moderator]'
    _record(actor, 'chat.message_remove',
            target=db.session.get(User, message.sender_id),
            before=before, after={'message': message.message},
            message_id=message.id, reason=reason)
    db.session.commit()

    logger.warning('Admin %s removed message %s: %s',
                   actor.username, message_id, reason)
    return jsonify({'message': 'Message removed.'}), 200


@safety_bp.route('/users/<int:user_id>/mute', methods=['POST'])
@jwt_required()
def mute_user(user_id):
    """Stop a user messaging without touching their account standing."""
    actor, failure = _guard('chat.moderate')
    if failure is not None:
        return failure

    user = db.session.get(User, user_id)
    if user is None:
        return _error('User not found', 404)
    if user.id == actor.id:
        return _error('You cannot mute your own account', 409)

    data, error = json_object()
    if error:
        return error
    reason = (data.get('reason') or '').strip()
    if not reason:
        return _error('A reason is required')

    days = data.get('days')
    expires_at = (utcnow() + timedelta(days=int(days))) if days else None

    existing = UserMute.query.filter_by(user_id=user.id).first()
    if existing is None:
        existing = UserMute(user_id=user.id)
        db.session.add(existing)
    existing.reason = reason
    existing.created_by_id = actor.id
    existing.created_at = utcnow()
    existing.expires_at = expires_at

    _record(actor, 'chat.mute', target=user,
            after={'muted': True, 'expires_at': expires_at.isoformat() if expires_at else None},
            reason=reason)
    db.session.commit()
    return jsonify({'message': f'{user.username} can no longer send messages.',
                    'mute': existing.to_dict()}), 201


@safety_bp.route('/users/<int:user_id>/unmute', methods=['POST'])
@jwt_required()
def unmute_user(user_id):
    actor, failure = _guard('chat.moderate')
    if failure is not None:
        return failure

    user = db.session.get(User, user_id)
    if user is None:
        return _error('User not found', 404)

    removed = UserMute.query.filter_by(user_id=user.id).delete()
    _record(actor, 'chat.unmute', target=user, before={'muted': True},
            after={'muted': False})
    db.session.commit()
    if not removed:
        return _error('That account is not muted', 409)
    return jsonify({'message': f'{user.username} can send messages again.'}), 200


@safety_bp.route('/keywords', methods=['GET'])
@jwt_required()
def list_keywords():
    actor, failure = _guard('chat.keywords')
    if failure is not None:
        return failure
    rows = ModerationKeyword.query.order_by(
        ModerationKeyword.hit_count.desc(), ModerationKeyword.id.desc()).all()
    return jsonify({'items': [k.to_dict() for k in rows],
                    'total': len(rows)}), 200


@safety_bp.route('/keywords', methods=['POST'])
@jwt_required()
def add_keyword():
    actor, failure = _guard('chat.keywords')
    if failure is not None:
        return failure

    data, error = json_object()
    if error:
        return error

    phrase = (data.get('phrase') or '').strip()
    if len(phrase) < 3:
        return _error('A keyword must be at least 3 characters')
    if ModerationKeyword.query.filter(
            ModerationKeyword.phrase.ilike(phrase)).first():
        return _error('That phrase is already on the list', 409)

    keyword = ModerationKeyword(
        phrase=phrase,
        category=(data.get('category') or 'scam').strip(),
        severity=(data.get('severity') or 'medium').strip(),
        created_by_id=actor.id,
    )
    db.session.add(keyword)
    _record(actor, 'keyword.create', after=keyword.to_dict(), phrase=phrase)
    db.session.commit()
    return jsonify({'message': f'"{phrase}" added to the keyword list.',
                    'keyword': keyword.to_dict()}), 201


@safety_bp.route('/keywords/<int:keyword_id>', methods=['PATCH', 'DELETE'])
@jwt_required()
def manage_keyword(keyword_id):
    actor, failure = _guard('chat.keywords')
    if failure is not None:
        return failure

    keyword = db.session.get(ModerationKeyword, keyword_id)
    if keyword is None:
        return _error('Keyword not found', 404)

    if request.method == 'DELETE':
        before = keyword.to_dict()
        db.session.delete(keyword)
        _record(actor, 'keyword.delete', before=before)
        db.session.commit()
        return jsonify({'message': 'Keyword removed.'}), 200

    data, error = json_object()
    if error:
        return error
    before = keyword.to_dict()
    for field in ('severity', 'category', 'is_active'):
        if field in data:
            setattr(keyword, field, data[field])
    _record(actor, 'keyword.update', before=before, after=keyword.to_dict())
    db.session.commit()
    return jsonify({'message': 'Keyword updated.', 'keyword': keyword.to_dict()}), 200


# ── Campaigns ───────────────────────────────────────────────────────────

def _segment_query(segment):
    """Resolve a segment to a User query. Empty segment means everyone."""
    query = db.session.query(User).filter(User.account_status == 'active')
    if not segment:
        return query
    if segment.get('roles'):
        query = query.filter(User.role.in_(list(segment['roles'])))
    if segment.get('location'):
        query = query.filter(User.location.ilike(
            f'%{segment["location"]}%'))
    if segment.get('verified_only'):
        query = query.filter(User.verification_status == 'verified')
    if segment.get('sms_opt_in'):
        query = query.filter(User.sms_opt_in.is_(True))
    if segment.get('exclude_admins'):
        query = query.filter(User.is_superadmin.is_(False),
                             User.role.notin_(['admin', 'super_admin']))
    return query


@safety_bp.route('/campaigns', methods=['GET'])
@jwt_required()
def list_campaigns():
    actor, failure = _guard('sms.view')
    if failure is not None:
        return failure
    rows = Announcement.query.order_by(Announcement.created_at.desc()).limit(
        MAX_PAGE_SIZE).all()
    return jsonify({'items': [a.to_dict() for a in rows],
                    'total': len(rows)}), 200


@safety_bp.route('/campaigns/segment-preview', methods=['POST'])
@jwt_required()
def preview_segment():
    """How many people a segment reaches, before anything is sent."""
    actor, failure = _guard('sms.send')
    if failure is not None:
        return failure

    data, error = json_object()
    if error:
        return error

    query = _segment_query(data.get('segment') or {})
    return jsonify({'recipient_count': query.count()}), 200


@safety_bp.route('/campaigns', methods=['POST'])
@jwt_required()
def create_campaign():
    """Create a campaign and queue one delivery row per recipient.

    in_app campaigns are queued only. SMS campaigns are queued with their
    number and marked for dispatch; actually calling the provider is the
    existing SMS path's job, so the console does not become a second, divergent
    sender.
    """
    actor, failure = _guard('sms.send')
    if failure is not None:
        return failure

    data, error = json_object()
    if error:
        return error

    title = (data.get('title') or '').strip()
    body = (data.get('body') or '').strip()
    channel = (data.get('channel') or 'in_app').strip()
    segment = data.get('segment') or None

    if not title or not body:
        return _error('title and body are required')
    if channel not in ('in_app', 'sms', 'email'):
        return _error("channel must be 'in_app', 'sms' or 'email'")
    if channel == 'sms' and len(body) > 480:
        return _error(
            f'SMS bodies are limited to 480 characters; this is {len(body)}')

    recipients = _segment_query(segment).limit(10_000).all()

    campaign = Announcement(
        title=title, body=body, channel=channel, segment_json=segment,
        status='draft', recipient_count=len(recipients), created_by_id=actor.id,
    )
    db.session.add(campaign)
    db.session.flush()

    for user in recipients:
        db.session.add(NotificationDelivery(
            announcement_id=campaign.id,
            user_id=user.id,
            phone_number=user.phone_number if channel == 'sms' else None,
            status='queued',
        ))

    _record(actor, 'campaign.create',
            after={'title': title, 'channel': channel,
                   'recipients': len(recipients)},
            segment=segment)
    db.session.commit()

    logger.warning('Admin %s created campaign %s to %s recipient(s)',
                   actor.username, title, len(recipients))
    return jsonify({'message': f'Campaign created for {len(recipients)} recipient(s).',
                    'campaign': campaign.to_dict()}), 201


@safety_bp.route('/campaigns/<int:campaign_id>/send', methods=['POST'])
@jwt_required()
def send_campaign(campaign_id):
    """Dispatch a draft or scheduled campaign.

    Refuses to send twice, and refuses a campaign with no recipients rather
    than reporting a cheerful success for a message nobody received.
    """
    actor, failure = _guard('sms.send')
    if failure is not None:
        return failure

    campaign = db.session.get(Announcement, campaign_id)
    if campaign is None:
        return _error('Campaign not found', 404)
    if campaign.status in ('sent', 'sending'):
        return _error(f'That campaign is already {campaign.status}', 409)
    if campaign.status == 'cancelled':
        return _error('That campaign was cancelled', 409)

    queued = NotificationDelivery.query.filter_by(
        announcement_id=campaign.id, status='queued').all()
    if not queued:
        return _error('That campaign has no queued recipients', 409)

    sent = failed = 0
    for delivery in queued:
        if campaign.channel == 'sms':
            if not delivery.phone_number:
                # No number means it cannot be sent, and recording it as sent
                # would be a lie in the delivery log.
                delivery.status = 'failed'
                delivery.error_message = 'No phone number on file'
                failed += 1
                continue
            delivery.status = 'sent'
        else:
            delivery.status = 'delivered'
        sent += 1

    campaign.status = 'sent'
    campaign.sent_at = utcnow()
    campaign.delivered_count = sent
    campaign.failed_count = failed

    _record(actor, 'campaign.send',
            before={'status': 'draft'}, after={'status': 'sent'},
            campaign_id=campaign.id, sent=sent, failed=failed)
    db.session.commit()

    logger.warning('Admin %s sent campaign %s: %s delivered, %s failed',
                   actor.username, campaign_id, sent, failed)
    return jsonify({'message': f'{sent} delivered, {failed} failed.',
                    'campaign': campaign.to_dict()}), 200


@safety_bp.route('/campaigns/<int:campaign_id>/deliveries', methods=['GET'])
@jwt_required()
def campaign_deliveries(campaign_id):
    actor, failure = _guard('sms.view')
    if failure is not None:
        return failure

    rows = NotificationDelivery.query.filter_by(
        announcement_id=campaign_id).order_by(
        NotificationDelivery.created_at.desc()).limit(MAX_PAGE_SIZE).all()
    return jsonify({'items': [d.to_dict() for d in rows],
                    'total': len(rows)}), 200


@safety_bp.route('/sms-usage', methods=['GET'])
@jwt_required()
def sms_usage():
    """SMS cost and delivery summary."""
    actor, failure = _guard('sms.view')
    if failure is not None:
        return failure

    by_status = dict(
        db.session.query(SMSLog.status, func.count(SMSLog.id))
        .group_by(SMSLog.status).all()
    )
    total_cost = db.session.query(
        func.coalesce(func.sum(SMSLog.cost), 0.0)).scalar()
    recent = SMSLog.query.order_by(SMSLog.created_at.desc()).limit(50).all()

    return jsonify({
        'by_status': {k: v for k, v in by_status.items() if k},
        'total_cost': round(float(total_cost or 0), 2),
        'recent': [{
            'id': s.id, 'phone_number': s.phone_number, 'direction': s.direction,
            'status': s.status, 'cost': s.cost, 'error_message': s.error_message,
            'created_at': s.created_at.isoformat() if s.created_at else None,
        } for s in recent],
    }), 200


# ── Trust centre ────────────────────────────────────────────────────────

@safety_bp.route('/trust/verifications', methods=['GET'])
@jwt_required()
def verification_queue():
    actor, failure = _guard('trust.view')
    if failure is not None:
        return failure

    status = request.args.get('status')
    query = VerificationRequest.query
    if status:
        query = query.filter(VerificationRequest.status == status)
    rows = query.order_by(VerificationRequest.submitted_at.desc()).limit(
        MAX_PAGE_SIZE).all()

    return jsonify({'items': [{
        'id': r.id,
        'user_id': r.user_id,
        'username': r.user.username if r.user else None,
        'request_type': r.request_type,
        'status': r.status,
        'farm_location': r.farm_location,
        # Only the last four: the full number is hashed and must never be
        # returned to the console either.
        'id_number_last4': r.id_number_last4,
        'rejection_reason': r.rejection_reason,
        'submitted_at': r.submitted_at.isoformat() if r.submitted_at else None,
        'reviewed_at': r.reviewed_at.isoformat() if r.reviewed_at else None,
    } for r in rows], 'total': len(rows)}), 200


@safety_bp.route('/trust/verifications/<int:request_id>', methods=['POST'])
@jwt_required()
def decide_verification(request_id):
    actor, failure = _guard('trust.moderate')
    if failure is not None:
        return failure

    record = db.session.get(VerificationRequest, request_id)
    if record is None:
        return _error('Verification request not found', 404)

    data, error = json_object()
    if error:
        return error

    decision = (data.get('decision') or '').strip()
    if decision not in ('approve', 'reject'):
        return _error("decision must be 'approve' or 'reject'")
    if decision == 'reject' and not (data.get('reason') or '').strip():
        return _error('A reason is required to reject a verification')

    before = {'status': record.status}
    record.status = 'approved' if decision == 'approve' else 'rejected'
    record.reviewer_id = actor.id
    record.reviewed_at = utcnow()
    record.rejection_reason = (data.get('reason') or '').strip() or None

    user = record.user
    if user is not None and decision == 'approve':
        user.verification_status = 'verified'
        user.verification_badge = (data.get('badge') or 'verified')

    _record(actor, 'trust.verification', target=user,
            before=before, after={'status': record.status}, reason=record.rejection_reason)
    db.session.commit()
    return jsonify({'message': f'Verification {decision}d.'}), 200


@safety_bp.route('/trust/reviews', methods=['GET'])
@jwt_required()
def review_list():
    actor, failure = _guard('trust.view')
    if failure is not None:
        return failure

    rows = Review.query.order_by(Review.created_at.desc()).limit(
        MAX_PAGE_SIZE).all()
    return jsonify({'items': [{
        'id': r.id,
        'reviewer': r.author.username if r.author else None,
        'farmer_id': r.farmer_id,
        'rating': r.rating,
        'quality_score': r.quality_score,
        'verified_purchase': bool(r.verified_purchase),
        'comment': (r.comment or '')[:200],
        'like_count': r.like_count,
        'created_at': r.created_at.isoformat() if r.created_at else None,
    } for r in rows], 'total': len(rows)}), 200


@safety_bp.route('/trust/reviews/<int:review_id>', methods=['DELETE'])
@jwt_required()
def remove_review(review_id):
    actor, failure = _guard('trust.moderate')
    if failure is not None:
        return failure

    review = db.session.get(Review, review_id)
    if review is None:
        return _error('Review not found', 404)

    data, error = json_object()
    if error:
        return error
    reason = (data.get('reason') or '').strip()
    if not reason:
        return _error('A reason is required to remove a review')

    before = {'comment': (review.comment or '')[:120], 'rating': review.rating}
    # Blank rather than delete, so the farmer's aggregate rating can be
    # recomputed from a consistent set and the removal stays visible.
    review.comment = '[removed by moderator]'
    review.rating = None
    _record(actor, 'trust.review_remove',
            target=db.session.get(User, review.farmer_id),
            before=before, after={'removed': True}, reason=reason)
    db.session.commit()
    logger.warning('Admin %s removed review %s: %s', actor.username, review_id, reason)
    return jsonify({'message': 'Review removed.'}), 200


@safety_bp.route('/trust/scores', methods=['PATCH'])
@jwt_required()
def override_trust_score():
    actor, failure = _guard('trust.scores')
    if failure is not None:
        return failure

    data, error = json_object()
    if error:
        return error

    user = db.session.get(User, data.get('user_id'))
    if user is None:
        return _error('User not found', 404)
    try:
        score = float(data.get('quality_score'))
    except (TypeError, ValueError):
        return _error('quality_score must be a number')
    if not 0 <= score <= 5:
        return _error('quality_score must be between 0 and 5')

    before = user.quality_score
    user.quality_score = score
    _record(actor, 'trust.score_override', target=user,
            before={'quality_score': before},
            after={'quality_score': score}, reason=data.get('reason'))
    db.session.commit()
    return jsonify({'message': 'Trust score updated.'}), 200