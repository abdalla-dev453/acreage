"""Normalized agricultural selling units and weight conversions."""

from decimal import Decimal, InvalidOperation, ROUND_HALF_UP


UNIT_WEIGHTS_KG = {
    'kg': Decimal('1'),
    'debe': Decimal('18'),
    'gunia': Decimal('90'),
    'bag': Decimal('50'),
    'crate': Decimal('10'),
    'piece': Decimal('1'),
}

SUPPORTED_UNITS = tuple(UNIT_WEIGHTS_KG)


def normalize_unit(value):
    unit = str(value or 'kg').strip().lower()
    if unit not in UNIT_WEIGHTS_KG:
        raise ValueError(f'Unsupported unit: {value}')
    return unit


def unit_weight_kg(unit, override=None):
    normalized = normalize_unit(unit)
    if override is not None:
        try:
            weight = Decimal(str(override))
        except (InvalidOperation, TypeError, ValueError) as exc:
            raise ValueError('unit_weight_kg must be a positive number') from exc
        if weight <= 0:
            raise ValueError('unit_weight_kg must be a positive number')
        return weight
    return UNIT_WEIGHTS_KG[normalized]


def to_kg(quantity, unit, unit_weight=None):
    try:
        amount = Decimal(str(quantity))
    except (InvalidOperation, TypeError, ValueError) as exc:
        raise ValueError('quantity must be a positive number') from exc
    if amount <= 0:
        raise ValueError('quantity must be a positive number')
    return float((amount * unit_weight_kg(unit, unit_weight)).quantize(Decimal('0.001'), rounding=ROUND_HALF_UP))


def from_kg(weight_kg, unit, unit_weight=None):
    try:
        amount = Decimal(str(weight_kg))
    except (InvalidOperation, TypeError, ValueError) as exc:
        raise ValueError('weight_kg must be a positive number') from exc
    if amount <= 0:
        raise ValueError('weight_kg must be a positive number')
    return float((amount / unit_weight_kg(unit, unit_weight)).quantize(Decimal('0.001'), rounding=ROUND_HALF_UP))
