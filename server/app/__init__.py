import os
import re
import logging
from flask import Flask, jsonify, request
from werkzeug.exceptions import HTTPException
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_migrate import Migrate
from flask_marshmallow import Marshmallow


db = SQLAlchemy()
jwt = JWTManager()
# Backstop only. This was "200 per day, 50 per hour", which is far too tight for
# ordinary browsing: a single user loading a dozen pages, each firing several API
# calls, exhausted the hourly budget and every response after it was a 429 —
# indistinguishable from the API being unreachable. Sensitive endpoints carry
# their own much tighter limits; this ceiling exists to stop abuse, not to
# ration normal traffic.
limiter = Limiter(key_func=get_remote_address, default_limits=["5000 per day", "600 per hour"])
migrate = Migrate()
ma = Marshmallow()

def create_app(config_class=None):
    app = Flask(__name__)
    
    if config_class:
        app.config.from_object(config_class)
    else:
        from .config import Config
        app.config.from_object(Config)

    logging.basicConfig(
        level=getattr(logging, app.config.get("LOG_LEVEL", "INFO"), logging.INFO),
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
    )
        
    db.init_app(app)
    jwt.init_app(app)
    ma.init_app(app)
    migrate.init_app(app, db)
    
    # 1. Build the CORS allow-list from exact origins plus anchored patterns.
    #    flask-cors 6.x matches a compiled regex and a literal string against
    #    the same option, so the two kinds can be combined in one list.
    raw_origins = app.config.get("CORS_ORIGINS")
    if isinstance(raw_origins, str):
        origins = [origin.strip() for origin in raw_origins.split(",") if origin.strip()]
    else:
        origins = list(raw_origins or [])
    # Never leave a placeholder origin in the list — it would silently
    # refuse every real browser origin in development.
    origins = [origin for origin in origins if origin and origin != "<local>"]

    patterns = app.config.get("CORS_ORIGIN_PATTERNS") or []
    if isinstance(patterns, str):
        patterns = [p.strip() for p in patterns.split(",") if p.strip()]
    for pattern in patterns:
        try:
            origins.append(re.compile(pattern))
        except re.error:
            logging.warning("Ignoring invalid CORS_ORIGIN_PATTERNS entry: %r", pattern)

    # A production API that allows no browser origin looks healthy to Render's
    # health check while every real request fails, so make it visible in the logs.
    if not origins:
        logging.error(
            "CORS is configured with zero allowed origins — every browser "
            "request will be refused. Set CORS_ORIGINS on this service."
        )
    else:
        logging.info(
            "CORS allowed origins: %s",
            ", ".join(o.pattern if hasattr(o, "pattern") else str(o) for o in origins),
        )

    # 2. Configure CORS with authorization credentials support
    CORS(app, resources={r"/api/*": {"origins": origins}}, supports_credentials=True)
    
    limiter.init_app(app)

    # Disable rate limiting in development for smoother testing
    if not app.config.get('IS_PROD'):
        limiter.enabled = False

    # Register every model before schemas are imported by the route modules.
    # SQLAlchemy otherwise tries to configure User's relationships before
    # Product, Order, and the other related models exist in its registry.
    from . import models  # noqa: F401

    @app.after_request
    def log_request(response):
        # Deliberately excludes request bodies, headers, credentials, and tokens.
        app.logger.info("HTTP request", extra={
            "method": request.method,
            "path": request.path,
            "status": response.status_code,
            "remote_addr": request.remote_addr,
        })
        return response

    @app.after_request
    def add_security_headers(response):
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['X-Frame-Options'] = 'DENY'
        response.headers['X-XSS-Protection'] = '1; mode=block'
        response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        if app.config.get("IS_PROD"):
            response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
        return response
    
    # Security Warning
    if app.config.get("USING_DEFAULT_SECRETS") and not app.debug:
        logging.warning("WARNING: Using default security keys in a non-debug environment!")

    # Register Blueprints
    from .routes.auth import auth_bp
    from .routes.products import products_bp
    from .routes.analytics import analytics_bp
    from .routes.chat import chat_bp
    from .routes.reviews import reviews_bp
    from .routes.orders import orders_bp
    from .routes.payouts import payouts_bp
    from .routes.farm_logs import farm_logs_bp
    from .routes.trust import trust_bp
    from .routes.commerce import commerce_bp
    from .routes.settings import settings_bp
    from .routes.sms import sms_bp
    from .routes.whatsapp import whatsapp_bp
    from .routes.price_alerts import price_alerts_bp
    from .routes.cooperatives import cooperatives_bp
    from .routes.admin import admin_bp

    app.register_blueprint(analytics_bp, url_prefix="/api/analytics")
    app.register_blueprint(products_bp, url_prefix="/api/products")
    app.register_blueprint(chat_bp, url_prefix="/api/chat")
    app.register_blueprint(reviews_bp, url_prefix="/api/reviews")
    app.register_blueprint(orders_bp, url_prefix="/api/orders")
    app.register_blueprint(payouts_bp, url_prefix="/api/payouts")
    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(farm_logs_bp, url_prefix="/api/farm_logs")
    app.register_blueprint(trust_bp, url_prefix="/api/trust")
    app.register_blueprint(commerce_bp, url_prefix="/api")
    app.register_blueprint(settings_bp, url_prefix="/api/settings")
    app.register_blueprint(sms_bp, url_prefix="/api/sms")
    app.register_blueprint(whatsapp_bp, url_prefix="/api/whatsapp")
    app.register_blueprint(price_alerts_bp, url_prefix="/api/price-alerts")
    app.register_blueprint(cooperatives_bp, url_prefix="/api/cooperatives")
    app.register_blueprint(admin_bp, url_prefix="/api/admin")

    # Enforce the account's standing on every authenticated request.
    #
    # JWTs are stateless and last an hour, so setting account_status alone
    # would leave a frozen user fully operational until their token expired.
    # The login route refuses a frozen account outright, and this guard closes
    # the gap for tokens that were issued before the freeze: every request
    # re-checks that the token's embedded version still matches the stored one.
    @app.before_request
    def enforce_account_status():
        from flask_jwt_extended import get_jwt, get_jwt_identity, verify_jwt_in_request

        # CORS preflights carry no credentials by definition. flask-jwt-extended
        # exempts OPTIONS by default, so verify_jwt_in_request() would succeed
        # and populate an empty claim set, and get_jwt_identity() would then
        # raise outside the guarded block. Skipping OPTIONS outright is what
        # keeps the preflight from 500-ing.
        if request.method == "OPTIONS":
            return None

        try:
            verify_jwt_in_request()
            user_id = int(get_jwt_identity())
        except Exception:
            # No, expired, malformed or identity-less token. The route's own
            # @jwt_required produces the correct 401; nothing to do here.
            return None

        from app.models.user import User
        account = db.session.get(User, user_id)
        if account is None:
            return jsonify({'message': 'Account no longer exists'}), 401
        if not account.can_authenticate:
            return jsonify({
                'message': f'This account is {account.account_status}.',
                'account_status': account.account_status,
                'reason': account.frozen_reason,
            }), 403

        token_version = get_jwt().get('ver')
        if token_version is not None and token_version != account.token_version:
            return jsonify({
                'message': 'Your session has been ended. Please sign in again.',
                'code': 'token_revoked',
            }), 401
        return None

    # Global Health Check Endpoint
    @app.route("/health")
    def health_check():
        return jsonify({"status": "healthy"}), 200

    # Global 404 & 500 JSON Handlers
    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"message": "Resource not found"}), 404

    @app.errorhandler(500)
    def internal_error(e):
        db.session.rollback()
        app.logger.exception("Unhandled server error")
        return jsonify({"message": "An internal server error occurred"}), 500

    @app.errorhandler(HTTPException)
    def http_error(error):
        return jsonify({"message": error.description}), error.code

    @app.teardown_request
    def rollback_failed_request(exception):
        if exception is not None:
            db.session.rollback()
            app.logger.exception("Request failed and transaction was rolled back", exc_info=exception)

    return app
