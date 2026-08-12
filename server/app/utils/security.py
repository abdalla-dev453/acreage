"""Token and notification helpers for account-security workflows."""

import hashlib
import logging
import secrets
import smtplib
from datetime import timedelta
from email.message import EmailMessage
from app.utils.time import utcnow


logger = logging.getLogger(__name__)


def new_token():
    token = secrets.token_urlsafe(32)
    return token, hashlib.sha256(token.encode()).hexdigest()


def is_valid_token(token, token_hash, expires_at):
    if not token or not token_hash or not expires_at or expires_at < utcnow():
        return False
    return secrets.compare_digest(hashlib.sha256(token.encode()).hexdigest(), token_hash)


def expiry(minutes):
    return utcnow() + timedelta(minutes=minutes)


def send_security_email(app, recipient, subject, body):
    """Send through configured SMTP; log delivery status without logging secrets."""
    host = app.config.get("MAIL_SERVER")
    if not host:
        logger.warning("Security email not delivered: SMTP is not configured", extra={"recipient": recipient})
        return False

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = app.config["MAIL_DEFAULT_SENDER"]
    message["To"] = recipient
    message.set_content(body)
    try:
        with smtplib.SMTP(host, app.config["MAIL_PORT"], timeout=10) as smtp:
            if app.config.get("MAIL_USE_TLS"):
                smtp.starttls()
            if app.config.get("MAIL_USERNAME"):
                smtp.login(app.config["MAIL_USERNAME"], app.config.get("MAIL_PASSWORD", ""))
            smtp.send_message(message)
        logger.info("Security email delivered", extra={"recipient": recipient, "subject": subject})
        return True
    except (OSError, smtplib.SMTPException):
        logger.exception("Security email delivery failed", extra={"recipient": recipient})
        return False
