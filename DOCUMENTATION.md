# 📘 Acreage - System Architecture & API Documentation

## 📄 Overview
Acreage simplifies the agricultural supply chain by eliminating intermediate transaction layers, allowing farmers to list fresh harvests directly to consumers, restaurants, and wholesale buyers.

---

## 🔌 API Endpoints Reference

### 🔐 Auth Endpoint (`/api/auth`)

| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Register a new user account | Public |
| `POST` | `/api/auth/login` | Authenticate user and issue JWT | Public |
| `GET` | `/api/auth/me` | Fetch authenticated user profile | Authenticated |
| `GET` | `/api/auth/users` | Retrieve contact directory for chat messaging | Authenticated |

---

### 🍅 Products Endpoint (`/api/products`)

| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/products/` | Retrieve all active crop listings | Public |
| `POST` | `/api/products/` | Create a new agricultural product listing | Farmer |
| `GET` | `/api/products/<id>` | Fetch specific product detail | Public |
| `PUT` | `/api/products/<id>` | Update stock or pricing parameters | Owner / Admin |
| `DELETE` | `/api/products/<id>` | Delete a product with no order history | Owner |

#### Example Request Body (`POST /api/products/`):
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

### 📦 Orders Endpoint (`/api/orders`)

| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/orders/` | Retrieve a ledger of all role-related order histories | Authenticated |
| `POST` | `/api/orders/` | Place a new transactional crop checkout order | Buyer |
| `PUT` | `/api/orders/<id>` | Modify order state or distribution logistics | Farmer / Admin |

#### Example Request Body (`POST /api/orders/`):
```json
{
  "farmer_id": 1,
  "delivery_address": "Biashara Street, Nairobi",
  "contact_phone": "+254712345678",
  "items": [
    {
      "product_id": 1,
      "quantity": 10.0,
      "unit_price": 150.0
    }
  ]
}
```

---

### 📓 Farm Logs Endpoint (`/api/farm_logs`)

| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/farm_logs/` | Fetch historical crop activity logs stream | Farmer |
| `POST` | `/api/farm_logs/` | Record a new cultivation or irrigation task entry | Farmer |

#### Example Request Body (`POST /api/farm_logs/`):
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

### 💬 Chat Messages Endpoint (`/api/chat`)

| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/chat/<userId>` | Load chat transaction threads with a distinct recipient | Authenticated |
| `POST` | `/api/chat/` | Send an outbound text message onto the ledger | Authenticated |

#### Example Request Body (`POST /api/chat/`):
```json
{
  "receiver_id": 2,
  "message": "Hi John, are the organic tomato crates packed for shipping?"
}
```

---

### 📊 Analytics & Review Endpoints

| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/analytics/dashboard` | Fetch aggregated charts, top products, and summaries | Authenticated |
| `GET` | `/api/reviews/` | Gather historical merchant performance evaluations | Public |
| `POST` | `/api/reviews/` | Submit a star rating evaluation statement to a farmer | Buyer |

#### Example Request Body (`POST /api/reviews/`):
```json
{
  "farmer_id": 1,
  "rating": 5,
  "comment": "Exceptional avocado supply quality, highly recommend."
}
```
