# 📘 Acreage — Technical Documentation

Architecture notes and a complete API reference for the Acreage backend. For setup instructions, see [README.md](./README.md).

## Contents

- [Architecture Overview](#architecture-overview)
- [Authentication & Sessions](#authentication--sessions)
- [Roles & Access Control](#roles--access-control)
- [Response & Error Conventions](#response--error-conventions)
- [API Reference](#api-reference)
  - [Auth](#-auth-apiauth)
  - [Products](#-products-apiproducts)
  - [Orders](#-orders-apiorders)
  - [Payouts](#-payouts-apipayouts)
  - [Farm Logs](#-farm-logs-apifarm_logs)
  - [Chat](#-chat-apichat)
  - [Reviews](#-reviews-apireviews)
  - [Analytics](#-analytics-apianalytics)
- [M-Pesa Integration Flow](#-m-pesa-integration-flow)
- [Rate Limiting](#-rate-limiting)

---

## Architecture Overview

Acreage's backend is a Flask application built with the **application factory pattern** (`create_app()` in `app/__init__.py`). Each domain is a separate **blueprint**, all mounted under `/api`:

| Blueprint | Prefix |
|---|---|
| `auth_bp` | `/api/auth` |
| `products_bp` | `/api/products` |
| `orders_bp` | `/api/orders` |
| `payouts_bp` | `/api/payouts` |
| `farm_logs_bp` | `/api/farm_logs` |
| `chat_bp` | `/api/chat` |
| `reviews_bp` | `/api/reviews` |
| `analytics_bp` | `/api/analytics` |

Data access goes through **Flask-SQLAlchemy** models (`app/models/`), serialized for API responses with **Flask-Marshmallow** schemas (`app/schemas/`). Schema classes control exactly which model fields leave the server — for example, `UserSchema` explicitly excludes `password_hash` and the password-reset/email-verification token hashes from every response, even when a user object is nested inside another response (like an order's `buyer`/`farmer`).

Schema changes are tracked with **Flask-Migrate** (Alembic) under `server/migrations/`. The migration history is already initialized and committed — run `flask db upgrade` to apply it; do not run `flask db init` against this repo.

---

## Authentication & Sessions

Acreage uses **stateless JWTs** via Flask-JWT-Extended.

1. `POST /api/auth/register` creates an account with `role` set to `farmer` or `buyer`.
2. If `EMAIL_VERIFICATION_REQUIRED=true`, the account can't log in until `POST /api/auth/verify-email` is called with the emailed token. Locally, this defaults to `false` so accounts are usable immediately.
3. `POST /api/auth/login` returns a JWT (`token` and `access_token`, both the same value, plus a `user` object). Send it on every subsequent request as:


4. Tokens expire after **1 hour**. There is currently no refresh-token endpoint — the client must re-authenticate with `/auth/login` after expiry. The frontend's Axios interceptor listens for `401` responses, clears the stored token, and dispatches an `auth-logout` event to force re-login.

---

## Roles & Access Control

Every account has a `role` of `farmer` or `buyer`, chosen at registration — there is no admin role wired into any route. Authorization is enforced per-endpoint using two patterns:

- **Role checks** — e.g. only `role == 'farmer'` may create a product or initiate a payout.
- **Ownership checks** — e.g. a farmer may only update their *own* product, and only the farmer attached to an order may change its status.

Endpoints below are marked accordingly.

---

## Response & Error Conventions

- All error responses are JSON: `{"message": "<human-readable description>"}`.
- **400** — malformed or invalid request body (missing required field, non-JSON body, invalid enum value).
- **401** — missing, invalid, or expired JWT.
- **403** — valid JWT, but the account's role or ownership doesn't permit the action.
- **404** — the referenced resource doesn't exist.
- **409** — the request conflicts with current state (e.g. deleting a product with order history, updating a `delivered`/`cancelled` order).
- **500** — unhandled server error; the response body never includes a stack trace.

---

## API Reference

All endpoints are prefixed with `/api`. "Auth" below refers to the `Authorization: Bearer <token>` header.

### 🔐 Auth (`/api/auth`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/auth/register` | Public | Create a farmer or buyer account. |
| `POST` | `/auth/login` | Public | Authenticate and receive a JWT. |
| `POST` | `/auth/verify-email` | Public (token) | Confirm an account using its emailed verification token. |
| `POST` | `/auth/password-reset/request` | Public | Request a password-reset email (always returns 200, regardless of whether the email exists). |
| `POST` | `/auth/password-reset/confirm` | Public (token) | Set a new password using a reset token. |
| `GET` | `/auth/me` | Authenticated | Return the authenticated user's profile. |

**`POST /api/auth/register`**
```json
{
  "username": "alice_grocer",
  "email": "alice@shop.com",
  "password": "StrongPassw0rd",
  "role": "buyer",
  "phone_number": "+254712345678",
  "location": "Nairobi, Kenya"
}
```

**`POST /api/auth/login`**
```json
{ "email": "alice@shop.com", "password": "StrongPassw0rd" }
```
Response:
```json
{
  "token": "<jwt>",
  "access_token": "<jwt>",
  "user": { "id": 3, "username": "alice_grocer", "role": "buyer", "...": "..." }
}
```

---

### 🍅 Products (`/api/products`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/products/` | Public | List available products. Supports `?category=` filtering. |
| `GET` | `/products/<id>` | Public | Fetch a single product. |
| `POST` | `/products/` | Farmer | Create a new listing under the authenticated farmer. |
| `PUT` | `/products/<id>` | Owner (farmer) | Update title, category, price, stock, availability, etc. |
| `DELETE` | `/products/<id>` | Owner (farmer) | Delete a listing — rejected with `409` if it has order history; mark it unavailable instead. |

**`POST /api/products/`**
```json
{
  "title": "Export Grade Hass Avocados",
  "category": "Fruits",
  "price_per_unit": 40.0,
  "unit": "piece",
  "stock_quantity": 500.0,
  "description": "Organically farmed Hass avocados ready for shipment."
}
```

---

### 📦 Orders (`/api/orders`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/orders/` | Authenticated | List orders for the current user. Accepts `?role=buyer\|farmer` to pick which side of the order to filter by; defaults to the account's own role. |
| `POST` | `/orders/` | Buyer | Place an order for one or more products **from a single farmer**. Triggers an M-Pesa STK push if configured. |
| `PATCH` | `/orders/<id>/status` | Farmer (order owner) | Transition an order's status. Rejected with `409` once the order is `delivered` or `cancelled`. |
| `POST` | `/orders/mpesa-callback` | Public (Safaricom webhook) | Receives the async STK push result and updates `payment_status`. |

**`POST /api/orders/`**

`farmer_id` is derived server-side from the first item's product — all items in one order must belong to the same farmer. `unit_price` and `total_amount` are computed server-side from the product's current price, not supplied by the client.

```json
{
  "delivery_address": "Biashara Street, Nairobi",
  "contact_phone": "0712345678",
  "payment_status": "unpaid",
  "items": [
    { "product_id": 1, "quantity": 10 }
  ]
}
```

**`PATCH /api/orders/<id>/status`**
```json
{ "status": "on delivery" }
```
Valid values: `pending`, `on delivery`, `delivered`, `cancelled`. Cancelling restores the reserved stock on each order item.

---

### 💸 Payouts (`/api/payouts`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/payouts/withdraw` | Farmer | Initiate an M-Pesa B2C withdrawal. |
| `GET` | `/payouts/history` | Authenticated | List the current user's payout records (empty for buyers, since payouts are farmer-only). |

**`POST /api/payouts/withdraw`**
```json
{ "amount": 5000, "mpesa_number": "0712345678" }
```

---

### 📓 Farm Logs (`/api/farm_logs`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/farm_logs/` | Authenticated (farmer's own logs) | List the current user's farm activity logs. |
| `POST` | `/farm_logs/` | Authenticated | Record a new farm activity entry. |

**`POST /api/farm_logs/`**
```json
{
  "field_name": "Greenhouse Block A",
  "activity_type": "Fertilizer Application",
  "description": "Applied organic compost mix across hybrid tomato rows.",
  "inputs_used": "Organic Compost NPK",
  "estimated_harvest_date": "2026-09-05"
}
```

---

### 💬 Chat (`/api/chat`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/chat/<other_user_id>` | Authenticated | Fetch the full message thread with another user; marks their unread messages to you as read. |
| `POST` | `/chat/` | Authenticated | Send a message to another user. |

**`POST /api/chat/`**
```json
{
  "receiver_id": 2,
  "message": "Hi John, are the organic tomato crates packed for shipping?"
}
```

---

### ⭐ Reviews (`/api/reviews`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/reviews/` | Authenticated | List every review platform-wide, plus the overall average rating. |
| `POST` | `/reviews/farmer/<farmer_id>` | Authenticated | Submit a 1–5 star rating and comment for a farmer. |

**`POST /api/reviews/farmer/1`**
```json
{ "rating": 5, "comment": "Exceptional avocado supply quality, highly recommend." }
```

---

### 📊 Analytics (`/api/analytics`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/analytics/dashboard` | Authenticated | Role-aware dashboard: order counts by status, revenue, top-selling products, and category breakdown, scoped to the current user's own orders (as buyer or farmer). |

---

## 🔄 M-Pesa Integration Flow

1. Buyer places an order via `POST /api/orders/`.
2. The order is created with `payment_status: "unpaid"`, then the backend requests a Safaricom Daraja access token and fires an STK push to the buyer's phone for `total_amount`. If the STK request itself fails, the order is still created — the failure is logged, not surfaced to the buyer as an order failure.
3. Safaricom calls back asynchronously to `POST /api/orders/mpesa-callback` with the transaction result:
   - **Success** (`ResultCode == 0`) — `payment_status` is set to `paid`, and the M-Pesa receipt number is appended to the order's delivery address notes.
   - **Failure** — `payment_status` is set to `failed`, `status` is set to `cancelled`, and the reserved stock on each order item is restored to the product.
4. Farmers withdraw accumulated earnings independently via `POST /api/payouts/withdraw`, which uses M-Pesa B2C rather than the STK push flow.

Configure Daraja credentials via `MPESA_*` environment variables — see [README.md § Environment Variables](./README.md#-environment-variables).

---

## 🚦 Rate Limiting

Flask-Limiter applies a default cap of **200 requests/day and 50/hour per IP** across the API. The storage backend is controlled by `RATELIMIT_STORAGE_URI` — it defaults to in-process memory (`memory://`) for local development, which does **not** work correctly across multiple production workers. Use a shared Redis URI in production; see `DEPLOYMENT_CHECKLIST.md`.