import { useCallback, useEffect, useState } from "react";
import { Download, Search } from "lucide-react";
import API from "../../services/api";
import PageHeader from "../../components/common/PageHeader";
import { useAdmin } from "../../context/AdminContext";
import { ReasonDialog } from "./AdminProducts";

/* Escrow administration. Disputed escrow is deliberately not releasable from
   this screen — it goes through the dispute queue so the decision is attached
   to a record that explains itself. */

const STATES = ["pending", "payment_started", "funded", "disputed", "released", "refunded"];

const TONE = {
  funded: "bg-sky-50 text-sky-700 ring-sky-200",
  disputed: "bg-rose-50 text-rose-700 ring-rose-200",
  released: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  refunded: "bg-slate-100 text-slate-600 ring-slate-200",
};

export default function AdminEscrow() {
  const { can } = useAdmin();
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState(null);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [commission, setCommission] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const [modal, setModal] = useState(null);

  const flash = (m) => { setNotice(m); window.setTimeout(() => setNotice(null), 4500); };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (status) params.status = status;
      if (search.trim()) params.q = search.trim();
      const { data } = await API.get("/admin/escrow", { params });
      setRows(data.items || []);
      setSummary(data.summary);
      if (can("finance.settings")) {
        const c = await API.get("/admin/commission");
        setCommission(c.data.commission_rate);
      }
    } catch (err) {
      flash(err?.response?.data?.message || "Could not load escrow.");
    } finally { setLoading(false); }
  }, [status, search, can]);

  useEffect(() => {
    const h = window.setTimeout(load, 300);
    return () => window.clearTimeout(h);
  }, [load]);

  async function act(row, kind, reason) {
    setBusy(true);
    try {
      const { data } = await API.post(`/admin/escrow/${row.id}/${kind}`, { reason });
      flash(data.message);
      setModal(null);
      await load();
    } catch (err) {
      flash(err?.response?.data?.message || "That action was refused.");
    } finally { setBusy(false); }
  }

  async function saveCommission(value) {
    setBusy(true);
    try {
      const { data } = await API.patch("/admin/commission", { commission_rate: value });
      flash(data.message);
      await load();
    } catch (err) {
      flash(err?.response?.data?.message || "Could not change the rate.");
    } finally { setBusy(false); }
  }

  if (!can("escrow.view")) {
    return <p className="py-16 text-center text-sm font-bold text-slate-500">Not permitted.</p>;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Escrow"
        description="Every held transaction. Release and refund both require a written reason and are recorded."
        actions={can("finance.export") ? (
          <a href="/api/admin/escrow/export.csv"
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3.5 py-2.5 text-[11px] font-extrabold uppercase tracking-wider text-white">
            <Download className="h-3.5 w-3.5" /> Export CSV
          </a>
        ) : null}
      />

      {notice && (
        <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-[12px] font-bold text-emerald-800 ring-1 ring-emerald-200">
          {notice}
        </p>
      )}

      {summary && (
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Currently held</p>
            <p className="mt-1 text-xl font-black text-emerald-600">
              KES {Number(summary.held_value || 0).toLocaleString()}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">By state</p>
            <p className="mt-1 text-[12px] font-bold text-slate-700">
              {Object.entries(summary.by_status).map(([k, v]) => `${k}: ${v}`).join(" · ") || "—"}
            </p>
          </div>
          {can("finance.settings") && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Commission</p>
              <div className="mt-1 flex items-center gap-2">
                <input
                  defaultValue={(commission * 100).toFixed(1)}
                  onBlur={(e) => {
                    const pct = parseFloat(e.target.value);
                    if (!Number.isNaN(pct) && pct / 100 !== commission) saveCommission(pct / 100);
                  }}
                  type="number" min="0" max="50" step="0.1" disabled={busy}
                  aria-label="Commission percent"
                  className="w-20 rounded-lg border border-slate-200 px-2 py-1 text-[13px] font-bold outline-none focus:border-emerald-400"
                />
                <span className="text-[12px] font-bold text-slate-500">% of each settlement</span>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 lg:flex-row lg:items-center dark:border-slate-800 dark:bg-slate-900">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search checkout id, receipt or order…" aria-label="Search escrow"
            className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-[13px] outline-none focus:border-emerald-400" />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)}
          aria-label="Filter by escrow state"
          className="rounded-xl border border-slate-200 px-3 py-2.5 text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
          <option value="">Any state</option>
          {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Commission</th>
                <th className="px-4 py-3">State</th>
                <th className="px-4 py-3">Receipt</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={6} className="px-4 py-10 text-center text-[12px] font-bold text-slate-400">Loading…</td></tr>}
              {!loading && rows.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-[12px] font-bold text-slate-400">No escrow matches.</td></tr>}
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                  <td className="px-4 py-3">
                    <p className="text-[12px] font-extrabold text-slate-800">Order #{row.order_id}</p>
                    <p className="font-mono text-[10px] text-slate-400">{row.checkout_request_id || "no checkout id"}</p>
                  </td>
                  <td className="px-4 py-3 text-[12px] font-black text-slate-800">KES {Number(row.amount || 0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-[12px] font-bold text-slate-500">KES {Number(row.commission || 0).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider ring-1 ${TONE[row.status] || "bg-slate-100 text-slate-600 ring-slate-200"}`}>
                      {row.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-[10px] text-slate-500">{row.mpesa_receipt_number || "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1.5">
                      {can("escrow.release") && row.status === "funded" && (
                        <button onClick={() => setModal({ row, kind: "release" })}
                          className="rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-emerald-700">
                          Release
                        </button>
                      )}
                      {can("escrow.refund") && ["funded", "released"].includes(row.status) && (
                        <button onClick={() => setModal({ row, kind: "refund" })}
                          className="rounded-lg bg-rose-50 px-2.5 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-rose-700">
                          Refund
                        </button>
                      )}
                      {row.status === "disputed" && (
                        <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-500"
                          title="Disputed escrow is decided from the disputes queue">
                          In dispute
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <ReasonDialog
          title={`${modal.kind === "release" ? "Release to farmer" : "Refund to buyer"} — KES ${Number(modal.row.amount || 0).toLocaleString()}`}
          required busy={busy}
          onCancel={() => setModal(null)}
          onConfirm={(reason) => act(modal.row, modal.kind, reason)}
          confirmLabel={modal.kind === "release" ? "Release funds" : "Refund funds"}
        >
          <p className="mt-1 text-[12px] text-slate-500">
            Order #{modal.row.order_id}. This moves real money and is recorded against your
            administrator account.
          </p>
        </ReasonDialog>
      )}
    </div>
  );
}
