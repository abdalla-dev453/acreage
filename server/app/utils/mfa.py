"""Multi-factor authentication for administrator accounts.

Two pieces:

  TOTP (RFC 6238) via pyotp. The shared secret is encrypted at rest with
  Fernet, derived from FERNET_KEY. Without that, a database dump is enough to
  mint valid codes, which would make MFA decorative.

  Recovery codes. Six single-use codes generated from `secrets`, stored hashed
  like passwords. Losing the authenticator is otherwise an unrecoverable
  lockout that can only be resolved by editing the database by hand.

Both the code and the recovery codes are compared in constant time, and a used
code is recorded so the same six digits cannot be replayed inside its own
30-second validity window.
"""

import hashlib
import hmac
import secrets

import pyotp
from cryptography.fernet import Fernet, InvalidToken

from app.models.rbac import UserMFA

RECOVERY_CODE_COUNT = 6
RECOVERY_CODE_BYTES = 5  # 10 hex characters, grouped as 5+5 for readability


class MFAUnavailable(Exception):
    """Raised when MFA is required but cannot be performed.

    Raised instead of falling back to a weaker mode: silently skipping the
    second factor when its cryptography is misconfigured is exactly the
    failure mode MFA exists to prevent.
    """


def _fernet():
    """Build the Fernet cipher used to protect stored TOTP secrets.

    FERNET_KEY must be a valid urlsafe base64 32-byte key. It is generated
    once from SECRET_KEY when not supplied, but production is expected to set
    it explicitly so the key survives a SECRET_KEY rotation.
    """
    from flask import current_app

    key = current_app.config.get('FERNET_KEY')
    if not key:
        raw = current_app.config['SECRET_KEY']
        key = base64_urlsafe_nanos_from_bytes(hashlib.sha256(raw.encode()).digest())
    try:
        return Fernet(key)
    except (ValueError, TypeError) as exc:
        raise MFAUnavailable(
            'FERNET_KEY is not a valid Fernet key; refusing to store MFA secrets'
        ) from exc


def base64_urlsafe_nanos_from_bytes(raw):
    import base64
    return base64.urlsafe_b64encode(raw).decode()


def _hash(value):
    return hashlib.sha256(value.encode()).hexdigest()


def new_secret():
    """A fresh TOTP shared secret, base32 as the RFC requires."""
    return pyotp.random_base32()


def encrypt_secret(secret):
    return _fernet().encrypt(secret.encode()).decode()


def decrypt_secret(ciphertext):
    try:
        return _fernet().decrypt(ciphertext.encode()).decode()
    except InvalidToken as exc:
        raise MFAUnavailable(
            'Stored MFA secret could not be decrypted; FERNET_KEY has probably '
            'changed. Re-enrol the authenticator.'
        ) from exc


def provision(user):
    """Create an unconfirmed enrolment. Returns (mfa_row, provisioning_uri).

    The secret is not active until confirm() is called with a valid code, so a
    mis-scanned QR code cannot lock an administrator out.
    """
    secret = new_secret()
    recovery = generate_recovery_codes()
    record = UserMFA.query.filter_by(user_id=user.id).first()
    if record is None:
        record = UserMFA(user_id=user.id)
        # imported here to avoid a circular import at module load
        from app import db
        db.session.add(record)
    record.secret_encrypted = encrypt_secret(secret)
    record.is_enabled = False
    record.last_used_code_hash = None
    record.recovery_codes = [_hash(_normalise(c)) for c in recovery]
    from app import db
    db.session.flush()

    uri = pyotp.TOTP(secret).provisioning_uri(
        name=user.email or user.username, issuer_name='Acreage Admin'
    )
    return record, uri, recovery


def confirm(record, code):
    """Activate the enrolment once a valid code is presented."""
    secret = decrypt_secret(record.secret_encrypted)
    if not pyotp.TOTP(secret).verify(code.strip(), valid_window=1):
        return False
    record.is_enabled = True
    from app.utils.time import utcnow
    record.confirmed_at = utcnow()
    # Deliberately does NOT record the code as used. This is the enrolment
    # code, not a login code; consuming it would force the administrator to
    # wait out the current 30-second window before their first sign-in.
    record.last_used_code_hash = None
    return True


def disable(user):
    from app import db
    record = UserMFA.query.filter_by(user_id=user.id).first()
    if record is None:
        return False
    db.session.delete(record)
    return True


def _normalise(code):
    """Reduce a pasted code to its canonical form.

    Authenticator apps display `123 456` and recovery codes are displayed as
    `ABCDE-12345`. Both have to collapse to the same string that is hashed,
    otherwise a code can be accepted on one path and rejected on the other.
    """
    return ''.join(c for c in str(code) if c.isalnum()).upper()


def verify(user, code):
    """Check a submitted second factor.

    Accepts either the current TOTP or an unused recovery code. Returns one of
    'ok', 'invalid', 'recovery'.

    Raises MFAUnavailable when the user has MFA enrolled but it cannot be
    checked — the caller must refuse the login rather than let it through.
    """
    record = UserMFA.query.filter_by(user_id=user.id).first()
    if record is None or not record.is_enabled:
        return 'invalid'

    normalised = _normalise(code)
    if not normalised:
        return 'invalid'

    # A recovery code is 10 hex characters; a TOTP is 6 digits. After
    # normalisation both are pure alnum, so the shape alone distinguishes them.
    # Routing on shape avoids feeding a recovery code to the TOTP verifier.
    if len(normalised) == RECOVERY_CODE_BYTES * 2:
        return _check_recovery(record, normalised)

    secret = decrypt_secret(record.secret_encrypted)
    if not pyotp.TOTP(secret).verify(normalised, valid_window=1):
        return 'invalid'

    # Replay guard: the same code cannot be used twice inside its window.
    fingerprint = _hash(normalised)
    if record.last_used_code_hash and hmac.compare_digest(
            record.last_used_code_hash, fingerprint):
        return 'invalid'

    record.last_used_code_hash = fingerprint
    return 'ok'


def _check_recovery(record, code):
    stored = list(record.recovery_codes or [])
    fingerprint = _hash(code)
    for index, candidate in enumerate(stored):
        if hmac.compare_digest(candidate, fingerprint):
            # Single use: drop it the moment it is spent.
            stored.pop(index)
            record.recovery_codes = stored
            return 'recovery'
    return 'invalid'


def generate_recovery_codes():
    codes = []
    for _ in range(RECOVERY_CODE_COUNT):
        raw = secrets.token_hex(RECOVERY_CODE_BYTES).upper()
        codes.append(f'{raw[:RECOVERY_CODE_BYTES]}-{raw[RECOVERY_CODE_BYTES:]}')
    return codes


def remaining_recovery_codes(user):
    record = UserMFA.query.filter_by(user_id=user.id).first()
    if record is None:
        return 0
    return len(record.recovery_codes or [])


def is_enabled(user):
    record = UserMFA.query.filter_by(user_id=user.id).first()
    return bool(record and record.is_enabled)