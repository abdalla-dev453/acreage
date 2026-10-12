from app import db
from app.models.admin import SuperadminSession
from app.models.rbac import AdminRole, AdminSession
from app.models.user import User
from app.utils.rbac import seed_permissions


def make_user(username, role, *, superadmin=False, admin_role=None):
    user = User(
        username=username,
        email=f'{username}@example.com',
        role=role,
        email_verified=True,
        is_superadmin=superadmin,
        admin_role=admin_role,
    )
    user.set_password('StrongPass1!')
    db.session.add(user)
    db.session.commit()
    return user


def login(client, username):
    response = client.post('/api/auth/login', json={
        'email': f'{username}@example.com',
        'password': 'StrongPass1!',
    })
    assert response.status_code == 200
    return {'Authorization': f"Bearer {response.get_json()['token']}"}


def test_superadmin_login_opens_admin_shell_and_records_sessions(client, app):
    with app.app_context():
        seed_permissions()
        role = AdminRole.query.filter_by(key='super_admin').one()
        admin = make_user('root-admin', 'super_admin', superadmin=True, admin_role=role)
        admin_id = admin.id

    headers = login(client, 'root-admin')
    identity = client.get('/api/admin/me', headers=headers)
    assert identity.status_code == 200
    assert identity.get_json()['is_super_admin'] is True

    users = client.get('/api/admin/users', headers=headers)
    assert users.status_code == 200

    with app.app_context():
        assert AdminSession.query.filter_by(user_id=admin_id, ended_at=None).count() == 1
        assert SuperadminSession.query.filter_by(user_id=admin_id).count() == 1


def test_regular_user_cannot_enter_admin_api(client, app):
    with app.app_context():
        make_user('ordinary-user', 'farmer')

    headers = login(client, 'ordinary-user')
    assert client.get('/api/admin/me', headers=headers).status_code == 403
    assert client.get('/api/admin/users', headers=headers).status_code == 403


def test_delegated_admin_gets_only_assigned_permissions(client, app):
    with app.app_context():
        seed_permissions()
        role = AdminRole.query.filter_by(key='admin').one()
        make_user('staff-admin', 'admin', admin_role=role)

    headers = login(client, 'staff-admin')
    identity = client.get('/api/admin/me', headers=headers)
    assert identity.status_code == 200
    permissions = set(identity.get_json()['permissions'])
    assert 'users.view' in permissions
    assert 'finance.settings' not in permissions
    assert client.get('/api/admin/users', headers=headers).status_code == 200
