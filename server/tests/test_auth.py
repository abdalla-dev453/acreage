from app import db
from app.models.user import User


def register(client):
    return client.post('/api/auth/register', json={
        'username': 'farmer', 'email': 'farmer@example.com',
        'password': 'Password1', 'role': 'farmer',
    })


def test_registration_requires_email_verification(client, app):
    response = register(client)
    assert response.status_code == 201
    assert 'verify' in response.get_json()['message'].lower()

    response = client.post('/api/auth/login', json={
        'email': 'farmer@example.com', 'password': 'Password1',
    })
    assert response.status_code == 403


def test_verification_allows_login(client, app, monkeypatch):
    monkeypatch.setattr('app.routes.auth.new_token', lambda: ('verification-token', 'a' * 64))
    register(client)
    user = User.query.filter_by(email='farmer@example.com').one()
    user.verification_token_hash = __import__('hashlib').sha256(b'verification-token').hexdigest()
    db.session.commit()

    response = client.post('/api/auth/verify-email', json={'token': 'verification-token'})
    assert response.status_code == 200

    response = client.post('/api/auth/login', json={
        'email': 'farmer@example.com', 'password': 'Password1',
    })
    assert response.status_code == 200
    assert response.get_json()['token']


def test_password_reset_changes_password(client, app, monkeypatch):
    register(client)
    user = User.query.filter_by(email='farmer@example.com').one()
    user.email_verified = True
    db.session.commit()

    monkeypatch.setattr('app.routes.auth.new_token', lambda: ('reset-token', 'b' * 64))
    assert client.post('/api/auth/password-reset/request', json={'email': user.email}).status_code == 200
    user = db.session.get(User, user.id)
    user.reset_token_hash = __import__('hashlib').sha256(b'reset-token').hexdigest()
    db.session.commit()

    response = client.post('/api/auth/password-reset/confirm', json={
        'token': 'reset-token', 'password': 'ChangedPassword1',
    })
    assert response.status_code == 200
    assert client.post('/api/auth/login', json={
        'email': user.email, 'password': 'ChangedPassword1',
    }).status_code == 200


def test_user_password_hash_is_not_plaintext(app):
    user = User(username='model-user', email='model@example.com', role='farmer')
    user.set_password('Password1')
    assert user.password_hash != 'Password1'
    assert user.check_password('Password1')
    assert not user.check_password('incorrect')


def test_auth_errors_include_cors_headers(client):
    response = client.post(
        '/api/auth/login',
        json={'email': 'missing@example.com', 'password': 'Password1'},
        headers={'Origin': 'http://localhost:5173'},
    )
    assert response.status_code == 401
    assert response.headers['Access-Control-Allow-Origin'] == 'http://localhost:5173'
