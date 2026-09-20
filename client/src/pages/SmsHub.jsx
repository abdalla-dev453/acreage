import { useEffect, useState } from 'react';
import { ArrowUpRight, Clock3, Inbox, MessageSquareText, Send, Smartphone, WandSparkles } from 'lucide-react';
import API from '../services/api';
import Navbar from '../components/common/Navbar';
import SEO from '../components/common/SEO';
import { EmptyState, LoadingState } from '../components/premium/PageState';

function MessageList({ messages, emptyLabel }) {
  if (!messages.length) return <EmptyState icon={Inbox} title={emptyLabel} description="New messages will appear here after the provider syncs them." />;
  return <div className="space-y-2">{messages.map((message) => <article key={message.id} className="rounded-xl border border-slate-100 bg-white p-3 shadow-sm"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-xs font-black text-slate-800">{message.phone_number}</p><p className="mt-1 whitespace-pre-wrap text-[11px] font-bold leading-relaxed text-slate-600">{message.message}</p></div><span className={`shrink-0 rounded-full px-2 py-1 text-[8px] font-extrabold uppercase tracking-wider ${message.status === 'delivered' ? 'bg-emerald-50 text-emerald-700' : message.status === 'failed' ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-600'}`}>{message.status || 'received'}</span></div><p className="mt-2 inline-flex items-center gap-1 text-[9px] font-bold text-slate-400"><Clock3 className="h-3 w-3" /> {message.received_at || message.sent_at ? new Date(message.received_at || message.sent_at).toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' }) : ''}</p></article>)}</div>;
}

export default function SmsHub() {
  const [inbox, setInbox] = useState([]);
  const [outbox, setOutbox] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('inbox');
  const [phone, setPhone] = useState('');
  const [command, setCommand] = useState('ORDER ');
  const [products, setProducts] = useState([]);
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [inboxResponse, outboxResponse, productResponse] = await Promise.all([
        API.get('/sms/inbox'),
        API.get('/sms/outbox'),
        API.get('/products/?per_page=100'),
      ]);
      const normalize = (item) => ({
        ...item,
        phone_number: item.phone,
        message: item.command,
        sent_at: item.received_at || item.created_at,
      });
      const inboxData = inboxResponse.data?.items || inboxResponse.data || [];
      const outboxData = outboxResponse.data?.items || outboxResponse.data || [];
      setInbox((Array.isArray(inboxData) ? inboxData : []).map(normalize));
      setOutbox((Array.isArray(outboxData) ? outboxData : []).map(normalize));
      const productData = productResponse.data?.items || productResponse.data || [];
      setProducts(Array.isArray(productData) ? productData : []);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'SMS hub is currently unavailable.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const insertOrderCommand = () => {
    const product = products.find((item) => item.id === Number(productId));
    if (!product) return;
    setCommand(`ORDER ${product.id} ${quantity || '1'}`.trim());
  };

  const send = async (event) => {
    event.preventDefault();
    setSending(true);
    setError('');
    setNotice('');
    try {
      const response = await API.post('/sms/commands', { phone, text: command });
      setOutbox((current) => [{
        ...response.data,
        phone_number: response.data.phone,
        message: response.data.command,
        sent_at: response.data.received_at || response.data.created_at,
      }, ...current]);
      setPhone('');
      setCommand('ORDER ');
      setNotice('Command queued for delivery.');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'SMS command could not be sent.');
    } finally {
      setSending(false);
    }
  };

  const messages = tab === 'inbox' ? inbox : outbox;

  return (
    <div className="space-y-6 w-full pb-16">
      <SEO title="SMS Ordering Hub | Acreage" description="Build feature-phone ordering commands and monitor SMS inbox and outbox delivery." />
      <Navbar title="SMS Ordering Hub" />
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><h1 className="text-xl font-black text-slate-900">Feature-phone commerce</h1><p className="mt-1 text-xs font-bold text-slate-500">Turn simple SMS commands into tracked marketplace orders.</p></div><span className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-3 py-2 text-[10px] font-extrabold uppercase tracking-wider text-white"><Smartphone className="h-3.5 w-3.5" /> SMS provider</span></div>
      {notice && <div className="rounded-xl bg-emerald-50 p-3 text-[11px] font-bold text-emerald-800" role="status">{notice}</div>}
      {error && <div className="rounded-xl bg-rose-50 p-3 text-[11px] font-bold text-rose-700" role="alert">{error}</div>}

      <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" aria-labelledby="builder-title">
          <div className="flex items-center gap-2"><WandSparkles className="h-4 w-4 text-emerald-600" /><h2 id="builder-title" className="text-sm font-black text-slate-800">Command builder</h2></div>
          <form onSubmit={send} className="mt-4 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2"><div><label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500" htmlFor="sms-phone">Recipient phone</label><input id="sms-phone" required type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+254..." className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-bold outline-none focus:border-emerald-400" /></div><div><label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500" htmlFor="sms-product">Insert product command</label><div className="flex gap-2"><select id="sms-product" value={productId} onChange={(event) => setProductId(event.target.value)} className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-2.5 py-2.5 text-xs font-bold outline-none focus:border-emerald-400"><option value="">Product</option>{products.map((product) => <option key={product.id} value={product.id}>{product.title}</option>)}</select><input aria-label="Order quantity" value={quantity} onChange={(event) => setQuantity(event.target.value)} inputMode="numeric" placeholder="Qty" className="w-20 rounded-xl border border-slate-200 px-2.5 py-2.5 text-xs font-bold outline-none focus:border-emerald-400" /></div></div></div>
            <button type="button" onClick={insertOrderCommand} disabled={!productId} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-[10px] font-extrabold text-slate-600 hover:bg-slate-50 disabled:opacity-50"><ArrowUpRight className="h-3 w-3" /> Insert ORDER command</button>
            <div><label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500" htmlFor="sms-command">Command text</label><textarea id="sms-command" required rows="4" value={command} onChange={(event) => setCommand(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 font-mono text-xs font-black text-slate-800 outline-none focus:border-emerald-400" /></div>
            <p className="rounded-xl bg-slate-50 p-3 text-[10px] font-bold text-slate-500">Supported commands: <code className="font-black text-slate-800">ORDER &lt;product_id&gt; &lt;quantity&gt;</code>, <code className="font-black text-slate-800">GROUP &lt;group_id&gt; &lt;quantity&gt;</code>, and <code className="font-black text-slate-800">STATUS &lt;order_code&gt;</code>.</p>
            <button type="submit" disabled={sending} className="w-full rounded-xl bg-emerald-600 px-3 py-2.5 text-xs font-extrabold text-white hover:bg-emerald-700 disabled:opacity-50">{sending ? 'Queueing...' : <span className="inline-flex items-center justify-center gap-1.5"><Send className="h-3.5 w-3.5" /> Send command</span>}</button>
          </form>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" aria-labelledby="messages-title">
          <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><MessageSquareText className="h-4 w-4 text-emerald-600" /><h2 id="messages-title" className="text-sm font-black text-slate-800">Provider messages</h2></div><div className="flex rounded-lg bg-slate-100 p-1 text-[9px] font-extrabold"><button type="button" onClick={() => setTab('inbox')} className={`rounded-md px-2.5 py-1.5 ${tab === 'inbox' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>Inbox</button><button type="button" onClick={() => setTab('outbox')} className={`rounded-md px-2.5 py-1.5 ${tab === 'outbox' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>Outbox</button></div></div>
          <div className="mt-4"><p className="text-[10px] font-bold text-slate-400">{messages.length} {tab === 'inbox' ? 'incoming' : 'outgoing'} messages</p><div className="mt-2">{loading ? <LoadingState label="Syncing SMS messages..." /> : <MessageList messages={messages} emptyLabel={`No ${tab} messages`} />}</div></div>
        </section>
      </div>
    </div>
  );
}
