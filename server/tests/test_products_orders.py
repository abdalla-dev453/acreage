from flask_jwt_extended import create_access_token

from app import db
from app.models.commerce import EscrowTransaction
from app.models.order import Order
from app.models.product import Product
from app.models.user import User


def user(username, email, role):
    account = User(username=username, email=email, role=role, email_verified=True)
    account.set_password('Password1')
    db.session.add(account)
    db.session.commit()
    return account


def headers(account):
    return {'Authorization': f'Bearer {create_access_token(identity=str(account.id))}'}


def product_payload(title='Tomatoes', stock=10):
    return {
        'title': title, 'category': 'Vegetables', 'price_per_unit': 100,
        'stock_quantity': stock, 'unit': 'kg',
    }


class FakeMpesaResponse:
    status_code = 200

    def __init__(self, payload):
        self.payload = payload

    def json(self):
        return self.payload

    def raise_for_status(self):
        return None


def arrange_order(client, app):
    farmer = user('farmer', 'farmer@example.com', 'farmer')
    buyer = user('buyer', 'buyer@example.com', 'buyer')
    product = Product(farmer_id=farmer.id, **product_payload(stock=10))
    db.session.add(product)
    db.session.commit()
    response = client.post('/api/orders/', json={
        'items': [{'product_id': product.id, 'quantity': 3}],
        'contact_phone': '0712345678', 'delivery_address': 'Nairobi',
    }, headers=headers(buyer))
    assert response.status_code == 201
    order = db.session.get(Order, response.get_json()['id'])
    return buyer, farmer, product, order


def callback_payload(checkout_id, result_code=0, receipt='QJG1234'):
    return {
        'Body': {'stkCallback': {
            'ResultCode': result_code,
            'ResultDesc': 'Accepted' if result_code == 0 else 'Declined',
            'CheckoutRequestID': checkout_id,
            'AccountReference': 'ACR-ignored',
            'CallbackMetadata': {'Item': [
                {'Name': 'MpesaReceiptNumber', 'Value': receipt},
            ]},
        }},
    }


def test_authentication_validation_checklist(client):
    assert client.post('/api/auth/register', json={
        'username': 'email', 'email': 'not-an-email', 'password': 'Password1',
    }).status_code == 400
    assert client.post('/api/auth/register', json={
        'username': 'weak', 'email': 'weak@example.com', 'password': 'weak',
    }).status_code == 400
    assert client.post('/api/auth/login', json={
        'email': 'missing@example.com', 'password': 'Password1',
    }).status_code == 401
    assert client.get('/api/orders/').status_code == 401


def test_product_permissions_and_deletion(client, app):
    farmer = user('farmer', 'farmer@example.com', 'farmer')
    buyer = user('buyer', 'buyer@example.com', 'buyer')
    other_farmer = user('other', 'other@example.com', 'farmer')

    created = client.post('/api/products/', json=product_payload(), headers=headers(farmer))
    assert created.status_code == 201
    product_id = created.get_json()['id']
    assert client.post('/api/products/', json=product_payload(), headers=headers(buyer)).status_code == 403
    assert client.put(f'/api/products/{product_id}', json={'stock_quantity': 8}, headers=headers(farmer)).status_code == 200
    assert client.put(f'/api/products/{product_id}', json={'stock_quantity': 7}, headers=headers(other_farmer)).status_code == 403
    assert client.delete(f'/api/products/{product_id}', headers=headers(other_farmer)).status_code == 403
    assert client.delete(f'/api/products/{product_id}', headers=headers(farmer)).status_code == 204


def test_order_stock_and_status_lifecycle(client, app, monkeypatch):
    monkeypatch.setenv('MPESA_PASSKEY', 'test-passkey')
    monkeypatch.setattr('app.routes.orders.get_mpesa_access_token', lambda: 'token')
    monkeypatch.setattr('app.routes.orders.requests.post', lambda *args, **kwargs: FakeMpesaResponse({
        'ResponseCode': 0, 'ResponseDescription': 'Accepted',
        'CheckoutRequestID': 'ws_CO_CHECKOUT1', 'MerchantRequestID': 'merchant-1',
    }))
    buyer, farmer, product, order = arrange_order(client, app)
    assert product.stock_quantity == 7
    assert client.patch(f'/api/orders/{order.id}/status', json={'status': 'on delivery'}, headers=headers(buyer)).status_code == 403
    assert client.patch(f'/api/orders/{order.id}/status', json={'status': 'on delivery'}, headers=headers(farmer)).status_code == 200
    assert client.patch(f'/api/orders/{order.id}/status', json={'status': 'cancelled'}, headers=headers(farmer)).status_code == 200
    assert db.session.get(Product, product.id).stock_quantity == 10
    assert db.session.get(Order, order.id).status == 'cancelled'


def test_stk_failure_rolls_back_order_and_releases_stock(client, app, monkeypatch):
    monkeypatch.setenv('MPESA_PASSKEY', 'test-passkey')
    monkeypatch.setattr('app.routes.orders.get_mpesa_access_token', lambda: 'token')
    monkeypatch.setattr('app.routes.orders.requests.post', lambda *args, **kwargs: FakeMpesaResponse({
        'ResponseCode': 1, 'ResponseDescription': 'Insufficient balance',
    }))
    farmer = user('farmer', 'farmer@example.com', 'farmer')
    buyer = user('buyer', 'buyer@example.com', 'buyer')
    product = Product(farmer_id=farmer.id, **product_payload(stock=10))
    db.session.add(product)
    db.session.commit()
    response = client.post('/api/orders/', json={
        'items': [{'product_id': product.id, 'quantity': 3}],
        'contact_phone': '0712345678', 'delivery_address': 'Nairobi',
    }, headers=headers(buyer))
    assert response.status_code == 502
    failed = Order.query.one()
    escrow = EscrowTransaction.query.one()
    assert failed.status == 'cancelled' and failed.payment_status == 'failed'
    assert escrow.status == 'failed'
    assert product.stock_quantity == 10


def test_duplicate_success_callback_is_idempotent(client, app, monkeypatch):
    monkeypatch.setenv('MPESA_PASSKEY', 'test-passkey')
    monkeypatch.setattr('app.routes.orders.get_mpesa_access_token', lambda: 'token')
    monkeypatch.setattr('app.routes.orders.requests.post', lambda *args, **kwargs: FakeMpesaResponse({
        'ResponseCode': 0, 'CheckoutRequestID': 'ws_CO_DUPLICATE',
        'MerchantRequestID': 'merchant-2',
    }))
    monkeypatch.setattr('app.routes.orders.send_payment_confirmation_sms', lambda order: None)
    monkeypatch.setattr('app.routes.orders.send_payment_confirmation_whatsapp', lambda order: None)
    _, _, product, order = arrange_order(client, app)
    payload = callback_payload('ws_CO_DUPLICATE')
    assert client.post('/api/orders/mpesa-callback', json=payload).status_code == 200
    assert client.post('/api/orders/mpesa-callback', json=payload).status_code == 200
    escrow = EscrowTransaction.query.one()
    assert order.payment_status == 'paid' and escrow.status == 'funded'
    assert escrow.events and len(escrow.events) == 1
    assert product.stock_quantity == 7


def test_late_success_after_cancellation_is_reconciled(client, app, monkeypatch):
    monkeypatch.setenv('MPESA_PASSKEY', 'test-passkey')
    monkeypatch.setattr('app.routes.orders.get_mpesa_access_token', lambda: 'token')
    monkeypatch.setattr('app.routes.orders.requests.post', lambda *args, **kwargs: FakeMpesaResponse({
        'ResponseCode': 0, 'CheckoutRequestID': 'ws_CO_LATE_SUCCESS',
        'MerchantRequestID': 'merchant-3',
    }))
    monkeypatch.setattr('app.routes.orders.send_payment_confirmation_sms', lambda order: None)
    monkeypatch.setattr('app.routes.orders.send_payment_confirmation_whatsapp', lambda order: None)
    _, farmer, product, order = arrange_order(client, app)
    assert client.patch(f'/api/orders/{order.id}/status', json={'status': 'cancelled'}, headers=headers(farmer)).status_code == 200
    assert product.stock_quantity == 10
    assert client.post('/api/orders/mpesa-callback', json=callback_payload('ws_CO_LATE_SUCCESS')).status_code == 200
    assert order.payment_status == 'paid'
    # The reservation was already released exactly once; reconciliation must not
    # silently undo that. Support can resolve this funded-after-cancellation case.
    assert product.stock_quantity == 10


def test_unknown_checkout_callback_is_rejected(client, app):
    response = client.post('/api/orders/mpesa-callback', json=callback_payload('ws_CO_UNKNOWN'))
    assert response.status_code == 404
