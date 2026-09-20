import { useContext, useEffect, useMemo, useState } from 'react';
import { CalendarDays, LockKeyhole, Plus, Sprout, UsersRound } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import API from '../services/api';
import UnitSelector, { unitLabel } from '../components/premium/UnitSelector';
import { EmptyState, ErrorState, LoadingState } from '../components/premium/PageState';

const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function dateKey(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().split('T')[0];
}

export default function HarvestPlanner() {
  const { user } = useContext(AuthContext);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [month, setMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(dateKey(new Date()));
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [quantity, setQuantity] = useState('');
  const [deposit, setDeposit] = useState('');
  const [notice, setNotice] = useState('');
  const [form, setForm] = useState({
    product_id: '',
    field_name: '',
    crop_name: '',
    planting_date: '',
    harvest_start: '',
    harvest_end: '',
    expected_quantity: '',
    unit: 'kg',
    unit_weight_kg: '',
    price_per_unit: '',
    visibility: 'buyers',
    notes: '',
  });

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const planResponse = await API.get('/harvest/plans');
      const planData = planResponse.data?.items || planResponse.data || [];
      setPlans((Array.isArray(planData) ? planData : []).map((plan) => ({
        ...plan,
        preorders: plan.preorders || [],
      })));
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load harvest plans.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const createPlan = async (event) => {
    event.preventDefault();
    setError('');
    setNotice('');
    try {
      const payload = { ...form };
      ['expected_quantity', 'price_per_unit'].forEach((key) => { payload[key] = Number(payload[key]); });
      if (form.unit_weight_kg) payload.unit_weight_kg = Number(form.unit_weight_kg);
      const response = await API.post('/harvest/plans', payload);
      setPlans((current) => [response.data, ...current]);
      setForm({ product_id: '', field_name: '', crop_name: '', planting_date: '', harvest_start: '', harvest_end: '', expected_quantity: '', unit: 'kg', unit_weight_kg: '', price_per_unit: '', visibility: 'buyers', notes: '' });
      setCreateOpen(false);
      setNotice('Harvest plan published.');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to create harvest plan.');
    }
  };

  const preorder = async () => {
    if (!selectedPlan || !Number(quantity)) return;
    setError('');
    setNotice('');
    try {
      const payload = { quantity: Number(quantity), unit: selectedPlan.unit };
      if (deposit) payload.deposit_amount = Number(deposit);
      await API.post(`/harvest/plans/${selectedPlan.id}/preorders`, payload);
      setNotice('Preorder request sent to the farmer.');
      setQuantity('');
      setDeposit('');
      setSelectedPlan(null);
      await load();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to create preorder.');
    }
  };

  const calendarDays = useMemo(() => {
    const year = month.getFullYear();
    const monthIndex = month.getMonth();
    const first = new Date(year, monthIndex, 1);
    const days = [];
    for (let index = 0; index < first.getDay(); index += 1) days.push(null);
    while (first.getMonth() === monthIndex) {
      days.push(dateKey(first));
      first.setDate(first.getDate() + 1);
    }
    return days;
  }, [month]);

  const plansByDate = useMemo(() => {
    const map = {};
    plans.forEach((plan) => {
      const start = dateKey(plan.harvest_start);
      const end = dateKey(plan.harvest_end || plan.harvest_start);
      if (!start || !end) return;
      const cursor = new Date(`${start}T00:00:00`);
      const last = new Date(`${end}T00:00:00`);
      while (cursor <= last) {
        const key = dateKey(cursor);
        if (!map[key]) map[key] = [];
        map[key].push(plan);
        cursor.setDate(cursor.getDate() + 1);
      }
    });
    return map;
  }, [plans]);

  const selectedPlans = plansByDate[selectedDate] || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><div className="flex items-center gap-2"><Sprout className="h-5 w-5 text-emerald-600" /><h1 className="text-xl font-black text-slate-900">Harvest calendar & preorders</h1></div><p className="mt-1 text-xs font-bold text-slate-500">Plan future supply and let buyers reserve verified harvest windows.</p></div>{user?.role === 'farmer' && <button type="button" onClick={() => setCreateOpen((value) => !value)} className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2.5 text-[11px] font-extrabold text-white hover:bg-emerald-700"><Plus className="h-3.5 w-3.5" /> New harvest plan</button>}</div>
      {notice && <div className="rounded-xl bg-emerald-50 p-3 text-[11px] font-bold text-emerald-800" role="status">{notice}</div>}
      {error && <div className="rounded-xl bg-rose-50 p-3 text-[11px] font-bold text-rose-700" role="alert">{error}</div>}

      {createOpen && (
        <form onSubmit={createPlan} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2"><CalendarDays className="h-4 w-4 text-emerald-600" /><h2 className="text-sm font-black text-slate-800">Create harvest plan</h2></div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="lg:col-span-2"><label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500" htmlFor="harvest-product">Product lot</label><select id="harvest-product" required value={form.product_id} onChange={(event) => setForm({ ...form, product_id: event.target.value })} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold outline-none focus:border-emerald-400"><option value="">Choose a product</option>{products.map((product) => <option key={product.id} value={product.id}>{product.title}</option>)}</select></div>
            <UnitSelector value={form.unit} onChange={(value) => setForm({ ...form, unit: value })} />
            <div><label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500" htmlFor="harvest-field">Field / plot</label><input id="harvest-field" required value={form.field_name} onChange={(event) => setForm({ ...form, field_name: event.target.value })} placeholder="Block A" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-bold outline-none focus:border-emerald-400" /></div>
            <div><label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500" htmlFor="harvest-crop">Crop name</label><input id="harvest-crop" required value={form.crop_name} onChange={(event) => setForm({ ...form, crop_name: event.target.value })} placeholder="Tomato" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-bold outline-none focus:border-emerald-400" /></div>
            <div><label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500" htmlFor="harvest-plant">Planting date</label><input id="harvest-plant" required type="date" value={form.planting_date} onChange={(event) => setForm({ ...form, planting_date: event.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-bold outline-none focus:border-emerald-400" /></div>
            <div><label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500" htmlFor="harvest-start">Harvest starts</label><input id="harvest-start" required type="date" value={form.harvest_start} onChange={(event) => setForm({ ...form, harvest_start: event.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-bold outline-none focus:border-emerald-400" /></div>
            <div><label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500" htmlFor="harvest-end">Harvest ends</label><input id="harvest-end" type="date" value={form.harvest_end} onChange={(event) => setForm({ ...form, harvest_end: event.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-bold outline-none focus:border-emerald-400" /></div>
            <div><label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500" htmlFor="harvest-quantity">Expected quantity</label><input id="harvest-quantity" required type="number" min="0.1" step="0.1" value={form.expected_quantity} onChange={(event) => setForm({ ...form, expected_quantity: event.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-bold outline-none focus:border-emerald-400" /></div>
            <div><label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500" htmlFor="harvest-price">Price / unit (KES)</label><input id="harvest-price" required type="number" min="0.1" step="0.1" value={form.price_per_unit} onChange={(event) => setForm({ ...form, price_per_unit: event.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-bold outline-none focus:border-emerald-400" /></div>
            <div><label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500" htmlFor="harvest-weight">Unit weight kg (optional)</label><input id="harvest-weight" type="number" min="0.1" step="0.1" value={form.unit_weight_kg} onChange={(event) => setForm({ ...form, unit_weight_kg: event.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-bold outline-none focus:border-emerald-400" /></div>
            <div><label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500" htmlFor="harvest-visibility">Visibility</label><select id="harvest-visibility" value={form.visibility} onChange={(event) => setForm({ ...form, visibility: event.target.value })} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold outline-none focus:border-emerald-400"><option value="buyers">Visible to buyers</option><option value="private">Private plan</option></select></div>
            <div className="lg:col-span-2"><label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500" htmlFor="harvest-notes">Plan notes</label><textarea id="harvest-notes" rows="2" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-bold outline-none focus:border-emerald-400" /></div>
          </div>
          <div className="mt-4 flex justify-end gap-2"><button type="button" onClick={() => setCreateOpen(false)} className="rounded-xl border border-slate-200 px-3 py-2 text-[10px] font-extrabold text-slate-600">Cancel</button><button type="submit" className="rounded-xl bg-emerald-600 px-3 py-2 text-[10px] font-extrabold text-white">Publish plan</button></div>
        </form>
      )}

      {loading ? <LoadingState label="Loading harvest plans..." /> : error && !plans.length ? <ErrorState message={error} onRetry={load} /> : plans.length === 0 ? <EmptyState icon={CalendarDays} title="No harvest plans" description="Farmers can publish a future harvest window. Buyers can preorder when plans are visible." /> : (
        <div className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between"><div><p className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">Harvest window</p><h2 className="mt-1 text-sm font-black text-slate-900">{monthNames[month.getMonth()]} {month.getFullYear()}</h2></div><div className="flex items-center gap-1"><button type="button" aria-label="Previous month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50">‹</button><button type="button" aria-label="Next month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50">›</button></div></div>
            <div className="grid grid-cols-7 gap-1 text-center text-[9px] font-extrabold uppercase tracking-wider text-slate-400"><span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span></div>
            <div className="mt-2 grid grid-cols-7 gap-1">{calendarDays.map((key, index) => { if (!key) return <div key={`blank-${index}`} className="min-h-20 rounded-lg bg-slate-50" />; const dayPlans = plansByDate[key] || []; const selected = key === selectedDate; return <button type="button" key={key} onClick={() => setSelectedDate(key)} className={`min-h-20 rounded-lg border p-1.5 text-left ${selected ? 'border-emerald-400 bg-emerald-50' : 'border-slate-100 bg-white hover:border-slate-300'}`}><span className={`inline-flex h-6 w-6 items-center justify-center rounded-md text-[10px] font-black ${selected ? 'bg-emerald-600 text-white' : 'text-slate-700'}`}>{Number(key.split('-')[2])}</span>{dayPlans.length > 0 && <span className="mt-1 flex flex-col gap-1">{dayPlans.slice(0, 2).map((plan) => <span key={plan.id} className="truncate rounded bg-amber-100 px-1 py-0.5 text-[8px] font-extrabold text-amber-800">{plan.crop_name || plan.product?.title}</span>)}</span>}</button>; })}</div>
            <p className="mt-3 text-[10px] font-bold text-slate-400"><span className="inline-block h-2 w-2 rounded-full bg-amber-400" /> Amber markers show active harvest windows.</p>
          </section>

          <aside className="space-y-4">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><div><p className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">Selected date</p><h2 className="mt-1 text-sm font-black text-slate-900">{selectedDate ? new Date(`${selectedDate}T00:00:00`).toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric', month: 'short' }) : 'Choose a date'}</h2></div><span className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-extrabold text-slate-600">{selectedPlans.length}</span></div><div className="mt-3 space-y-2">{selectedPlans.length === 0 ? <EmptyState title="No harvest window" description="Choose a highlighted day to view planned supply." /> : selectedPlans.map((plan) => <article key={plan.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3"><p className="text-xs font-black text-slate-800">{plan.crop_name || plan.product?.title || 'Harvest plan'}</p><p className="mt-1 text-[10px] font-bold text-slate-500">{plan.expected_quantity} {unitLabel(plan.unit)} · KES {plan.price_per_unit}/{plan.unit}</p><p className="mt-1 text-[10px] font-bold text-slate-400">{plan.field_name}</p>{(user?.role === 'buyer' || user?.role === 'admin') && plan.visibility === 'buyers' && <button type="button" onClick={() => { setSelectedPlan(plan); setQuantity(''); setDeposit(''); }} className="mt-2 w-full rounded-lg bg-slate-900 px-2.5 py-2 text-[9px] font-extrabold text-white">Request preorder</button>}</article>)}</div></section>
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-2"><UsersRound className="h-4 w-4 text-emerald-600" /><h2 className="text-sm font-black text-slate-800">Preorder demand</h2></div><div className="mt-3 space-y-2">{plans.filter((plan) => (plan.preorders || []).length > 0).length === 0 ? <p className="text-[10px] font-bold text-slate-400">No preorder demand yet.</p> : plans.filter((plan) => (plan.preorders || []).length > 0).map((plan) => <div key={plan.id} className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] font-black text-slate-700">{plan.crop_name || plan.product?.title}</p><p className="mt-1 text-[10px] font-bold text-slate-500">{plan.preorders.length} request{(plan.preorders.length === 1) ? '' : 's'} · {plan.preorders.reduce((sum, item) => sum + Number(item.quantity || 0), 0)} {unitLabel(plan.unit)}</p></div>)}</div></section>
          </aside>
        </div>
      )}

      {selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-4 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="preorder-title"><div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"><div className="flex items-start gap-2"><LockKeyhole className="mt-0.5 h-4 w-4 text-emerald-600" /><div><p className="text-[9px] font-extrabold uppercase tracking-wider text-emerald-600">Harvest preorder</p><h2 id="preorder-title" className="mt-1 text-sm font-black text-slate-900">{selectedPlan.crop_name || selectedPlan.product?.title}</h2></div></div><div className="mt-3 grid grid-cols-2 gap-2 text-[11px] font-bold text-slate-500"><div className="rounded-lg bg-slate-50 p-3"><span className="block text-[8px] uppercase tracking-wider text-slate-400">Window</span><p className="mt-1 font-black text-slate-800">{dateKey(selectedPlan.harvest_start)}{selectedPlan.harvest_end && dateKey(selectedPlan.harvest_end) !== dateKey(selectedPlan.harvest_start) ? ` – ${dateKey(selectedPlan.harvest_end)}` : ''}</p></div><div className="rounded-lg bg-slate-50 p-3"><span className="block text-[8px] uppercase tracking-wider text-slate-400">Available</span><p className="mt-1 font-black text-slate-800">{selectedPlan.expected_quantity} {unitLabel(selectedPlan.unit)}</p></div></div><label className="mt-3 mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500" htmlFor="preorder-quantity">Quantity ({unitLabel(selectedPlan.unit)})</label><input id="preorder-quantity" type="number" min="0.1" step="0.1" value={quantity} onChange={(event) => setQuantity(event.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-bold outline-none focus:border-emerald-400" /><label className="mt-2 mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500" htmlFor="preorder-deposit">Deposit amount (optional)</label><input id="preorder-deposit" type="number" min="0" step="0.1" value={deposit} onChange={(event) => setDeposit(event.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-bold outline-none focus:border-emerald-400" /><div className="mt-4 flex gap-2"><button type="button" onClick={() => setSelectedPlan(null)} className="flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-[10px] font-extrabold text-slate-600">Cancel</button><button type="button" onClick={preorder} className="flex-1 rounded-xl bg-emerald-600 px-3 py-2.5 text-[10px] font-extrabold text-white">Send preorder</button></div></div></div>
      )}
    </div>
  );
}
