import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  Ban,
  CheckCircle2,
  ChevronLeft,
  Lock,
  Search,
  Shield,
  ShieldCheck,
  Trash2,
  UserCog,
  Users,
  X,
} from "lucide-react";
import API from "../services/api";
import SEO from "../components/common/SEO";
import PageHeader from "../components/common/PageHeader";
import { AuthContext } from "../context/AuthContext";

/* ── presentation helpers ─────────────────────────────────────────────── */

const STATUS_STYLES = {
  active: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  frozen: "bg-sky-50 text-sky-700 ring-sky-200",
  suspended: "bg-rose-50 text-rose-700 ring-rose-200",
};

const ROLE_STYLES = {
  farmer: "bg-lime-50 text-lime-700 ring-lime-200",
  buyer: "bg-amber-50 text-amber-700 ring-amber-200",
  admin: "bg-violet-50 text-violet-700 ring-violet-200",
};

function StatusPill({ status }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider ring-1 ${
        STATUS_STYLES[status] || STATUS_STYLES.active
      }`}
    >
      {status}
    </span>
  );
}

function RolePill({ role }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider ring-1 ${
        ROLE_STYLES[role] || "bg-slate-50 text-slate-600 ring-slate-200"
      }`}
    >
      {role}
    </span>
  );
}

function StatCard({ label, value, tone = "slate", icon: Icon }) {
  const tones = {
    slate: "text-slate-900",
    emerald: "text-emerald-600",
    sky: "text-sky-600",
    rose: "text-rose-600",
  };
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
          {label}
        </p>
        <Icon className="h-3.5 w-3.5 text-slate-300" aria-hidden="true" />
      </div>
      <p className={`mt-2 text-2xl font-black ${tones[tone]}`}>{value}</p>
    </article>
  );
}

function ConfirmDialog({ open, title, body, confirmLabel, danger, onConfirm, onCancel, busy }) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="text-base font-black text-slate-900">{title}</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-slate-600">{body}</p>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl px-4 py-2.5 text-[11px] font-extrabold uppercase tracking-wider text-slate-600 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={`rounded-xl px-4 py-2.5 text-[11px] font-extrabold uppercase tracking-wider text-white disabled:opacity-60 ${
              danger ? "bg-rose-600 hover:bg-rose-700" : "bg-slate-900 hover:bg-slate-800"
            }`}
          >
            {busy ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── main page ────────────────────────────────────────────────────────── */

const TABS = [
  { id: "users", label: "Users", icon: Users },
  { id: "activity", label: "Activity", icon: Activity },
  { id: "audit", label: "Audit log", icon: Shield },
  { id: "sessions", label: "Admin sign-ins", icon: Lock },
];

export default function AdminDashboard() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const [tab, setTab] = useState("users");
  const [stats, setStats] = useState(null);
  const [rows, setRows] = useState([]);
  const [pageInfo, setPageInfo] = useState({ total: 0, page: 1, pages: 1 });
  const [activity, setActivity] = useState({});
  const [audit, setAudit] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);

  const [pending, setPending] = useState(null);
  const [dialog, setDialog] = useState(null);
  const [reason, setReason] = useState("");

  const isSuperadmin = Boolean(user?.is_superadmin);

  const flash = useCallback((message, kind = "success") => {
    setNotice({ message, kind });
    window.setTimeout(() => setNotice(null), 4500);
  }, []);

  const fail = useCallback((err, fallback) => {
    setError(err?.response?.data?.message || fallback || "Something went wrong.");
  }, []);

  // A non-superadmin who reaches this URL must not sit on a dead page.
  useEffect(() => {
    if (user && !isSuperadmin) navigate("/dashboard", { replace: true });
  }, [user, isSuperadmin, navigate]);

  const loadStats = useCallback(async () => {
    try {
      const { data } = await API.get("/admin/stats");
      setStats(data);
    } catch (err) {
      if (err?.response?.status === 403) navigate("/dashboard", { replace: true });
    }
  }, [navigate]);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, per_page: 25 };
      if (query.trim()) params.q = query.trim();
      if (roleFilter) params.role = roleFilter;
      if (statusFilter) params.status = statusFilter;
      const { data } = await API.get("/admin/users", { params });
      setRows(data.items || []);
      setPageInfo({ total: data.total, page: data.page, pages: data.pages });
      setError(null);
    } catch (err) {
      fail(err, "Could not load users.");
    } finally {
      setLoading(false);
    }
  }, [page, query, roleFilter, statusFilter, fail]);

  const loadActivity = useCallback(async () => {
    try {
      const { data } = await API.get("/admin/activity", { params: { days: 7 } });
      setActivity(data || {});
    } catch (err) {
      fail(err, "Could not load activity.");
    }
  }, [fail]);

  const loadAudit = useCallback(async () => {
    try {
      const { data } = await API.get("/admin/audit", { params: { per_page: 50 } });
      setAudit(data.items || []);
    } catch (err) {
      fail(err, "Could not load the audit log.");
    }
  }, [fail]);

  const loadSessions = useCallback(async () => {
    try {
      const { data } = await API.get("/admin/admin-sessions");
      setSessions(data.items || []);
    } catch (err) {
      fail(err, "Could not load sign-in history.");
    }
  }, [fail]);

  useEffect(() => {
    if (!isSuperadmin) return;
    loadStats();
  }, [isSuperadmin, loadStats]);

  useEffect(() => {
    if (!isSuperadmin) return;
    if (tab === "users") loadUsers();
    if (tab === "activity") loadActivity();
    if (tab === "audit") loadAudit();
    if (tab === "sessions") loadSessions();
  }, [tab, isSuperadmin, loadUsers, loadActivity, loadAudit, loadSessions]);

  // Debounce so typing does not fire a request per keystroke.
  useEffect(() => {
    const handle = window.setTimeout(() => setPage(1), 350);
    return () => window.clearTimeout(handle);
  }, [query, roleFilter, statusFilter]);

  const stats_view = useMemo(() => {
    if (!stats) return null;
    const c = stats.counts;
    return [
      { label: "Total users", value: c.users, tone: "slate", icon: Users },
      { label: "Active", value: c.active_users, tone: "emerald", icon: CheckCircle2 },
      { label: "Frozen", value: c.frozen_users, tone: "sky", icon: Ban },
      { label: "Farms", value: c.farms, tone: "slate", icon: Users },
      { label: "Buyers", value: c.buyers, tone: "slate", icon: Users },
      { label: "Products", value: c.products, tone: "slate", icon: Activity },
      { label: "Orders", value: c.orders, tone: "slate", icon: Activity },
      { label: "Escrow held", value: `KES ${stats.escrow_held_value?.toLocaleString()}`, tone: "emerald", icon: ShieldCheck },
    ];
  }, [stats]);

  async function act(fn, successMessage) {
    if (!pending) return;
    setPending(`${pending}:busy`);
    try {
      await fn();
      flash(successMessage);
      setDialog(null);
      setReason("");
      await Promise.all([loadUsers(), loadStats()]);
      if (tab === "audit") await loadAudit();
    } catch (err) {
      const message = err?.response?.data?.message;
      const blockers = err?.response?.data?.blockers;
      fail(
        err,
        blockers
          ? `${message} Blocked by: ${Object.entries(blockers).map(([k, v]) => `${k.replace(/_/g, " ")} (${v})`).join(", ")}`
          : undefined,
      );
    } finally {
      setPending(null);
    }
  }

  const freeze = (row) =>
    act(
      () =>
        API.patch(`/admin/users/${row.id}/status`, {
          account_status: "frozen",
          reason: reason.trim() || "No reason given",
        }),
      `${row.username} has been frozen and signed out everywhere.`,
    );


  const unfreeze = (row) =>
    act(
      () => API.patch(`/admin/users/${row.id}/status`, { account_status: "active" }),
      `${row.username} can sign in again.`,
    );

  const revoke = (row) =>
    act(
      () => API.post(`/admin/users/${row.id}/revoke-sessions`),
      `${row.username} has been signed out everywhere.`,
    );

  const changeRole = (row, role) =>
    act(
      () => API.patch(`/admin/users/${row.id}/role`, { role }),
      `${row.username} is now a ${role}.`,
    );

  const remove = (row) =>
    act(() => API.delete(`/admin/users/${row.id}`), `${row.username} has been deleted.`);

  if (!isSuperadmin) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm font-bold text-slate-500">Checking permissions…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full pb-12">
      <SEO
        title="Platform Administration | Acreage"
        description="Superadmin control panel for managing users, accounts and platform activity."
      />

      <PageHeader
        title="Platform Administration"
        description={`Signed in as ${user.username}. Every action below is recorded in the audit log.`}
        actions={
          <span className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3.5 py-2.5 text-[10px] font-extrabold uppercase tracking-wider text-white">
            <Shield className="h-3.5 w-3.5" aria-hidden="true" />
            Superadmin
          </span>
        }
      />

      {notice && (
        <div
          role="status"
          className={`flex items-center gap-2 rounded-xl px-4 py-3 text-[12px] font-bold ${
            notice.kind === "success"
              ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200"
              : "bg-rose-50 text-rose-800 ring-1 ring-rose-200"
          }`}
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          {notice.message}
        </div>
      )}
      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl bg-rose-50 px-4 py-3 text-[12px] font-bold text-rose-800 ring-1 ring-rose-200"
        >
          <AlertTriangle className="mt-px h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="flex-1">{error}</span>
          <button type="button" onClick={() => setError(null)} aria-label="Dismiss">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {stats_view && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats_view.map((card) => (
            <StatCard key={card.label} {...card} />
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-1 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-[11px] font-extrabold uppercase tracking-wider transition-colors ${
              tab === id
                ? "bg-slate-900 text-white"
                : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            }`}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>

      {tab === "users" && (
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search username, email, phone or location…"
                aria-label="Search users"
                className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-[13px] font-medium outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={roleFilter}
                onChange={(event) => setRoleFilter(event.target.value)}
                aria-label="Filter by role"
                className="rounded-xl border border-slate-200 px-3 py-2.5 text-[11px] font-extrabold uppercase tracking-wider text-slate-600 outline-none focus:border-emerald-400"
              >
                <option value="">All roles</option>
                <option value="farmer">Farmers</option>
                <option value="buyer">Buyers</option>
                <option value="admin">Admins</option>
              </select>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                aria-label="Filter by status"
                className="rounded-xl border border-slate-200 px-3 py-2.5 text-[11px] font-extrabold uppercase tracking-wider text-slate-600 outline-none focus:border-emerald-400"
              >
                <option value="">Any status</option>
                <option value="active">Active</option>
                <option value="frozen">Frozen</option>
                <option value="suspended">Suspended</option>
                <option value="unverified">Email unverified</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left">
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
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-[12px] font-bold text-slate-400">
                      Loading users…
                    </td>
                  </tr>
                )}
                {!loading && rows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-[12px] font-bold text-slate-400">
                      No users match those filters.
                    </td>
                  </tr>
                )}
                {rows.map((row) => {
                  const locked = row.is_superadmin || row.is_self;
                  return (
                    <tr key={row.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-900 text-[10px] font-black text-white">
                            {(row.username || "?").slice(0, 2).toUpperCase()}
                          </span>
                          <div className="min-w-0">
                            <p className="flex items-center gap-1.5 truncate text-[13px] font-extrabold text-slate-800">
                              {row.username}
                              {row.is_superadmin && (
                                <Shield className="h-3 w-3 text-violet-500" aria-label="Superadmin" />
                              )}
                              {row.is_self && (
                                <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[9px] font-black uppercase text-slate-600">
                                  you
                                </span>
                              )}
                            </p>
                            <p className="truncate text-[11px] font-medium text-slate-500">
                              {row.email}
                              {row.location ? ` · ${row.location}` : ""}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3"><RolePill role={row.role} /></td>
                      <td className="px-4 py-3">
                        <StatusPill status={row.account_status} />
                        {!row.email_verified && (
                          <p className="mt-1 text-[10px] font-bold text-amber-600">email unverified</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-[11px] font-semibold text-slate-500">
                        {row.created_at ? new Date(row.created_at).toLocaleDateString("en-KE") : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1.5">
                          {row.account_status === "active" ? (
                            <>
                              <button
                                type="button"
                                disabled={locked || pending === `${row.id}:busy`}
                                onClick={() => {
                                  setPending(row.id);
                                  setReason("");
                                  setDialog({
                                    kind: "freeze",
                                    row,
                                    title: `Freeze ${row.username}?`,
                                    body: "They are signed out of every device immediately and cannot sign back in. Their data is preserved.",
                                    confirmLabel: "Freeze account",
                                    danger: true,
                                    onConfirm: freeze,
                                  });
                                }}
                                className="rounded-lg bg-sky-50 px-2.5 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-sky-700 hover:bg-sky-100 disabled:opacity-40"
                              >
                                Freeze
                              </button>
                              <button
                                type="button"
                                disabled={locked || pending === `${row.id}:busy`}
                                onClick={() => changeRole(row, row.role === "farmer" ? "buyer" : "farmer")}
                                className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-600 hover:bg-slate-200 disabled:opacity-40"
                              >
                                Make {row.role === "farmer" ? "buyer" : "farmer"}
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              disabled={locked || pending === `${row.id}:busy`}
                              onClick={() => unfreeze(row)}
                              className="rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 hover:bg-emerald-100 disabled:opacity-40"
                            >
                              Restore
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={locked || pending === `${row.id}:busy`}
                            onClick={() => revoke(row)}
                            title="End all sessions"
                            aria-label={`Sign out ${row.username} everywhere`}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40"
                          >
                            <UserCog className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={locked || pending === `${row.id}:busy`}
                            onClick={() => {
                              setPending(row.id);
                              setDialog({
                                kind: "delete",
                                row,
                                title: `Delete ${row.username}?`,
                                body: "This permanently removes the account. It is refused while the account has orders or escrow history, so the financial ledger is never orphaned.",
                                confirmLabel: "Delete permanently",
                                danger: true,
                                onConfirm: remove,
                              });
                            }}
                            aria-label={`Delete ${row.username}`}
                            className="rounded-lg p-1.5 text-slate-300 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
            <p className="text-[11px] font-bold text-slate-500">
              Page {pageInfo.page} of {pageInfo.pages} · {pageInfo.total} users
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={pageInfo.page <= 1}
                onClick={() => setPage((value) => value - 1)}
                className="rounded-lg px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-600 hover:bg-slate-100 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={!pageInfo.has_next}
                onClick={() => setPage((value) => value + 1)}
                className="rounded-lg px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-600 hover:bg-slate-100 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </section>
      )}

      {tab === "activity" && (
        <div className="grid gap-4 lg:grid-cols-3">
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <header className="border-b border-slate-100 px-4 py-3">
              <h2 className="text-[13px] font-black text-slate-800">New accounts</h2>
              <p className="mt-0.5 text-[11px] font-medium text-slate-500">Last {activity.window_days ?? 7} days</p>
            </header>
            <ul className="divide-y divide-slate-50">
              {(activity.new_users || []).length === 0 && (
                <li className="px-4 py-8 text-center text-[12px] font-bold text-slate-400">No sign-ups in this window.</li>
              )}
              {(activity.new_users || []).map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-[12px] font-extrabold text-slate-800">{item.username}</p>
                    <p className="text-[10px] font-semibold text-slate-400">
                      {item.created_at ? new Date(item.created_at).toLocaleDateString("en-KE") : "—"}
                    </p>
                  </div>
                  <RolePill role={item.role} />
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <header className="border-b border-slate-100 px-4 py-3">
              <h2 className="text-[13px] font-black text-slate-800">Recent orders</h2>
              <p className="mt-0.5 text-[11px] font-medium text-slate-500">Latest trading on the platform</p>
            </header>
            <ul className="divide-y divide-slate-50">
              {(activity.orders || []).length === 0 && (
                <li className="px-4 py-8 text-center text-[12px] font-bold text-slate-400">No orders in this window.</li>
              )}
              {(activity.orders || []).map((order) => (
                <li key={order.id} className="px-4 py-2.5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-[12px] font-extrabold text-slate-800">
                      {order.order_code}
                      <span className="ml-2 font-semibold text-slate-500">
                        {order.buyer} → {order.farmer}
                      </span>
                    </p>
                    <span className="shrink-0 text-[12px] font-black text-slate-700">
                      KES {Number(order.total_amount || 0).toLocaleString()}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[10px] font-semibold text-slate-400">
                    {order.status} · {order.payment_status} ·{" "}
                    {order.created_at ? new Date(order.created_at).toLocaleString("en-KE") : "—"}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <header className="border-b border-slate-100 px-4 py-3">
              <h2 className="text-[13px] font-black text-slate-800">Latest reviews</h2>
              <p className="mt-0.5 text-[11px] font-medium text-slate-500">Reputation signals</p>
            </header>
            <ul className="divide-y divide-slate-50">
              {(activity.reviews || []).length === 0 && (
                <li className="px-4 py-8 text-center text-[12px] font-bold text-slate-400">No reviews yet.</li>
              )}
              {(activity.reviews || []).map((review) => (
                <li key={review.id} className="px-4 py-2.5">
                  <p className="text-[12px] font-extrabold text-amber-600">
                    {"★".repeat(Math.max(1, Math.min(5, review.rating || 0)))}
                  </p>
                  {review.comment && (
                    <p className="mt-0.5 line-clamp-2 text-[11px] font-medium text-slate-600">{review.comment}</p>
                  )}
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}

      {tab === "audit" && (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <header className="border-b border-slate-100 px-4 py-3">
            <h2 className="text-[13px] font-black text-slate-800">Administrative action log</h2>
            <p className="mt-0.5 text-[11px] font-medium text-slate-500">
              Append-only record of every freeze, restore, role change and deletion.
            </p>
          </header>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  <th className="px-4 py-3">When</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Admin</th>
                  <th className="px-4 py-3">Target</th>
                  <th className="px-4 py-3">Detail</th>
                </tr>
              </thead>
              <tbody>
                {audit.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-[12px] font-bold text-slate-400">
                      No administrative actions recorded yet.
                    </td>
                  </tr>
                )}
                {audit.map((entry) => (
                  <tr key={entry.id} className="border-b border-slate-50 last:border-0">
                    <td className="whitespace-nowrap px-4 py-3 text-[11px] font-semibold text-slate-500">
                      {entry.created_at ? new Date(entry.created_at).toLocaleString("en-KE") : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <code className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-700">
                        {entry.action}
                      </code>
                    </td>
                    <td className="px-4 py-3 text-[12px] font-bold text-slate-700">{entry.actor_username}</td>
                    <td className="px-4 py-3 text-[12px] font-bold text-slate-700">
                      {entry.target_username || "—"}
                    </td>
                    <td className="max-w-[280px] truncate px-4 py-3 text-[11px] font-medium text-slate-500">
                      {JSON.stringify(entry.detail)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === "sessions" && (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <header className="border-b border-slate-100 px-4 py-3">
            <h2 className="text-[13px] font-black text-slate-800">Superadmin sign-in history</h2>
            <p className="mt-0.5 text-[11px] font-medium text-slate-500">
              Separate from the audit log so reviewing admin access does not
              depend on the table admins write to.
            </p>
          </header>
          <ul className="divide-y divide-slate-50">
            {sessions.length === 0 && (
              <li className="px-4 py-10 text-center text-[12px] font-bold text-slate-400">
                No admin sign-ins recorded yet.
              </li>
            )}
            {sessions.map((entry) => (
              <li key={entry.id} className="flex items-center justify-between gap-4 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-[12px] font-extrabold text-slate-800">
                    {entry.username || `user #${entry.user_id}`}
                  </p>
                  <p className="truncate text-[11px] font-medium text-slate-500">
                    {entry.ip_address || "unknown IP"} ·{" "}
                    {entry.created_at ? new Date(entry.created_at).toLocaleString("en-KE") : "—"}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider ring-1 ${
                    entry.was_successful
                      ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                      : "bg-rose-50 text-rose-700 ring-rose-200"
                  }`}
                >
                  {entry.was_successful ? "success" : entry.failure_reason || "failed"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <ConfirmDialog
        open={Boolean(dialog)}
        title={dialog?.title || ""}
        body={dialog?.body || ""}
        confirmLabel={dialog?.confirmLabel || "Confirm"}
        danger={dialog?.danger}
        busy={pending === `${dialog?.row?.id}:busy`}
        onCancel={() => {
          setDialog(null);
          setPending(null);
          setReason("");
        }}
        onConfirm={dialog?.onConfirm}
      />

      {dialog?.kind === "freeze" && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center pointer-events-none">
          <div className="w-full max-w-md px-4">
            <label
              htmlFor="freeze-reason"
              className="block rounded-2xl bg-white p-4 shadow-2xl pointer-events-auto"
            >
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                Reason (recorded in the audit log)
              </span>
              <input
                id="freeze-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="e.g. suspected fraud"
                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-[13px] font-medium outline-none focus:border-emerald-400"
              />
            </label>
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => {
            logout();
            navigate("/login");
          }}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-[11px] font-extrabold uppercase tracking-wider text-slate-600 hover:bg-slate-50"
        >
          <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Sign out of the admin panel
        </button>
      </div>
    </div>
  );
}
