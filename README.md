# 🌾 ShambaPulse

An end-to-end agritech marketplace and management platform connecting local Kenyan farmers directly with urban buyers. ShambaPulse eliminates middlemen by providing direct trade capabilities, real-time market analytics charts, agronomic crop activity logs, order fulfillment workflows, and an integrated M-Pesa ready digital wallet system.

---

## 🛠️ Tech Stack

### Backend Environment
- **Runtime:** Python 3.12+
- **Framework:** Flask (Application Factory Pattern)
- **ORM / Database:** Flask-SQLAlchemy (PostgreSQL / SQLite locally)
- **Migrations:** Flask-Migrate (Alembic engine under the hood)
- **Security:** Flask-JWT-Extended (Stateless token authentication)
- **Serialization:** Flask-Marshmallow + Marshmallow-SQLAlchemy

### Frontend Environment
- **Framework:** React 18 (Vite Bundler)
- **Styles:** Tailwind CSS (Utility-first configuration)
- **Animations:** Framer Motion (Staggered layout entries & SVG transitions)
- **Icons:** Lucide React
- **Network Client:** Axios (With custom event single-page app 401 interceptors)

---

## 📂 Project Architecture Layout

```text
shambapulse/
├── client/                     # Vite + React Frontend Workspace
│   ├── src/
│   │   ├── components/         # Reusable presentation blocks
│   │   │   ├── common/         # Navbar, Sidebar, ProtectedRoute, Portal Modal
│   │   │   └── dashboard/      # StatCard, AnalyticsChart, OrderSummary, TopSelling
│   │   ├── context/            # Central Application State Providers (Auth, Chat)
│   │   ├── pages/              # Main Screen Views (Home, Login, Register, Chats, Wallet)
│   │   ├── services/           # Network Abstractions (api.js interceptors configuration)
│   │   ├── App.jsx             # Unified Router tree map configuration
│   │   └── index.css           # Global CSS and Tailwind entry directives
│   ├── package.json
│   └── vite.config.js          # Port 3000 mapping with backend local proxy routing
└── server/                     # Flask Backend Workspace
    ├── app/
    │   ├── models/             # Database Schemas (user, product, order, farm_log, etc.)
    │   ├── routes/             # Blueprint Controllers (auth, products, orders, analytics)
    │   ├── schemas/            # Marshmallow Serialization classes
    │   └── __init__.py         # Core Factory Setup (create_app, extension initializers)
    ├── instance/               # Local binary runtime store (acreage.db)
    ├── migrations/             # Alembic database version history tracking
    ├── app.py                  # Entry Point execution script
    ├── seed.py                 # Automated marketplace relational seed script
    └── requirements.txt
```

---

## 📊 Entity Relationship Diagram (ERD)

```mermaid
erDiagram
    USERS ||--o{ PRODUCTS : lists
    USERS ||--o{ ORDERS : places
    USERS ||--o{ FARM_LOGS : records
    USERS ||--o1 WALLETS : owns
    PRODUCTS ||--o{ ORDER_ITEMS : contains
    ORDERS ||--|{ ORDER_ITEMS : includes
    USERS ||--o{ REVIEWS : writes

    USERS {
        int id PK
        string username UNIQUE
        string email UNIQUE
        string password_hash
        string role "farmer | buyer | admin"
        string location
        datetime created_at
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
        datetime created_at
    }

    ORDERS {
        int id PK
        int buyer_id FK
        int farmer_id FK
        string order_code UNIQUE
        float total_amount
        string status "pending | on delivery | delivered | cancelled"
        string payment_status "paid | unpaid"
        string delivery_address
        string contact_phone
        datetime created_at
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
        string activity_type "Planting | Fertilizer | Irrigation | Harvesting"
        string description
        string inputs_used
        date estimated_harvest_date
        datetime logged_at
    }

    REVIEWS {
        int id PK
        int reviewer_id FK
        int farmer_id FK
        int rating
        string comment
        datetime created_at
    }
```

---

## ⚡ API Endpoint Blueprint Specification

All route calls are prefixed with `/api` and return standardized JSON objects.

### 🔐 Authentication (`/api/auth`)
- `POST /auth/register` - Creates a new user profile and generates a JWT access token.
- `POST /auth/login` - Authenticates user credentials and issues a JWT access token.
- `GET /auth/me` - [Protected] Retreives profile telemetry mapping the active token.
- `GET /auth/users` - [Protected] Aggregates full system contact registries for chat tools.

### 🍅 Crop Listings & Marketplace (`/api/products`)
- `GET /products/` - Pulls full active marketplace directory listings (supports category queries).
- `POST /products/` - [Protected: Farmer] Commits a new crop inventory entry onto the ledger.
- `PUT /products/<id>` - [Protected: Owner] Updates pricing parameters or stock quantities.

### 📦 Logistics & Ordering (`/api/orders`)
- `GET /orders/` - [Protected] Fetches historical transaction records associated with the user role.
- `POST /orders/` - [Protected: Buyer] Places an invoice order containing specific inventory items.

### 📓 Agronomy Logs (`/api/farm_logs`)
- `GET /farm_logs/` - [Protected: Farmer] Streams active local crop field maintenance journals.
- `POST /farm_logs/` - [Protected: Farmer] Appends a new farming activity record into the ledger.

### 📊 Aggregated Insights (`/api/analytics`)
- `GET /analytics/dashboard` - [Protected] Returns financial stats, top-selling graphs, and metrics distribution.

---

## 🚀 Environment Initialization Workflow

Follow this sequence to launch ShambaPulse inside your local environment.

### 1. Backend Setup (`/server`)
Navigate into the server repository directory and activate your virtual environment:
```bash
cd server
python3 -m venv venv
source venv/bin/activate

# Install package footprints
pip install -r requirements.txt

# Bind structural runtime path variables
export FLASK_APP=app.py
export PYTHONPATH=.

# Rebuild migration history and apply database layout schema
flask db init
flask db migrate -m "Initialize ShambaPulse tables schema"
flask db upgrade

# Populates test farmers, orders, products, chats and reviews assets
python seed.py

# Launch development backend pipeline server on Port 5000
flask run --port=5000
```

### 2. Frontend Setup (`/client`)
Open a secondary terminal window and initialize your React workspace configurations:
```bash
cd client

# Pull configuration dependencies
npm install

# Installs shared interface dependencies
npm install react-router-dom axios lucide-react framer-motion

# Configures Tailwind and hooks local development layout servers
npm run dev
```
*The app will spin up on `http://localhost:3000`, with a proxy rule forwarding `/api` queries straight to the Flask engine.*

---

## 👥 Branch Configuration Standards
Keep your git contributions structured using these primary feature branches before creating pull requests against `main`:
- `auth` — Initial authentication context and token middleware tokens.
- `models` — Declarative ORM schemas and structural layout boundaries.
- `routes` — Blueprint controller routes and request validators.
- `pages` — Frontend views and interface page alignments.
