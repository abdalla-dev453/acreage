import { useCallback, useEffect, useState } from "react";
import { Search, ShoppingBag } from "lucide-react";
import API from "../../services/api";
import PageHeader from "../../components/common/PageHeader";
import { useAdmin } from "../../context/AdminContext";
import { ReasonDialog } from "./AdminProducts";

/* Order administration: every order on the platform, with both parties, plus
   out-of-band intervention. The transition graph is enforced server-side, so
   this screen cannot be used to skip the escrow precondition on delivery. */

export default function AdminOrders() {
  const { can } = useAdmin();
  const [rows, setRows] = useState([]);
  const [facets, setFacets] = useState({ statuses: [], payment_statuses: [] });
  const [pageInfo, setPageInfo] = useState({ total: 0, page: 1, pages: 1, has_next: false });
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [payment, setPayment] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const [modal, setModal] = useState(null);
  const [detail, setDetail] = useState(null);

  const flash = (m) => { setNotice(m); window.setTimeout(() => setNotice(null), 4500); };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, per_page: 25 };
      if (query.trim()) params.q = query.trim();
      if (status) params.status = status;
      if (payment) params.payment_status = payment;
      const { data } = await API.get("/admin/orders", { params });
      setRows(data.items || []);
      setPageInfo(data);
      setFacets(data.facets || { statuses: [], payment_statuses: [] });
    } catch (err) {
      flash(err?.response?.data?.message || "Could not load orders.");
    } finally { setLoading(false); }
  }, [page, query, status, payment]);

  useEffect(() => {
    const h = window.setTimeout(load, 300);
    return () => window.clearTimeout(h);
  }, [load]);

  const openDetail = async (order) => {
    try {
      const { data } = await API.get(`/admin/orders/${order.id}`);
      setDetail(data);
    } catch (err) {
      flash(err?.response?.data?.message || "Could not open that order.");
    }
  };

  async function intervene(row, patch) {
    setBusy(true);
    try {
      const { data } = await API.patch(`/admin/orders/${row.id}/status`, patch);
      flash(data.message);
      setModal(null);
      await load();
    } catch (err) {
      const body = err?.response?.data;
      flash(body?.allowed
        ? `${body.message} Allowed from ${status || "here"}: ${body.allowed.join(", ")}`
        : body?.message || "That change was refused.");
    } finally { setBusy(false); }
  }

  if (!can("orders.view")) {
    return <p className="py-16 text-center text-sm font-bold text-slate-500">Not permitted.</p>;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Orders"
        description="Every order on the platform. Interventions require a note and cannot skip a legal status step."
      />

      {notice && (
        <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-[12px] font-bold text-emerald-800 ring-1 ring-emerald-200">
          {notice}
        </p>
      )}

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 lg:flex-row lg:items-center dark:border-slate-800 dark:bg-slate-900">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Search order code or address…" aria-label="Search orders"
            className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-[13px] outline-none focus:border-emerald-400" />
        </div>
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          aria-label="Filter by status"
          className="rounded-xl border border-slate-200 px-3 py-2.5 text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
          <option value="">Any status</option>
          {facets.statuses.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={payment} onChange={(e) => { setPayment(e.target.value); setPage(1); }}
          aria-label="Filter by payment status"
          className="rounded-xl border border-slate-200 px-3 py-2.5 text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
          <option value="">Any payment</option>
          {facets.payment_statuses.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-left">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Buyer → Farmer</th>
                <th className="px-4 py-3">Value</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={6} className="px-4 py-10 text-center text-[12px] font-bold text-slate-400">Loading…</td></tr>}
              {!loading && rows.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-[12px] font-bold text-slate-400">No orders match.</td></tr>}
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                  <td className="px-4 py-3">
                    <p className="text-[12px] font-extrabold text-slate-800 dark:text-slate-100">{row.order_code}</p>
                    <p className="text-[10px] text-slate-400">
                      {new Date(row.created_at).toLocaleDateString("en-KE")} · {row.line_count} line(s)
                    </p>
                    {row.admin_note && (
                      <p className="mt-0.5 max-w-[200px] truncate text-[10px] italic text-slate-400"
                        title={row.admin_note}>admin: {row.admin_note}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[12px] text-slate-600">
                    {row.buyer_username} <span className="text-slate-300">→</span> {row.farmer_username}
                  </td>
                  <td className="px-4 py-3 text-[12px] font-black text-slate-700">
                    KES {Number(row.total_amount || 0).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-600">
                      {row.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider ring-1 ${
                      row.payment_status === "paid" ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                      : row.payment_status === "unpaid" ? "bg-amber-50 text-amber-700 ring-amber-200"
                      : "bg-slate-100 text-slate-600 ring-slate-200"
                    }`}>{row.payment_status}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1.5">
                      <button onClick={() => openDetail(row)}
                        className="rounded-lg bg-slate-100 p-1.5 text-slate-500 hover:bg-slate-200"
                        aria-label={`Open ${row.order_code}`}>
                        <ShoppingBag className="h-3.5 w-3.5" />
                      </button>
                      {can("orders.intervene") && (
                        <button onClick={() => setModal({ row, field: "status" })}
                          className="rounded-lg bg-slate-900 px-2.5 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-white">
                          Intervene
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
          <p className="text-[11px] font-bold text-slate-500">Page {pageInfo.page} of {pageInfo.pages} · {pageInfo.total} orders</p>
          <div className="flex gap-2">
            <button disabled={pageInfo.page <= 1} onClick={() => setPage((v) => Math.max(1, v - 1))}
              className="rounded-lg px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-600 hover:bg-slate-100 disabled:opacity-40">Previous</button>
            <button disabled={!pageInfo.has_next} onClick={() => setPage((v) => v + 1)}
              className="rounded-lg px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-600 hover:bg-slate-100 disabled:opacity-40">Next</button>
          </div>
        </div>
      </div>

      {modal && (
        <InterventionDialog
          order={modal.row}
          facets={facets}
          busy={busy}
          onCancel={() => setModal(null)}
          onConfirm={intervene}
        />
      )}

      {detail && (
        <OrderDrawer detail={detail} onClose={() => setDetail(null)} />
      )}
    </div>
  );
}

function InterventionDialog({ order, facets, busy, onCancel, onConfirm }) {
  const [field, setField] = useState("status");
  const [value, setValue] = useState("");
  const [note, setNote] = useState("");
  const options = field === "status" ? facets.statuses : facets.payment_statuses;
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
      role="dialog" aria-modal="true" onClick={onCancel}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-base font-black text-slate-900">Intervene on {order.order_code}</h2>
        <p className="mt-1 text-[12px] text-slate-500">
          Currently <strong>{order.status}</strong> / payment <strong>{order.payment_status}</strong>.
          Illegal transitions are refused by the server.
        </p>
        <div className="mt-4 flex gap-2">
          {["status", "payment_status"].map((f) => (
            <button key={f} onClick={() => { setField(f); setValue(""); }}
              className={`rounded-lg px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider ${
                field === f ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"
              }`}>{f === "status" ? "Order status" : "Payment"}</button>
          ))}
        </div>
        <select value={value} onChange={(e) => setValue(e.target.value)}
          className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-[13px] outline-none focus:border-emerald-400">
          <option value="">Choose…</option>
          {options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        <label className="mt-3 block">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Note (required)</span>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-emerald-400" />
        </label>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onCancel}
            className="rounded-xl px-4 py-2.5 text-[11px] font-extrabold uppercase tracking-wider text-slate-600 hover:bg-slate-100">Cancel</button>
          <button disabled={busy || !value || !note.trim()}
            onClick={() => onConfirm(order, { [field]: value, note })}
            className="rounded-xl bg-slate-900 px-4 py-2.5 text-[11px] font-extrabold uppercase tracking-wider text-white disabled:opacity-40">
            {busy ? "Working…" : "Apply"}
          </button>
        </div>
      </div>
    </div>
  );
}

function OrderDrawer({ detail, onClose }) {
  const o = detail.order;
  return (
    <div className="fixed inset-0 z-[80] flex justify-end bg-slate-900/50 backdrop-blur-sm"
      role="dialog" aria-modal="true" onClick={onClose}>
      <aside className="h-full w-full max-w-md overflow-y-auto bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-base font-black text-slate-900">{o.order_code}</h2>
            <p className="text-[11px] text-slate-500">{new Date(o.created_at).toLocaleString("en-KE")}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
            aria-label="Close">✕</button>
        </div>

        <dl className="mt-4 space-y-2 text-[12px]">
          {[
            ["Status", `${o.status} / ${o.payment_status}`],
            ["Total", `KES ${Number(o.total_amount || 0).toLocaleString()}`],
            ["Buyer", o.buyer ? `${o.buyer.username} · ${o.buyer.phone_number || "no phone"}` : "—"],
            ["Farmer", o.farmer ? `${o.farmer.username} · ${o.farmer.phone_number || "no phone"}` : "—"],
            ["Deliver to", o.delivery_address],
            ["Origin", o.origin_location || "—"],
            ...(o.admin_note ? [["Admin note", o.admin_note]] : []),
            ...(detail.escrow ? [["Escrow", `${detail.escrow.status} · KES ${detail.escrow.amount}`]] : []),
          ].map(([k, v]) => (
            <div key={k} className="flex gap-3">
              <dt className="w-24 shrink-0 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">{k}</dt>
              <dd className="flex-1 font-bold text-slate-700">{v}</dd>
            </div>
          ))}
        </dl>

        <h3 className="mt-6 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Line items</h3>
        <ul className="mt-2 space-y-1.5">
          {(detail.items || []).map((item, i) => (
            <li key={i} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-[12px]">
              <span className="font-bold text-slate-700">{item.title || `product #${item.product_id}`}</span>
              <span className="text-slate-500">{item.quantity} {item.unit} × {item.unit_price}</span>
            </li>
          ))}
          {(!detail.items || detail.items.length === 0) && (
            <li className="px-3 py-4 text-center text-[12px] text-slate-400">No line items.</li>
          )}
        </ul>
      </aside>
    </div>
  );
}
