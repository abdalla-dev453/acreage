# 🌾 Acreage

**A direct-trade agritech marketplace connecting Kenyan farmers with buyers — no middlemen.**

Acreage lets farmers list crops, buyers order directly, and both sides track fulfillment, payments, and communication in one place. It ships with M-Pesa-ready checkout, per-role analytics dashboards, agronomic activity logs, and in-app buyer↔farmer chat.

![Python](https://img.shields.io/badge/Python-3.12+-3776AB?logo=python&logoColor=white)
![Flask](https://img.shields.io/badge/Flask-3.x-000000?logo=flask&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-Bundler-646CFF?logo=vite&logoColor=white)
![CI](https://github.com/abdalla-dev453/acreage/actions/workflows/ci.yml/badge.svg)
![License](https://img.shields.io/badge/License-Unspecified-lightgrey)

---

## Contents

- [Features](#-features)
- [Tech Stack](#️-tech-stack)
- [Quick Start](#-quick-start)
- [Project Structure](#-project-structure)
- [Data Model](#-data-model)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [Running Tests](#-running-tests)
- [API Reference](#-api-reference)
- [Roles & Permissions](#-roles--permissions)
- [Deployment](#-deployment)
- [Troubleshooting](#-troubleshooting)
- [Roadmap](#-roadmap)
- [Contributing](#-contributing)

---

## ✨ Features

- **Direct marketplace** — farmers list produce by category, unit, and stock; buyers browse and check out without a middleman.
- **Role-aware order pipeline** — a single `/orders` API branches by role, so buyers see what they've bought and farmers see what they need to fulfill, with status transitions (`pending → on delivery → delivered / cancelled`).
- **M-Pesa STK Push checkout** — orders trigger a Safaricom Daraja STK push at checkout, with an async callback endpoint that reconciles payment status and restores stock on failed payments.
- **Farmer payouts** — farmers can withdraw available balance via M-Pesa B2C, with a payout history ledger.
- **Analytics dashboards** — role-specific revenue, order-status, and top-seller breakdowns for both farmers and buyers.
- **Agronomy logs** — farmers record planting, fertilizing, irrigation, and harvest activity per field.
- **Buyer↔farmer chat** — threaded, read-tracked messaging between any two accounts.
- **Reviews** — buyers rate and review farmers after a transaction.
- **Secure auth** — JWT sessions, email verification, and token-based password reset.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Backend runtime | Python 3.12+ |
| Backend framework | Flask (application factory pattern) |
| ORM / migrations | Flask-SQLAlchemy + Flask-Migrate (Alembic) |
| Auth | Flask-JWT-Extended (stateless JWT) |
| Serialization | Flask-Marshmallow + Marshmallow-SQLAlchemy |
| Rate limiting | Flask-Limiter |
| Database | SQLite locally, PostgreSQL in production |
| Frontend framework | React 18 (Vite) |
| Styling | Tailwind CSS |
| Animation | Framer Motion |
| Icons | Lucide React |
| HTTP client | Axios, with a global 401 → logout interceptor |

---

## ⚡ Quick Start

For readers who just want it running. See [Getting Started](#-getting-started) below for the full walkthrough, including environment variables.

```bash
git clone https://github.com/abdalla-dev453/acreage.git && cd acreage

# Terminal 1 — backend
cd server && python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
export FLASK_APP=app.py PYTHONPATH=.
cp .env.example .env
flask db upgrade && python seed.py && flask run --port=5000

# Terminal 2 — frontend
cd client && npm install && npm run dev
```

Open `http://localhost:5173` and sign in with a [seeded demo account](#demo-accounts).

---

## 📂 Project Structure

```text
acreage/
├── client/                     # Vite + React frontend
│   ├── src/
│   │   ├── components/         # Reusable UI: common/ (Navbar, Sidebar, ProtectedRoute), dashboard/ (charts, stat cards), orders/ (OrderTable), chat/ (ConversationList, ChatWindow)
│   │   ├── context/            # AuthContext and other app-wide state providers
│   │   ├── pages/              # Route-level views (Home, Login, Register, Orders, Marketplace, Chats, Wallet, ...)
│   │   ├── services/           # api.js — Axios instance with JWT + 401 interceptors
│   │   ├── routes/             # AppRoutes.jsx, ProtectedRoute.jsx
│   │   ├── App.jsx
│   │   └── index.css
│   ├── package.json
│   └── vite.config.js
└── server/                     # Flask backend
    ├── app/
    │   ├── models/              # SQLAlchemy models: user, product, order, farm_log, chat, review, payout
    │   ├── routes/               # Blueprints: auth, products, orders, farm_logs, chat, reviews, payouts, analytics
    │   ├── schemas/               # Marshmallow serializers
    │   ├── utils/                   # mpesa, security, validators, http helpers
    │   └── __init__.py               # create_app() application factory
    ├── migrations/               # Alembic migration history (already initialized — do not re-run `flask db init`)
    ├── instance/                  # SQLite database file (created at runtime, not committed)
    ├── tests/                    # pytest suite
    ├── app.py                   # Entry point
    ├── seed.py                  # Demo data seed script
    └── requirements.txt
```

---

## 📊 Data Model
erDiagram
    USERS ||--o{ PRODUCTS : lists
    USERS ||--o{ ORDERS : "places (buyer)"
    USERS ||--o{ ORDERS : "fulfills (farmer)"
    USERS ||--o{ FARM_LOGS : records
    USERS ||--o{ PAYOUTS : withdraws
    USERS ||--o{ REVIEWS : writes
    USERS ||--o{ CHAT_MESSAGES : sends
    PRODUCTS ||--o{ ORDER_ITEMS : contains
    ORDERS ||--|{ ORDER_ITEMS : includes

    USERS {
        int id PK
        string username UK
        string email UK
        string password_hash
        string role "farmer | buyer"
        string phone_number
        string location
        boolean email_verified
        string created_at
    }

    PRODUCTS {
        int id PK
        int farmer_id FK
        string title
        string category
        float price_per_unit
        string unit "kg | piece | crate | bag"
        float stock_quantity
        boolean is_available
        string created_at
    }

    ORDERS {
        int id PK
        int buyer_id FK
        int farmer_id FK
        string order_code UK
        float total_amount
        string status "pending | on delivery | delivered | cancelled"
        string payment_status "unpaid | paid | failed"
        string delivery_address
        string contact_phone
        string created_at
    }

    ORDER_ITEMS {
        int id PK
        int order_id FK
        int product_id FK
        float quantity
        float unit_price
    }

    FARM_LOGS {
        int id PK
        int farmer_id FK
        string field_name
        string activity_type "Planting | Fertilizer | Irrigation | Harvest"
        string inputs_used
        string estimated_harvest_date
        string logged_at
    }

    PAYOUTS {
        int id PK
        int farmer_id FK
        string mpesa_number
        string conversation_id
        float amount
        string status
        string created_at
    }

    REVIEWS {
        int id PK
        int reviewer_id FK
        int farmer_id FK
        int rating
        string comment
        string created_at
    }


---

## 🚀 Getting Started

### Prerequisites

- Python 3.12+
- Node.js 18+ and npm
- Git

### 1. Backend (`/server`)

```bash
cd server
python3 -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate

pip install -r requirements.txt

export FLASK_APP=app.py           # Windows (PowerShell): $env:FLASK_APP="app.py"
export PYTHONPATH=.

cp .env.example .env              # then fill in real values — see Environment Variables below

# Migrations are already committed to this repo — do NOT run `flask db init`.
# This creates/updates server/instance/acreage.db and applies the full schema.
flask db upgrade

# Optional: populate demo farmers, buyers, products, orders, logs, chats, and reviews
python seed.py

flask run --port=5000
```

The API is now live at `http://localhost:5000/api`, with a health check at `http://localhost:5000/health`.

### 2. Frontend (`/client`)

In a second terminal:

```bash
cd client
npm install
npm run dev
```

Vite serves the app at `http://localhost:5173`. The client talks to the backend directly via Axios (`VITE_API_BASE_URL`, defaulting to `http://localhost:5000/api`) — there is no dev-server proxy, so CORS on the backend must include the frontend's origin (already configured for `localhost:5173` and `localhost:3000` by default).

### Demo accounts

If you ran `python seed.py`, these accounts are ready to sign in with (password for all: `password123`):

| Username | Role | Email |
|---|---|---|
| `johndoe_farm` | Farmer | john@farm.com |
| `mary_wambui` | Farmer | mary@farm.com |
| `alice_grocer` | Buyer | alice@shop.com |
| `bob_eats` | Buyer | bob@eats.com |

---

## 🔐 Environment Variables

Copy `server/.env.example` to `server/.env` and configure:

| Variable | Purpose | Local default |
|---|---|---|
| `SECRET_KEY` / `JWT_SECRET_KEY` | Flask session / JWT signing secrets | insecure dev fallback — **must** be set in production |
| `DATABASE_URL` | SQLAlchemy database URI | `sqlite:///../instance/acreage.db` |
| `CORS_ORIGINS` | Comma-separated allowed frontend origins | `http://localhost:5173,http://localhost:3000` |
| `FRONTEND_URL` | Used to build verification/reset links | `http://localhost:5173` |
| `EMAIL_VERIFICATION_REQUIRED` | Require email verification before login | `false` locally |
| `MAIL_*` | SMTP settings for verification/reset emails | unset (emails log instead of send) |
| `MPESA_ENV` / `MPESA_SHORTCODE` / `MPESA_CONSUMER_KEY` / `MPESA_CONSUMER_SECRET` / `MPESA_PASSKEY` | Safaricom Daraja credentials | sandbox |
| `MPESA_CALLBACK_URL` | Public HTTPS URL Safaricom calls after STK push | `http://localhost:5000/api/orders/mpesa-callback` |
| `RATELIMIT_STORAGE_URI` | Flask-Limiter backing store | `memory://` (use Redis in production with multiple workers) |

See `server/.env.example` for the full list and `DEPLOYMENT_CHECKLIST.md` before deploying.

---

## ✅ Running Tests

**Backend:**
```bash
cd server
pytest
```

**Frontend lint:**
```bash
cd client
npm run lint
```

---

## 📖 API Reference

Full endpoint-by-endpoint reference with request/response examples lives in **[DOCUMENTATION.md](./DOCUMENTATION.md)**. Quick summary:

| Blueprint | Prefix | Covers |
|---|---|---|
| Auth | `/api/auth` | Register, login, email verification, password reset, current profile |
| Products | `/api/products` | Marketplace listings — CRUD, farmer-owned |
| Orders | `/api/orders` | Placing orders, role-filtered order history, status updates, M-Pesa callback |
| Payouts | `/api/payouts` | Farmer M-Pesa withdrawals and payout history |
| Farm Logs | `/api/farm_logs` | Farmer agronomy activity journal |
| Chat | `/api/chat` | Buyer↔farmer direct messaging |
| Reviews | `/api/reviews` | Farmer ratings and comments |
| Analytics | `/api/analytics` | Role-aware dashboard metrics |

---

## 👥 Roles & Permissions

Every account is either a **farmer** or a **buyer** (set at registration). There is no separate admin role in the current implementation.

- **Farmers** list and manage their own products, fulfill and update orders placed against them, log farm activity, and withdraw earnings.
- **Buyers** browse the marketplace, place orders, track their own order history, and review farmers.

Both roles share chat, analytics (scoped to their own data), and profile management.

---

## 📦 Deployment

Production configuration and a pre-launch checklist (secrets, HTTPS, Redis-backed rate limiting, WSGI server, monitoring) are documented in **[DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)**. Never run Flask's built-in development server in production.

---

## 🧯 Troubleshooting

**`flask db upgrade` seems to have no effect / my changes aren't showing up.**
`DATABASE_URL`'s default (`sqlite:///../instance/acreage.db`) is a *relative* SQLite path. Flask-SQLAlchemy resolves it against the Flask app's root path (`server/app/`), **not** your shell's current working directory — so the file that's actually used at runtime is `server/instance/acreage.db`, regardless of where you ran the command from (as long as it was somewhere under `server/`). If you're inspecting the database directly, check that path first before assuming migrations didn't run.

**Login fails with "Verify your email before signing in" on a fresh setup.**
`EMAIL_VERIFICATION_REQUIRED` defaults to `false` locally, so this shouldn't happen for accounts you register yourself. If you're using `seed.py`'s demo accounts, make sure you're on a version of the script that sets `email_verified=True` — older copies of this seed script did not, which silently locked every demo account out of `/auth/login`.

**Frontend requests fail with a CORS error.**
The Flask backend only allows origins listed in `CORS_ORIGINS` (defaults to `http://localhost:5173,http://localhost:3000`). If you're serving the frontend from a different host or port, add it to that variable in `server/.env`.

**`ModuleNotFoundError: No module named 'app'` when running `flask` commands.**
Make sure `PYTHONPATH=.` is set and that you're running the command from inside `server/`, not the repo root.

**Port already in use.**
Both `flask run --port=5000` and `npm run dev` (Vite, port `5173`) will fail loudly if something else is already bound to that port — stop the other process, or pass a different port (`flask run --port=5001`, `npm run dev -- --port=5174`).

---

## 🗺️ Roadmap

Known gaps in the current implementation — useful context before extending it:

- **No admin role.** Every account is `farmer` or `buyer`; there's no moderation or platform-admin surface.
- **No refresh tokens.** JWTs expire after 1 hour with no silent renewal; the client re-prompts login on expiry.
- **In-memory rate limiting by default.** `RATELIMIT_STORAGE_URI=memory://` doesn't share state across multiple production workers — swap in Redis before scaling horizontally (see `DEPLOYMENT_CHECKLIST.md`).
- **Single-farmer orders.** An order can only contain products from one farmer per checkout; multi-farmer carts aren't supported.
- **No license file.** See [License](#license) below.

---

## 🤝 Contributing

Structure feature branches by area before opening a pull request against `main`:

- `auth` — authentication context and token middleware
- `models` — ORM schema changes
- `routes` — blueprint controllers and request validation
- `pages` — frontend views and routing

Every push and pull request runs the **[CI pipeline](.github/workflows/ci.yml)** — a backend syntax check plus `pytest`, and a production frontend build (`npm run build`). Make sure both pass locally before opening a PR:

```bash
cd server && pytest
cd ../client && npm run build
```

Keep commits scoped and descriptive, and open PRs against `main` with a clear summary of what changed and why.

---

## License

No license file is currently included in this repository. Add one (e.g. MIT, Apache-2.0) before distributing or accepting external contributions.
