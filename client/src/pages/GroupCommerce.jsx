import { useContext, useEffect, useState } from 'react';
import { CalendarDays, Plus, ShoppingCart, UsersRound, XCircle } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import API from '../services/api';
import Navbar from '../components/common/Navbar';
import SEO from '../components/common/SEO';
import UnitSelector, { unitLabel } from '../components/premium/UnitSelector';
import { EmptyState, ErrorState, LoadingState } from '../components/premium/PageState';

function ProgressBar({ value, max }) {
  const percent = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${percent}%` }} /><span className="sr-only">{percent}% funded</span></div>;
}

export default function GroupCommerce() {
  const { user } = useContext(AuthContext);
  const [groups, setGroups] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [quantity, setQuantity] = useState('');
  const [notice, setNotice] = useState('');
  const [form, setForm] = useState({
    product_id: '',
    target_quantity: '',
    min_quantity: '',
    price_per_unit: '',
    unit: 'kg',
    unit_weight_kg: '',
    deposit_percentage: '10',
    closes_at: '',
    delivery_location: '',
    transport_mode: 'matatu',
  });

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [groupResponse, productResponse] = await Promise.all([
        API.get('/group-orders'),
        API.get('/products/?per_page=100'),
      ]);
      setGroups(groupResponse.data?.items || groupResponse.data || []);
      const productData = productResponse.data?.items || productResponse.data || [];
      setProducts(Array.isArray(productData) ? productData : []);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load group commerce workspace.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const createGroup = async (event) => {
    event.preventDefault();
    setError('');
    setNotice('');
    try {
      const payload = {
        ...form,
        deposit_percent: Number(form.deposit_percentage),
        deadline: form.closes_at,
      };
      delete payload.deposit_percentage;
      delete payload.closes_at;
      ['target_quantity', 'min_quantity', 'price_per_unit'].forEach((key) => { payload[key] = Number(payload[key]); });
      if (form.unit_weight_kg) payload.unit_weight_kg = Number(form.unit_weight_kg);
      const response = await API.post('/group-orders', payload);
      setGroups((current) => [response.data, ...current]);
      setForm({ product_id: '', target_quantity: '', min_quantity: '', price_per_unit: '', unit: 'kg', unit_weight_kg: '', deposit_percentage: '10', closes_at: '', delivery_location: '', transport_mode: 'matatu' });
      setCreateOpen(false);
      setNotice('Group order opened.');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to open group order.');
    }
  };

  const commit = async () => {
    if (!selectedGroup || !Number(quantity)) return;
    setError('');
    setNotice('');
    try {
      const response = await API.post(`/group-orders/${selectedGroup.id}/commit`, { quantity: Number(quantity) });
      setGroups((current) => current.map((item) => item.id === selectedGroup.id ? response.data.group_order || item : item));
      setNotice('Commitment recorded. Complete payment from your Orders page.');
      setQuantity('');
      setSelectedGroup(null);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to join this group order.');
    }
  };

  const closeGroup = async (group) => {
    setError('');
    try {
      await API.patch(`/group-orders/${group.id}`, { status: 'closed' });
      setNotice('Group order closed.');
      await load();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to close group order.');
    }
  };

  const selectedProduct = products.find((product) => product.id === Number(form.product_id));
  const activeGroups = groups.filter((group) => group.status === 'open');
  const closedGroups = groups.filter((group) => group.status !== 'open');

  return (
    <div className="space-y-6 w-full pb-16">
      <SEO title="Group Buying & Selling | Acreage" description="Pool demand, commit to harvest lots, and share transport with verified farmers." />
      <Navbar title="Group Buying & Selling" />
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div><h1 className="text-xl font-black text-slate-900">Collective commerce</h1><p className="mt-1 text-xs font-bold text-slate-500">Pool demand, reduce transport cost, and reserve harvest lots together.</p></div>
        {user?.role === 'farmer' && <button type="button" onClick={() => setCreateOpen((value) => !value)} className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2.5 text-[11px] font-extrabold text-white hover:bg-emerald-700"><Plus className="h-3.5 w-3.5" /> Open group order</button>}
      </div>
      {notice && <div className="rounded-xl bg-emerald-50 p-3 text-[11px] font-bold text-emerald-800" role="status">{notice}</div>}
      {error && <div className="rounded-xl bg-rose-50 p-3 text-[11px] font-bold text-rose-700" role="alert">{error}</div>}

      {createOpen && (
        <form onSubmit={createGroup} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2"><UsersRound className="h-4 w-4 text-emerald-600" /><h2 className="text-sm font-black text-slate-800">Open a group order</h2></div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="lg:col-span-2"><label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500" htmlFor="group-product">Product lot</label><select id="group-product" required value={form.product_id} onChange={(event) => setForm({ ...form, product_id: event.target.value })} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold outline-none focus:border-emerald-400"><option value="">Choose a listing</option>{products.map((product) => <option key={product.id} value={product.id}>{product.title} · {product.unit}</option>)}</select></div>
            <UnitSelector value={form.unit} onChange={(value) => setForm({ ...form, unit: value })} />
            <div><label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500" htmlFor="group-target">Target quantity</label><input id="group-target" required type="number" min="1" value={form.target_quantity} onChange={(event) => setForm({ ...form, target_quantity: event.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-bold outline-none focus:border-emerald-400" /></div>
            <div><label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500" htmlFor="group-min">Minimum quantity</label><input id="group-min" required type="number" min="1" value={form.min_quantity} onChange={(event) => setForm({ ...form, min_quantity: event.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-bold outline-none focus:border-emerald-400" /></div>
            <div><label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500" htmlFor="group-price">Price / unit (KES)</label><input id="group-price" required type="number" min="0.1" step="0.1" value={form.price_per_unit} onChange={(event) => setForm({ ...form, price_per_unit: event.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-bold outline-none focus:border-emerald-400" /></div>
            <div><label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500" htmlFor="group-weight">Unit weight kg (optional)</label><input id="group-weight" type="number" min="0.1" step="0.1" value={form.unit_weight_kg} onChange={(event) => setForm({ ...form, unit_weight_kg: event.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-bold outline-none focus:border-emerald-400" /></div>
            <div><label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500" htmlFor="group-deposit">Deposit %</label><input id="group-deposit" required type="number" min="0" max="100" value={form.deposit_percentage} onChange={(event) => setForm({ ...form, deposit_percentage: event.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-bold outline-none focus:border-emerald-400" /></div>
            <div><label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500" htmlFor="group-close">Closes at</label><input id="group-close" required type="datetime-local" value={form.closes_at} onChange={(event) => setForm({ ...form, closes_at: event.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-bold outline-none focus:border-emerald-400" /></div>
            <div><label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500" htmlFor="group-location">Delivery location</label><input id="group-location" required value={form.delivery_location} onChange={(event) => setForm({ ...form, delivery_location: event.target.value })} placeholder="Town / collection point" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-bold outline-none focus:border-emerald-400" /></div>
          </div>
          {selectedProduct && <p className="mt-3 text-[11px] font-bold text-slate-500">Listing owner: {selectedProduct.farmer?.username || '—'} · Available: {selectedProduct.stock_quantity} {selectedProduct.unit}</p>}
          <div className="mt-4 flex justify-end gap-2"><button type="button" onClick={() => setCreateOpen(false)} className="rounded-xl border border-slate-200 px-3 py-2 text-[10px] font-extrabold text-slate-600">Cancel</button><button type="submit" className="rounded-xl bg-emerald-600 px-3 py-2 text-[10px] font-extrabold text-white">Publish group order</button></div>
        </form>
      )}

      {loading ? <LoadingState label="Loading group orders..." /> : error && !groups.length ? <ErrorState message={error} onRetry={load} /> : groups.length === 0 ? <EmptyState icon={UsersRound} title="No group orders yet" description="Farmers can open a group lot. Buyers can join when one is available." /> : (
        <div className="grid gap-4 xl:grid-cols-2">
          {activeGroups.map((group) => (
            <article key={group.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3"><div><p className="text-[9px] font-extrabold uppercase tracking-wider text-emerald-600">Open group lot</p><h2 className="mt-1 text-sm font-black text-slate-900">{group.product?.title || 'Product lot'}</h2><p className="mt-1 text-[11px] font-bold text-slate-400">{group.delivery_location}</p></div><span className="rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-extrabold uppercase tracking-wider text-emerald-700">Open</span></div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-[11px] font-bold text-slate-500"><div className="rounded-lg bg-slate-50 p-3"><span className="block text-[9px] uppercase tracking-wider text-slate-400">Committed</span><span className="mt-1 block font-black text-slate-900">{group.committed_quantity || 0} / {group.target_quantity} {unitLabel(group.unit)}</span></div><div className="rounded-lg bg-slate-50 p-3"><span className="block text-[9px] uppercase tracking-wider text-slate-400">Price</span><span className="mt-1 block font-black text-slate-900">KES {group.price_per_unit}/{group.unit}</span></div></div>
              <div className="mt-3"><ProgressBar value={group.committed_quantity || 0} max={group.target_quantity} /></div>
              <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-bold text-slate-500"><span className="inline-flex items-center gap-1"><UsersRound className="h-3 w-3" /> {group.commitments?.length || 0} buyers</span><span className="inline-flex items-center gap-1"><CalendarDays className="h-3 w-3" /> Closes {group.closes_at ? new Date(group.closes_at).toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}</span><span className="inline-flex items-center gap-1"><ShoppingCart className="h-3 w-3" /> {group.transport_mode}</span></div>
              <div className="mt-4 flex gap-2">{user?.role === 'buyer' ? <button type="button" onClick={() => { setSelectedGroup(group); setQuantity(''); }} className="flex-1 rounded-xl bg-slate-900 px-3 py-2.5 text-[10px] font-extrabold text-white hover:bg-slate-800">Join group</button> : user?.role === 'farmer' ? <button type="button" onClick={() => closeGroup(group)} className="flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-[10px] font-extrabold text-slate-600 hover:bg-slate-50">Close order</button> : <span className="text-[10px] font-bold text-slate-400">Sign in to participate</span>}</div>
            </article>
          ))}
          {closedGroups.length > 0 && <div className="xl:col-span-2 rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Closed history</p><div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{closedGroups.map((group) => <div key={group.id} className="rounded-xl bg-white p-3 text-[11px] font-bold text-slate-500"><p className="font-black text-slate-800">{group.product?.title || 'Product lot'}</p><p className="mt-1 capitalize">{group.status}</p></div>)}</div></div>}
        </div>
      )}

      {selectedGroup && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-4 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="join-group-title">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"><div className="flex items-start justify-between gap-3"><div><p className="text-[9px] font-extrabold uppercase tracking-wider text-emerald-600">Join group order</p><h2 id="join-group-title" className="mt-1 text-sm font-black text-slate-900">{selectedGroup.product?.title || 'Product lot'}</h2></div><button type="button" onClick={() => setSelectedGroup(null)} aria-label="Close join dialog" className="text-slate-400 hover:text-slate-700"><XCircle className="h-4 w-4" /></button></div><label className="mt-4 mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500" htmlFor="group-quantity">Quantity ({unitLabel(selectedGroup.unit)})</label><input id="group-quantity" type="number" min="1" value={quantity} onChange={(event) => setQuantity(event.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-bold outline-none focus:border-emerald-400" /><div className="mt-4 flex gap-2"><button type="button" onClick={() => setSelectedGroup(null)} className="flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-[10px] font-extrabold text-slate-600">Cancel</button><button type="button" onClick={commit} className="flex-1 rounded-xl bg-emerald-600 px-3 py-2.5 text-[10px] font-extrabold text-white">Commit quantity</button></div></div>
        </div>
      )}
    </div>
  );
}
