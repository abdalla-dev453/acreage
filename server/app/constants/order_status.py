# Order status constants for the Acreage marketplace
# These values are used throughout the backend to enforce a strict order lifecycle.
# Do NOT change the string values without also migrating existing data.

class OrderStatus:
    # Core lifecycle (buyer actions)
    DRAFT = "DRAFT"                     # Created but not yet submitted
    PENDING_PAYMENT = "PENDING_PAYMENT" # Awaiting payment (STK push sent)
    PAYMENT_INITIATED = "PAYMENT_INITIATED" # Payment request sent, waiting for callback
    PAYMENT_CONFIRMED = "PAYMENT_CONFIRMED" # Payment succeeded, escrow funded
    PAYMENT_FAILED = "PAYMENT_FAILED"   # Payment attempt failed or timed‑out
    PAYMENT_EXPIRED = "PAYMENT_EXPIRED" # Payment window elapsed without confirmation

    # Order processing (farmer actions)
    CONFIRMED = "CONFIRMED"             # Farmer accepted the order
    PROCESSING = "PROCESSING"           # Farmer preparing the goods
    READY_FOR_COLLECTION = "READY_FOR_COLLECTION" # Buyer can collect / delivery scheduled
    OUT_FOR_DELIVERY = "OUT_FOR_DELIVERY"   # Goods are on the way
    COMPLETED = "COMPLETED"             # Transaction finished, funds released

    # Cancellation / dispute paths
    CANCELLED_BY_BUYER = "CANCELLED_BY_BUYER"
    CANCELLED_BY_FARMER = "CANCELLED_BY_FARMER"
    DISPUTED = "DISPUTED"
    REFUNDED = "REFUNDED"
    EXPIRED = "EXPIRED"

    # Helper list for validation
    ALL = [
        DRAFT,
        PENDING_PAYMENT,
        PAYMENT_INITIATED,
        PAYMENT_CONFIRMED,
        PAYMENT_FAILED,
        PAYMENT_EXPIRED,
        CONFIRMED,
        PROCESSING,
        READY_FOR_COLLECTION,
        OUT_FOR_DELIVERY,
        COMPLETED,
        CANCELLED_BY_BUYER,
        CANCELLED_BY_FARMER,
        DISPUTED,
        REFUNDED,
        EXPIRED,
    ]

# Payment status constants – separate from order lifecycle
class PaymentStatus:
    UNPAID = "UNPAID"
    PAID = "PAID"
    FAILED = "FAILED"
    REFUNDED = "REFUNDED"
    PENDING = "PENDING"

    ALL = [UNPAID, PAID, FAILED, REFUNDED, PENDING]
