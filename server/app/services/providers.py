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

    def latest(self, category=None, market=None, county_id=None, item_uuid=None):
        raise ProviderUnavailable('Market price provider is not configured')


class ShambaRecordsMarketPriceProvider(MarketPriceProvider):
    name = 'shambarecords'

    def latest(self, category=None, market=None, county_id=None, item_uuid=None):
        from app.services.shamba_records import shamba_records_client
        return shamba_records_client.fetch_market_prices(
            category=category,
            market=market,
            county_id=county_id,
            item_uuid=item_uuid,
        )


class LocalMarketPriceProvider(MarketPriceProvider):
    name = 'local'

    def latest(self, category=None, market=None, county_id=None, item_uuid=None):
        from app.services.shamba_records import shamba_records_client
        return shamba_records_client.fetch_market_prices(
            category=category,
            market=market,
            county_id=county_id,
            item_uuid=item_uuid,
        )


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
    name = os.getenv('MARKET_PRICE_PROVIDER', 'shambarecords').lower()
    if name in {'shambarecords', 'shamba_records', 'shamba'}:
        return ShambaRecordsMarketPriceProvider()
    if name == 'local':
        return LocalMarketPriceProvider()
    return ShambaRecordsMarketPriceProvider()


def sms_provider():
    name = os.getenv('SMS_PROVIDER', 'local' if _enabled('SMS_LOCAL_ENABLED') else 'unconfigured')
    if name == 'local':
        return LocalSmsProvider()
    return SmsProvider()


def idempotency_key(provider, phone, command):
    value = f'{provider}:{phone}:{command.strip().upper()}'
    return hashlib.sha256(value.encode()).hexdigest()
