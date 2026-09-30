import { useCallback, useEffect, useState } from "react";
import { Activity, Ban, Download, Send } from "lucide-react";
import API from "../../services/api";
import PageHeader from "../../components/common/PageHeader";
import { useAdmin } from "../../context/AdminContext";
import { ReasonDialog } from "./AdminProducts";

/* Reports, campaigns, settings, the security centre and support, as one screen
   per tab. Grouped here because each is thin, and a separate sidebar entry for
   "SMS usage" would be more navigation than the feature deserves. */

export default function AdminPlatform() {
  const { can } = useAdmin();
  const tabs = [
    { id: "reports", label: "Reports", permission: "reports.view" },
    { id: "campaigns", label: "Campaigns", permission: "sms.view" },
    { id: "settings", label: "Settings", permission: "settings.view" },
    { id: "security", label: "Security", permission: "security.view" },
    { id: "support", label: "Support", permission: "support.view" },
  ].filter((t) => can(t.permission));

  const [tab, setTab] = useState(tabs[0]?.id || "");

  if (!tabs.length) return <p className="py-16 text-center text-sm font-bold text-slate-500">Not permitted.</p>;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Platform"
        description="Reporting, outbound messaging, configuration, the security centre and support."
      />
      <div className="flex flex-wrap gap-1 rounded-2xl border border-slate-200 bg-white p-1.5">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`rounded-xl px-3.5 py-2 text-[11px] font-extrabold uppercase tracking-wider ${
              tab === t.id ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-100"
            }`}>{t.label}</button>
        ))}
      </div>

      {tab === "reports" && <Reports />}
      {tab === "campaigns" && <Campaigns />}
      {tab === "settings" && <Settings />}
      {tab === "security" && <Security />}
      {tab === "support" && <Support />}
    </div>
  );
}

function Reports() {
  const { can } = useAdmin();
  const [data, setData] = useState(null);
  const [days, setDays] = useState(30);
  const [error, setError] = useState(null);

  useEffect(() => {
    API.get("/admin/reports/summary", { params: { days } })
      .then((r) => setData(r.data))
      .catch((e) => setError(e?.response?.data?.message || "Could not load reports."));
  }, [days]);

  if (error) return <p className="rounded-xl bg-rose-50 px-4 py-3 text-[12px] font-bold text-rose-800">{error}</p>;
  if (!data) return <p className="text-[12px] font-bold text-slate-400">Loading…</p>;

  const stat = (label, node, change) => (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-1 text-xl font-black text-slate-800">{node}</p>
      {change != null && (
        <p className={`text-[10px] font-bold ${change >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
          {change >= 0 ? "▲" : "▼"} {Math.abs(change)}% vs previous {days} days
        </p>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <select value={days} onChange={(e) => setDays(Number(e.target.value))} aria-label="Date range"
          className="rounded-xl border border-slate-200 px-3 py-2.5 text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
          {[7, 30, 90, 365].map((d) => <option key={d} value={d}>Last {d} days</option>)}
        </select>
        {can("reports.export") && (
          <a href="/api/admin/reports/users.csv"
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3.5 py-2.5 text-[11px] font-extrabold uppercase tracking-wider text-white">
            <Download className="h-3.5 w-3.5" /> Export users
          </a>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {stat("Signups", data.signups.current, data.signups.change_pct)}
        {stat("Orders", data.orders.current, data.orders.change_pct)}
        {stat("Revenue", `KES ${Number(data.revenue.current).toLocaleString()}`, data.revenue.change_pct)}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Top farmers">
          {(data.top_farmers || []).map((f, i) => (
            <Row key={i} label={f.username} value={`KES ${Number(f.revenue).toLocaleString()}`} sub={`${f.orders} orders`} />
          ))}
          {!data.top_farmers?.length && <Empty />}
        </Panel>
        <Panel title="Top products">
          {(data.top_products || []).map((p, i) => (
            <Row key={i} label={p.title} value={`KES ${Number(p.revenue).toLocaleString()}`} sub={`${p.quantity} units`} />
          ))}
          {!data.top_products?.length && <Empty />}
        </Panel>
        <Panel title="Regional activity">
          {(data.regions || []).map((r, i) => (
            <Row key={i} label={r.location} value={`${r.users} users`} />
          ))}
          {!data.regions?.length && <Empty />}
        </Panel>
        <Panel title="Daily revenue">
          {data.revenue_series.slice(-10).map((p) => (
            <Row key={p.date} label={p.date} value={`KES ${Number(p.revenue).toLocaleString()}`} />
          ))}
          {!data.revenue_series?.length && <Empty />}
        </Panel>
      </div>
    </div>
  );
}

function Campaigns() {
  const { can } = useAdmin();
  const [rows, setRows] = useState([]);
  const [usage, setUsage] = useState(null);
  const [draft, setDraft] = useState({ title: "", body: "", channel: "in_app" });
  const [reach, setReach] = useState(null);
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [c, u] = await Promise.all([
      API.get("/admin/campaigns"),
      API.get("/admin/sms-usage"),
    ]);
    setRows(c.data.items || []);
    setUsage(u.data);
  }, []);
  useEffect(() => { load().catch(() => {}); }, [load]);

  const preview = async () => {
    const { data } = await API.post("/admin/campaigns/segment-preview", { segment: {} });
    setReach(data.recipient_count);
  };

  const create = async () => {
    setBusy(true);
    try {
      const { data } = await API.post("/admin/campaigns", draft);
      setNotice(data.message);
      setDraft({ title: "", body: "", channel: "in_app" });
      setReach(null);
      await load();
    } catch (err) {
      setNotice(err?.response?.data?.message || "Could not create the campaign.");
    } finally { setBusy(false); }
  };

  const send = async (id) => {
    if (!window.confirm("Send this campaign now? It cannot be recalled.")) return;
    const { data } = await API.post(`/admin/campaigns/${id}/send`);
    setNotice(data.message);
    await load();
  };

  return (
    <div className="space-y-4">
      {notice && <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-[12px] font-bold text-emerald-800 ring-1 ring-emerald-200">{notice}</p>}

      {usage && (
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat label="SMS cost" value={`KES ${Number(usage.total_cost || 0).toFixed(2)}`} />
          <Stat label="States" value={Object.entries(usage.by_status).map(([k, v]) => `${k}:${v}`).join(" · ") || "—"} />
          <Stat label="Recent records" value={usage.recent.length} />
        </div>
      )}

      {can("sms.send") && (
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
          <h2 className="text-[13px] font-black text-slate-800">New campaign</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              placeholder="Title" aria-label="Campaign title"
              className="rounded-xl border border-slate-200 px-3 py-2.5 text-[13px] outline-none focus:border-emerald-400" />
            <select value={draft.channel} onChange={(e) => setDraft({ ...draft, channel: e.target.value })}
              aria-label="Channel" className="rounded-xl border border-slate-200 px-3 py-2.5 text-[12px] font-bold">
              <option value="in_app">in-app</option>
              <option value="sms">SMS</option>
              <option value="email">email</option>
            </select>
          </div>
          <textarea value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })}
            rows={3} placeholder="Message body" aria-label="Message body"
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-[13px] outline-none focus:border-emerald-400" />
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={preview}
              className="rounded-xl bg-slate-100 px-3 py-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-600">
              Preview reach
            </button>
            <button onClick={create} disabled={busy || !draft.title || !draft.body}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2.5 text-[11px] font-extrabold uppercase tracking-wider text-white disabled:opacity-40">
              <Send className="h-3.5 w-3.5" /> Create draft
            </button>
            {reach != null && <span className="text-[12px] font-bold text-slate-600">Reaches {reach} active user(s).</span>}
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <table className="w-full min-w-[640px] text-left">
          <thead><tr className="border-b border-slate-100 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
            <th className="px-4 py-3">Title</th><th className="px-4 py-3">Channel</th>
            <th className="px-4 py-3">Status</th><th className="px-4 py-3">Delivery</th>
            <th className="px-4 py-3" /></tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-[12px] font-bold text-slate-400">No campaigns yet.</td></tr>}
            {rows.map((c) => (
              <tr key={c.id} className="border-b border-slate-50 last:border-0">
                <td className="px-4 py-3 text-[12px] font-extrabold text-slate-800">{c.title}</td>
                <td className="px-4 py-3 text-[11px] font-bold text-slate-500">{c.channel}</td>
                <td className="px-4 py-3 text-[11px] font-bold text-slate-600">{c.status}</td>
                <td className="px-4 py-3 text-[11px] font-bold text-slate-600">
                  {c.delivered_count}/{c.recipient_count}
                  {c.failed_count > 0 && <span className="ml-1 text-rose-600">{c.failed_count} failed</span>}
                </td>
                <td className="px-4 py-3 text-right">
                  {can("sms.send") && c.status === "draft" && (
                    <button onClick={() => send(c.id)}
                      className="rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[10px] font-extrabold uppercase text-emerald-700">Send</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Settings() {
  const { can } = useAdmin();
  const [groups, setGroups] = useState([]);
  const [notice, setNotice] = useState(null);

  const load = useCallback(async () => {
    const { data } = await API.get("/admin/settings");
    setGroups(data.categories || []);
  }, []);
  useEffect(() => { load(); }, [load]);

  const save = async (key, value) => {
    const { data } = await API.patch(`/admin/settings/${key}`, { value });
    setNotice(data.message);
    window.setTimeout(() => setNotice(null), 3500);
    await load();
  };

  return (
    <div className="space-y-4">
      {notice && <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-[12px] font-bold text-emerald-800 ring-1 ring-emerald-200">{notice}</p>}
      {!can("settings.edit") && (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-[12px] font-bold text-amber-800 ring-1 ring-amber-200">
          Your role can read settings but not change them.
        </p>
      )}
      {groups.map((g) => (
        <Panel key={g.name} title={g.name}>
          {g.settings.map((s) => (
            <div key={s.key} className="flex items-center justify-between gap-4 border-b border-slate-50 py-2 last:border-0">
              <div className="min-w-0">
                <p className="text-[12px] font-extrabold text-slate-800">{s.key}</p>
                <p className="text-[10px] text-slate-500">{s.description}</p>
              </div>
              {typeof s.value === "boolean" ? (
                <input type="checkbox" checked={s.value} disabled={!can("settings.edit")}
                  onChange={(e) => save(s.key, e.target.checked)}
                  aria-label={s.key} className="h-4 w-4" />
              ) : (
                <input
                  defaultValue={s.value ?? ""} disabled={!can("settings.edit")}
                  onBlur={(e) => {
                    const next = typeof s.value === "number" ? Number(e.target.value) : e.target.value;
                    if (String(next) !== String(s.value)) save(s.key, next);
                  }}
                  aria-label={s.key}
                  className="w-48 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[12px] font-bold outline-none focus:border-emerald-400 disabled:opacity-60" />
              )}
            </div>
          ))}
        </Panel>
      ))}
    </div>
  );
}

function Security() {
  const { can } = useAdmin();
  const [overview, setOverview] = useState(null);
  const [ips, setIps] = useState([]);
  const [integrations, setIntegrations] = useState([]);
  const [cidr, setCidr] = useState("");
  const [notice, setNotice] = useState(null);

  const load = useCallback(async () => {
    const [o, b, i] = await Promise.all([
      API.get("/admin/security/overview"),
      API.get("/admin/security/blocked-ips"),
      API.get("/admin/system/integrations"),
    ]);
    setOverview(o.data); setIps(b.data.items || []); setIntegrations(i.data.integrations || []);
  }, []);
  useEffect(() => { load().catch(() => {}); }, [load]);

  const block = async () => {
    try {
      const { data } = await API.post("/admin/security/blocked-ips", { cidr, reason: "console" });
      setNotice(data.message); setCidr(""); await load();
    } catch (err) { setNotice(err?.response?.data?.message || "Could not block that."); }
  };

  return (
    <div className="space-y-4">
      {notice && <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-[12px] font-bold text-emerald-800 ring-1 ring-emerald-200">{notice}</p>}
      {overview && (
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Stat label="Failed logins 7d" value={overview.failed_logins_7d} icon={Ban} />
          <Stat label="Admin logins 7d" value={overview.successful_logins_7d} icon={Activity} />
          <Stat label="Live sessions" value={overview.live_admin_sessions} />
          <Stat label="Blocked IPs" value={overview.blocked_ips} />
          <Stat label="Locked accounts" value={overview.locked_accounts} />
          <Stat label="Open reports" value={overview.open_reports} />
        </div>
      )}

      {can("security.block_ip") && (
        <div className="flex gap-2">
          <input value={cidr} onChange={(e) => setCidr(e.target.value)}
            placeholder="203.0.113.0/24" aria-label="IP or CIDR to block"
            className="flex-1 rounded-xl border border-slate-200 px-3 py-2.5 font-mono text-[12px] outline-none focus:border-emerald-400" />
          <button onClick={block} className="rounded-xl bg-rose-600 px-4 py-2.5 text-[11px] font-extrabold uppercase tracking-wider text-white">
            Block
          </button>
        </div>
      )}

      <Panel title="Blocked addresses">
        {ips.length === 0 && <Empty />}
        {ips.map((b) => (
          <Row key={b.id} label={b.cidr} value={`${b.hits} hits`} sub={b.reason}
            action={can("security.block_ip")
              ? <button onClick={async () => { await API.delete(`/admin/security/blocked-ips/${b.id}`); load(); }}
                  className="text-[10px] font-extrabold uppercase text-emerald-600">Unblock</button>
              : null} />
        ))}
      </Panel>

      <Panel title="Integrations">
        {integrations.map((i) => (
          <Row key={i.env_var} label={i.name} value={i.configured ? "configured" : "not set"}
            sub={i.env_var} />
        ))}
      </Panel>
    </div>
  );
}

function Support() {
  const [rows, setRows] = useState([]);
  const [counts, setCounts] = useState({});
  const [open, setOpen] = useState(null);
  const [reply, setReply] = useState("");

  const load = useCallback(async () => {
    const { data } = await API.get("/admin/support/tickets");
    setRows(data.items || []); setCounts(data.counts || {});
  }, []);
  useEffect(() => { load(); }, [load]);

  const openTicket = async (id) => {
    const { data } = await API.get(`/admin/support/tickets/${id}`);
    setOpen(data.ticket);
  };

  const send = async () => {
    if (!reply.trim()) return;
    const { data } = await API.post(`/admin/support/tickets/${open.id}/reply`, { body: reply });
    setOpen(data.ticket); setReply(""); await load();
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-4">
        {["open", "pending", "resolved", "closed"].map((s) => (
          <Stat key={s} label={s} value={counts[s] ?? 0} />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-2">
          {rows.length === 0 && <p className="rounded-2xl border border-slate-200 bg-white px-4 py-10 text-center text-[12px] font-bold text-slate-400">No tickets.</p>}
          {rows.map((t) => (
            <button key={t.id} onClick={() => openTicket(t.id)}
              className={`block w-full rounded-2xl border bg-white px-4 py-3 text-left hover:border-slate-300 ${
                open?.id === t.id ? "border-slate-900" : "border-slate-200"
              }`}>
              <p className="text-[12px] font-extrabold text-slate-800">{t.subject}</p>
              <p className="text-[10px] text-slate-500">
                {t.username || "no user"} · {t.priority} · {t.status} · {t.message_count} message(s)
              </p>
            </button>
          ))}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          {!open && <p className="py-10 text-center text-[12px] font-bold text-slate-400">Choose a ticket.</p>}
          {open && (
            <>
              <h2 className="text-[13px] font-black text-slate-800">{open.subject}</h2>
              <p className="mt-0.5 text-[10px] text-slate-500">Opened by {open.username || "anonymous"}</p>
              <ul className="mt-3 max-h-72 space-y-2 overflow-y-auto">
                {(open.messages || []).map((m) => (
                  <li key={m.id} className={`rounded-xl px-3 py-2 text-[12px] ${
                    m.is_staff ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-700"
                  }`}>
                    {m.body}
                    <p className="mt-0.5 text-[10px] opacity-60">{m.author} · {new Date(m.created_at).toLocaleString("en-KE")}</p>
                  </li>
                ))}
              </ul>
              <textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={3}
                placeholder="Write a reply…" aria-label="Reply"
                className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-[12px] outline-none focus:border-emerald-400" />
              <button onClick={send} className="mt-2 rounded-xl bg-slate-900 px-4 py-2.5 text-[11px] font-extrabold uppercase tracking-wider text-white">
                Send reply
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── small presentational pieces ───────────────────────────────────────── */
function Panel({ title, children }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4">
      <h2 className="mb-2 text-[12px] font-black text-slate-800">{title}</h2>
      <ul>{children}</ul>
    </section>
  );
}
function Row({ label, value, sub, action }) {
  return (
    <li className="flex items-center justify-between gap-3 border-b border-slate-50 py-2 last:border-0">
      <div className="min-w-0">
        <p className="truncate text-[12px] font-extrabold text-slate-800">{label}</p>
        {sub && <p className="truncate text-[10px] text-slate-500">{sub}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="text-[11px] font-bold text-slate-600">{value}</span>
        {action}
      </div>
    </li>
  );
}
function Stat({ label, value, icon: Icon }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">{label}</p>
        {Icon && <Icon className="h-3.5 w-3.5 text-slate-300" />}
      </div>
      <p className="mt-1 text-lg font-black text-slate-800">{value}</p>
    </div>
  );
}
function Empty() {
  return <li className="py-6 text-center text-[12px] font-bold text-slate-400">Nothing here yet.</li>;
}
