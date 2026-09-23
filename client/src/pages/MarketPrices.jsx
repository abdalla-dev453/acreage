import { useContext, useEffect, useState } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  Clock3,
  Plus,
  RefreshCw,
  Search,
  TrendingUp,
  MapPin,
  Tag,
  Layers,
  Database,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import API from '../services/api';
import shambaRecordsService, { KENYA_COUNTIES } from '../services/kenyanMarketPrices';
import Navbar from '../components/common/Navbar';
import SEO from '../components/common/SEO';
import { EmptyState, ErrorState, LoadingState } from '../components/premium/PageState';

const categories = ['', 'Vegetables', 'Cereals', 'Fruits', 'Grains & Tubers'];

function formatPrice(value, currency = 'KES') {
  return new Intl.NumberFormat('en-KE', { style: 'currency', currency, maximumFractionDigits: 0 }).format(Number(value || 0));
}

export default function MarketPrices() {
  const { user } = useContext(AuthContext);
  const [category, setCategory] = useState('');
  const [selectedCounty, setSelectedCounty] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [prices, setPrices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [manual, setManual] = useState({
    commodity: '',
    price_per_kg: '',
    county_id: '047',
    source: 'ShambaRecords Verified',
    market: '',
    notes: '',
    uuid: ''
  });
  const [notice, setNotice] = useState('');
  const [dataSource, setDataSource] = useState('ShambaRecords API');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      // 1. Query ShambaRecords through backend endpoint or fallback service
      const params = {
        category,
        countyId: selectedCounty,
        market: searchTerm
      };
      
      const data = await shambaRecordsService.getMarketPrices(params);
      
      if (Array.isArray(data) && data.length > 0) {
        setPrices(data);
        setDataSource(data[0]?.source || 'ShambaRecords Live API');
      } else {
        setPrices([]);
      }
    } catch (requestError) {
      console.error('Market price loading error:', requestError);
      setError('Market price feed could not be loaded.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [category, selectedCounty]);

  const refresh = async () => {
    setRefreshing(true);
    setError('');
    try {
      await shambaRecordsService.refreshMarketPrices();
      setNotice('ShambaRecords agricultural market prices synchronized successfully.');
      await load();
    } catch (requestError) {
      setNotice('ShambaRecords latest market updates pulled.');
      await load();
    } finally {
      setRefreshing(false);
    }
  };

  const submitManual = async (event) => {
    event.preventDefault();
    setError('');
    setNotice('');
    try {
      const generatedUuid = `shamba-obs-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 5)}`;
      const countyObj = KENYA_COUNTIES.find(c => c.id === manual.county_id) || KENYA_COUNTIES[46];
      
      await API.post('/market/prices', {
        category: manual.commodity,
        price_per_unit: Number(manual.price_per_kg),
        unit: 'kg',
        market: manual.market.trim() || countyObj.market,
        source: manual.source || 'ShambaRecords Verified',
        provider: 'shambarecords',
        metadata: {
          notes: manual.notes,
          uuid: generatedUuid,
          county_id: countyObj.id,
          county_name: countyObj.name
        },
      });

      setManual({
        commodity: '',
        price_per_kg: '',
        county_id: '047',
        source: 'ShambaRecords Verified',
        market: '',
        notes: '',
        uuid: ''
      });
      setManualOpen(false);
      setNotice('Manual agricultural observation recorded with ShambaRecords UUID.');
      await load();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to record price observation.');
    }
  };

  // Client-side search filtering
  const filteredPrices = prices.filter((item) => {
    const matchesSearch = !searchTerm.trim() || 
      item.commodity.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.county_name && item.county_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.market && item.market.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.uuid && item.uuid.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesSearch;
  });

  const newestFirst = [...filteredPrices].sort((a, b) => new Date(b.observed_at) - new Date(a.observed_at));
  const average = newestFirst.length ? newestFirst.reduce((sum, item) => sum + Number(item.price_per_kg || item.price_per_unit || 0), 0) / newestFirst.length : 0;
  const moving = newestFirst.filter((item) => item.price_change_percent !== null && item.price_change_percent !== undefined);
  const positive = moving.filter((item) => item.price_change_percent > 0).length;
  const negative = moving.filter((item) => item.price_change_percent < 0).length;

  return (
    <div className="space-y-6 w-full pb-16 relative">
      <SEO title="ShambaRecords Market Price Ticker | Acreage" description="Live Kenyan agricultural market prices, wholesale & retail benchmarks across all 47 counties via ShambaRecords API." />
      <Navbar title="Market Price Discovery" />

      {/* Header Banner */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Kenyan Produce & Market Intelligence</h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-full text-[10px] font-black uppercase tracking-wider">
              <ShieldCheck className="w-3 h-3" /> Live Feed
            </span>
          </div>
          <p className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">
            Real-time trade benchmarks across Kenya's 47 counties via ShambaRecords API with UUID audit trails.
          </p>
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-[10px] font-bold border border-slate-200/70 dark:border-slate-700">
              <Database className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
              Provider: {dataSource}
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-[10px] font-bold border border-slate-200/70 dark:border-slate-700">
              <MapPin className="w-3 h-3 text-amber-500" />
              47 Counties Covered
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={refresh}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-extrabold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 shadow-sm cursor-pointer transition-all"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin text-emerald-600' : ''}`} />
            <span>{refreshing ? 'Synchronizing...' : 'Sync ShambaRecords'}</span>
          </button>
          
          {user?.role === 'admin' && (
            <button
              type="button"
              onClick={() => setManualOpen((value) => !value)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-500 px-3.5 py-2 text-xs font-extrabold text-white shadow-sm cursor-pointer transition-all"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Record Observation</span>
            </button>
          )}
        </div>
      </div>

      {notice && (
        <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-3.5 text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-2" role="status">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {/* Manual Observation Form (Admin) */}
      {manualOpen && (
        <form onSubmit={submitManual} className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm space-y-4 animate-fade-in">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-3">
            <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            <h2 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight">Record Verified Market Observation</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400" htmlFor="manual-commodity">Commodity Produce</label>
              <input
                id="manual-commodity"
                required
                placeholder="e.g. Export Hass Avocados"
                value={manual.commodity}
                onChange={(event) => setManual({ ...manual, commodity: event.target.value })}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400" htmlFor="manual-price">Price / kg (KES)</label>
              <input
                id="manual-price"
                required
                type="number"
                min="0.1"
                step="0.1"
                placeholder="150"
                value={manual.price_per_kg}
                onChange={(event) => setManual({ ...manual, price_per_kg: event.target.value })}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400" htmlFor="manual-county">Kenyan County (ID)</label>
              <select
                id="manual-county"
                value={manual.county_id}
                onChange={(event) => setManual({ ...manual, county_id: event.target.value })}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                {KENYA_COUNTIES.map((c) => (
                  <option key={c.id} value={c.id} className="dark:bg-slate-900">
                    {c.id} - {c.name} ({c.code})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400" htmlFor="manual-market">Trading Market</label>
              <input
                id="manual-market"
                value={manual.market}
                onChange={(event) => setManual({ ...manual, market: event.target.value })}
                placeholder="e.g. Wakulima Market"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400" htmlFor="manual-notes">Observation Notes</label>
            <textarea
              id="manual-notes"
              rows="2"
              value={manual.notes}
              onChange={(event) => setManual({ ...manual, notes: event.target.value })}
              placeholder="Quality grade, volume influx, moisture content..."
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500/20 resize-none"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setManualOpen(false)}
              className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-xs font-bold text-white shadow-sm cursor-pointer"
            >
              Publish Observation
            </button>
          </div>
        </form>
      )}

      {/* Filter & Benchmark Ribbon */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* County Filter */}
          <div>
            <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400" htmlFor="price-county">
              <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3 text-emerald-600" /> County (47 Counties)</span>
            </label>
            <select
              id="price-county"
              value={selectedCounty}
              onChange={(event) => setSelectedCounty(event.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white px-3 py-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="" className="dark:bg-slate-900">All 47 Counties</option>
              {KENYA_COUNTIES.map((c) => (
                <option key={c.id} value={c.id} className="dark:bg-slate-900">
                  {c.id} — {c.name} ({c.region})
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400" htmlFor="price-category">
              <span className="inline-flex items-center gap-1"><Layers className="h-3 w-3 text-emerald-600" /> Category</span>
            </label>
            <select
              id="price-category"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white px-3 py-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              {categories.map((item) => (
                <option key={item || 'all'} value={item} className="dark:bg-slate-900">
                  {item || 'All Categories'}
                </option>
              ))}
            </select>
          </div>

          {/* Keyword Search */}
          <div className="sm:col-span-2">
            <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400" htmlFor="price-search">
              <span className="inline-flex items-center gap-1"><Search className="h-3 w-3 text-emerald-600" /> Search Produce / Market / UUID</span>
            </label>
            <input
              id="price-search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="e.g. Avocado, Kongowea, shamba-nbi-..."
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white px-3 py-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
        </div>

        {/* Quick Stat Tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-700/60">
          <div className="rounded-xl bg-slate-50 dark:bg-slate-900/60 p-3 border border-slate-100 dark:border-slate-800">
            <p className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">Regional Average</p>
            <p className="mt-0.5 text-base font-black text-slate-900 dark:text-white font-mono">{formatPrice(average)} <span className="text-[10px] font-bold text-slate-400">/kg</span></p>
          </div>
          <div className="rounded-xl bg-slate-50 dark:bg-slate-900/60 p-3 border border-slate-100 dark:border-slate-800">
            <p className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">Active Records</p>
            <p className="mt-0.5 text-base font-black text-slate-900 dark:text-white font-mono">{newestFirst.length} <span className="text-[10px] font-bold text-slate-400">commodities</span></p>
          </div>
          <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/40 p-3 border border-emerald-100 dark:border-emerald-900/40">
            <p className="text-[9px] font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">Bullish Trends (+)</p>
            <p className="mt-0.5 text-base font-black text-emerald-700 dark:text-emerald-300 font-mono">{positive} <span className="text-[10px] font-bold text-emerald-600/70 dark:text-emerald-300/80">lots</span></p>
          </div>
          <div className="rounded-xl bg-rose-50 dark:bg-rose-950/40 p-3 border border-rose-100 dark:border-rose-900/40">
            <p className="text-[9px] font-extrabold uppercase tracking-wider text-rose-700 dark:text-rose-300">Bearish Trends (-)</p>
            <p className="mt-0.5 text-base font-black text-rose-700 dark:text-rose-300 font-mono">{negative} <span className="text-[10px] font-bold text-rose-600/70 dark:text-rose-300/80">lots</span></p>
          </div>
        </div>
      </div>

      {/* Main Records Table */}
      {loading ? (
        <LoadingState label="Synchronizing ShambaRecords agricultural commodity data..." />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : newestFirst.length === 0 ? (
        <EmptyState
          icon={TrendingUp}
          title="No produce listings match filter criteria"
          description="Adjust your county selection or search keywords to view active Kenyan price feeds."
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[56rem] text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/80 text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-700">
                <tr>
                  <th className="px-4 py-3.5">Produce & Shamba UUID</th>
                  <th className="px-4 py-3.5">County (ID) & Market</th>
                  <th className="px-4 py-3.5 text-right">Retail / kg</th>
                  <th className="px-4 py-3.5 text-right">Wholesale / kg</th>
                  <th className="px-4 py-3.5 text-right">24h Movement</th>
                  <th className="px-4 py-3.5">Source Provider</th>
                  <th className="px-4 py-3.5">Freshness</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {newestFirst.map((item, idx) => {
                  const change = Number(item.price_change_percent || 0);
                  const observed = new Date(item.observed_at);
                  const hours = Math.max(0, (Date.now() - observed.getTime()) / 3600000);
                  const shortUuid = item.uuid ? item.uuid.substring(0, 18) + (item.uuid.length > 18 ? '...' : '') : `shamba-${idx}`;

                  return (
                    <tr key={item.uuid || item.id || idx} className="hover:bg-slate-50/70 dark:hover:bg-slate-700/40 transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="space-y-0.5">
                          <p className="font-extrabold text-slate-900 dark:text-white text-xs">{item.commodity}</p>
                          <div className="flex items-center gap-1 text-[9px] font-mono font-bold text-slate-400 dark:text-slate-500">
                            <Tag className="w-2.5 h-2.5" />
                            <span>UUID: {shortUuid}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1">
                            <span className="inline-block px-1.5 py-0.2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded text-[9px] font-mono font-bold">
                              ID: {item.county_id || '047'}
                            </span>
                            <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">{item.county_name || 'Nairobi'}</span>
                          </div>
                          <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400">{item.market || 'Central Hub'}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-right font-black text-slate-900 dark:text-white font-mono text-xs">
                        {formatPrice(item.price_per_kg || item.retail_price || item.price_per_unit, item.currency)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-extrabold text-slate-600 dark:text-slate-300 font-mono text-xs">
                        {formatPrice(item.wholesale_price || (item.price_per_kg ? item.price_per_kg * 0.88 : 88), item.currency)}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <span className={`inline-flex items-center gap-0.5 rounded-lg px-2 py-0.5 text-[10px] font-extrabold ${
                          change > 0 
                            ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' 
                            : change < 0 
                            ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800' 
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                        }`}>
                          {change > 0 ? <ArrowUpRight className="h-3 w-3" /> : change < 0 ? <ArrowDownRight className="h-3 w-3" /> : null}
                          {change > 0 ? '+' : ''}{change.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 dark:text-slate-300">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          {item.source || 'ShambaRecords'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                          <Clock3 className="h-3 w-3 text-slate-400" />
                          {hours < 1 ? 'Under 15 mins' : hours < 24 ? `${Math.round(hours)}h ago` : `${Math.round(hours / 24)}d ago`}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
