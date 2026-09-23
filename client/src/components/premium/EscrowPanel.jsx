import { useEffect, useState } from 'react';
import { BadgeCheck, Clock3, DollarSign, FileText, ShieldCheck, Truck } from 'lucide-react';
import API from '../../services/api';
import { ErrorState, LoadingState } from './PageState';

const statusLabels = {
  pending: 'Pending',
  payment_started: 'Payment started',
  funded: 'Funded',
  released: 'Released',
  refunded: 'Refunded',
  disputed: 'Disputed',
};

function StatusPill({ status }) {
  const tone = {
    funded: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    released: 'bg-slate-900 dark:bg-emerald-600 text-white border-slate-900 dark:border-emerald-600',
    refunded: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700',
    disputed: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    payment_started: 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800',
  }[status] || 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700';
  return <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider ${tone}`}>{statusLabels[status] || status || 'Pending'}</span>;
}

export default function EscrowPanel({ order, userRole, onRefresh }) {
  const [escrow, setEscrow] = useState(null);
  const [events, setEvents] = useState([]);
  const [receipt, setReceipt] = useState(order?.receipt || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [action, setAction] = useState('');
  const [disputeReason, setDisputeReason] = useState('');
  const [notice, setNotice] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const escrowResponse = await API.get(`/escrow/orders/${order.id}`);
      setEscrow(escrowResponse.data);
      if (escrowResponse.data?.id) {
        try {
          const eventsResponse = await API.get(`/escrow/${escrowResponse.data.id}/events`);
          setEvents(eventsResponse?.data?.items || []);
        } catch {
          setEvents([]);
        }
      }
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load escrow protection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (order?.id) load();
  }, [order?.id]);

  const runAction = async (path, payload, nextNotice) => {
    setAction(path);
    setError('');
    setNotice('');
    try {
      const response = await API.post(path, payload);
      setEscrow(response.data);
      setNotice(nextNotice);
      await load();
      onRefresh?.();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Action failed.');
    } finally {
      setAction('');
    }
  };

  const fund = async () => {
    setAction('fund');
    setError('');
    try {
      const payment = await API.post(`/orders/${order.id}/pay`);
      await API.post(`/escrow/orders/${order.id}/fund`, {
        checkout_request_id: payment.data?.checkout_request_id,
      });
      setNotice('Payment request created. Complete the M-Pesa prompt to fund escrow.');
      await load();
      onRefresh?.();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to start escrow funding.');
    } finally {
      setAction('');
    }
  };

  if (loading) return <LoadingState label="Loading escrow protection..." />;
  if (error && !escrow) return <ErrorState message={error} onRetry={load} />;

  const current = escrow || order.escrow_transaction;
  const isBuyer = userRole === 'buyer';
  const isFarmer = userRole === 'farmer';
  const isFinal = ['released', 'refunded'].includes(current?.status);

  return (
    <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm" aria-labelledby="escrow-heading">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            <h3 id="escrow-heading" className="text-sm font-black text-slate-800 dark:text-white">Acreage Escrow</h3>
          </div>
          <p className="mt-1 text-[11px] font-bold text-slate-400 dark:text-slate-400">Funds are held until both parties confirm the transaction.</p>
        </div>
        {current && <StatusPill status={current.status} />}
      </div>

      {notice && <div className="mt-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-800 p-3 text-[11px] font-bold text-emerald-800 dark:text-emerald-300" role="status">{notice}</div>}
      {error && <div className="mt-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-800 p-3 text-[11px] font-bold text-rose-700 dark:text-rose-300" role="alert">{error}</div>}

      {current && (
        <>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl bg-slate-50 dark:bg-slate-900/60 p-3">
              <p className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">Protected amount</p>
              <p className="mt-1 text-sm font-black text-slate-900 dark:text-white">{new Intl.NumberFormat('en-KE', { style: 'currency', currency: current.currency || 'KES' }).format(current.amount || order.total_amount || 0)}</p>
            </div>
            <div className="rounded-xl bg-slate-50 dark:bg-slate-900/60 p-3">
              <p className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">Provider</p>
              <p className="mt-1 flex items-center gap-1 text-xs font-black text-slate-800 dark:text-slate-200"><DollarSign className="h-3 w-3" /> {current.provider || 'M-Pesa'}</p>
            </div>
            <div className="rounded-xl bg-slate-50 dark:bg-slate-900/60 p-3">
              <p className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">Receipt</p>
              <p className="mt-1 text-xs font-black text-slate-800 dark:text-slate-200">{current.mpesa_receipt_number || 'Awaiting payment'}</p>
            </div>
            <div className="rounded-xl bg-slate-50 dark:bg-slate-900/60 p-3">
              <p className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">Updated</p>
              <p className="mt-1 text-xs font-black text-slate-800 dark:text-slate-200">{current.updated_at ? new Date(current.updated_at).toLocaleDateString('en-KE') : '—'}</p>
            </div>
          </div>

          <div className="mt-4 space-y-2 border-t border-slate-100 dark:border-slate-700/60 pt-4">
            {!isFinal && current.status === 'pending' && isBuyer && (
              <button type="button" disabled={action === 'fund'} onClick={fund} className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500 px-3 py-2.5 text-xs font-extrabold text-white disabled:opacity-50">
                {action === 'fund' ? 'Starting secure payment...' : 'Fund escrow with M-Pesa'}
              </button>
            )}
            {!isFinal && current.status === 'funded' && isBuyer && order.quality_status !== 'confirmed' && (
              <button type="button" disabled={action === 'quality'} onClick={() => runAction(`/escrow/${current.id}/quality-confirm`, {}, 'Quality confirmation recorded.')} className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500 px-3 py-2.5 text-xs font-extrabold text-white disabled:opacity-50">
                {action === 'quality' ? 'Confirming quality...' : 'Confirm quality received'}
              </button>
            )}
            {!isFinal && current.status === 'funded' && order.quality_status === 'confirmed' && isFarmer && (
              <button type="button" disabled={action === 'release'} onClick={() => runAction(`/escrow/${current.id}/release`, {}, 'Escrow released to the farmer.')} className="w-full rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 px-3 py-2.5 text-xs font-extrabold text-white disabled:opacity-50">
                {action === 'release' ? 'Releasing funds...' : 'Release escrow to farmer'}
              </button>
            )}
            {!isFinal && current.status === 'funded' && (
              <div className="rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-700/60 p-3">
                <label htmlFor="dispute-reason" className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">Open a dispute</label>
                <div className="flex gap-2">
                  <input id="dispute-reason" value={disputeReason} onChange={(event) => setDisputeReason(event.target.value)} placeholder="Describe the issue" className="min-w-0 flex-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white px-2.5 py-2 text-xs font-bold outline-none focus:border-emerald-400" />
                  <button type="button" disabled={action === 'dispute' || !disputeReason.trim()} onClick={() => runAction(`/escrow/${current.id}/dispute`, { reason: disputeReason }, 'Dispute opened for review.')} className="rounded-lg bg-amber-500 px-3 py-2 text-[10px] font-extrabold text-white hover:bg-amber-600 disabled:opacity-50">{action === 'dispute' ? 'Opening...' : 'Dispute'}</button>
                </div>
              </div>
            )}
            {!isFinal && current.status === 'disputed' && userRole === 'admin' && (
              <button type="button" disabled={action === 'refund'} onClick={() => runAction(`/escrow/${current.id}/refund`, {}, 'Escrow refunded by admin.')} className="w-full rounded-xl bg-rose-600 px-3 py-2.5 text-xs font-extrabold text-white hover:bg-rose-700 disabled:opacity-50">{action === 'refund' ? 'Refunding...' : 'Refund escrow'}</button>
            )}
            {!receipt && !isFinal && (
              <button type="button" disabled={action === 'receipt'} onClick={async () => {
                setAction('receipt');
                try {
                  const response = await API.post(`/orders/${order.id}/receipt`);
                  setReceipt(response.data);
                  setNotice('Receipt issued from the immutable order snapshot.');
                  onRefresh?.();
                } catch (requestError) {
                  setError(requestError.response?.data?.message || 'Receipt is not available yet.');
                } finally {
                  setAction('');
                }
              }} className="w-full rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2.5 text-xs font-extrabold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50">
                {action === 'receipt' ? 'Issuing receipt...' : 'Generate receipt'}
              </button>
            )}
          </div>

          {receipt && (
            <div className="mt-4 flex items-start justify-between gap-3 rounded-xl border border-emerald-100 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/30 p-3">
              <div className="flex items-start gap-2">
                <FileText className="mt-0.5 h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">Receipt issued</p>
                  <p className="mt-0.5 text-xs font-black text-slate-800 dark:text-white">{receipt.receipt_number}</p>
                  <p className="mt-0.5 text-[11px] font-bold text-slate-500 dark:text-slate-400">{new Intl.NumberFormat('en-KE', { style: 'currency', currency: receipt.currency || 'KES' }).format(receipt.total_amount || receipt.total_amount === 0 ? receipt.total_amount : current.amount || 0)}</p>
                </div>
              </div>
              <BadgeCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            </div>
          )}

          {events.length > 0 && (
            <div className="mt-4 border-t border-slate-100 dark:border-slate-700/60 pt-4">
              <p className="mb-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">Protection ledger</p>
              <ol className="space-y-2">
                {events.map((event) => (
                  <li key={event.id} className="flex items-center gap-2 text-[11px] font-bold text-slate-600 dark:text-slate-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
                    <span className="capitalize">{event.event_type?.replaceAll('_', ' ')}</span>
                    <span className="ml-auto text-slate-400 dark:text-slate-500"><Clock3 className="ml-auto inline h-3 w-3" /> {event.created_at ? new Date(event.created_at).toLocaleString('en-KE', { dateStyle: 'short', timeStyle: 'short' }) : ''}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
          {order.transport_quote && (
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 p-3 text-[11px] font-bold text-slate-600 dark:text-slate-300 border border-slate-100 dark:border-slate-700/60">
              <Truck className="h-4 w-4 text-slate-400 dark:text-slate-500" aria-hidden="true" />
              <span>Transport: {order.transport_quote.mode} · {new Intl.NumberFormat('en-KE', { style: 'currency', currency: order.transport_quote.currency || 'KES' }).format(order.transport_quote.cost || 0)}</span>
            </div>
          )}
        </>
      )}
    </section>
  );
}
