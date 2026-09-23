import os
import re
import uuid
from datetime import datetime

from flask import Blueprint, current_app, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from sqlalchemy import desc
from sqlalchemy.orm import selectinload

from app import db
from app.models.commerce import (
    EscrowEvent,
    EscrowTransaction,
    GroupOrder,
    GroupOrderCommitment,
    HarvestPlan,
    HarvestPreorder,
    MarketPriceObservation,
    Receipt,
    SmsCommand,
    TransportQuote,
)
from app.models.order import Order, OrderItem
from app.models.product import Product
from app.models.user import User
from app.schemas.commerce import (
    escrow_transaction_schema,
    group_commitment_schema,
    group_order_schema,
    group_orders_schema,
    harvest_plan_schema,
    harvest_plans_schema,
    harvest_preorder_schema,
    harvest_preorders_schema,
    market_price_schema,
    market_prices_schema,
    receipt_schema,
    receipts_schema,
    sms_command_schema,
    sms_commands_schema,
    transport_quote_schema,
    transport_quotes_schema,
)
from app.schemas.order import order_schema
from app.services.escrow import (
    confirm_quality,
    dispute_escrow,
    get_or_create_escrow,
    release_escrow,
    refund_escrow,
    user_can_view,
)
from app.services.providers import (
    ProviderUnavailable,
    idempotency_key,
    market_price_provider,
    sms_provider,
    transport_provider,
)
from app.services.units import normalize_unit, to_kg, unit_weight_kg
from app.utils.http import json_object
from app.utils.time import utcnow

commerce_bp = Blueprint('commerce', __name__)


def _user():
    return db.get_or_404(User, int(get_jwt_identity()))


def _order_or_404(order_id):
    return db.get_or_404(Order, order_id)


def _can_access_order(user, order):
    return user.role == 'admin' or user.id in {order.buyer_id, order.farmer_id}


def _parse_datetime(value, field):
    if not value:
        return None
    if isinstance(value, datetime):
        return value
    try:
        return datetime.fromisoformat(str(value).replace('Z', '+00:00')).replace(tzinfo=None)
    except ValueError:
        raise ValueError(f'{field} must be an ISO date-time')


def _parse_date(value, field):
    if not value:
        return None
    if isinstance(value, datetime):
        return value.date()
    try:
        return datetime.strptime(str(value), '%Y-%m-%d').date()
    except ValueError:
        raise ValueError(f'{field} must use YYYY-MM-DD')


def _phone(value):
    raw = str(value or '').strip().replace('+', '').replace(' ', '')
    if raw.startswith('0'):
        return '254' + raw[1:]
    if raw.startswith('7') or raw.startswith('1'):
        return '254' + raw
    return raw


def _quote_order(quote):
    return Order.query.filter_by(transport_quote_id=quote.id).first()


def _error(message, status=400):
    return jsonify({'message': message}), status


def _provider_error(exc, resource):
    return jsonify({
        'message': str(exc),
        'available': False,
        'resource': resource,
    }), 503


@commerce_bp.route('/escrow/orders/<int:order_id>', methods=['GET'])
@jwt_required()
def get_order_escrow(order_id):
    user = _user()
    order = _order_or_404(order_id)
    if not _can_access_order(user, order):
        return _error('Unauthorized', 403)
    escrow = get_or_create_escrow(order)
    db.session.commit()
    return escrow_transaction_schema.jsonify(escrow), 200


@commerce_bp.route('/escrow/orders/<int:order_id>/fund', methods=['POST'])
@jwt_required()
def fund_order_escrow(order_id):
    user = _user()
    order = _order_or_404(order_id)
    if user.id != order.buyer_id:
        return _error('Only the buyer can fund this escrow', 403)
    data, error = json_object()
    if error:
        return error
    escrow = get_or_create_escrow(order)
    if escrow.status == 'funded':
        return _error('Escrow is already funded', 409)
    escrow.status = 'payment_started'
    escrow.checkout_request_id = data.get('checkout_request_id') or escrow.checkout_request_id
    db.session.commit()
    return escrow_transaction_schema.jsonify(escrow), 200


@commerce_bp.route('/escrow/<int:escrow_id>/quality-confirm', methods=['POST'])
@jwt_required()
def quality_confirm(escrow_id):
    user = _user()
    escrow = db.get_or_404(EscrowTransaction, escrow_id)
    if not user_can_view(user, escrow):
        return _error('Unauthorized', 403)
    try:
        confirm_quality(escrow, user)
        db.session.commit()
    except (ValueError, PermissionError) as exc:
        return _error(str(exc), 409 if isinstance(exc, ValueError) else 403)
    return escrow_transaction_schema.jsonify(escrow), 200


@commerce_bp.route('/escrow/<int:escrow_id>/release', methods=['POST'])
@jwt_required()
def escrow_release(escrow_id):
    user = _user()
    escrow = db.get_or_404(EscrowTransaction, escrow_id)
    if not user_can_view(user, escrow):
        return _error('Unauthorized', 403)
    try:
        release_escrow(escrow, user)
        db.session.commit()
    except (ValueError, PermissionError) as exc:
        return _error(str(exc), 409 if isinstance(exc, ValueError) else 403)
    return escrow_transaction_schema.jsonify(escrow), 200


@commerce_bp.route('/escrow/<int:escrow_id>/dispute', methods=['POST'])
@jwt_required()
def escrow_dispute(escrow_id):
    user = _user()
    escrow = db.get_or_404(EscrowTransaction, escrow_id)
    if not user_can_view(user, escrow):
        return _error('Unauthorized', 403)
    data, error = json_object()
    if error:
        return error
    try:
        dispute_escrow(escrow, user, data.get('reason', ''))
        db.session.commit()
    except (ValueError, PermissionError) as exc:
        return _error(str(exc), 409 if isinstance(exc, ValueError) else 403)
    return escrow_transaction_schema.jsonify(escrow), 200


@commerce_bp.route('/escrow/<int:escrow_id>/refund', methods=['POST'])
@jwt_required()
def escrow_refund(escrow_id):
    user = _user()
    if user.role != 'admin':
        return _error('Admin access required', 403)
    escrow = db.get_or_404(EscrowTransaction, escrow_id)
    try:
        refund_escrow(escrow, user)
        db.session.commit()
    except ValueError as exc:
        return _error(str(exc), 409)
    return escrow_transaction_schema.jsonify(escrow), 200


@commerce_bp.route('/escrow/<int:escrow_id>/events', methods=['GET'])
@jwt_required()
def escrow_events(escrow_id):
    user = _user()
    escrow = db.get_or_404(EscrowTransaction, escrow_id)
    if not user_can_view(user, escrow):
        return _error('Unauthorized', 403)
    events = EscrowEvent.query.filter_by(escrow_transaction_id=escrow_id).order_by(
        EscrowEvent.created_at.asc()
    ).all()
    return jsonify({'items': [event.to_dict() for event in events], 'total': len(events)}), 200


@commerce_bp.route('/transport/quotes', methods=['POST'])
@jwt_required()
def create_transport_quote():
    user = _user()
    data, error = json_object()
    if error:
        return error
    try:
        origin = str(data.get('origin', '')).strip()
        destination = str(data.get('destination', '')).strip()
        weight_kg = float(data.get('weight_kg'))
        package_count = int(data.get('package_count', 1))
        mode = str(data.get('mode', 'boda')).strip().lower()
        if not origin or not destination or weight_kg <= 0 or package_count <= 0:
            raise ValueError('origin, destination, weight_kg, and a positive package_count are required')
        if mode not in {'boda', 'matatu', 'truck'}:
            raise ValueError('mode must be boda, matatu, or truck')
        quote_data = transport_provider().quote(origin, destination, weight_kg, package_count, mode)
    except ProviderUnavailable as exc:
        return _provider_error(exc, 'transport')
    except (TypeError, ValueError) as exc:
        return _error(str(exc))
    quote = TransportQuote(
        provider=quote_data['provider'],
        provider_quote_id=str(quote_data.get('provider_quote_id') or uuid.uuid4().hex[:16]),
        origin=origin,
        destination=destination,
        weight_kg=weight_kg,
        package_count=package_count,
        mode=quote_data.get('mode', mode),
        carrier=quote_data.get('carrier'),
        cost=float(quote_data['cost']),
        currency=quote_data.get('currency', 'KES'),
        eta_minutes=quote_data.get('eta_minutes'),
        expires_at=quote_data.get('expires_at'),
        metadata_json=quote_data.get('metadata') or {},
    )
    db.session.add(quote)
    db.session.flush()
    order_id = data.get('order_id')
    if order_id:
        order = db.session.get(Order, int(order_id)) if str(order_id).isdigit() else None
        if not order or not _can_access_order(user, order):
            db.session.rollback()
            return _error('Order not found or unauthorized', 404)
        order.transport_quote = quote
        order.transport_cost = quote.cost
    db.session.commit()
    return transport_quote_schema.jsonify(quote), 201


@commerce_bp.route('/transport/quotes/<int:quote_id>', methods=['GET'])
@jwt_required()
def get_transport_quote(quote_id):
    user = _user()
    quote = db.get_or_404(TransportQuote, quote_id)
    order = _quote_order(quote)
    if order and not _can_access_order(user, order):
        return _error('Unauthorized', 403)
    return transport_quote_schema.jsonify(quote), 200


@commerce_bp.route('/transport/quotes/<int:quote_id>/accept', methods=['POST'])
@jwt_required()
def accept_transport_quote(quote_id):
    user = _user()
    quote = db.get_or_404(TransportQuote, quote_id)
    order = _quote_order(quote)
    if not order or not _can_access_order(user, order):
        return _error('Order not found or unauthorized', 404)
    if quote.status != 'quoted':
        return _error('Quote is no longer available', 409)
    quote.status = 'accepted'
    order.transport_quote = quote
    order.transport_cost = quote.cost
    db.session.commit()
    return transport_quote_schema.jsonify(quote), 200


@commerce_bp.route('/market/prices', methods=['GET'])
@jwt_required()
def get_market_prices():
    try:
        rows = market_price_provider().latest(
            category=request.args.get('category'),
            market=request.args.get('market'),
            county_id=request.args.get('county_id'),
            item_uuid=request.args.get('uuid') or request.args.get('item_uuid'),
        )
    except ProviderUnavailable as exc:
        return _provider_error(exc, 'market-prices')
    except Exception as exc:
        # Fallback to direct client
        from app.services.shamba_records import shamba_records_client
        rows = shamba_records_client.fetch_market_prices(
            category=request.args.get('category'),
            market=request.args.get('market'),
            county_id=request.args.get('county_id'),
            item_uuid=request.args.get('uuid') or request.args.get('item_uuid'),
        )

    observations = []
    for row in rows:
        try:
            observed_at = _parse_datetime(row.get('observed_at'), 'observed_at') or utcnow()
            meta = row.get('metadata') or {}
            if 'uuid' in row:
                meta['uuid'] = row['uuid']
            if 'county_id' in row:
                meta['county_id'] = row['county_id']
            if 'county_name' in row:
                meta['county_name'] = row['county_name']
            if 'commodity' in row:
                meta['commodity'] = row['commodity']
            if 'wholesale_price' in row:
                meta['wholesale_price'] = row['wholesale_price']
            if 'retail_price' in row:
                meta['retail_price'] = row['retail_price']
            if 'trend' in row:
                meta['trend'] = row['trend']
            if 'price_change_percent' in row:
                meta['price_change_percent'] = row['price_change_percent']

            observation = MarketPriceObservation(
                product_id=int(row['product_id']) if row.get('product_id') is not None else None,
                category=row.get('category') or row.get('commodity'),
                market=row.get('market') or 'Nairobi',
                location=row.get('location') or 'Kenya',
                price_per_unit=float(row['price_per_unit']),
                unit=normalize_unit(row.get('unit', 'kg')),
                currency=row.get('currency', 'KES'),
                source=row.get('source') or 'ShambaRecords API',
                provider=row.get('provider') or 'shambarecords',
                observed_at=observed_at,
                freshness_minutes=int(row.get('freshness_minutes', 15)),
                is_current=bool(row.get('is_current', True)),
                metadata_json=meta,
            )
            db.session.add(observation)
            observations.append(observation)
        except (KeyError, TypeError, ValueError) as exc:
            db.session.rollback()
            return _error(f'Invalid market-price observation: {exc}')
    db.session.commit()

    # Dump schema and enhance with direct top-level fields for frontend ease
    dumped = market_prices_schema.dump(observations)
    for i, item in enumerate(dumped):
        meta = item.get('metadata') or {}
        item['uuid'] = meta.get('uuid') or f"shamba-{item.get('id')}"
        item['county_id'] = meta.get('county_id') or '047'
        item['county_name'] = meta.get('county_name') or 'Nairobi'
        item['commodity'] = meta.get('commodity') or item.get('category')
        item['wholesale_price'] = meta.get('wholesale_price') or round(float(item.get('price_per_unit', 0)) * 0.88, 2)
        item['retail_price'] = meta.get('retail_price') or round(float(item.get('price_per_unit', 0)) * 1.12, 2)
        item['trend'] = meta.get('trend') or ('up' if (item.get('price_change_percent') or 0) > 0 else 'down')
        if item.get('price_change_percent') is None and 'price_change_percent' in meta:
            item['price_change_percent'] = meta['price_change_percent']

    return jsonify({'items': dumped, 'total': len(dumped)}), 200


@commerce_bp.route('/market/prices', methods=['POST'])
@jwt_required()
def create_market_price():
    user = _user()
    if user.role != 'admin':
        return _error('Admin access required', 403)
    data, error = json_object()
    if error:
        return error
    try:
        observation = MarketPriceObservation(
            product_id=int(data['product_id']) if data.get('product_id') is not None else None,
            category=data.get('category'),
            market=str(data.get('market', '')).strip(),
            location=data.get('location'),
            price_per_unit=float(data['price_per_unit']),
            unit=normalize_unit(data.get('unit', 'kg')),
            currency=data.get('currency', 'KES'),
            source=data.get('source', 'manual'),
            provider=data.get('provider', 'manual'),
            observed_at=_parse_datetime(data.get('observed_at'), 'observed_at') or utcnow(),
            freshness_minutes=int(data.get('freshness_minutes', 60)),
            is_current=bool(data.get('is_current', True)),
            metadata_json=data.get('metadata') if isinstance(data.get('metadata'), dict) else {},
        )
    except (KeyError, TypeError, ValueError) as exc:
        return _error(str(exc))
    if not observation.market or observation.price_per_unit <= 0:
        return _error('market and a positive price_per_unit are required')
    db.session.add(observation)
    db.session.commit()
    return market_price_schema.jsonify(observation), 201


@commerce_bp.route('/market/prices/refresh', methods=['POST'])
@jwt_required()
def refresh_market_prices():
    user = _user()
    if user.role != 'admin':
        return _error('Admin access required', 403)
    try:
        rows = market_price_provider().latest()
    except ProviderUnavailable as exc:
        return _provider_error(exc, 'market-prices')
    created = []
    for row in rows:
        observation = MarketPriceObservation(
            product_id=int(row['product_id']) if row.get('product_id') is not None else None,
            category=row.get('category'),
            market=row.get('market') or 'Nairobi',
            location=row.get('location'),
            price_per_unit=float(row['price_per_unit']),
            unit=normalize_unit(row.get('unit', 'kg')),
            currency=row.get('currency', 'KES'),
            source=row.get('source') or 'provider',
            provider=row.get('provider') or market_price_provider().name,
            observed_at=_parse_datetime(row.get('observed_at'), 'observed_at') or utcnow(),
            freshness_minutes=int(row.get('freshness_minutes', 60)),
            is_current=bool(row.get('is_current', True)),
            metadata_json=row.get('metadata') or {},
        )
        db.session.add(observation)
        created.append(observation)
    db.session.commit()
    return jsonify({'items': market_prices_schema.dump(created), 'total': len(created)}), 201


def _parse_sms_command(text):
    parts = re.findall(r'[A-Za-z]+|\d+(?:\.\d+)?', str(text or ''))
    if not parts:
        return 'help', []
    verb = parts[0].upper()
    if verb in {'ORDER', 'BUY'} and len(parts) >= 3:
        return 'order', {'product_id': parts[1], 'quantity': parts[2]}
    if verb == 'STATUS' and len(parts) >= 2:
        return 'status', {'order_code': parts[1].upper()}
    return 'help', {}


@commerce_bp.route('/sms/inbox', methods=['POST'])
def sms_inbox_webhook():
    token = os.getenv('SMS_WEBHOOK_TOKEN')
    if not token or request.headers.get('X-SMS-Token') != token:
        return _error('SMS webhook is not configured or authorized', 503)
    data = request.get_json(silent=True) or request.form.to_dict()
    provider_name = str(data.get('provider') or os.getenv('SMS_PROVIDER', 'unconfigured'))
    phone = _phone(data.get('phone') or data.get('From') or data.get('msisdn'))
    text = str(data.get('text') or data.get('Body') or data.get('message') or '').strip()
    if not phone or not text:
        return _error('phone and text are required')
    key = idempotency_key(provider_name, phone, text)
    existing = db.session.query(SmsCommand).filter_by(idempotency_key=key).first()
    if existing:
        return jsonify({'duplicate': True, 'command': sms_command_schema.dump(existing)}), 200
    command_type, args = _parse_sms_command(text)
    normalized = ' '.join([command_type.upper(), *(str(value) for value in args.values())])
    command = SmsCommand(
        provider=provider_name,
        direction='inbound',
        phone=phone,
        command=text,
        normalized_command=normalized,
        idempotency_key=key,
        raw_payload=data,
        status='processing',
        received_at=_parse_datetime(data.get('received_at'), 'received_at') or utcnow(),
    )
    db.session.add(command)
    db.session.flush()
    user = User.query.filter_by(phone_number=phone).first()
    if command_type == 'order':
        if not user or user.role != 'buyer':
            command.status = 'rejected'
            command.error_message = 'Buyer phone is not registered'
        else:
            try:
                product = db.session.get(Product, int(args['product_id']))
                quantity = float(args['quantity'])
                if not product or not product.is_available or product.farmer_id == user.id:
                    raise ValueError('Product is unavailable')
                if product.stock_quantity < quantity:
                    raise ValueError('Insufficient stock')
                product.stock_quantity -= quantity
                order = Order(
                    order_code=f'ACR-{uuid.uuid4().hex[:6].upper()}',
                    buyer_id=user.id,
                    farmer_id=product.farmer_id,
                    total_amount=product.price_per_unit * quantity,
                    status='pending',
                    payment_status='unpaid',
                    delivery_address='SMS fulfillment, Nairobi',
                    contact_phone=phone,
                    quality_status='not_required',
                )
                order.items = [OrderItem(
                    product_id=product.id,
                    quantity=quantity,
                    unit_price=product.price_per_unit,
                    unit=product.unit,
                    unit_weight_kg=product.unit_weight_kg,
                    line_total=product.price_per_unit * quantity,
                )]
                db.session.add(order)
                db.session.flush()
                get_or_create_escrow(order)
                order.sms_command = command
                command.status = 'processed'
                command.processed_at = utcnow()
                response = {'order': order_schema.dump(order), 'command_type': 'order'}
            except (TypeError, ValueError) as exc:
                command.status = 'rejected'
                command.error_message = str(exc)
                response = {'message': str(exc), 'command_type': 'order'}
    elif command_type == 'status':
        order = Order.query.filter_by(order_code=args['order_code']).first()
        if not order or not user or not _can_access_order(user, order):
            command.status = 'rejected'
            command.error_message = 'Order not found'
            response = {'message': 'Order not found', 'command_type': 'status'}
        else:
            command.status = 'processed'
            command.processed_at = utcnow()
            response = {'order_code': order.order_code, 'status': order.status, 'command_type': 'status'}
    else:
        command.status = 'processed'
        command.processed_at = utcnow()
        response = {'message': 'Commands: ORDER <product_id> <quantity>, STATUS <order_code>', 'command_type': 'help'}
    db.session.commit()
    payload = {'command': sms_command_schema.dump(command), **response}
    return jsonify(payload), 200


@commerce_bp.route('/sms/inbox', methods=['GET'])
@jwt_required()
def list_sms_inbox():
    user = _user()
    query = SmsCommand.query.filter_by(direction='inbound')
    if user.role != 'admin':
        query = query.filter_by(phone=_phone(user.phone_number))
    items = query.order_by(SmsCommand.received_at.desc()).all()
    return jsonify({'items': sms_commands_schema.dump(items), 'total': len(items)}), 200


@commerce_bp.route('/sms/commands', methods=['POST'])
@jwt_required()
def create_sms_command():
    user = _user()
    data, error = json_object()
    if error:
        return error
    phone = _phone(data.get('phone'))
    text = str(data.get('text') or data.get('message') or '').strip()
    if not phone or not text:
        return _error('phone and text are required')
    reference = data.get('reference') or uuid.uuid4().hex[:16]
    try:
        result = sms_provider().send(phone, text, reference)
    except ProviderUnavailable as exc:
        return _provider_error(exc, 'sms')
    command = SmsCommand(
        provider=result.get('provider') or os.getenv('SMS_PROVIDER', 'unconfigured'),
        direction='outbound',
        phone=phone,
        command=text,
        normalized_command=text.upper(),
        idempotency_key=idempotency_key('outbound', phone, text),
        raw_payload=data,
        status=result.get('status', 'accepted'),
        received_at=utcnow(),
        processed_at=utcnow(),
    )
    db.session.add(command)
    db.session.commit()
    return sms_command_schema.jsonify(command), 201


@commerce_bp.route('/sms/outbox', methods=['GET'])
@jwt_required()
def list_sms_outbox():
    user = _user()
    query = SmsCommand.query.filter_by(direction='outbound')
    if user.role != 'admin':
        query = query.filter_by(phone=_phone(user.phone_number))
    items = query.order_by(SmsCommand.created_at.desc()).all()
    return jsonify({'items': sms_commands_schema.dump(items), 'total': len(items)}), 200


@commerce_bp.route('/group-orders', methods=['GET'])
@jwt_required()
def list_group_orders():
    user = _user()
    query = GroupOrder.query
    if user.role != 'admin':
        query = query.filter((GroupOrder.farmer_id == user.id) | (GroupOrder.status == 'open'))
    items = query.options(selectinload(GroupOrder.commitments)).order_by(GroupOrder.created_at.desc()).all()
    return jsonify({'items': group_orders_schema.dump(items), 'total': len(items)}), 200


@commerce_bp.route('/group-orders', methods=['POST'])
@jwt_required()
def create_group_order():
    user = _user()
    if user.role != 'farmer':
        return _error('Only farmers can create group orders', 403)
    data, error = json_object()
    if error:
        return error
    try:
        product = db.session.get(Product, int(data['product_id']))
        if not product or product.farmer_id != user.id:
            return _error('Product not found or not owned by farmer', 404)
        target_quantity = float(data['target_quantity'])
        min_quantity = float(data.get('min_quantity', target_quantity))
        if target_quantity <= 0 or min_quantity <= 0 or min_quantity > target_quantity:
            raise ValueError('Invalid target or minimum quantity')
        unit = normalize_unit(data.get('unit', product.unit))
        group_order = GroupOrder(
            product=product,
            farmer=user,
            title=str(data.get('title') or product.title).strip(),
            description=data.get('description'),
            target_quantity=target_quantity,
            min_quantity=min_quantity,
            unit=unit,
            price_per_unit=float(data.get('price_per_unit', product.price_per_unit)),
            deposit_percent=float(data.get('deposit_percent', 0)),
            deadline=_parse_datetime(data.get('deadline'), 'deadline') or utcnow(),
            delivery_location=data.get('delivery_location'),
            transport_mode=data.get('transport_mode'),
        )
    except (KeyError, TypeError, ValueError) as exc:
        return _error(str(exc))
    if group_order.price_per_unit < 0:
        return _error('price_per_unit cannot be negative')
    db.session.add(group_order)
    db.session.commit()
    return group_order_schema.jsonify(group_order), 201


@commerce_bp.route('/group-orders/<int:group_order_id>', methods=['GET'])
@jwt_required()
def get_group_order(group_order_id):
    _user()
    group_order = db.get_or_404(GroupOrder, group_order_id)
    return group_order_schema.jsonify(group_order), 200


@commerce_bp.route('/group-orders/<int:group_order_id>', methods=['PATCH'])
@jwt_required()
def update_group_order(group_order_id):
    user = _user()
    group_order = db.get_or_404(GroupOrder, group_order_id)
    if group_order.farmer_id != user.id and user.role != 'admin':
        return _error('Unauthorized', 403)
    data, error = json_object()
    if error:
        return error
    for field in ('title', 'description', 'delivery_location', 'transport_mode', 'status'):
        if field in data:
            setattr(group_order, field, data[field])
    if 'target_quantity' in data:
        group_order.target_quantity = float(data['target_quantity'])
    if 'min_quantity' in data:
        group_order.min_quantity = float(data['min_quantity'])
    if 'price_per_unit' in data:
        group_order.price_per_unit = float(data['price_per_unit'])
    if 'deadline' in data:
        group_order.deadline = _parse_datetime(data['deadline'], 'deadline')
    db.session.commit()
    return group_order_schema.jsonify(group_order), 200


@commerce_bp.route('/group-orders/<int:group_order_id>/commit', methods=['POST'])
@jwt_required()
def commit_group_order(group_order_id):
    user = _user()
    if user.role != 'buyer':
        return _error('Only buyers can commit to a group order', 403)
    group_order = db.get_or_404(GroupOrder, group_order_id)
    data, error = json_object()
    if error:
        return error
    try:
        quantity = float(data.get('quantity'))
        if quantity <= 0:
            raise ValueError('quantity must be positive')
        if group_order.status != 'open':
            raise ValueError('Group order is not open')
        if GroupOrderCommitment.query.filter_by(group_order_id=group_order.id, buyer_id=user.id).first():
            raise ValueError('Buyer has already committed to this group order')
        if group_order.committed_quantity + quantity > group_order.target_quantity:
            raise ValueError('Commitment exceeds target quantity')
        product = group_order.product
        if product.stock_quantity < quantity:
            raise ValueError('Insufficient stock')
        product.reserved_quantity += quantity
        amount = quantity * group_order.price_per_unit
        commitment = GroupOrderCommitment(
            group_order=group_order,
            buyer=user,
            quantity=quantity,
            amount=amount,
            status='committed',
        )
        order = Order(
            order_code=f'ACR-{uuid.uuid4().hex[:6].upper()}',
            buyer_id=user.id,
            farmer_id=group_order.farmer_id,
            total_amount=amount,
            status='group-pending',
            payment_status='unpaid',
            delivery_address=group_order.delivery_location or 'Group fulfillment, Nairobi',
            contact_phone=_phone(user.phone_number),
            quality_status='not_required',
        )
        order.items = [OrderItem(
            product_id=product.id,
            quantity=quantity,
            unit_price=group_order.price_per_unit,
            unit=group_order.unit,
            unit_weight_kg=product.unit_weight_kg,
            line_total=amount,
        )]
        db.session.add(commitment)
        db.session.add(order)
        db.session.flush()
        get_or_create_escrow(order)
        commitment.order = order
        group_order.committed_quantity += quantity
        if group_order.committed_quantity >= group_order.target_quantity:
            group_order.status = 'ready'
        db.session.commit()
    except (TypeError, ValueError) as exc:
        db.session.rollback()
        return _error(str(exc))
    return jsonify({'group_order': group_order_schema.dump(group_order), 'commitment': group_commitment_schema.dump(commitment)}), 201


@commerce_bp.route('/harvest/plans', methods=['GET'])
@jwt_required()
def list_harvest_plans():
    user = _user()
    query = HarvestPlan.query
    if user.role == 'admin':
        pass
    elif user.role == 'farmer':
        query = query.filter((HarvestPlan.farmer_id == user.id) | (HarvestPlan.visibility == 'buyers'))
    else:
        query = query.filter(HarvestPlan.visibility == 'buyers')
    items = query.options(selectinload(HarvestPlan.preorders), selectinload(HarvestPlan.product)).order_by(HarvestPlan.harvest_start.desc()).all()
    return jsonify({'items': harvest_plans_schema.dump(items), 'total': len(items)}), 200


@commerce_bp.route('/harvest/plans', methods=['POST'])
@jwt_required()
def create_harvest_plan():
    user = _user()
    if user.role != 'farmer':
        return _error('Only farmers can create harvest plans', 403)
    data, error = json_object()
    if error:
        return error
    try:
        product = db.session.get(Product, int(data['product_id'])) if data.get('product_id') is not None else None
        if product and product.farmer_id != user.id:
            return _error('Product not owned by farmer', 403)
        plan = HarvestPlan(
            farmer=user,
            product=product,
            field_name=str(data.get('field_name', '')).strip(),
            crop_name=str(data.get('crop_name', '')).strip(),
            planting_date=_parse_date(data.get('planting_date'), 'planting_date'),
            harvest_start=_parse_date(data.get('harvest_start'), 'harvest_start'),
            harvest_end=_parse_date(data.get('harvest_end'), 'harvest_end'),
            expected_quantity=float(data.get('expected_quantity')),
            unit=normalize_unit(data.get('unit', 'kg')),
            unit_weight_kg=float(data['unit_weight_kg']) if data.get('unit_weight_kg') is not None else None,
            price_per_unit=float(data['price_per_unit']) if data.get('price_per_unit') is not None else None,
            status=data.get('status', 'planned'),
            visibility=data.get('visibility', 'buyers'),
            notes=data.get('notes'),
        )
    except (KeyError, TypeError, ValueError) as exc:
        return _error(str(exc))
    if not plan.field_name or not plan.crop_name or not plan.harvest_start or plan.expected_quantity <= 0:
        return _error('field_name, crop_name, harvest_start, and a positive expected_quantity are required')
    db.session.add(plan)
    db.session.commit()
    return harvest_plan_schema.jsonify(plan), 201


@commerce_bp.route('/harvest/plans/<int:plan_id>', methods=['GET'])
@jwt_required()
def get_harvest_plan(plan_id):
    user = _user()
    plan = db.get_or_404(HarvestPlan, plan_id)
    if user.role != 'admin' and plan.farmer_id != user.id and plan.visibility != 'buyers':
        return _error('Unauthorized', 403)
    return harvest_plan_schema.jsonify(plan), 200


@commerce_bp.route('/harvest/plans/<int:plan_id>', methods=['PATCH'])
@jwt_required()
def update_harvest_plan(plan_id):
    user = _user()
    plan = db.get_or_404(HarvestPlan, plan_id)
    if plan.farmer_id != user.id and user.role != 'admin':
        return _error('Unauthorized', 403)
    data, error = json_object()
    if error:
        return error
    for field in ('field_name', 'crop_name', 'status', 'visibility', 'notes'):
        if field in data:
            setattr(plan, field, data[field])
    if 'expected_quantity' in data:
        plan.expected_quantity = float(data['expected_quantity'])
    if 'unit' in data:
        plan.unit = normalize_unit(data['unit'])
    if 'unit_weight_kg' in data:
        plan.unit_weight_kg = float(data['unit_weight_kg']) if data['unit_weight_kg'] else None
    if 'price_per_unit' in data:
        plan.price_per_unit = float(data['price_per_unit']) if data['price_per_unit'] else None
    if 'harvest_start' in data:
        plan.harvest_start = _parse_date(data['harvest_start'], 'harvest_start')
    if 'harvest_end' in data:
        plan.harvest_end = _parse_date(data['harvest_end'], 'harvest_end')
    db.session.commit()
    return harvest_plan_schema.jsonify(plan), 200


@commerce_bp.route('/harvest/plans/<int:plan_id>/preorders', methods=['POST'])
@jwt_required()
def create_harvest_preorder(plan_id):
    user = _user()
    if user.role != 'buyer':
        return _error('Only buyers can place harvest pre-orders', 403)
    plan = db.get_or_404(HarvestPlan, plan_id)
    if plan.visibility != 'buyers' and plan.farmer_id != user.id:
        return _error('Pre-orders are not available', 403)
    data, error = json_object()
    if error:
        return error
    try:
        quantity = float(data.get('quantity'))
        if quantity <= 0:
            raise ValueError('quantity must be positive')
        if HarvestPreorder.query.filter_by(harvest_plan_id=plan.id, buyer_id=user.id).first():
            raise ValueError('Buyer has already pre-ordered this harvest')
        preorder = HarvestPreorder(
            harvest_plan=plan,
            buyer=user,
            quantity=quantity,
            unit=normalize_unit(data.get('unit', plan.unit)),
            deposit_amount=float(data.get('deposit_amount', 0)),
            status='pending',
        )
    except (TypeError, ValueError) as exc:
        return _error(str(exc))
    if preorder.deposit_amount < 0:
        return _error('deposit_amount cannot be negative')
    db.session.add(preorder)
    db.session.commit()
    return harvest_preorder_schema.jsonify(preorder), 201


@commerce_bp.route('/harvest/plans/<int:plan_id>/preorders', methods=['GET'])
@jwt_required()
def list_harvest_preorders(plan_id):
    user = _user()
    plan = db.get_or_404(HarvestPlan, plan_id)
    query = HarvestPreorder.query.filter_by(harvest_plan_id=plan.id)
    if user.role != 'admin' and plan.farmer_id != user.id:
        query = query.filter_by(buyer_id=user.id)
    items = query.all()
    return jsonify({'items': harvest_preorders_schema.dump(items), 'total': len(items)}), 200


@commerce_bp.route('/receipts', methods=['GET'])
@jwt_required()
def list_receipts():
    user = _user()
    query = Receipt.query
    if user.role != 'admin':
        query = query.filter((Receipt.buyer_id == user.id) | (Receipt.farmer_id == user.id))
    items = query.order_by(Receipt.issued_at.desc()).all()
    return jsonify({'items': receipts_schema.dump(items), 'total': len(items)}), 200


@commerce_bp.route('/receipts/<int:receipt_id>', methods=['GET'])
@jwt_required()
def get_receipt(receipt_id):
    user = _user()
    receipt = db.get_or_404(Receipt, receipt_id)
    if user.role != 'admin' and user.id not in {receipt.buyer_id, receipt.farmer_id}:
        return _error('Unauthorized', 403)
    return receipt_schema.jsonify(receipt), 200


@commerce_bp.route('/orders/<int:order_id>/receipt', methods=['POST'])
@jwt_required()
def create_receipt(order_id):
    user = _user()
    order = _order_or_404(order_id)
    if not _can_access_order(user, order):
        return _error('Unauthorized', 403)
    if order.receipt:
        return receipt_schema.jsonify(order.receipt), 200
    escrow = getattr(order, 'escrow_transaction', None)
    if not escrow or escrow.status != 'funded':
        return _error('Receipt requires a funded order', 409)
    subtotal = sum(item.quantity * item.unit_price for item in order.items)
    transport_cost = order.transport_cost or 0.0
    processing_fee = float(current_app.config.get('RECEIPT_PROCESSING_FEE', 0.0))
    discount = float(current_app.config.get('RECEIPT_DISCOUNT', 0.0))
    total = round(subtotal + transport_cost + processing_fee - discount, 2)
    receipt = Receipt(
        order=order,
        receipt_number=f'ACR-R-{uuid.uuid4().hex[:10].upper()}',
        buyer_id=order.buyer_id,
        farmer_id=order.farmer_id,
        currency='KES',
        subtotal=subtotal,
        transport_cost=transport_cost,
        processing_fee=processing_fee,
        discount=discount,
        total_amount=total,
        payment_reference=(escrow.mpesa_receipt_number if escrow else None) or order.order_code,
        escrow_transaction=escrow,
        status='issued',
        snapshot_json={
            'order_code': order.order_code,
            'items': [item.to_dict() for item in order.items],
            'subtotal': subtotal,
            'transport_cost': transport_cost,
            'processing_fee': processing_fee,
            'discount': discount,
            'total_amount': total,
            'created_from': 'order',
        },
    )
    db.session.add(receipt)
    db.session.commit()
    return receipt_schema.jsonify(receipt), 201
