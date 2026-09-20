import hashlib
import os
from datetime import timedelta

from app.utils.time import utcnow


class ProviderUnavailable(RuntimeError):
    pass


def _enabled(name, default=False):
    return os.getenv(name, str(default)).lower() in {'1', 'true', 'yes'}


class TransportQuoteProvider:
    name = 'unconfigured'

    def quote(self, origin, destination, weight_kg, package_count=1, mode='boda'):
        raise ProviderUnavailable('Transport provider is not configured')


class LocalTransportQuoteProvider(TransportQuoteProvider):
    name = 'local'

    def quote(self, origin, destination, weight_kg, package_count=1, mode='boda'):
        if not _enabled('TRANSPORT_LOCAL_ENABLED'):
            raise ProviderUnavailable('Local transport adapter is disabled')
        base = {'boda': 180.0, 'matatu': 350.0, 'truck': 1200.0}.get(mode, 500.0)
        cost = base + max(0.0, weight_kg - 1.0) * 18.0 + max(0, package_count - 1) * 25.0
        now = utcnow()
        return {
            'provider': self.name,
            'mode': mode,
            'cost': round(cost, 2),
            'currency': 'KES',
            'eta_minutes': max(15, int(25 + (weight_kg * 1.5))),
            'expires_at': now + timedelta(minutes=15),
            'metadata': {'adapter': 'local-development', 'origin': origin, 'destination': destination},
        }


class MarketPriceProvider:
    name = 'unconfigured'

    def latest(self, category=None, market=None):
        raise ProviderUnavailable('Market price provider is not configured')


class LocalMarketPriceProvider(MarketPriceProvider):
    name = 'local'

    def latest(self, category=None, market=None):
        if not _enabled('MARKET_PRICE_LOCAL_ENABLED'):
            raise ProviderUnavailable('Local market-price adapter is disabled')
        selected_market = market or 'Nairobi'
        rows = [
            {'category': 'Vegetables', 'market': selected_market, 'price_per_unit': 85.0, 'unit': 'kg'},
            {'category': 'Fruits', 'market': selected_market, 'price_per_unit': 120.0, 'unit': 'kg'},
            {'category': 'Grains', 'market': selected_market, 'price_per_unit': 65.0, 'unit': 'kg'},
        ]
        if category:
            rows = [row for row in rows if row['category'].lower() == category.lower()]
        now = utcnow()
        return [{
            **row,
            'currency': 'KES',
            'source': 'local-development',
            'provider': self.name,
            'observed_at': now,
            'freshness_minutes': 60,
            'metadata': {'adapter': 'local-development'},
        } for row in rows]


class SmsProvider:
    name = 'unconfigured'

    def send(self, phone, text, reference):
        raise ProviderUnavailable('SMS provider is not configured')


class LocalSmsProvider(SmsProvider):
    name = 'local'

    def send(self, phone, text, reference):
        if not _enabled('SMS_LOCAL_ENABLED'):
            raise ProviderUnavailable('Local SMS adapter is disabled')
        return {
            'provider': self.name,
            'reference': reference,
            'status': 'accepted',
            'metadata': {'adapter': 'local-development', 'phone': phone, 'text': text},
        }


def transport_provider():
    name = os.getenv('TRANSPORT_PROVIDER', 'local' if _enabled('TRANSPORT_LOCAL_ENABLED') else 'unconfigured')
    if name == 'local':
        return LocalTransportQuoteProvider()
    return TransportQuoteProvider()


def market_price_provider():
    name = os.getenv('MARKET_PRICE_PROVIDER', 'local' if _enabled('MARKET_PRICE_LOCAL_ENABLED') else 'unconfigured')
    if name == 'local':
        return LocalMarketPriceProvider()
    return MarketPriceProvider()


def sms_provider():
    name = os.getenv('SMS_PROVIDER', 'local' if _enabled('SMS_LOCAL_ENABLED') else 'unconfigured')
    if name == 'local':
        return LocalSmsProvider()
    return SmsProvider()


def idempotency_key(provider, phone, command):
    value = f'{provider}:{phone}:{command.strip().upper()}'
    return hashlib.sha256(value.encode()).hexdigest()
