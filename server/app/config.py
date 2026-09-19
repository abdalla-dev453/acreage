import os
from datetime import timedelta

class Config:
    # Flask Environment State
    FLASK_ENV = os.getenv("FLASK_ENV", "development")
    IS_PROD = FLASK_ENV == "production"

    #Security: Fall back to auto-generated keys in production if env vars are missing
    SECRET_KEY = os.getenv("SECRET_KEY") or (
        os.urandom(24).hex() if IS_PROD else "dev-secret-key-change-me-in-production"
    )
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY") or (
        os.urandom(24).hex() if IS_PROD else "dev-jwt-secret-key-change-me"
    )

    # Flag default secrets usage for app startup warnings
    USING_DEFAULT_SECRETS = (
        SECRET_KEY == "dev-secret-key-change-me-in-production" or 
        JWT_SECRET_KEY == "dev-jwt-secret-key-change-me"
    )

    # Database Configuration (Ensures standard postgresql:// URI format)
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL", "sqlite:///../instance/acreage.db")
    if SQLALCHEMY_DATABASE_URI.startswith("postgres://"):
        SQLALCHEMY_DATABASE_URI = SQLALCHEMY_DATABASE_URI.replace("postgres://", "postgresql://", 1)
    
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=1)
    SECURITY_TOKEN_EXPIRES_MINUTES = int(os.getenv("SECURITY_TOKEN_EXPIRES_MINUTES", "30"))
    EMAIL_VERIFICATION_REQUIRED = os.getenv(
        "EMAIL_VERIFICATION_REQUIRED", str(IS_PROD)
    ).lower() in {"1", "true", "yes"}
    FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip("/")

    MAIL_SERVER = os.getenv("MAIL_SERVER")
    MAIL_PORT = int(os.getenv("MAIL_PORT", "587"))
    MAIL_USE_TLS = os.getenv("MAIL_USE_TLS", "true").lower() in {"1", "true", "yes"}
    MAIL_USERNAME = os.getenv("MAIL_USERNAME")
    MAIL_PASSWORD = os.getenv("MAIL_PASSWORD")
    MAIL_DEFAULT_SENDER = os.getenv("MAIL_DEFAULT_SENDER", "no-reply@acreage.local")

    # Upload size limit — 16 MB max for file uploads (prevents DoS via large payloads)
    MAX_CONTENT_LENGTH = int(os.getenv("MAX_CONTENT_LENGTH", 16 * 1024 * 1024))

    # Security headers
    SESSION_COOKIE_SECURE = IS_PROD
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'
    PERMANENT_SESSION_LIFETIME = timedelta(minutes=60)
    JWT_TOKEN_LOCATION = ["headers"]
    JWT_COOKIE_SECURE = IS_PROD
    JWT_COOKIE_CSRF_PROTECT = False

    LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()
    # Use Redis (for example redis://redis:6379/0) in production so limits
    # work consistently across multiple web workers.
    RATELIMIT_STORAGE_URI = os.getenv("RATELIMIT_STORAGE_URI", "memory://")

    raw_cors = os.getenv("CORS_ORIGINS", "")
    if raw_cors:
        CORS_ORIGINS = [origin.strip() for origin in raw_cors.split(",") if origin.strip()]
    else:
        CORS_ORIGINS = ["<local>"]  # auto-detect in dev; set CORS_ORIGINS in production

    #Safaricom M-Pesa Settings
    MPESA_ENV = os.getenv("MPESA_ENV", "sandbox")
    MPESA_CONSUMER_KEY = os.getenv("MPESA_CONSUMER_KEY", "")
    MPESA_CONSUMER_SECRET = os.getenv("MPESA_CONSUMER_SECRET", "")
    MPESA_SHORTCODE = os.getenv("MPESA_SHORTCODE", "174379")
    MPESA_PASSKEY = os.getenv("MPESA_PASSKEY", "")
    MPESA_INITIATOR_NAME = os.getenv("MPESA_INITIATOR_NAME", "")
    MPESA_B2C_COMMAND = os.getenv("MPESA_B2C_COMMAND", "BusinessPayment")
    MPESA_CALLBACK_URL = os.getenv(
        "MPESA_CALLBACK_URL",
        "http://localhost:5000/api/orders/mpesa-callback"
    )
