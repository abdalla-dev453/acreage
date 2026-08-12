from flask_jwt_extended import create_access_token

from app import db
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
    monkeypatch.setattr('app.routes.orders.get_mpesa_access_token', lambda: None)
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
    order_id = response.get_json()['id']
    assert db.session.get(Product, product.id).stock_quantity == 7
    assert client.patch(f'/api/orders/{order_id}/status', json={'status': 'on delivery'}, headers=headers(buyer)).status_code == 403
    assert client.patch(f'/api/orders/{order_id}/status', json={'status': 'on delivery'}, headers=headers(farmer)).status_code == 200
    assert client.patch(f'/api/orders/{order_id}/status', json={'status': 'cancelled'}, headers=headers(farmer)).status_code == 200
    assert db.session.get(Product, product.id).stock_quantity == 10
    assert db.session.get(Order, order_id).status == 'cancelled'
