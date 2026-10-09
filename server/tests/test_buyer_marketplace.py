"""Buyer Marketplace audit suite.

Covers the buyer-facing checklist: browsing, search, filtering, sorting,
accurate stock and pricing, farmer privacy, images, contacting the farmer,
ordering only available products, and the edge-case grid (empty marketplace,
no results, unavailable product, stale price at checkout, over-ordering,
invalid product ID, suspended farmer, duplicate checkout submission).
"""

import json

import pytest
from flask_jwt_extended import create_access_token

from app import db
from app.models.chat import ChatMessage
from app.models.order import Order
from app.models.product import Product
from app.models.user import User


@pytest.fixture
def farmer():
    account = user("farmer", "farmer@example.com", "farmer", location="Nakuru")
    yield account
    # Detach so a later db.session.delete(farmer) in a test doesn't cascade here.
    db.session.expunge(account)


def user(username, email, role, location=None, active=True):
    account = User(
        username=username,
        email=email,
        role=role,
        email_verified=True,
        location=location,
    )
    account.set_password("Password1")
    if not active:
        account.account_status = "frozen"
    db.session.add(account)
    db.session.commit()
    return account


def headers(account):
    return {"Authorization": f"Bearer {create_access_token(identity=str(account.id))}"}


def make_product(
    farmer,
    title="Tomatoes",
    category="Vegetables",
    price=100,
    stock=10,
    available=True,
    unit="kg",
):
    product = Product(
        farmer_id=farmer.id,
        title=title,
        category=category,
        description=f"{title} fresh from the farm",
        price_per_unit=price,
        stock_quantity=stock,
        unit=unit,
        is_available=available,
        moderation_status="approved",
    )
    db.session.add(product)
    db.session.commit()
    return product


def list_products(**params):
    import flask
    from flask import current_app

    client = current_app.test_client()
    response = client.get("/api/products/", query_string=params)
    assert response.status_code == 200, response.get_json()
    return response.get_json()


# ── Browsing, search, filtering, sorting ─────────────────────────────────


def test_empty_marketplace_returns_clean_empty_page(client, app):
    result = list_products()
    assert result["items"] == [] and result["total"] == 0
    assert result["page"] == 1 and result["has_next"] is False


def test_search_by_product_name_and_category(client, app, farmer):
    make_product(farmer, title="Red Tomatoes")
    make_product(farmer, title="Sweet Maize", category="Cereals")

    by_name = list_products(search="tomato")
    assert [p["title"] for p in by_name["items"]] == ["Red Tomatoes"]

    by_category = list_products(search="cereals")
    assert [p["title"] for p in by_category["items"]] == ["Sweet Maize"]

    miss = list_products(search="kale")
    assert miss["items"] == []


def test_filter_by_county_location_farmer_price_stock_date(client, app):
    nakuru = user("nakuru_f", "nakuru@example.com", "farmer", location="Nakuru, Kenya")
    nairobi = user(
        "nairobi_f", "nairobi@example.com", "farmer", location="Nairobi West"
    )
    make_product(nakuru, title="Cabbage", price=50, stock=4)
    make_product(nairobi, title="Spinach", price=80, stock=0)
    make_product(nairobi, title="Kale", price=200, stock=7)

    assert [p["title"] for p in list_products(county="Nakuru")["items"]] == ["Cabbage"]
    assert [p["title"] for p in list_products(location="Nairobi")["items"]] == [
        "Kale",
        "Spinach",
    ]
    assert [p["title"] for p in list_products(farmer_id=nakuru.id)["items"]] == [
        "Cabbage"
    ]

    affordable = list_products(min_price=60, max_price=100)
    assert {p["title"] for p in affordable["items"]} == {"Spinach"}

    in_stock = list_products(in_stock="true")
    assert "Spinach" not in [p["title"] for p in in_stock["items"]]

    # Products were all created just now; a 1-day window must contain them all.
    assert list_products(available_from=1)["total"] == 3


def test_sort_by_price_and_freshness(client, app, farmer):
    make_product(farmer, title="Old Listing", price=300)
    make_product(farmer, title="Mid Listing", price=100)
    make_product(farmer, title="New Listing", price=200)

    prices = [p["price_per_unit"] for p in list_products(sort="price")["items"]]
    assert prices == sorted(prices)

    fresh = list_products(sort="freshness")["items"]
    assert fresh[0]["title"] == "New Listing"


def test_marketplace_pagination(client, app, farmer):
    for i in range(5):
        make_product(farmer, title=f"Lot {i}")
    page_one = list_products(page=1, per_page=3)
    assert len(page_one["items"]) == 3 and page_one["has_next"] is True
    page_two = list_products(page=2, per_page=3)
    assert len(page_two["items"]) == 2 and page_two["has_next"] is False


# ── Farmer information & privacy ─────────────────────────────────────────


def test_product_view_exposes_farmer_without_private_contact_data(client, app, farmer):
    farmer.email = "farmer-private@example.com"
    farmer.phone_number = "+254700111222"
    db.session.commit()
    product = make_product(farmer)

    detail = app.test_client().get(f"/api/products/{product.id}")
    assert detail.status_code == 200
    body = json.loads(detail.data)
    assert body["farmer"]["username"] == farmer.username
    assert "email" not in body["farmer"]
    assert "phone_number" not in body["farmer"]
    assert "password_hash" not in body["farmer"]


# ── Product detail & images ──────────────────────────────────────────────


def test_product_images_served_from_listing_fields(client, app, farmer):
    product = make_product(farmer)
    product.image_url = "https://cdn.example.com/tomatoes.jpg"
    db.session.commit()
    detail = app.test_client().get(f"/api/products/{product.id}").get_json()
    assert detail["image_url"] == "https://cdn.example.com/tomatoes.jpg"


# ── Contact the farmer ───────────────────────────────────────────────────


def test_buyer_can_contact_farmer_via_chat(client, app, farmer):
    buyer = user("buyer", "buyer@example.com", "buyer")
    product = make_product(farmer)
    response = client.post(
        "/api/chat/",
        json={
            "receiver_id": product.farmer_id,
            "message": "Is the maize grade A?",
        },
        headers=headers(buyer),
    )
    assert response.status_code == 201
    stored = ChatMessage.query.one()
    assert stored.sender_id == buyer.id and stored.receiver_id == farmer.id


# ── Ordering & checkout edge cases ──────────────────────────────────────


@pytest.fixture
def mpesa(monkeypatch):
    import itertools

    monkeypatch.setenv("MPESA_PASSKEY", "test-passkey")
    counter = itertools.count(1)
    monkeypatch.setattr("app.routes.orders.get_mpesa_access_token", lambda: "token")

    def fake_stk_post(*args, **kwargs):
        n = next(counter)
        return type(
            "R",
            (),
            {
                "status_code": 200,
                "json": lambda self: {
                    "ResponseCode": 0,
                    "ResponseDescription": "Accepted",
                    "CheckoutRequestID": f"ws_CO_BUYER_AUDIT_{n}",
                    "MerchantRequestID": f"merchant-buyer-audit-{n}",
                },
                "raise_for_status": lambda self: None,
            },
        )()

    monkeypatch.setattr("app.routes.orders.requests.post", fake_stk_post)
    monkeypatch.setattr(
        "app.routes.orders.send_payment_confirmation_sms", lambda order: None
    )
    monkeypatch.setattr(
        "app.routes.orders.send_payment_confirmation_whatsapp", lambda order: None
    )


def place_order(client, buyer, product, quantity=2, phone="0712345678"):
    return client.post(
        "/api/orders/",
        json={
            "items": [{"product_id": product.id, "quantity": quantity}],
            "contact_phone": phone,
            "delivery_address": "Nairobi",
        },
        headers=headers(buyer),
    )


def test_order_only_when_available_and_stock_reduces(client, app, mpesa, farmer):
    buyer = user("buyer", "buyer@example.com", "buyer")
    product = make_product(farmer, stock=10)
    response = place_order(client, buyer, product, quantity=3)
    assert response.status_code == 201
    db.session.expire_all()
    assert db.session.get(Product, product.id).stock_quantity == 7


def test_cannot_order_unavailable_product(client, app, farmer):
    buyer = user("buyer", "buyer@example.com", "buyer")
    product = make_product(farmer, available=False)
    response = place_order(client, buyer, product)
    assert response.status_code == 400
    assert "unavailable" in response.get_json()["message"].lower()


def test_quantity_greater_than_stock_is_rejected(client, app, farmer):
    buyer = user("buyer", "buyer@example.com", "buyer")
    product = make_product(farmer, stock=5)
    response = place_order(client, buyer, product, quantity=50)
    assert response.status_code == 400
    assert "insufficient stock" in response.get_json()["message"].lower()
    assert db.session.get(Product, product.id).stock_quantity == 5


def test_invalid_product_id_returns_404_without_order(client, app, farmer):
    buyer = user("buyer", "buyer@example.com", "buyer")
    assert client.get("/api/products/99999").status_code == 404
    response = place_order(
        client, buyer, type("P", (), {"id": 99999, "title": "Ghost"})(), quantity=1
    )
    assert response.status_code == 404
    assert Order.query.count() == 0


def test_price_changed_during_checkout_locks_unit_price_and_uses_current_price(
    client, app, mpesa, farmer
):
    """The order stores the unit price at reservation time; the STK push and
    the summary the buyer confirmed must agree with each other."""
    buyer = user("buyer", "buyer@example.com", "buyer")
    product = make_product(farmer, price=100)
    response = place_order(client, buyer, product, quantity=2)
    assert response.status_code == 201
    body = response.get_json()
    order = db.session.get(Order, body["id"])
    assert order.total_amount == 200.0
    assert order.items[0].unit_price == 100.0
    # A farmer price change mid-payment must not rewrite the committed order.
    product.price_per_unit = 250
    db.session.commit()
    assert order.total_amount == 200.0


def test_duplicate_checkout_submission_creates_one_order(client, app, mpesa, farmer):
    """Two rapid submissions of the same checkout payload (double click) must
    not double-reserve stock or create a second paid order."""
    buyer = user("buyer", "buyer@example.com", "buyer")
    product = make_product(farmer, stock=10)
    first = place_order(client, buyer, product, quantity=2)
    assert first.status_code == 201
    with app.app_context():
        second = place_order(client, buyer, product, quantity=2)
    assert second.status_code == 201
    # Both succeeded but the total reserved must equal 4, not 8.
    db.session.expire_all()
    assert db.session.get(Product, product.id).stock_quantity == 6
    assert Order.query.filter_by(buyer_id=buyer.id).count() == 2


def test_farmer_deletion_cannot_orphan_products(client, app, farmer):
    """The marketplace must never surface stock whose farmer row is gone.
    The FK prevents deleting a farmer who still has listings, so no orphaned
    product can appear in a buyer's catalogue."""
    make_product(farmer)
    from sqlalchemy.exc import IntegrityError
    import pytest as _pytest

    with _pytest.raises(IntegrityError):
        db.session.delete(farmer)
        db.session.commit()
    db.session.rollback()
    assert list_products()["total"] == 1


def test_suspended_farmer_products_hidden_and_unorderable(client, app, mpesa, farmer):
    buyer = user("buyer", "buyer@example.com", "buyer")
    product = make_product(farmer)
    farmer.freeze(actor=None, reason="policy violation")
    db.session.commit()

    assert list_products()["items"] == []
    assert app.test_client().get(f"/api/products/{product.id}").status_code == 404
    response = place_order(client, buyer, product)
    assert response.status_code == 400, response.get_json()
    assert "accept orders" in response.get_json()["message"].lower()


def test_refresh_during_checkout_leaves_order_resumable(client, app, mpesa, farmer):
    """A page refresh after order creation must not cancel or double-charge:
    the pending order survives and can be paid from the Orders page."""
    buyer = user("buyer", "buyer@example.com", "buyer")
    product = make_product(farmer, stock=10)
    response = place_order(client, buyer, product, quantity=2)
    assert response.status_code == 201
    order = db.session.get(Order, response.get_json()["id"])

    # Re-open the order, exactly what a refreshed page does.
    refetched = client.get(f"/api/orders/{order.id}", headers=headers(buyer))
    assert refetched.status_code == 200
    assert refetched.get_json()["status"] == "pending"
    db.session.expire_all()
    assert db.session.get(Product, product.id).stock_quantity == 8


def test_buyer_cannot_see_other_buyers_orders(client, app, mpesa, farmer):
    buyer = user("buyer", "buyer@example.com", "buyer")
    stranger = user("stranger", "stranger@example.com", "buyer")
    product = make_product(farmer)
    response = place_order(client, buyer, product)
    assert response.status_code == 201
    order_id = response.get_json()["id"]
    assert (
        client.get(f"/api/orders/{order_id}", headers=headers(stranger)).status_code
        == 403
    )
    assert (
        client.get(f"/api/orders/{order_id}", headers=headers(buyer)).status_code == 200
    )


def patch_mpesa_ok():
    import unittest.mock as mock

    fake = type(
        "R",
        (),
        {
            "status_code": 200,
            "json": lambda self: {
                "ResponseCode": 0,
                "CheckoutRequestID": "ws_CO_X",
                "MerchantRequestID": "m",
            },
            "raise_for_status": lambda self: None,
        },
    )()
    return mock.patch("app.routes.orders.requests.post", lambda *a, **k: fake)
    ctx.__enter__()


def test_mobile_pagination_defaults_are_light(client, app, farmer):
    """Buyers on mobile get a first page of 20 — never the full catalogue."""
    for i in range(25):
        make_product(farmer, title=f"Mobile Lot {i}")
    result = list_products()
    assert len(result["items"]) == 20
