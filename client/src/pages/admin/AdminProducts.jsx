import { useCallback, useEffect, useState } from "react";
import { Eye, Flag, Package, Search, Star, Trash2 } from "lucide-react";
import API from "../../services/api";
import PageHeader from "../../components/common/PageHeader";
import { useAdmin } from "../../context/AdminContext";

/* Listing moderation: approve, reject, flag, feature, edit and bulk-moderate.
   Rejecting or flagging requires a note, because the note is what the farmer
   sees when they ask why. */

const STATES = ["pending", "approved", "rejected", "flagged"];

const STATE_STYLES = {
  approved: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  pending: "bg-amber-50 text-amber-700 ring-amber-200",
  rejected: "bg-rose-50 text-rose-700 ring-rose-200",
  flagged: "bg-violet-50 text-violet-700 ring-violet-200",
  draft: "bg-slate-100 text-slate-600 ring-slate-200",
};

export default function AdminProducts() {
  const { can } = useAdmin();
  const [rows, setRows] = useState([]);
  const [pageInfo, setPageInfo] = useState({ total: 0, page: 1, pages: 1, has_next: false });
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [state, setState] = useState("");
  const [selected, setSelected] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const [categories, setCategories] = useState([]);
  const [modal, setModal] = useState(null);

  const flash = (m) => { setNotice(m); window.setTimeout(() => setNotice(null), 4500); };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, per_page: 25 };
      if (query.trim()) params.q = query.trim();
      if (state) params.moderation_status = state;
      const { data } = await API.get("/admin/products", { params });
      setRows(data.items || []);
      setPageInfo(data);
    } catch (err) {
      flash(err?.response?.data?.message || "Could not load listings.");
    } finally { setLoading(false); }
  }, [page, query, state]);

  useEffect(() => {
    const h = window.setTimeout(load, 300);
    return () => window.clearTimeout(h);
  }, [load]);

  const loadCategories = useCallback(async () => {
    if (!can("products.categorise")) return;
    try {
      const { data } = await API.get("/admin/categories");
      setCategories(data.items || []);
    } catch { /* the moderation table does not depend on categories */ }
  }, [can]);

  useEffect(() => { loadCategories(); }, [loadCategories]);

  async function moderate(row, nextState, note) {
    setBusy(true);
    try {
      await API.patch(`/admin/products/${row.id}`, {
        moderation_status: nextState,
        ...(note ? { moderation_note: note } : {}),
      });
      flash(`${row.title} → ${nextState}.`);
      setModal(null);
      await load();
    } catch (err) {
      flash(err?.response?.data?.message || "That did not work.");
    } finally { setBusy(false); }
  }

  async function feature(row) {
    setBusy(true);
    try {
      await API.patch(`/admin/products/${row.id}`, { is_featured: !row.is_featured });
      await load();
    } catch (err) { flash(err?.response?.data?.message || "Could not change featured."); }
    finally { setBusy(false); }
  }

  async function remove(row) {
    setBusy(true);
    try {
      const { data } = await API.delete(`/admin/products/${row.id}`);
      flash(data.message);
      await load();
    } catch (err) { flash(err?.response?.data?.message || "Could not remove."); }
    finally { setBusy(false); }
  }

  async function bulk(nextState, note) {
    setBusy(true);
    try {
      const { data } = await API.post("/admin/products/bulk", {
        ids: [...selected], moderation_status: nextState,
        ...(note ? { moderation_note: note } : {}),
      });
      flash(data.message);
      setSelected(new Set());
      setModal(null);
      await load();
    } catch (err) {
      flash(err?.response?.data?.message || "Bulk action failed.");
    } finally { setBusy(false); }
  }

  const toggle = (id) => setSelected((prev) => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const allShownSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));

  if (!can("products.view")) {
    return <p className="py-16 text-center text-sm font-bold text-slate-500">Not permitted.</p>;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Listings"
        description="Every listing, including hidden and flagged ones. Flagging withdraws a live listing without the farmer being able to re-hide it."
        actions={can("products.categorise") ? (
          <span className="text-[11px] font-bold text-slate-500">
            {categories.length} categor{categories.length === 1 ? "y" : "ies"}
          </span>
        ) : null}
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
            placeholder="Search title or category…" aria-label="Search listings"
            className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-[13px] outline-none focus:border-emerald-400" />
        </div>
        <select value={state} onChange={(e) => { setState(e.target.value); setPage(1); }}
          aria-label="Filter by moderation state"
          className="rounded-xl border border-slate-200 px-3 py-2.5 text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
          <option value="">Any state</option>
          {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {can("products.moderate") && selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <span className="text-[12px] font-extrabold text-emerald-900">
            {selected.size} selected
          </span>
          {STATES.filter((s) => s !== "approved").map((s) => (
            <button key={s} disabled={busy} onClick={() => setModal({ kind: "bulk", next: s })}
              className="rounded-lg bg-white px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 ring-1 ring-emerald-300 hover:bg-emerald-100">
              Mark {s}
            </button>
          ))}
          <button disabled={busy} onClick={() => bulk("approved")}
            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-white">
            Approve
          </button>
          <button onClick={() => setSelected(new Set())}
            className="ml-auto text-[10px] font-extrabold uppercase tracking-wider text-emerald-700">
            Clear
          </button>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                {can("products.moderate") && (
                  <th className="w-10 px-4 py-3">
                    <input type="checkbox" aria-label="Select all shown"
                      checked={allShownSelected}
                      onChange={() => setSelected(allShownSelected ? new Set() : new Set(rows.map((r) => r.id)))} />
                  </th>
                )}
                <th className="px-4 py-3">Listing</th>
                <th className="px-4 py-3">Farmer</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Stock</th>
                <th className="px-4 py-3">State</th>
                <th className="px-4 py-3">Signals</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={8} className="px-4 py-10 text-center text-[12px] font-bold text-slate-400">Loading…</td></tr>}
              {!loading && rows.length === 0 && <tr><td colSpan={8} className="px-4 py-10 text-center text-[12px] font-bold text-slate-400">No listings match.</td></tr>}
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                  {can("products.moderate") && (
                    <td className="px-4 py-3">
                      <input type="checkbox" checked={selected.has(row.id)}
                        onChange={() => toggle(row.id)}
                        aria-label={`Select ${row.title}`} />
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <p className="text-[13px] font-extrabold text-slate-800 dark:text-slate-100">{row.title}</p>
                    <p className="text-[11px] text-slate-500">
                      {row.category}{row.is_featured ? " · featured" : ""}
                    </p>
                    {row.moderation_note && (
                      <p className="mt-0.5 max-w-[220px] truncate text-[10px] italic text-slate-400"
                        title={row.moderation_note}>{row.moderation_note}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[12px] font-bold text-slate-600">{row.farmer_username || "—"}</td>
                  <td className="px-4 py-3 text-[12px] font-bold text-slate-700">{row.price_per_unit}/{row.unit}</td>
                  <td className="px-4 py-3 text-[12px] text-slate-600">
                    {row.stock_quantity}
                    {row.reserved_quantity > 0 && (
                      <span className="ml-1 text-[10px] text-slate-400">({row.reserved_quantity} held)</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider ring-1 ${STATE_STYLES[row.moderation_status] || STATE_STYLES.draft}`}>
                      {row.moderation_status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[10px] font-bold text-slate-400">
                    {row.report_count > 0 && <span className="text-rose-600">{row.report_count} reports</span>}
                    <span className="ml-2">{row.view_count} views</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1.5">
                      {can("products.moderate") && row.moderation_status !== "approved" && (
                        <button disabled={busy} onClick={() => moderate(row, "approved")}
                          className="rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-emerald-700">Approve</button>
                      )}
                      {can("products.moderate") && !["flagged", "rejected"].includes(row.moderation_status) && (
                        <button disabled={busy} onClick={() => setModal({ kind: "row", row, next: "flagged" })}
                          className="inline-flex items-center gap-1 rounded-lg bg-violet-50 px-2.5 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-violet-700">
                          <Flag className="h-3 w-3" /> Flag
                        </button>
                      )}
                      {can("products.moderate") && (
                        <button disabled={busy} onClick={() => feature(row)}
                          className={`rounded-lg px-2 py-1.5 ${row.is_featured ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-500"}`}
                          title={row.is_featured ? "Remove from featured" : "Feature this listing"}>
                          <Star className="h-3.5 w-3.5" fill={row.is_featured ? "currentColor" : "none"} />
                        </button>
                      )}
                      {can("products.moderate") && (
                        <button disabled={busy} onClick={() => remove(row)}
                          className="rounded-lg p-1.5 text-slate-300 hover:bg-rose-50 hover:text-rose-600"
                          aria-label={`Remove ${row.title}`}>
                          <Trash2 className="h-3.5 w-3.5" />
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
          <p className="text-[11px] font-bold text-slate-500">Page {pageInfo.page} of {pageInfo.pages} · {pageInfo.total} listings</p>
          <div className="flex gap-2">
            <button disabled={pageInfo.page <= 1} onClick={() => setPage((v) => Math.max(1, v - 1))}
              className="rounded-lg px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-600 hover:bg-slate-100 disabled:opacity-40">Previous</button>
            <button disabled={!pageInfo.has_next} onClick={() => setPage((v) => v + 1)}
              className="rounded-lg px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-600 hover:bg-slate-100 disabled:opacity-40">Next</button>
          </div>
        </div>
      </div>

      {modal && (
        <ReasonDialog
          title={modal.kind === "bulk"
            ? `Mark ${selected.size} listing(s) as ${modal.next}`
            : `${modal.next === "flagged" ? "Flag" : "Reject"} "${modal.row.title}"`}
          required
          busy={busy}
          onCancel={() => setModal(null)}
          onConfirm={(note) => modal.kind === "bulk"
            ? bulk(modal.next, note)
            : moderate(modal.row, modal.next, note)}
        />
      )}
    </div>
  );
}

export function ReasonDialog({ title, busy, onCancel, onConfirm, required, children, confirmLabel = "Confirm" }) {
  const [note, setNote] = useState("");
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
      role="dialog" aria-modal="true" onClick={onCancel}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-base font-black text-slate-900">{title}</h2>
        {children}
        <label className="mt-3 block">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
            Note {required ? "(required — the farmer sees this)" : "(optional)"}
          </span>
          <textarea value={note} onChange={(e) => setNote(e.target.value)}
            rows={3}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-emerald-400" />
        </label>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onCancel}
            className="rounded-xl px-4 py-2.5 text-[11px] font-extrabold uppercase tracking-wider text-slate-600 hover:bg-slate-100">Cancel</button>
          <button onClick={() => onConfirm(note)} disabled={busy || (required && !note.trim())}
            className="rounded-xl bg-slate-900 px-4 py-2.5 text-[11px] font-extrabold uppercase tracking-wider text-white disabled:opacity-40">
            {busy ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
