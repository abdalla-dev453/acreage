import { useCallback, useEffect, useState } from "react";
import { Scale } from "lucide-react";
import API from "../../services/api";
import PageHeader from "../../components/common/PageHeader";
import { useAdmin } from "../../context/AdminContext";
import { ReasonDialog } from "./AdminProducts";

/* Dispute queue. A decision moves money, so the dialog states the amount and
   the direction before anything happens, and the reason is mandatory. */

export default function AdminDisputes() {
  const { can } = useAdmin();
  const [rows, setRows] = useState([]);
  const [counts, setCounts] = useState({});
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
      const { data } = await API.get("/admin/disputes", { params });
      setRows(data.items || []);
      setCounts(data.counts || {});
    } catch (err) {
      flash(err?.response?.data?.message || "Could not load disputes.");
    } finally { setLoading(false); }
  }, [status]);

  useEffect(() => { load(); }, [load]);

  async function resolve(row, decision, note, amount) {
    setBusy(true);
    try {
      const { data } = await API.post(`/admin/disputes/${row.id}/resolve`, {
        decision, note, ...(amount ? { resolution_amount: amount } : {}),
      });
      flash(data.message);
      setModal(null);
      await load();
    } catch (err) {
      flash(err?.response?.data?.message || "That decision was refused.");
    } finally { setBusy(false); }
  }

  if (!can("disputes.view")) {
    return <p className="py-16 text-center text-sm font-bold text-slate-500">Not permitted.</p>;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Disputes"
        description="Contested escrow. Deciding one releases or refunds real money, so every outcome is recorded with its reason."
      />

      {notice && (
        <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-[12px] font-bold text-emerald-800 ring-1 ring-emerald-200">
          {notice}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-4">
        {[["open", counts.open], ["awaiting_evidence", counts.awaiting_evidence],
          ["resolved", counts.resolved]].map(([label, value]) => (
          <button key={label}
            onClick={() => setStatus(status === label ? "" : label)}
            className={`rounded-2xl border p-4 text-left transition ${
              status === label ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white hover:border-slate-300"
            }`}>
            <p className={`text-[10px] font-extrabold uppercase tracking-wider ${status === label ? "text-white/70" : "text-slate-400"}`}>
              {label.replace("_", " ")}
            </p>
            <p className="mt-1 text-xl font-black">{value ?? 0}</p>
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {loading && <p className="rounded-2xl border border-slate-200 bg-white px-4 py-10 text-center text-[12px] font-bold text-slate-400">Loading…</p>}
        {!loading && rows.length === 0 && (
          <p className="rounded-2xl border border-slate-200 bg-white px-4 py-10 text-center text-[12px] font-bold text-slate-400">
            Nothing in this queue.
          </p>
        )}
        {rows.map((row) => (
          <article key={row.id} className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <header className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 text-[13px] font-black text-slate-800 dark:text-slate-100">
                  <Scale className="h-3.5 w-3.5 text-rose-600" aria-hidden="true" />
                  {row.reason}
                </h2>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  {row.opened_by} vs {row.against_user} ·{" "}
                  {row.order_code ? `order ${row.order_code}` : `escrow #${row.escrow_transaction_id}`}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[16px] font-black text-slate-800">
                  KES {Number(row.escrow_amount || 0).toLocaleString()}
                </p>
                <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ring-1 ${
                  row.status === "resolved" ? "bg-slate-100 text-slate-600 ring-slate-200"
                  : "bg-rose-50 text-rose-700 ring-rose-200"
                }`}>{row.status.replace("_", " ")}</span>
              </div>
            </header>

            {row.details && <p className="mt-3 text-[12px] leading-relaxed text-slate-600">{row.details}</p>}

            {row.status === "resolved" ? (
              <footer className="mt-4 rounded-xl bg-slate-50 p-3">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  Decided by {row.resolved_by} · {row.decision?.replace("_", " ")}
                </p>
                <p className="mt-1 text-[12px] text-slate-600">{row.resolution_note}</p>
              </footer>
            ) : (
              <footer className="mt-4 flex flex-wrap gap-2">
                {can("disputes.resolve") ? (
                  <>
                    <button onClick={() => setModal({ row, decision: "refund_buyer" })}
                      className="rounded-lg bg-rose-50 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-rose-700">
                      Refund buyer
                    </button>
                    <button onClick={() => setModal({ row, decision: "release_farmer" })}
                      className="rounded-lg bg-emerald-50 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-emerald-700">
                      Release to farmer
                    </button>
                    <button onClick={() => setModal({ row, decision: "split" })}
                      className="rounded-lg bg-amber-50 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-amber-700">
                      Split
                    </button>
                    <button onClick={() => setModal({ row, decision: "no_action" })}
                      className="rounded-lg bg-slate-100 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-600">
                      Close, no action
                    </button>
                  </>
                ) : (
                  <p className="text-[11px] font-bold text-slate-400">
                    Your role can review this but not decide it.
                  </p>
                )}
              </footer>
            )}
          </article>
        ))}
      </div>

      {modal && (
        <SplitDialog
          modal={modal} busy={busy}
          onCancel={() => setModal(null)}
          onConfirm={(note, amount) => resolve(modal.row, modal.decision, note, amount)}
        />
      )}
    </div>
  );
}

function SplitDialog({ modal, busy, onCancel, onConfirm }) {
  const [note, setNote] = useState("");
  const [amount, setAmount] = useState("");
  const isSplit = modal.decision === "split";
  const labels = {
    refund_buyer: ["Refund the buyer in full", `KES ${Number(modal.row.escrow_amount || 0).toLocaleString()} returns to ${modal.row.opened_by}`],
    release_farmer: ["Release the funds to the farmer", `KES ${Number(modal.row.escrow_amount || 0).toLocaleString()} goes to ${modal.row.against_user}`],
    split: ["Split the escrow", "Enter the gross amount released to the farmer. Commission is deducted automatically."],
    no_action: ["Close without moving money", "The dispute closes and the escrow stays where it is."],
  }[modal.decision];

  return (
    <ReasonDialog
      title={labels[0]}
      required busy={busy}
      onCancel={onCancel}
      onConfirm={() => onConfirm(note, isSplit ? parseFloat(amount) : null)}
      confirmLabel="Record decision"
    >
      <p className="mt-1 text-[12px] text-slate-500">{labels[1]}</p>
      {isSplit && (
        <input
          type="number" min="0" max={modal.row.escrow_amount} step="0.01" required
          value={amount} onChange={(e) => setAmount(e.target.value)}
          placeholder={`0 – ${modal.row.escrow_amount}`} aria-label="Gross amount to farmer"
          className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-[13px] outline-none focus:border-emerald-400"
        />
      )}
    </ReasonDialog>
  );
}
