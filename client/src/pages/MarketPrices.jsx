import { useContext, useEffect, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, Clock3, Plus, RefreshCw, Search, TrendingUp } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import API from '../services/api';
import Navbar from '../components/common/Navbar';
import SEO from '../components/common/SEO';
import { EmptyState, ErrorState, LoadingState } from '../components/premium/PageState';

const categories = ['', 'Vegetables', 'Cereals', 'Fruits', 'Grains & Tubers'];

function formatPrice(value, currency = 'KES') {
  return new Intl.NumberFormat('en-KE', { style: 'currency', currency }).format(Number(value || 0));
}

export default function MarketPrices() {
  const { user } = useContext(AuthContext);
  const [category, setCategory] = useState('');
  const [market, setMarket] = useState('');
  const [prices, setPrices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [manual, setManual] = useState({ commodity: '', price_per_kg: '', source: '', notes: '' });
  const [notice, setNotice] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (category) params.set('category', category);
      if (market.trim()) params.set('market', market.trim());
      const response = await API.get(`/market/prices?${params.toString()}`);
      const data = response.data?.items || response.data || [];
      setPrices((Array.isArray(data) ? data : []).map((item) => ({
        ...item,
        commodity: item.commodity || item.category || 'Market observation',
        price_per_kg: item.price_per_kg ?? item.price_per_unit,
        price_change_percent: item.price_change_percent ?? 0,
      })));
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Market price feed is unavailable.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [category, market]);

  const refresh = async () => {
    setRefreshing(true);
    setError('');
    try {
      await API.post('/market/prices/refresh');
      setNotice('Provider observations refreshed.');
      await load();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Provider refresh is unavailable.');
    } finally {
      setRefreshing(false);
    }
  };

  const submitManual = async (event) => {
    event.preventDefault();
    setError('');
    setNotice('');
    try {
      await API.post('/market/prices', {
        category: manual.commodity,
        price_per_unit: Number(manual.price_per_kg),
        unit: 'kg',
        market: manual.market,
        source: manual.source,
        provider: 'manual',
        metadata: { notes: manual.notes },
      });
      setManual({ commodity: '', price_per_kg: '', source: '', notes: '' });
      setManualOpen(false);
      setNotice('Manual observation recorded.');
      await load();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to record price observation.');
    }
  };

  const newestFirst = [...prices].sort((a, b) => new Date(b.observed_at) - new Date(a.observed_at));
  const average = newestFirst.length ? newestFirst.reduce((sum, item) => sum + Number(item.price_per_kg || 0), 0) / newestFirst.length : 0;
  const moving = newestFirst.filter((item) => item.price_change_percent !== null && item.price_change_percent !== undefined);
  const positive = moving.filter((item) => item.price_change_percent > 0).length;
  const negative = moving.filter((item) => item.price_change_percent < 0).length;

  return (
    <div className="space-y-6 w-full pb-16">
      <SEO title="Market Price Ticker | Acreage" description="Live agricultural market price observations with source and freshness metadata." />
      <Navbar title="Market Price Ticker" />

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-900">Live market intelligence</h1>
          <p className="mt-1 text-xs font-bold text-slate-500">Source-aware observations for smarter listing and preorder decisions.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {user?.role === 'admin' && <button type="button" onClick={refresh} disabled={refreshing} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-extrabold text-slate-700 hover:bg-slate-50 disabled:opacity-50"><RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} /> {refreshing ? 'Refreshing...' : 'Refresh provider'}</button>}
          {user?.role === 'admin' && <button type="button" onClick={() => setManualOpen((value) => !value)} className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-[11px] font-extrabold text-white hover:bg-slate-800"><Plus className="h-3.5 w-3.5" /> Add observation</button>}
        </div>
      </div>

      {notice && <div className="rounded-xl bg-emerald-50 p-3 text-[11px] font-bold text-emerald-800" role="status">{notice}</div>}
      {manualOpen && (
        <form onSubmit={submitManual} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-4 w-4 text-emerald-600" aria-hidden="true" />
            <h2 className="text-sm font-black text-slate-800">Record manual observation</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div><label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500" htmlFor="manual-commodity">Commodity</label><input id="manual-commodity" required value={manual.commodity} onChange={(event) => setManual({ ...manual, commodity: event.target.value })} className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-xs font-bold outline-none focus:border-emerald-400" /></div>
            <div><label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500" htmlFor="manual-price">Price / kg (KES)</label><input id="manual-price" required type="number" min="0.1" step="0.1" value={manual.price_per_kg} onChange={(event) => setManual({ ...manual, price_per_kg: event.target.value })} className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-xs font-bold outline-none focus:border-emerald-400" /></div>
            <div><label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500" htmlFor="manual-source">Source</label><input id="manual-source" required value={manual.source} onChange={(event) => setManual({ ...manual, source: event.target.value })} placeholder="Market / report" className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-xs font-bold outline-none focus:border-emerald-400" /></div>
            <div><label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500" htmlFor="manual-market">Market</label><input id="manual-market" value={manual.market || ''} onChange={(event) => setManual({ ...manual, market: event.target.value })} placeholder="Optional" className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-xs font-bold outline-none focus:border-emerald-400" /></div>
          </div>
          <label className="mt-3 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500" htmlFor="manual-notes">Notes</label>
          <textarea id="manual-notes" rows="2" value={manual.notes} onChange={(event) => setManual({ ...manual, notes: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-2 text-xs font-bold outline-none focus:border-emerald-400" />
          <div className="mt-3 flex justify-end gap-2"><button type="button" onClick={() => setManualOpen(false)} className="rounded-lg border border-slate-200 px-3 py-2 text-[10px] font-extrabold text-slate-600">Cancel</button><button type="submit" className="rounded-lg bg-emerald-600 px-3 py-2 text-[10px] font-extrabold text-white">Save observation</button></div>
        </form>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[12rem] flex-1"><label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500" htmlFor="price-category">Category</label><select id="price-category" value={category} onChange={(event) => setCategory(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold outline-none focus:border-emerald-400">{categories.map((item) => <option key={item || 'all'} value={item}>{item || 'All categories'}</option>)}</select></div>
          <div className="min-w-[12rem] flex-1"><label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500" htmlFor="price-market"><span className="inline-flex items-center gap-1"><Search className="h-3 w-3" /> Market</span></label><input id="price-market" value={market} onChange={(event) => setMarket(event.target.value)} placeholder="Nakuru, Nairobi..." className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-bold outline-none focus:border-emerald-400" /></div>
          <div className="rounded-xl bg-slate-50 px-4 py-3"><p className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">Average / kg</p><p className="mt-0.5 text-lg font-black text-slate-900">{formatPrice(average)}</p></div>
          <div className="flex gap-2"><div className="rounded-xl bg-emerald-50 px-3 py-3"><p className="text-[9px] font-extrabold uppercase tracking-wider text-emerald-600">Moving up</p><p className="mt-0.5 text-sm font-black text-emerald-700">{positive}</p></div><div className="rounded-xl bg-rose-50 px-3 py-3"><p className="text-[9px] font-extrabold uppercase tracking-wider text-rose-600">Moving down</p><p className="mt-0.5 text-sm font-black text-rose-700">{negative}</p></div></div>
        </div>
      </div>

      {loading ? <LoadingState label="Reading market observations..." /> : error ? <ErrorState message={error} onRetry={load} /> : newestFirst.length === 0 ? <EmptyState icon={TrendingUp} title="No market observations" description="Select another category or ask an administrator to refresh the provider." /> : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto"><table className="w-full min-w-[48rem] text-left text-xs">
            <thead className="bg-slate-50 text-[9px] font-extrabold uppercase tracking-wider text-slate-500"><tr><th className="px-4 py-3">Commodity</th><th className="px-4 py-3">Market</th><th className="px-4 py-3 text-right">Price / kg</th><th className="px-4 py-3 text-right">Movement</th><th className="px-4 py-3">Source</th><th className="px-4 py-3">Freshness</th></tr></thead>
            <tbody className="divide-y divide-slate-100">{newestFirst.map((item) => {
              const change = Number(item.price_change_percent || 0);
              const observed = new Date(item.observed_at);
              const hours = Math.max(0, (Date.now() - observed.getTime()) / 3600000);
              return <tr key={item.id} className="hover:bg-slate-50/60"><td className="px-4 py-3 font-black text-slate-800">{item.commodity}</td><td className="px-4 py-3 font-bold text-slate-500">{item.market || '—'}</td><td className="px-4 py-3 text-right font-black text-slate-900">{formatPrice(item.price_per_kg, item.currency)}</td><td className="px-4 py-3 text-right"><span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[9px] font-extrabold ${change > 0 ? 'bg-emerald-50 text-emerald-700' : change < 0 ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-600'}`}>{change > 0 ? <ArrowUpRight className="h-3 w-3" /> : change < 0 ? <ArrowDownRight className="h-3 w-3" /> : <span className="h-3 w-3" />}{change > 0 ? '+' : ''}{change.toFixed(1)}%</span></td><td className="px-4 py-3 font-bold text-slate-500">{item.source}</td><td className="px-4 py-3"><span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500"><Clock3 className="h-3 w-3" /> {hours < 1 ? 'Under 1 hour' : hours < 24 ? `${Math.round(hours)}h old` : `${Math.round(hours / 24)}d old`}</span></td></tr>;
            })}</tbody>
          </table></div>
        </div>
      )}
    </div>
  );
}
