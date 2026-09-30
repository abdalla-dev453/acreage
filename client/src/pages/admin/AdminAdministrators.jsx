import { useCallback, useEffect, useState } from "react";
import { ShieldCheck, UserPlus } from "lucide-react";
import API from "../../services/api";
import PageHeader from "../../components/common/PageHeader";
import { useAdmin } from "../../context/AdminContext";

/* Administrator roster plus creation of sub-admins with an explicit RBAC role.
   Creating one requires `admins.manage`, which the plain `admin` role does not
   hold, so day-to-day operators cannot mint peers. */

export default function AdminAdministrators() {
  const { can } = useAdmin();
  const [rows, setRows] = useState([]);
  const [roles, setRoles] = useState([]);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ username: "", email: "", password: "", admin_role: "admin" });

  const load = useCallback(async () => {
    try {
      const [a, r] = await Promise.all([
        API.get("/admin/administrators"),
        API.get("/admin/roles"),
      ]);
      setRows(a.data.items || []);
      setRoles(r.data.items || []);
      setError(null);
    } catch (err) {
      setError(err?.response?.data?.message || "Could not load administrators.");
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function create(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { data } = await API.post("/admin/administrators", form);
      setNotice(data.message);
      setForm({ username: "", email: "", password: "", admin_role: "admin" });
      await load();
      window.setTimeout(() => setNotice(null), 5000);
    } catch (err) {
      const body = err?.response?.data;
      setError(body?.escalation ? `${body.message}: ${body.escalation.join(", ")}` : body?.message || "Could not create the administrator.");
    } finally {
      setBusy(false);
    }
  }

  if (!can("admins.view")) {
    return <p className="py-16 text-center text-sm font-bold text-slate-500">Not permitted.</p>;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Administrators"
        description="Everyone with platform access, and the role that decides what they can do."
      />

      {notice && <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-[12px] font-bold text-emerald-800 ring-1 ring-emerald-200">{notice}</p>}
      {error && <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-[12px] font-bold text-rose-800 ring-1 ring-rose-200">{error}</p>}

      {can("admins.manage") && (
        <form onSubmit={create} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="flex items-center gap-2 text-sm font-black text-slate-800 dark:text-slate-100">
            <UserPlus className="h-4 w-4 text-emerald-600" aria-hidden="true" /> New administrator
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <input required value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })}
              placeholder="username" aria-label="Username" autoComplete="off"
              className="rounded-xl border border-slate-200 px-3 py-2.5 text-[13px] outline-none focus:border-emerald-400" />
            <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="email" aria-label="Email" autoComplete="off"
              className="rounded-xl border border-slate-200 px-3 py-2.5 text-[13px] outline-none focus:border-emerald-400" />
            <input required type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="temporary password" aria-label="Temporary password" autoComplete="new-password"
              className="rounded-xl border border-slate-200 px-3 py-2.5 text-[13px] outline-none focus:border-emerald-400" />
            <select value={form.admin_role} onChange={(e) => setForm({ ...form, admin_role: e.target.value })}
              aria-label="Role"
              className="rounded-xl border border-slate-200 px-3 py-2.5 text-[12px] font-bold outline-none focus:border-emerald-400">
              {roles.map((r) => <option key={r.key} value={r.key}>{r.name}</option>)}
            </select>
          </div>
          <button disabled={busy} className="rounded-xl bg-slate-900 px-4 py-2.5 text-[11px] font-extrabold uppercase tracking-wider text-white disabled:opacity-50">
            {busy ? "Creating…" : "Create administrator"}
          </button>
        </form>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full min-w-[720px] text-left">
          <thead>
            <tr className="border-b border-slate-100 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              <th className="px-4 py-3">Administrator</th>
              <th className="px-4 py-3">Tier</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">2FA</th>
              <th className="px-4 py-3">Sessions</th>
              <th className="px-4 py-3">Last sign-in</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-[12px] font-bold text-slate-400">No administrators found.</td></tr>
            )}
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-slate-50 last:border-0">
                <td className="px-4 py-3">
                  <p className="flex items-center gap-1.5 text-[13px] font-extrabold text-slate-800 dark:text-slate-100">
                    {row.username}
                    {row.is_super_admin && <ShieldCheck className="h-3 w-3 text-violet-500" aria-label="Super admin" />}
                  </p>
                  <p className="text-[11px] text-slate-500">{row.email}</p>
                </td>
                <td className="px-4 py-3 text-[11px] font-black uppercase tracking-wider text-emerald-700">
                  {row.is_super_admin ? "super" : "admin"}
                </td>
                <td className="px-4 py-3 text-[11px] font-bold text-slate-600">{row.admin_role || "—"}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider ring-1 ${
                    row.mfa_enabled ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-amber-50 text-amber-700 ring-amber-200"
                  }`}>{row.mfa_enabled ? "on" : "off"}</span>
                </td>
                <td className="px-4 py-3 text-[12px] font-bold text-slate-600">{row.active_sessions}</td>
                <td className="px-4 py-3 text-[11px] text-slate-500">
                  {row.last_login_at ? new Date(row.last_login_at).toLocaleString("en-KE") : "never"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
