# Deployment checklist

- [ ] Set unique `SECRET_KEY` and `JWT_SECRET_KEY` (at least 32 random bytes each).
- [ ] Set `FLASK_DEBUG=false`, a production `DATABASE_URL`, and run `flask db upgrade`.
- [ ] Configure SMTP (`MAIL_*`) and a public HTTPS `FRONTEND_URL`.
- [ ] Set `CORS_ORIGINS` to only the deployed frontend origin.
- [ ] Set `MPESA_CALLBACK_URL` to a public HTTPS `/api/orders/mpesa-callback` URL.
- [ ] Set `RATELIMIT_STORAGE_URI` to Redis; do not use `memory://` with multiple workers.
- [ ] Run `pytest` and `npm run build` in CI before deployment.
- [ ] Run behind Gunicorn/uWSGI and a TLS-terminating reverse proxy; do not use Flask's development server.
- [ ] Configure log retention, database backups, monitoring, and a health check at `/health`.
