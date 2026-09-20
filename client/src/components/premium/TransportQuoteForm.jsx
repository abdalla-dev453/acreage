import { useState } from 'react';
import { ArrowRight, Clock3, PackageCheck, Truck } from 'lucide-react';
import API from '../../services/api';

const modes = [
  { value: 'boda', label: 'Boda boda', description: 'Fast local delivery' },
  { value: 'matatu', label: 'Matatu', description: 'Shared transport' },
  { value: 'truck', label: 'Truck', labelIcon: Truck, description: 'Bulk haulage' },
];

export default function TransportQuoteForm({ orderId, onQuote, onAccept, onError, compact = false }) {
  const [form, setForm] = useState({
    origin: '',
    destination: '',
    weight_kg: '',
    package_count: '1',
    mode: 'boda',
  });
  const [loading, setLoading] = useState(false);
  const [quote, setQuote] = useState(null);
  const [error, setError] = useState('');
  const [unavailable, setUnavailable] = useState(false);

  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const requestQuote = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setUnavailable(false);
    try {
      const payload = {
        ...form,
        weight_kg: Number(form.weight_kg),
        package_count: Number(form.package_count),
      };
      if (orderId) payload.order_id = orderId;
      const response = await API.post('/transport/quotes', payload);
      setQuote(response.data);
      onQuote?.(response.data);
    } catch (requestError) {
      const data = requestError.response?.data || {};
      if (data.available === false || requestError.response?.status === 503) {
        setUnavailable(true);
        setError(data.message || 'Transport quotes are currently unavailable.');
      } else {
        setError(data.message || 'Unable to request a transport quote.');
      }
      onError?.(requestError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={requestQuote} className={compact ? 'space-y-3' : 'rounded-2xl border border-slate-200 bg-white p-4 shadow-sm'} aria-label="Transport quote request">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-black text-slate-800">
            <Truck className="h-4 w-4 text-emerald-600" aria-hidden="true" />
            Transport quote
          </div>
          <p className="mt-1 text-[11px] font-bold text-slate-400">Get a live carrier estimate before checkout.</p>
        </div>
        {quote && <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider text-emerald-700">Quoted</span>}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-[11px] font-extrabold text-slate-500" htmlFor={`origin-${orderId || 'quote'}`}>Pickup location</label>
          <input id={`origin-${orderId || 'quote'}`} value={form.origin} onChange={(event) => update('origin', event.target.value)} required placeholder="e.g. Nakuru" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50" />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-extrabold text-slate-500" htmlFor={`destination-${orderId || 'quote'}`}>Delivery location</label>
          <input id={`destination-${orderId || 'quote'}`} value={form.destination} onChange={(event) => update('destination', event.target.value)} required placeholder="e.g. Nairobi" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50" />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-extrabold text-slate-500" htmlFor={`weight-${orderId || 'quote'}`}>Weight (kg)</label>
          <input id={`weight-${orderId || 'quote'}`} type="number" min="0.1" step="0.1" value={form.weight_kg} onChange={(event) => update('weight_kg', event.target.value)} required className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50" />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-extrabold text-slate-500" htmlFor={`packages-${orderId || 'quote'}`}>Packages</label>
          <input id={`packages-${orderId || 'quote'}`} type="number" min="1" step="1" value={form.package_count} onChange={(event) => update('package_count', event.target.value)} required className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50" />
        </div>
      </div>
      <fieldset className="grid grid-cols-3 gap-2">
        <legend className="sr-only">Transport mode</legend>
        {modes.map((mode) => {
          const ModeIcon = mode.labelIcon || PackageCheck;
          const selected = form.mode === mode.value;
          return (
            <label key={mode.value} className={`cursor-pointer rounded-xl border px-2 py-2 text-center transition ${selected ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
              <input type="radio" name={`mode-${orderId || 'quote'}`} value={mode.value} checked={selected} onChange={() => update('mode', mode.value)} className="sr-only" />
              <ModeIcon className={`mx-auto h-4 w-4 ${selected ? 'text-emerald-600' : 'text-slate-400'}`} aria-hidden="true" />
              <span className="mt-1 block text-[11px] font-extrabold text-slate-700">{mode.label}</span>
              <span className="block text-[9px] font-bold text-slate-400">{mode.description}</span>
            </label>
          );
        })}
      </fieldset>
      {quote && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-950 p-3 text-white" role="status">
          <div>
            <p className="text-xs font-black">{new Intl.NumberFormat('en-KE', { style: 'currency', currency: quote.currency || 'KES' }).format(quote.cost)}</p>
            <p className="mt-0.5 text-[11px] font-bold text-slate-300">{quote.provider || 'Carrier'} · {quote.mode || form.mode}</p>
          </div>
          <div className="flex items-center gap-3 text-[11px] font-bold text-slate-300">
            <span className="inline-flex items-center gap-1"><Clock3 className="h-3 w-3" aria-hidden="true" /> {quote.eta_minutes ?? '—'} min</span>
            {onAccept && <button type="button" onClick={() => onAccept(quote)} className="inline-flex items-center gap-1 rounded-lg bg-emerald-400 px-2.5 py-1.5 text-[10px] font-extrabold text-slate-950 hover:bg-emerald-300">Accept <ArrowRight className="h-3 w-3" aria-hidden="true" /></button>}
          </div>
        </div>
      )}
      {unavailable && <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] font-bold text-amber-800" role="alert">{error}</div>}
      {error && !unavailable && <p className="text-[11px] font-bold text-rose-600" role="alert">{error}</p>}
      <button type="submit" disabled={loading} className="w-full rounded-xl bg-slate-900 px-3 py-2.5 text-xs font-extrabold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50">
        {loading ? 'Requesting quote...' : 'Request live quote'}
      </button>
    </form>
  );
}
