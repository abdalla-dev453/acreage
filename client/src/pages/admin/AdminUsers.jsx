import { useCallback, useEffect, useState } from "react";
import { Ban, RotateCcw, Search, ShieldCheck, Trash2, UserCog } from "lucide-react";
import API from "../../services/api";
import PageHeader from "../../components/common/PageHeader";
import { useAdmin } from "../../context/AdminContext";

/* User management: browse, freeze, restore, change role, sign out, delete.
   Every button is permission-gated from the server-supplied grant set, so the
   UI cannot offer an action the API would refuse. */

const STATUS_STYLES = {
  active: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  frozen: "bg-sky-50 text-sky-700 ring-sky-200",
  suspended: "bg-rose-50 text-rose-700 ring-rose-200",
};

function Pill({ children, className = "" }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider ring-1 ${className}`}
    >
      {children}
    </span>
  );
}

export default function AdminUsers() {
  const { can } = useAdmin();
  const [rows, setRows] = useState([]);
  const [pageInfo, setPageInfo] = useState({ total: 0, page: 1, pages: 1, has_next: false });
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [notice, setNotice] = useState(null);
  const [reason, setReason] = useState("");

  const flash = useCallback((message) => {
    setNotice(message);
    window.setTimeout(() => setNotice(null), 4000);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, per_page: 25 };
      if (query.trim()) params.q = query.trim();
      if (roleFilter) params.role = roleFilter;
      if (statusFilter) params.status = statusFilter;
      const { data } = await API.get("/admin/users", { params });
      setRows(data.items || []);
      setPageInfo(data);
    } catch (err) {
      flash(err?.response?.data?.message || "Could not load users.");
    } finally {
      setLoading(false);
    }
  }, [page, query, roleFilter, statusFilter, flash]);

  useEffect(() => {
    const handle = window.setTimeout(load, 300);
    return () => window.clearTimeout(handle);
  }, [load]);

  async function act(row, fn, success) {
    setBusy(`${row.id}`);
    try {
      await fn();
      flash(success);
      setReason("");
      await load();
    } catch (err) {
      const body = err?.response?.data;
      const blockers = body?.blockers;
      flash(
        blockers
          ? `${body.message} Blocked by: ${Object.entries(blockers)
              .map(([k, v]) => `${k.replace(/_/g, " ")} (${v})`)
              .join(", ")}`
          : body?.message || "That action failed."
      );
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Users"
        description="Every account on the platform. Actions here are recorded in the audit log."
      />

      {notice && (
        <p
          role="status"
          className="rounded-xl bg-emerald-50 px-4 py-3 text-[12px] font-bold text-emerald-800 ring-1 ring-emerald-200"
        >
          {notice}
        </p>
      )}

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 lg:flex-row lg:items-center dark:border-slate-800 dark:bg-slate-900">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search username, email, phone or location…"
            aria-label="Search users"
            className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-[13px] outline-none focus:border-emerald-400"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          aria-label="Filter by role"
          className="rounded-xl border border-slate-200 px-3 py-2.5 text-[11px] font-extrabold uppercase tracking-wider text-slate-600"
        >
          <option value="">All roles</option>
          <option value="farmer">Farmers</option>
          <option value="buyer">Buyers</option>
          <option value="admin">Admins</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="Filter by status"
          className="rounded-xl border border-slate-200 px-3 py-2.5 text-[11px] font-extrabold uppercase tracking-wider text-slate-600"
        >
          <option value="">Any status</option>
          <option value="active">Active</option>
          <option value="frozen">Frozen</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      {can("users.suspend") && (
        <label className="flex items-center gap-2 text-[11px] font-bold text-slate-500">
          Default freeze reason
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Recorded in the audit log"
            className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-[12px] font-medium outline-none focus:border-emerald-400"
          />
        </label>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Joined</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-[12px] font-bold text-slate-400">Loading…</td></tr>
              )}
              {!loading && rows.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-[12px] font-bold text-slate-400">No users match.</td></tr>
              )}
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-900 text-[10px] font-black text-white">
                        {(row.username || "?").slice(0, 2).toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <p className="flex items-center gap-1.5 truncate text-[13px] font-extrabold text-slate-800 dark:text-slate-100">
                          {row.username}
                          {row.is_superadmin && <ShieldCheck className="h-3 w-3 text-violet-500" aria-label="Super admin" />}
                          {row.is_self && <span className="rounded bg-slate-200 px-1.5 text-[9px] font-black uppercase text-slate-600">you</span>}
                        </p>
                        <p className="truncate text-[11px] text-slate-500">{row.email}{row.location ? ` · ${row.location}` : ""}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3"><Pill className="bg-slate-100 text-slate-600 ring-slate-200">{row.role}</Pill></td>
                  <td className="px-4 py-3">
                    <Pill className={STATUS_STYLES[row.account_status] || STATUS_STYLES.active}>{row.account_status}</Pill>
                  </td>
                  <td className="px-4 py-3 text-[11px] font-semibold text-slate-500">
                    {row.created_at ? new Date(row.created_at).toLocaleDateString("en-KE") : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1.5">
                      {row.account_status === "active" ? (
                        <ActionButton
                          show={can("users.suspend") && !row.is_superadmin && !row.is_self}
                          onClick={() => act(row, () => API.patch(`/admin/users/${row.id}/status`, {
                            account_status: "frozen", reason: reason.trim() || "No reason given",
                          }), `${row.username} frozen and signed out everywhere.`)}
                          label="Freeze"
                          className="bg-sky-50 text-sky-700"
                        />
                      ) : (
                        <ActionButton
                          show={can("users.suspend") && !row.is_superadmin}
                          onClick={() => act(row, () => API.patch(`/admin/users/${row.id}/status`, {
                            account_status: "active",
                          }), `${row.username} can sign in again.`)}
                          label="Restore"
                          className="bg-emerald-50 text-emerald-700"
                        />
                      )}
                      <ActionButton
                        show={can("users.revoke_sessions") && !row.is_superadmin && !row.is_self}
                        onClick={() => act(row, () => API.post(`/admin/users/${row.id}/revoke-sessions`),
                          `${row.username} signed out everywhere.`)}
                        label="Sign out"
                        className="bg-slate-100 text-slate-600"
                      >
                        <UserCog className="h-3.5 w-3.5" />
                      </ActionButton>
                      <ActionButton
                        show={can("users.delete") && !row.is_superadmin && !row.is_self}
                        onClick={() => act(row, () => API.delete(`/admin/users/${row.id}`),
                          `${row.username} deleted.`)}
                        label="Delete"
                        className="bg-rose-50 text-rose-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </ActionButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
          <p className="text-[11px] font-bold text-slate-500">
            Page {pageInfo.page} of {pageInfo.pages} · {pageInfo.total} users
          </p>
          <div className="flex gap-2">
            <button onClick={() => setPage((v) => Math.max(1, v - 1))} disabled={pageInfo.page <= 1}
              className="rounded-lg px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-600 hover:bg-slate-100 disabled:opacity-40">Previous</button>
            <button onClick={() => setPage((v) => v + 1)} disabled={!pageInfo.has_next}
              className="rounded-lg px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-600 hover:bg-slate-100 disabled:opacity-40">Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ActionButton({ show, onClick, label, className, children }) {
  if (!show) return null;
  return (
    <button onClick={onClick} title={label}
      className={`rounded-lg px-2.5 py-1.5 text-[10px] font-extrabold uppercase tracking-wider hover:brightness-95 ${className}`}>
      {children ?? label}
    </button>
  );
}
