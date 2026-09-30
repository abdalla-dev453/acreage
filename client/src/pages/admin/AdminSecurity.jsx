import { useCallback, useEffect, useState } from "react";
import { ShieldAlert, XCircle } from "lucide-react";
import API from "../../services/api";
import PageHeader from "../../components/common/PageHeader";
import { useAdmin } from "../../context/AdminContext";

/* Security centre: admin sign-in attempts, live sessions, and the audit log
   with its before/after diffs. */

const TABS = [
  { id: "attempts", label: "Sign-in attempts" },
  { id: "sessions", label: "Live sessions" },
  { id: "audit", label: "Audit log" },
];

export default function AdminSecurity() {
  const { can } = useAdmin();
  const [tab, setTab] = useState("attempts");
  const [attempts, setAttempts] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [audit, setAudit] = useState([]);
  const [onlyFailed, setOnlyFailed] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      if (tab === "attempts") {
        const { data } = await API.get("/admin/login-attempts", { params: { failed: onlyFailed, per_page: 100 } });
        setAttempts(data.items || []);
      } else if (tab === "sessions") {
        const { data } = await API.get("/admin/sessions");
        setSessions(data.items || []);
      } else {
        const { data } = await API.get("/admin/audit", { params: { per_page: 100 } });
        setAudit(data.items || []);
      }
    } catch (err) {
      setError(err?.response?.data?.message || "Could not load that view.");
    }
  }, [tab, onlyFailed]);

  useEffect(() => { if (can("security.view")) load(); }, [load, can]);

  async function endSession(session) {
    try {
      await API.post(`/admin/sessions/${session.id}/end`);
      setNotice(`Session for ${session.username} ended and their tokens revoked.`);
      window.setTimeout(() => setNotice(null), 5000);
      await load();
    } catch (err) {
      setError(err?.response?.data?.message || "Could not end that session.");
    }
  }

  if (!can("security.view")) {
    return <p className="py-16 text-center text-sm font-bold text-slate-500">Not permitted.</p>;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Security"
        description="Administrator sign-ins, live sessions and the full audit trail."
      />

      {notice && <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-[12px] font-bold text-emerald-800 ring-1 ring-emerald-200">{notice}</p>}
      {error && <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-[12px] font-bold text-rose-800 ring-1 ring-rose-200">{error}</p>}

      <div className="flex flex-wrap gap-1 rounded-2xl border border-slate-200 bg-white p-1.5 dark:border-slate-800 dark:bg-slate-900">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`rounded-xl px-3.5 py-2 text-[11px] font-extrabold uppercase tracking-wider ${
              tab === t.id ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-100"
            }`}>{t.label}</button>
        ))}
        {tab === "attempts" && (
          <label className="ml-auto flex items-center gap-2 px-2 text-[11px] font-bold text-slate-500">
            <input type="checkbox" checked={onlyFailed} onChange={(e) => setOnlyFailed(e.target.checked)} />
            failures only
          </label>
        )}
      </div>

      {tab === "attempts" && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full min-w-[680px] text-left">
            <thead><tr className="border-b border-slate-100 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              <th className="px-4 py-3">When</th><th className="px-4 py-3">Identifier</th>
              <th className="px-4 py-3">Address</th><th className="px-4 py-3">Result</th></tr></thead>
            <tbody>
              {attempts.length === 0 && <tr><td colSpan={4} className="px-4 py-10 text-center text-[12px] font-bold text-slate-400">No records.</td></tr>}
              {attempts.map((a) => (
                <tr key={a.id} className="border-b border-slate-50 last:border-0">
                  <td className="px-4 py-3 text-[11px] text-slate-500">{new Date(a.created_at).toLocaleString("en-KE")}</td>
                  <td className="px-4 py-3 text-[12px] font-bold text-slate-700">{a.identifier}</td>
                  <td className="px-4 py-3 font-mono text-[11px] text-slate-500">{a.ip_address || "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider ring-1 ${
                      a.was_successful ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-rose-50 text-rose-700 ring-rose-200"
                    }`}>{a.was_successful ? "ok" : (a.failure_reason || "failed")}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "sessions" && (
        <div className="space-y-2">
          {sessions.length === 0 && <p className="rounded-2xl border border-slate-200 bg-white px-4 py-10 text-center text-[12px] font-bold text-slate-400">No live sessions.</p>}
          {sessions.map((s) => (
            <article key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
              <div className="min-w-0">
                <p className="text-[13px] font-extrabold text-slate-800 dark:text-slate-100">
                  {s.username || `user #${s.user_id}`}
                  {s.mfa_verified && (
                    <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-black uppercase text-emerald-700">2FA</span>
                  )}
                </p>
                <p className="text-[11px] text-slate-500">
                  {s.ip_address || "unknown"} · idle {Math.round(s.idle_seconds / 60)}m ·
                  expires {s.expires_at ? new Date(s.expires_at).toLocaleString("en-KE") : "—"}
                </p>
                <p className="truncate text-[10px] text-slate-400">{s.user_agent}</p>
              </div>
              <button onClick={() => endSession(s)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-rose-50 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-rose-600">
                <XCircle className="h-3.5 w-3.5" /> End
              </button>
            </article>
          ))}
        </div>
      )}

      {tab === "audit" && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full min-w-[900px] text-left">
            <thead><tr className="border-b border-slate-100 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              <th className="px-4 py-3">When</th><th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Admin</th><th className="px-4 py-3">Target</th>
              <th className="px-4 py-3">Change</th></tr></thead>
            <tbody>
              {audit.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-[12px] font-bold text-slate-400">No actions recorded.</td></tr>}
              {audit.map((e) => (
                <tr key={e.id} className="border-b border-slate-50 align-top last:border-0">
                  <td className="whitespace-nowrap px-4 py-3 text-[11px] text-slate-500">{new Date(e.created_at).toLocaleString("en-KE")}</td>
                  <td className="px-4 py-3"><code className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-700">{e.action}</code></td>
                  <td className="px-4 py-3 text-[12px] font-bold text-slate-700">{e.actor_username}</td>
                  <td className="px-4 py-3 text-[12px] font-bold text-slate-700">{e.target_username || "—"}</td>
                  <td className="px-4 py-3">
                    {e.before || e.after ? (
                      <div className="space-y-0.5 font-mono text-[10px]">
                        {Object.keys({ ...(e.before || {}), ...(e.after || {}) }).map((k) => {
                          const b = e.before?.[k], a = e.after?.[k];
                          const changed = JSON.stringify(b) !== JSON.stringify(a);
                          return (
                            <p key={k} className={changed ? "text-slate-700" : "text-slate-400"}>
                              {k}: <span className="text-slate-400 line-through">{JSON.stringify(b)}</span>{" → "}
                              <span className={changed ? "font-bold text-emerald-700" : ""}>{JSON.stringify(a)}</span>
                            </p>
                          );
                        })}
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-400">{JSON.stringify(e.detail)}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
