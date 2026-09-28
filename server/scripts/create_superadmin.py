"""Create or update the platform superadmin account.

    python -m scripts.create_superadmin

Credentials are read from the environment, never from source and never from
argv (argv leaks into shell history and `ps` output):

    export SUPERADMIN_EMAIL=you@example.com
    export SUPERADMIN_USERNAME=you
    read -rs SUPERADMIN_PASSWORD && export SUPERADMIN_PASSWORD

Refuses to run against a password that does not meet the platform's own policy,
and refuses to print the password back. Re-running is safe: it updates the
existing superadmin rather than creating a duplicate, and can be used to reset
a forgotten password.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app, db                       # noqa: E402
from app.models.user import User                     # noqa: E402
from app.utils.validators import validate_password   # noqa: E402


class SuperadminPasswordTooWeak(Exception):
    pass


class MissingCredentials(Exception):
    pass


def read_credentials():
    email = (os.getenv('SUPERADMIN_EMAIL') or '').strip().lower()
    username = (os.getenv('SUPERADMIN_USERNAME') or '').strip()
    password = os.getenv('SUPERADMIN_PASSWORD') or ''

    if not email or not username or not password:
        raise MissingCredentials(
            'Set SUPERADMIN_EMAIL, SUPERADMIN_USERNAME and SUPERADMIN_PASSWORD.'
        )

    # Stronger than the sign-up policy, because this account bypasses it.
    if len(password) < 14:
        raise SuperadminPasswordTooWeak(
            f'Password is {len(password)} characters; a superadmin needs at least 14.'
        )
    checks = (
        (any(c.isupper() for c in password), 'an uppercase letter'),
        (any(c.islower() for c in password), 'a lowercase letter'),
        (any(c.isdigit() for c in password), 'a digit'),
        (any(not c.isalnum() for c in password), 'a symbol'),
    )
    missing = [label for passed, label in checks if not passed]
    if missing:
        raise SuperadminPasswordTooWeak(
            'Password is missing ' + ', '.join(missing) + '.'
        )
    if password.lower() in {username.lower(), email.lower()}:
        raise SuperadminPasswordTooWeak(
            'The password must not be the username or the email.'
        )
    return email, username, password


def main():
    email, username, password = read_credentials()

    app = create_app()
    with app.app_context():
        db.create_all()

        existing = User.query.filter(
            (User.email == email) | (User.username == username)).first()

        if existing is None:
            account = User(
                username=username,
                email=email,
                role='admin',
                is_superadmin=True,
                account_status='active',
                email_verified=True,
                verification_status='verified',
            )
            account.set_password(password)
            db.session.add(account)
            action = 'created'
        else:
            account = existing
            # Re-running always repairs the grant, so an accidental demotion
            # or a forgotten password is fixable without hand-editing SQL.
            account.is_superadmin = True
            account.role = 'admin'
            account.account_status = 'active'
            account.frozen_reason = None
            account.frozen_at = None
            account.frozen_by_id = None
            account.email_verified = True
            account.set_password(password)
            action = 'updated'

        db.session.commit()

        print()
        print('  Superadmin account ' + action + '.')
        print('    id            :', account.id)
        print('    username      :', account.username)
        print('    email         :', account.email)
        print('    role          :', account.role)
        print('    superadmin    :', account.is_superadmin)
        print('    status        :', account.account_status)
        print('    email verified:', account.email_verified)
        print()
        print('  Sign in at /login with the username or the email above.')
        print('  The password is not printed here; keep the one you supplied.')
        print()
        print('  First steps:')
        print('    - open /admin for the control panel')
        print('    - every action is written to the audit log at /admin/audit')
        print()


if __name__ == '__main__':
    try:
        main()
    except (MissingCredentials, SuperadminPasswordTooWeak) as exc:
        print('\n  Refusing to create the account: ' + str(exc) + '\n', file=sys.stderr)
        sys.exit(1)
