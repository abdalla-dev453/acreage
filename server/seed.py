import os
from datetime import datetime, date, timedelta
from app import create_app, db
from app.models.user import User
from app.models.product import Product
from app.models.order import Order, OrderItem
from app.models.farm_log import FarmLog
from app.models.chat import ChatMessage
from app.models.review import Review

def seed_database():
    print("🌱 Clearing old database data...")
    # Delete dependent data first to avoid foreign key constraints
    OrderItem.query.delete()
    Review.query.delete()
    Order.query.delete()
    Product.query.delete()
    FarmLog.query.delete()
    ChatMessage.query.delete()
    User.query.delete()
    db.session.commit()

    print("👥 Creating Users (Farmers and Buyers)...")
    
    # 1. Farmers
    farmer1 = User(username="johndoe_farm", email="john@farm.com", location="Nakuru, Kenya", role="farmer")
    farmer1.set_password("password123")
    
    farmer2 = User(username="mary_wambui", email="mary@farm.com", location="Nyeri, Kenya", role="farmer")
    farmer2.set_password("password123")

    # 2. Buyers
    buyer1 = User(username="alice_grocer", email="alice@shop.com", location="Nairobi, Kenya", role="buyer")
    buyer1.set_password("password123")
    
    buyer2 = User(username="bob_eats", email="bob@eats.com", location="Mombasa, Kenya", role="buyer")
    buyer2.set_password("password123")

    db.session.add_all([farmer1, farmer2, buyer1, buyer2])
    db.session.commit()  # Commit to get IDs

    print("🍎 Creating Products...")
    prod1 = Product(farmer_id=farmer1.id, title="Organic Tomatoes", category="Vegetables", description="Freshly picked plum tomatoes.", price_per_unit=150.0, unit="kg", stock_quantity=100.0, is_available=True)
    prod2 = Product(farmer_id=farmer1.id, title="White Onions", category="Vegetables", description="Sweet bulb onions.", price_per_unit=120.0, unit="kg", stock_quantity=250.0, is_available=True)
    prod3 = Product(farmer_id=farmer2.id, title="Fresh Avocados", category="Fruits", description="Export quality Hass avocados.", price_per_unit=40.0, unit="piece", stock_quantity=500.0, is_available=True)
    prod4 = Product(farmer_id=farmer2.id, title="Grade A Potatoes", category="Grains & Tubers", description="Perfect for french fries.", price_per_unit=3000.0, unit="bag", stock_quantity=15.0, is_available=True)

    db.session.add_all([prod1, prod2, prod3, prod4])
    db.session.commit()

    print("📦 Creating Orders & Items...")
    # Order 1: Alice buys from John
    order1 = Order(
        order_code="ACR-2026-0001",
        buyer_id=buyer1.id,
        farmer_id=farmer1.id,
        total_amount=4200.0,
        status="pending",
        payment_status="unpaid",
        delivery_address="Biashara Street, Nairobi",
        contact_phone="+254712345678"
    )
    db.session.add(order1)
    db.session.commit()

    item1 = OrderItem(order_id=order1.id, product_id=prod1.id, quantity=10.0, unit_price=150.0) # 1500
    item2 = OrderItem(order_id=order1.id, product_id=prod2.id, quantity=22.5, unit_price=120.0) # 2700
    db.session.add_all([item1, item2])

    print("📓 Creating Farm Logs...")
    log1 = FarmLog(
        farmer_id=farmer1.id,
        field_name="Block A - Greenhouse",
        activity_type="Weeding & Pruning",
        description="Removed lateral shoots from tomato vines.",
        inputs_used="None",
        estimated_harvest_date=date.today() + timedelta(days=30)
    )
    log2 = FarmLog(
        farmer_id=farmer2.id,
        field_name="Hillside Section",
        activity_type="Fertilizer Application",
        description="Applied organic compost to young avocado trees.",
        inputs_used="Organic Compost NPK",
        estimated_harvest_date=date.today() + timedelta(days=90)
    )
    db.session.add_all([log1, log2])

    print("💬 Creating Chat Messages...")
    chat1 = ChatMessage(sender_id=buyer1.id, receiver_id=farmer1.id, message="Hi John, are the tomatoes ready for delivery tomorrow?", is_read=False)
    chat2 = ChatMessage(sender_id=farmer1.id, receiver_id=buyer1.id, message="Hello Alice! Yes, we are harvesting them early morning.", is_read=True)
    db.session.add_all([chat1, chat2])

    print("⭐ Creating Reviews...")
    rev1 = Review(reviewer_id=buyer2.id, farmer_id=farmer2.id, rating=5, comment="Amazing avocados! Super creamy and fresh.")
    db.session.add(rev1)

    db.session.commit()
    print("🎉 Database successfully seeded with test assets!")

if __name__ == '__main__':
    app = create_app()
    with app.app_context():
        seed_database()
