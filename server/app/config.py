import os
from datetime import timedelta

BASE_DIR = os.path.abspath(os.path.dirname(__file__))

# Fallback dev-only secrets. If these are still in use when FLASK_DEBUG is
# off (i.e. a production run), create_app() will refuse to start — see
# app/__init__.py. Always set real SECRET_KEY / JWT_SECRET_KEY env vars
# before deploying.
_DEV_SECRET_KEY = 'acreage-dev-key'
_DEV_JWT_SECRET_KEY = 'acreage-jwt-key'


class Config:
    DEBUG = os.getenv('FLASK_DEBUG', 'false').lower() in ('1', 'true', 'yes')

    SECRET_KEY = os.getenv('SECRET_KEY', _DEV_SECRET_KEY)
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', _DEV_JWT_SECRET_KEY)

    SQLALCHEMY_DATABASE_URI = os.getenv(
        'DATABASE_URL',
        f"sqlite:///{os.path.join(os.path.dirname(BASE_DIR), 'instance', 'acreage.db')}"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Access tokens expire after 1 hour by default instead of never expiring.
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(
        seconds=int(os.getenv('JWT_ACCESS_TOKEN_EXPIRES_SECONDS', 3600))
    )

    # Comma-separated list of allowed frontend origins, e.g.
    # "https://acreage.example.com,https://www.acreage.example.com"
    CORS_ORIGINS = [
        origin.strip()
        for origin in os.getenv('CORS_ORIGINS', 'http://localhost:5173,http://localhost:3000').split(',')
        if origin.strip()
    ]

    USING_DEFAULT_SECRETS = (
        SECRET_KEY == _DEV_SECRET_KEY or JWT_SECRET_KEY == _DEV_JWT_SECRET_KEY
    )
