import { useCallback, useEffect, useState } from "react";
import { RotateCcw } from "lucide-react";
import API from "../../services/api";
import PageHeader from "../../components/common/PageHeader";
import { useAdmin } from "../../context/AdminContext";
import { ReasonDialog } from "./AdminProducts";

/* Farmer payouts and their failures. Retry resets a failed payout to pending;
   it deliberately does not re-issue the B2C call from here, so there is only
   one code path that can move money to a phone number. */

export default function AdminPayouts() {
  const { can } = useAdmin();
  const [rows, setRows] = useState([]);
  const [totals, setTotals] = useState({});
  const [status, setStatus] = useState("");
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
      const { data } = await API.get("/admin/payouts", { params });
      setRows(data.items || []);
      setTotals(data.totals || {});
    } catch (err) {
      flash(err?.response?.data?.message || "Could not load payouts.");
    } finally { setLoading(false); }
  }, [status]);

  useEffect(() => { load(); }, [load]);

  async function retry(row, reason) {
    setBusy(true);
    try {
      const { data } = await API.post(`/admin/payouts/${row.id}/retry`, { reason });
      flash(data.message);
      setModal(null);
      await load();
    } catch (err) {
      flash(err?.response?.data?.message || "Could not reset that payout.");
    } finally { setBusy(false); }
  }

  if (!can("payouts.view")) {
    return <p className="py-16 text-center text-sm font-bold text-slate-500">Not permitted.</p>;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Payouts"
        description="Farmer settlements. A retry clears the failure so the farmer can try again through the normal path."
      />

      {notice && (
        <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-[12px] font-bold text-emerald-800 ring-1 ring-emerald-200">
          {notice}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        {Object.entries(totals).map(([k, v]) => (
          <div key={k} className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">{k}</p>
            <p className="text-[15px] font-black text-slate-800">KES {Number(v || 0).toLocaleString()}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <select value={status} onChange={(e) => setStatus(e.target.value)}
          aria-label="Filter by payout status"
          className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
          <option value="">Any status</option>
          {["Pending", "completed", "failed", "Pending", "completed"].filter((v, i, a) => a.indexOf(v) === i).map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full min-w-[760px] text-left">
          <thead>
            <tr className="border-b border-slate-100 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              <th className="px-4 py-3">Farmer</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={6} className="px-4 py-10 text-center text-[12px] font-bold text-slate-400">Loading…</td></tr>}
            {!loading && rows.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-[12px] font-bold text-slate-400">No payouts match.</td></tr>}
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-slate-50 last:border-0">
                <td className="px-4 py-3 text-[12px] font-extrabold text-slate-800">{row.farmer_username || `#${row.farmer_id}`}</td>
                <td className="px-4 py-3 text-[12px] font-black text-slate-700">KES {Number(row.amount || 0).toLocaleString()}</td>
                <td className="px-4 py-3 font-mono text-[11px] text-slate-500">{row.mpesa_number || "—"}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider ring-1 ${
                    row.status === "completed" ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                    : row.status === "failed" ? "bg-rose-50 text-rose-700 ring-rose-200"
                    : "bg-amber-50 text-amber-700 ring-amber-200"
                  }`}>{row.status}</span>
                </td>
                <td className="px-4 py-3 text-[11px] text-slate-500">
                  {row.created_at ? new Date(row.created_at).toLocaleDateString("en-KE") : "—"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end">
                    {can("payouts.manage") && row.status === "failed" && (
                      <button onClick={() => setModal(row)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-2.5 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-white">
                        <RotateCcw className="h-3 w-3" /> Retry
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <ReasonDialog
          title={`Reset payout of KES ${Number(modal.amount || 0).toLocaleString()} for retry`}
          required busy={busy}
          onCancel={() => setModal(null)}
          onConfirm={(reason) => retry(modal, reason)}
          confirmLabel="Reset to pending"
        >
          <p className="mt-1 text-[12px] text-slate-500">
            This clears the provider conversation id so the next attempt is treated as
            new. It does not send money from this screen.
          </p>
        </ReasonDialog>
      )}
    </div>
  );
}
