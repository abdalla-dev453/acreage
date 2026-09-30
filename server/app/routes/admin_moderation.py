"""Phase 2: marketplace moderation, categories, order administration and the
remaining user-management actions (verification, badges, password reset).

Every mutating route records a before/after snapshot through the shared audit
helper, so the security centre shows exactly what changed without anyone having
to remember to attach a note.
"""

import logging
from datetime import timedelta

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from sqlalchemy import func, or_
from sqlalchemy.orm import selectinload

from app import db
from app.models.admin import AdminAuditLog
from app.models.moderation import ContentReport, ProductCategory, UserFlag
from app.models.order import Order, OrderItem
from app.models.product import Product
from app.models.user import User
from app.utils import admin_auth
from app.utils.http import json_object
from app.utils.rbac import permissions_for
from app.utils.time import utcnow

admin_mod_bp = Blueprint('admin_moderation', __name__)
logger = logging.getLogger(__name__)

MAX_PAGE_SIZE = 100
PRODUCT_STATES = ('draft', 'pending', 'approved', 'rejected', 'flagged')
PRODUCT_FIELDS = ['title', 'category', 'description', 'price_per_unit', 'unit',
                  'stock_quantity', 'is_available', 'is_featured',
                  'moderation_status', 'image_url', 'video_url']
USER_EDITABLE = ('username', 'email', 'phone_number', 'location', 'role',
                 'verification_status', 'verification_badge', 'quality_score')


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


def _snapshot(obj, fields):
    """Field-level before/after. Explicit field lists, never the whole model —
    snapshotting a User wholesale would write password hashes into the audit
    table, which is exactly the leak the schema excludes everywhere else."""
    out = {}
    for field in fields:
        value = getattr(obj, field, None)
        out[field] = value.isoformat() if hasattr(value, 'isoformat') else value
    return out


def _guard(permission):
    """Resolve the caller and check one permission.

    Returns (user, None) or (None, response).
    """
    from app.routes.admin import require_admin
    return require_admin(permission)


# ── Categories ──────────────────────────────────────────────────────────

@admin_mod_bp.route('/categories', methods=['GET'])
@jwt_required()
def list_categories():
    actor, failure = _guard('products.categorise')
    if failure is not None:
        return failure

    rows = ProductCategory.query.order_by(
        ProductCategory.sort_order, ProductCategory.name).all()
    counts = dict(
        db.session.query(Product.category, func.count(Product.id))
        .group_by(Product.category).all()
    )
    return jsonify({
        'items': [c.to_dict(product_count=counts.get(c.slug, 0) or counts.get(c.name, 0))
                  for c in rows],
        'total': len(rows),
        # Categories actually in use on listings but not yet declared. Without
        # this the typo problem is invisible until someone filters on it.
        'undeclared': sorted(
            name for name in counts
            if not any(c.slug == name or c.name == name for c in rows)
        ),
    }), 200


@admin_mod_bp.route('/categories', methods=['POST'])
@jwt_required()
def create_category():
    actor, failure = _guard('products.categorise')
    if failure is not None:
        return failure

    data, error = json_object()
    if error:
        return error

    name = (data.get('name') or '').strip()
    slug = (data.get('slug') or '').strip().lower().replace(' ', '-')
    if not name or not slug:
        return _error('name and slug are required')
    if not slug.replace('-', '').isalnum():
        return _error('slug may only contain letters, digits and dashes')
    if ProductCategory.query.filter_by(slug=slug).first():
        return _error(f'A category with slug {slug!r} already exists', 409)

    category = ProductCategory(
        name=name, slug=slug,
        description=(data.get('description') or '').strip() or None,
        default_unit=(data.get('default_unit') or '').strip() or None,
        icon=(data.get('icon') or '').strip() or None,
        sort_order=int(data.get('sort_order', 0) or 0),
    )
    db.session.add(category)
    _record(actor, 'category.create', after=category.to_dict())
    db.session.commit()
    logger.info('Admin %s created category %s', actor.username, slug)
    return jsonify({'message': f'Category {name} created.',
                    'category': category.to_dict()}), 201


@admin_mod_bp.route('/categories/<int:category_id>', methods=['PATCH'])
@jwt_required()
def update_category(category_id):
    actor, failure = _guard('products.categorise')
    if failure is not None:
        return failure

    category = db.session.get(ProductCategory, category_id)
    if category is None:
        return _error('Category not found', 404)

    data, error = json_object()
    if error:
        return error

    before = category.to_dict()
    for field in ('name', 'description', 'default_unit', 'icon', 'sort_order',
                  'is_active'):
        if field in data:
            setattr(category, field, data[field])

    # The slug is the value listings carry, so renaming it has to migrate
    # every listing or they silently land in an undeclared category.
    if 'slug' in data and data['slug'] != category.slug:
        new_slug = data['slug'].strip().lower().replace(' ', '-')
        if ProductCategory.query.filter_by(slug=new_slug).first():
            return _error(f'A category with slug {new_slug!r} already exists', 409)
        old_slug = category.slug
        moved = Product.query.filter_by(category=old_slug).update({'category': new_slug})
        category.slug = new_slug
        logger.info('Category %s renamed to %s, moved %s listings',
                    old_slug, new_slug, moved)

    _record(actor, 'category.update', before=before, after=category.to_dict())
    db.session.commit()
    return jsonify({'message': 'Category updated.', 'category': category.to_dict()}), 200


# ── Listings ────────────────────────────────────────────────────────────

@admin_mod_bp.route('/products', methods=['GET'])
@jwt_required()
def list_products():
    """Every listing, including hidden and flagged ones."""
    actor, failure = _guard('products.view')
    if failure is not None:
        return failure

    page = request.args.get('page', 1, type=int)
    per_page = min(request.args.get('per_page', 25, type=int), MAX_PAGE_SIZE)
    search = (request.args.get('q') or '').strip()
    state = request.args.get('moderation_status')
    category = request.args.get('category')
    featured = request.args.get('featured')

    query = Product.query.options(selectinload(Product.farmer))

    if search:
        like = f'%{search}%'
        query = query.filter(or_(Product.title.ilike(like),
                                 Product.category.ilike(like)))
    if state in PRODUCT_STATES:
        query = query.filter(Product.moderation_status == state)
    if category:
        query = query.filter(Product.category == category)
    if featured in ('true', 'false'):
        query = query.filter(Product.is_featured.is_(featured == 'true'))

    sort = request.args.get('sort', 'newest')
    if sort == 'reported':
        query = query.order_by(Product.report_count.desc(), Product.created_at.desc())
    elif sort == 'oldest':
        query = query.order_by(Product.created_at.asc())
    elif sort == 'price':
        query = query.order_by(Product.price_per_unit.desc())
    else:
        query = query.order_by(Product.created_at.desc())

    pagination = query.paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        'items': [{
            'id': p.id,
            'title': p.title,
            'category': p.category,
            'price_per_unit': p.price_per_unit,
            'unit': p.unit,
            'stock_quantity': p.stock_quantity,
            'reserved_quantity': p.reserved_quantity,
            'is_available': bool(p.is_available),
            'is_featured': bool(p.is_featured),
            'moderation_status': p.moderation_status,
            'moderation_note': p.moderation_note,
            'report_count': p.report_count,
            'view_count': p.view_count,
            'farmer_id': p.farmer_id,
            'farmer_username': p.farmer.username if p.farmer else None,
            'created_at': p.created_at.isoformat() if p.created_at else None,
            'moderated_at': p.moderated_at.isoformat() if p.moderated_at else None,
        } for p in pagination.items],
        'total': pagination.total,
        'page': pagination.page,
        'pages': pagination.pages,
        'has_next': pagination.has_next,
    }), 200


@admin_mod_bp.route('/products/<int:product_id>', methods=['PATCH'])
@jwt_required()
def moderate_product(product_id):
    """Approve, reject, flag, feature or edit a listing.

    `is_premium` is deliberately not editable here. It is a monetisation trust
    signal that listings could previously self-assign, so it is not an admin
    moderation input either; it needs its own deliberate path.
    """
    actor, failure = _guard('products.moderate')
    if failure is not None:
        return failure

    product = db.session.get(Product, product_id)
    if product is None:
        return _error('Listing not found', 404)

    data, error = json_object()
    if error:
        return error

    before = _snapshot(product, PRODUCT_FIELDS)
    changed = []
    note = (data.get('moderation_note') or '').strip() or None

    if 'moderation_status' in data:
        state = data['moderation_status']
        if state not in PRODUCT_STATES:
            return _error(
                f'moderation_status must be one of: {", ".join(PRODUCT_STATES)}'
            )
        # Rejecting or flagging without saying why is not actionable for the
        # farmer, and the note is what they see when they ask.
        if state in ('rejected', 'flagged') and not note and not product.moderation_note:
            return _error('A note is required when rejecting or flagging a listing')
        product.moderation_status = state
        product.moderated_by_id = actor.id
        product.moderated_at = utcnow()
        changed.append('moderation_status')

    if 'is_featured' in data:
        product.is_featured = bool(data['is_featured'])
        changed.append('is_featured')

    if note is not None:
        product.moderation_note = note
        changed.append('moderation_note')

    # Free-text corrections an admin may need to make.
    for field in ('title', 'category', 'description', 'price_per_unit', 'unit',
                  'stock_quantity', 'image_url', 'video_url'):
        if field in data:
            setattr(product, field, data[field])
            changed.append(field)

    if not changed:
        return _error('Nothing to change')

    _record(actor, 'product.moderate', target=product.farmer,
            before=before, after=_snapshot(product, PRODUCT_FIELDS),
            product_id=product.id, title=product.title, changed=changed)

    db.session.commit()
    logger.info('Admin %s moderated listing %s: %s',
                actor.username, product.title, ', '.join(changed))
    return jsonify({'message': f'Listing updated.', 'changed': changed}), 200


@admin_mod_bp.route('/products/<int:product_id>', methods=['DELETE'])
@jwt_required()
def remove_product(product_id):
    """Withdraw a listing. Stands down rather than deletes when it has trading
    history, so order history is not left pointing at nothing."""
    actor, failure = _guard('products.moderate')
    if failure is not None:
        return failure

    product = db.session.get(Product, product_id)
    if product is None:
        return _error('Listing not found', 404)

    sold = OrderItem.query.filter_by(product_id=product.id).count()
    if sold:
        product.is_available = False
        product.moderation_status = 'rejected'
        product.moderation_note = (
            f'Withdrawn by {actor.username}: appears in {sold} order(s).'
        )
        product.moderated_by_id = actor.id
        product.moderated_at = utcnow()
        _record(actor, 'product.withdraw', target=product.farmer,
                before={'is_available': True}, after={'is_available': False},
                product_id=product.id, title=product.title, order_items=sold)
        db.session.commit()
        return jsonify({
            'message': (f'Listing appears in {sold} order(s), so it was withdrawn '
                        'rather than deleted. Its history is preserved.'),
            'withdrawn': True,
        }), 200

    title = product.title
    _record(actor, 'product.delete', target=product.farmer,
            before={'title': title}, product_id=product.id, title=title)
    db.session.delete(product)
    db.session.commit()
    logger.warning('Admin %s deleted listing %s', actor.username, title)
    return jsonify({'message': f'"{title}" has been deleted.',
                    'withdrawn': False}), 200


@admin_mod_bp.route('/products/bulk', methods=['POST'])
@jwt_required()
def bulk_moderate():
    """Approve, reject or flag many listings at once."""
    actor, failure = _guard('products.moderate')
    if failure is not None:
        return failure

    data, error = json_object()
    if error:
        return error

    ids = data.get('ids') or []
    state = data.get('moderation_status')
    note = (data.get('moderation_note') or '').strip() or None

    if not isinstance(ids, list) or not ids:
        return _error('ids must be a non-empty list')
    if len(ids) > 200:
        return _error('At most 200 listings can be moderated in one request')
    if state not in PRODUCT_STATES:
        return _error(f'moderation_status must be one of: {", ".join(PRODUCT_STATES)}')
    if state in ('rejected', 'flagged') and not note:
        return _error('A note is required when rejecting or flagging')

    products = Product.query.filter(Product.id.in_(ids)).all()
    if not products:
        return _error('No listings matched those ids')

    for product in products:
        before = _snapshot(product, PRODUCT_FIELDS)
        product.moderation_status = state
        product.moderation_note = note
        product.moderated_by_id = actor.id
        product.moderated_at = utcnow()
        _record(actor, 'product.moderate.bulk', target=product.farmer,
                before=before, after=_snapshot(product, PRODUCT_FIELDS),
                product_id=product.id, note=note)

    db.session.commit()
    logger.info('Admin %s set %s listings to %s', actor.username, len(products), state)
    return jsonify({'message': f'{len(products)} listing(s) set to {state}.',
                    'count': len(products)}), 200


# ── Orders ──────────────────────────────────────────────────────────────

@admin_mod_bp.route('/orders', methods=['GET'])
@jwt_required()
def list_orders():
    """Every order on the platform, with both parties."""
    actor, failure = _guard('orders.view')
    if failure is not None:
        return failure

    page = request.args.get('page', 1, type=int)
    per_page = min(request.args.get('per_page', 25, type=int), MAX_PAGE_SIZE)
    search = (request.args.get('q') or '').strip()
    status = request.args.get('status')
    payment_status = request.args.get('payment_status')

    # Both eager loads go inside a single options() call. Chaining
    # .options(...).selectinload(...) is a bug: selectinload builds a loader
    # option, it is not a Query method.
    query = Order.query.options(
        selectinload(Order.buyer),
        selectinload(Order.farmer),
        # items is used for the line count, so loading it here avoids an
        # N+1 across the page.
        selectinload(Order.items),
    )

    if search:
        like = f'%{search}%'
        query = query.filter(
            or_(Order.order_code.ilike(like), Order.delivery_address.ilike(like))
        )
    if status:
        query = query.filter(Order.status == status)
    if payment_status:
        query = query.filter(Order.payment_status == payment_status)

    pagination = query.order_by(
        Order.created_at.desc()).paginate(page=page, per_page=per_page,
                                          error_out=False)

    return jsonify({
        'items': [{
            'id': o.id,
            'order_code': o.order_code,
            'buyer_id': o.buyer_id,
            'buyer_username': o.buyer.username if o.buyer else None,
            'farmer_id': o.farmer_id,
            'farmer_username': o.farmer.username if o.farmer else None,
            'total_amount': o.total_amount,
            'status': o.status,
            'payment_status': o.payment_status,
            'delivery_address': o.delivery_address,
            'line_count': len(o.items or []),
            'admin_note': o.admin_note,
            'intervened_at': o.intervened_at.isoformat() if o.intervened_at else None,
            'created_at': o.created_at.isoformat() if o.created_at else None,
        } for o in pagination.items],
        'total': pagination.total,
        'page': pagination.page,
        'pages': pagination.pages,
        'has_next': pagination.has_next,
        'facets': {
            'statuses': [r[0] for r in db.session.query(
                Order.status).distinct().order_by(Order.status).all() if r[0]],
            'payment_statuses': [r[0] for r in db.session.query(
                Order.payment_status).distinct().order_by(
                Order.payment_status).all() if r[0]],
        },
    }), 200


@admin_mod_bp.route('/orders/<int:order_id>', methods=['GET'])
@jwt_required()
def order_detail(order_id):
    actor, failure = _guard('orders.view')
    if failure is not None:
        return failure

    order = db.session.get(Order, order_id, options=[
        selectinload(Order.buyer), selectinload(Order.farmer),
    ])
    if order is None:
        return _error('Order not found', 404)

    items = OrderItem.query.filter_by(order_id=order.id).all()
    escrow = order.escrow_transaction

    return jsonify({
        'order': {
            'id': order.id,
            'order_code': order.order_code,
            'buyer': {'id': order.buyer.id, 'username': order.buyer.username,
                      'phone_number': order.buyer.phone_number}
            if order.buyer else None,
            'farmer': {'id': order.farmer.id, 'username': order.farmer.username,
                       'phone_number': order.farmer.phone_number}
            if order.farmer else None,
            'total_amount': order.total_amount,
            'status': order.status,
            'payment_status': order.payment_status,
            'quality_status': order.quality_status,
            'delivery_address': order.delivery_address,
            'contact_phone': order.contact_phone,
            'origin_location': order.origin_location,
            'admin_note': order.admin_note,
            'intervened_at': order.intervened_at.isoformat() if order.intervened_at else None,
            'created_at': order.created_at.isoformat() if order.created_at else None,
        },
        'items': [{
            'product_id': i.product_id,
            'title': i.product.title if i.product else None,
            'quantity': i.quantity,
            'unit': i.unit,
            'unit_price': i.unit_price,
            'line_total': i.line_total,
        } for i in items],
        'escrow': {
            'id': escrow.id, 'amount': escrow.amount, 'status': escrow.status,
            'checkout_request_id': escrow.checkout_request_id,
        } if escrow else None,
    }), 200


@admin_mod_bp.route('/orders/<int:order_id>/status', methods=['PATCH'])
@jwt_required()
def intervene_order(order_id):
    """Change an order's status or payment status out of band.

    Enforces the same transition graph the farmer-facing route uses. An admin
    override that skips the graph would be a way to bypass the escrow
    precondition on delivery, which is the whole point of the state machine.
    """
    actor, failure = _guard('orders.intervene')
    if failure is not None:
        return failure

    order = db.session.get(Order, order_id)
    if order is None:
        return _error('Order not found', 404)

    data, error = json_object()
    if error:
        return error

    note = (data.get('note') or '').strip()
    if not note:
        return _error('A note is required when intervening on an order')

    new_status = data.get('status')
    new_payment = data.get('payment_status')
    if not new_status and not new_payment:
        return _error('Provide status, payment_status, or both')

    before = _snapshot(order, ['status', 'payment_status', 'quality_status'])
    changed = []

    if new_status:
        allowed = {
            'pending': {'on delivery', 'cancelled'},
            'on delivery': {'delivered', 'cancelled'},
            'delivered': set(),
            'cancelled': set(),
        }
        if new_status not in allowed:
            return _error(f'Unknown status {new_status!r}')
        if new_status != order.status and new_status not in allowed.get(order.status, set()):
            return _error(
                f'Cannot move an order from {order.status!r} to {new_status!r}',
                409,
                allowed=sorted(allowed.get(order.status, set())),
            )
        if new_status != order.status:
            order.status = new_status
            changed.append('status')

    if new_payment:
        valid_payments = {'unpaid', 'pending', 'paid', 'refunded', 'failed'}
        if new_payment not in valid_payments:
            return _error(f'payment_status must be one of: {", ".join(sorted(valid_payments))}')
        if new_payment != order.payment_status:
            order.payment_status = new_payment
            changed.append('payment_status')

    if not changed:
        return _error('Nothing to change')

    order.admin_note = note
    order.intervened_by_id = actor.id
    order.intervened_at = utcnow()

    _record(actor, 'order.intervene', target=order.farmer,
            before=before, after=_snapshot(order, ['status', 'payment_status',
                                                   'quality_status']),
            order_id=order.id, order_code=order.order_code,
            changed=changed, note=note)

    db.session.commit()
    logger.warning('Admin %s intervened on order %s: %s',
                   actor.username, order.order_code, ', '.join(changed))
    return jsonify({'message': f'Order {order.order_code} updated.',
                    'changed': changed}), 200


# ── Flags and reports ───────────────────────────────────────────────────

@admin_mod_bp.route('/flags', methods=['GET'])
@jwt_required()
def list_flags():
    actor, failure = _guard('users.view')
    if failure is not None:
        return failure

    only_open = request.args.get('open', 'true').lower() != 'false'
    query = UserFlag.query.options(selectinload(UserFlag.user))
    if only_open:
        query = query.filter(UserFlag.cleared_at.is_(None))
    rows = query.order_by(UserFlag.created_at.desc()).limit(MAX_PAGE_SIZE).all()
    return jsonify({'items': [f.to_dict() for f in rows], 'total': len(rows)}), 200


@admin_mod_bp.route('/flags', methods=['POST'])
@jwt_required()
def raise_flag():
    actor, failure = _guard('users.edit')
    if failure is not None:
        return failure

    data, error = json_object()
    if error:
        return error

    user_id = data.get('user_id')
    reason = (data.get('reason') or '').strip()
    if not user_id or not reason:
        return _error('user_id and reason are required')

    target = db.session.get(User, user_id)
    if target is None:
        return _error('User not found', 404)
    if target.id == actor.id:
        return _error('You cannot flag your own account', 409)

    flag = UserFlag(
        user_id=target.id,
        category=(data.get('category') or 'other').strip(),
        reason=reason,
        severity=(data.get('severity') or 'medium').strip(),
        raised_by_id=actor.id,
    )
    db.session.add(flag)
    _record(actor, 'user.flag', target=target,
            after={'category': flag.category, 'severity': flag.severity},
            reason=reason)
    db.session.commit()
    logger.info('Admin %s flagged %s (%s)', actor.username, target.username, flag.severity)
    return jsonify({'message': f'{target.username} flagged.', 'flag': flag.to_dict()}), 201


@admin_mod_bp.route('/flags/<int:flag_id>/clear', methods=['POST'])
@jwt_required()
def clear_flag(flag_id):
    actor, failure = _guard('users.edit')
    if failure is not None:
        return failure

    flag = db.session.get(UserFlag, flag_id)
    if flag is None:
        return _error('Flag not found', 404)
    if not flag.is_open:
        return _error('That flag is already cleared', 409)

    data, error = json_object()
    if error:
        return error
    reason = (data.get('reason') or '').strip() or None

    flag.cleared_by_id = actor.id
    flag.cleared_at = utcnow()
    flag.cleared_reason = reason
    _record(actor, 'user.flag_clear', target=db.session.get(User, flag.user_id),
            before={'cleared_at': None}, after={'cleared_at': flag.cleared_at.isoformat()},
            reason=reason)
    db.session.commit()
    return jsonify({'message': 'Flag cleared.'}), 200


@admin_mod_bp.route('/reports', methods=['GET'])
@jwt_required()
def list_reports():
    actor, failure = _guard('users.view')
    if failure is not None:
        return failure

    status = request.args.get('status')
    query = ContentReport.query.options(
        selectinload(ContentReport.reporter),
        selectinload(ContentReport.resolved_by),
    )
    if status in ('open', 'actioned', 'dismissed'):
        query = query.filter(ContentReport.status == status)
    rows = query.order_by(ContentReport.created_at.desc()).limit(
        MAX_PAGE_SIZE).all()

    counts = {
        'open': ContentReport.query.filter_by(status='open').count(),
        'actioned': ContentReport.query.filter_by(status='actioned').count(),
        'dismissed': ContentReport.query.filter_by(status='dismissed').count(),
    }
    return jsonify({
        'items': [r.to_dict(_label_for(r)) for r in rows],
        'total': len(rows),
        'counts': counts,
    }), 200


def _label_for(report):
    """A human label for whatever was reported, so the queue is readable
    without opening each target."""
    if report.target_type == 'product':
        product = db.session.get(Product, report.target_id)
        return product.title if product else 'listing no longer exists'
    if report.target_type == 'user':
        user = db.session.get(User, report.target_id)
        return user.username if user else 'account no longer exists'
    return f'{report.target_type} #{report.target_id}'


@admin_mod_bp.route('/reports', methods=['POST'])
@jwt_required()
def create_report():
    """File a report. Usable by administrators and, if a public reporting
    endpoint is added later, by ordinary users."""
    actor, failure = _guard('users.view')
    if failure is not None:
        return failure

    data, error = json_object()
    if error:
        return error

    target_type = (data.get('target_type') or '').strip()
    if target_type not in ('product', 'user', 'review', 'chat_message'):
        return _error('target_type must be product, user, review or chat_message')
    reason = (data.get('reason') or '').strip()
    if not data.get('target_id') or not reason:
        return _error('target_id and reason are required')

    report = ContentReport(
        target_type=target_type,
        target_id=int(data['target_id']),
        reason=reason,
        category=(data.get('category') or 'other').strip(),
        details=(data.get('details') or '').strip() or None,
        reporter_user_id=actor.id,
    )
    db.session.add(report)
    # Keep the denormalised counter on the listing in step, so the moderation
    # queue can sort by "most reported" without a per-row subquery.
    if target_type == 'product':
        product = db.session.get(Product, int(data['target_id']))
        if product:
            product.report_count = (product.report_count or 0) + 1
    _record(actor, 'report.create', after={'target_type': target_type,
                                           'target_id': data['target_id']},
            reason=reason)
    db.session.commit()
    return jsonify({'message': 'Report filed.', 'report': report.to_dict()}), 201


@admin_mod_bp.route('/reports/<int:report_id>/resolve', methods=['POST'])
@jwt_required()
def resolve_report(report_id):
    actor, failure = _guard('users.edit')
    if failure is not None:
        return failure

    report = db.session.get(ContentReport, report_id)
    if report is None:
        return _error('Report not found', 404)
    if report.status != 'open':
        return _error(f'That report is already {report.status}', 409)

    data, error = json_object()
    if error:
        return error

    outcome = (data.get('outcome') or '').strip()
    if outcome not in ('actioned', 'dismissed'):
        return _error("outcome must be 'actioned' or 'dismissed'")
    note = (data.get('note') or '').strip() or None

    report.status = outcome
    report.resolved_by_id = actor.id
    report.resolved_at = utcnow()
    report.resolution_note = note
    _record(actor, f'report.{outcome}',
            before={'status': 'open'}, after={'status': outcome},
            report_id=report.id, note=note)
    db.session.commit()
    return jsonify({'message': f'Report {outcome}.',
                    'report': report.to_dict()}), 200


# ── Remaining user management ───────────────────────────────────────────

@admin_mod_bp.route('/users/<int:user_id>/verify', methods=['PATCH'])
@jwt_required()
def verify_user(user_id):
    """Approve or reject a farmer registration and set their badge."""
    actor, failure = _guard('users.verify')
    if failure is not None:
        return failure

    user = db.session.get(User, user_id)
    if user is None:
        return _error('User not found', 404)

    data, error = json_object()
    if error:
        return error

    decision = (data.get('decision') or '').strip()
    if decision not in ('approve', 'reject'):
        return _error("decision must be 'approve' or 'reject'")

    badge = (data.get('verification_badge') or '').strip() or None
    reason = (data.get('reason') or '').strip() or None

    if decision == 'reject' and not reason:
        return _error('A reason is required when rejecting a registration')

    before = _snapshot(user, USER_EDITABLE)

    if decision == 'approve':
        user.verification_status = 'verified'
        user.email_verified = True
        user.verification_badge = badge or 'verified'
        user.verification_token_hash = None
        user.verification_token_expires_at = None
    else:
        user.verification_status = 'rejected'
        user.verification_badge = None

    _record(actor, f'user.{decision}', target=user,
            before=before, after=_snapshot(user, USER_EDITABLE),
            badge=user.verification_badge, reason=reason)

    db.session.commit()
    logger.info('Admin %s %sd %s', actor.username, decision, user.username)
    return jsonify({'message': f'{user.username} {decision}d.',
                    'user': {'id': user.id,
                             'verification_status': user.verification_status,
                             'verification_badge': user.verification_badge}}), 200


@admin_mod_bp.route('/users/<int:user_id>/reset-password', methods=['POST'])
@jwt_required()
def reset_user_password(user_id):
    """Force a password reset: clears the hash and the issued token.

    No new password is set. Inventing one here would mean the administrator
    knows the user's credential, which is not something an admin panel should
    make possible; the user resets it themselves via the normal flow.
    """
    actor, failure = _guard('users.reset_password')
    if failure is not None:
        return failure

    user = db.session.get(User, user_id)
    if user is None:
        return _error('User not found', 404)
    if user.is_privileged:
        return _error(
            'Administrator passwords cannot be reset from this panel. Reset it '
            'with scripts/create_superadmin.py or the recovery flow.', 403,
        )

    before = {'password_hash': '<redacted>'}
    user.password_hash = ''  # forces a reset; unusable for sign-in
    user.reset_token_hash = None
    user.reset_token_expires_at = None
    user.revoke_tokens()

    _record(actor, 'user.password_reset', target=user,
            before=before, after={'password_hash': '<cleared>'},
            sessions_revoked=True)

    db.session.commit()
    logger.warning('Admin %s forced a password reset for %s',
                   actor.username, user.username)
    return jsonify({
        'message': (f'{user.username} must set a new password at '
                    '/forgot-password before signing in again. All their '
                    'sessions have been ended.'),
    }), 200


@admin_mod_bp.route('/users/<int:user_id>/flag', methods=['POST'])
@jwt_required()
def flag_user(user_id):
    """Shortcut from the user directory."""
    actor, failure = _guard('users.edit')
    if failure is not None:
        return failure

    user = db.session.get(User, user_id)
    if user is None:
        return _error('User not found', 404)

    data, error = json_object()
    if error:
        return error
    reason = (data.get('reason') or '').strip()
    if not reason:
        return _error('A reason is required')
    # Same guard as raise_flag. This shortcut route was added separately and
    # had drifted, which let an administrator flag their own account.
    if user.id == actor.id:
        return _error('You cannot flag your own account', 409)

    flag = UserFlag(user_id=user.id,
                    category=(data.get('category') or 'other').strip(),
                    reason=reason,
                    severity=(data.get('severity') or 'medium').strip(),
                    raised_by_id=actor.id)
    db.session.add(flag)
    _record(actor, 'user.flag', target=user,
            after={'category': flag.category, 'severity': flag.severity},
            reason=reason)
    db.session.commit()
    return jsonify({'message': f'{user.username} flagged.', 'flag': flag.to_dict()}), 201