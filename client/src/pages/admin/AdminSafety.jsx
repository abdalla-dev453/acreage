import { useCallback, useEffect, useState } from "react";
import { Flag, MessageSquare, Plus } from "lucide-react";
import API from "../../services/api";
import PageHeader from "../../components/common/PageHeader";
import { useAdmin } from "../../context/AdminContext";

/* Chat moderation, the keyword list, and the trust centre.
   Reading a conversation is audited server-side, which is why the banner here
   says so: an administrator browsing private messages is itself something the
   platform records. */

const TABS = [
  { id: "conversations", label: "Conversations", icon: MessageSquare, permission: "chat.view" },
  { id: "keywords", label: "Keyword list", icon: Flag, permission: "chat.keywords" },
  { id: "trust", label: "Trust centre", icon: null, permission: "trust.view" },
];

export default function AdminSafety() {
  const { can } = useAdmin();
  const allowed = TABS.filter((t) => can(t.permission));
  const [tab, setTab] = useState(allowed[0]?.id || "");
  const [canUse, setCanUse] = useState(null);

  if (!allowed.length) {
    return <p className="py-16 text-center text-sm font-bold text-slate-500">Not permitted.</p>;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Trust & safety"
        description="Conversations, the scam keyword list and verification. Reading a conversation is recorded in the audit log."
      />

      <div className="flex flex-wrap gap-1 rounded-2xl border border-slate-200 bg-white p-1.5">
        {allowed.map((t) => (
          <button key={t.id} onClick={() => { setTab(t.id); setCanUse(null); }}
            className={`rounded-xl px-3.5 py-2 text-[11px] font-extrabold uppercase tracking-wider ${
              tab === t.id ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-100"
            }`}>{t.label}</button>
        ))}
      </div>

      {tab === "conversations" && <Conversations onPick={setCanUse} picked={canUse} />}
      {tab === "keywords" && <Keywords />}
      {tab === "trust" && <Trust />}
    </div>
  );
}

function Conversations({ onPick, picked }) {
  const { can } = useAdmin();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState(null);
  const [notice, setNotice] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await API.get("/admin/conversations", { params: { per_page: 30 } });
      setRows(data.items || []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const open = async (key) => {
    const [a, b] = key.split("-").map(Number);
    onPick(key);
    const { data } = await API.get(`/admin/conversations/${a}/${b}`);
    setMessages({ ...data, participants: data.participants, key });
  };

  const remove = async (id, reason) => {
    const { data } = await API.delete(`/admin/messages/${id}`, { data: { reason } });
    setNotice(data.message);
    window.setTimeout(() => setNotice(null), 4000);
    if (picked) open(picked);
  };

  return (
    <div className="space-y-4">
      {notice && <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-[12px] font-bold text-emerald-800 ring-1 ring-emerald-200">{notice}</p>}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-2">
          {loading && <p className="text-[12px] font-bold text-slate-400">Loading…</p>}
          {!loading && rows.length === 0 && (
            <p className="rounded-2xl border border-slate-200 bg-white px-4 py-10 text-center text-[12px] font-bold text-slate-400">No messages yet.</p>
          )}
          {rows.map((row) => (
            <button key={row.key} onClick={() => open(row.key)}
              className={`block w-full rounded-2xl border bg-white px-4 py-3 text-left hover:border-slate-300 ${
                picked === row.key ? "border-slate-900" : "border-slate-200"
              }`}>
              <p className="text-[12px] font-extrabold text-slate-800">{row.participants.join(" ↔ ")}</p>
              <p className="truncate text-[11px] text-slate-500">{row.last_message}</p>
              <p className="mt-0.5 text-[10px] text-slate-400">
                {row.last_message_at ? new Date(row.last_message_at).toLocaleString("en-KE") : ""}
              </p>
            </button>
          ))}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          {!messages && <p className="py-10 text-center text-[12px] font-bold text-slate-400">Choose a conversation.</p>}
          {messages && (
            <>
              <p className="mb-3 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                {messages.participants.map((p) => `${p.username}${p.muted ? " (muted)" : ""}`).join(" ↔ ")}
              </p>
              {messages.flagged.length > 0 && (
                <p className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-[11px] font-bold text-rose-700">
                  {messages.flagged.length} message(s) matched a keyword.
                </p>
              )}
              <ul className="max-h-[420px] space-y-2 overflow-y-auto">
                {messages.messages.map((m) => (
                  <li key={m.id} className="rounded-xl bg-slate-50 px-3 py-2">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[12px] text-slate-700">{m.message}</p>
                      {can("chat.moderate") && m.message !== "[removed by moderator]" && (
                        <button
                          onClick={() => {
                            const reason = window.prompt("Reason for removing this message");
                            if (reason) remove(m.id, reason);
                          }}
                          className="shrink-0 text-[10px] font-extrabold uppercase text-rose-600">
                          Remove
                        </button>
                      )}
                    </div>
                    <p className="mt-0.5 text-[10px] text-slate-400">
                      {new Date(m.created_at).toLocaleString("en-KE")}
                    </p>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Keywords() {
  const { can } = useAdmin();
  const [rows, setRows] = useState([]);
  const [phrase, setPhrase] = useState("");
  const [severity, setSeverity] = useState("medium");
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data } = await API.get("/admin/keywords");
    setRows(data.items || []);
  }, []);
  useEffect(() => { load(); }, [load]);

  const add = async () => {
    if (!phrase.trim()) return;
    setBusy(true);
    try {
      const { data } = await API.post("/admin/keywords", { phrase, severity });
      setNotice(data.message);
      setPhrase("");
      await load();
    } catch (err) {
      setNotice(err?.response?.data?.message || "Could not add that phrase.");
    } finally { setBusy(false); }
  };

  const remove = async (id) => { await API.delete(`/admin/keywords/${id}`); await load(); };

  return (
    <div className="space-y-4">
      {notice && <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-[12px] font-bold text-emerald-800 ring-1 ring-emerald-200">{notice}</p>}
      <div className="flex flex-wrap gap-2">
        <input value={phrase} onChange={(e) => setPhrase(e.target.value)}
          placeholder="Phrase to watch for, e.g. paypal" aria-label="New keyword"
          className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[13px] outline-none focus:border-emerald-400" />
        <select value={severity} onChange={(e) => setSeverity(e.target.value)}
          aria-label="Severity" className="rounded-xl border border-slate-200 px-3 py-2.5 text-[11px] font-extrabold uppercase">
          <option value="low">low</option>
          <option value="medium">medium</option>
          <option value="high">high</option>
        </select>
        <button onClick={add} disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2.5 text-[11px] font-extrabold uppercase tracking-wider text-white">
          <Plus className="h-3.5 w-3.5" /> Add
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-left">
          <thead><tr className="border-b border-slate-100 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
            <th className="px-4 py-3">Phrase</th><th className="px-4 py-3">Severity</th>
            <th className="px-4 py-3">Hits</th><th className="px-4 py-3" /></tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={4} className="px-4 py-10 text-center text-[12px] font-bold text-slate-400">The list is empty.</td></tr>}
            {rows.map((k) => (
              <tr key={k.id} className="border-b border-slate-50 last:border-0">
                <td className="px-4 py-3 font-mono text-[12px] font-bold text-slate-800">{k.phrase}</td>
                <td className="px-4 py-3 text-[11px] font-bold text-slate-600">{k.severity}</td>
                <td className="px-4 py-3 text-[12px] font-bold text-slate-600">{k.hits}</td>
                <td className="px-4 py-3 text-right">
                  {can("chat.keywords") && (
                    <button onClick={() => remove(k.id)}
                      className="text-[10px] font-extrabold uppercase text-rose-600">Remove</button>
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

function Trust() {
  const [verifications, setVerifications] = useState([]);
  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    API.get("/admin/trust/verifications").then((r) => setVerifications(r.data.items || [])).catch(() => {});
    API.get("/admin/trust/reviews").then((r) => setReviews(r.data.items || [])).catch(() => {});
  }, []);

  const decide = async (id, decision) => {
    const reason = decision === "reject" ? window.prompt("Reason for rejection") : null;
    if (decision === "reject" && !reason) return;
    await API.post(`/admin/trust/verifications/${id}`, { decision, reason });
    const { data } = await API.get("/admin/trust/verifications");
    setVerifications(data.items || []);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="text-[13px] font-black text-slate-800">Verification queue</h2>
        <ul className="mt-3 space-y-2">
          {verifications.length === 0 && <li className="text-[12px] text-slate-400">Nothing pending.</li>}
          {verifications.map((v) => (
            <li key={v.id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2">
              <div className="min-w-0">
                <p className="text-[12px] font-extrabold text-slate-800">{v.username}</p>
                <p className="text-[10px] text-slate-500">
                  {v.request_type} · {v.farm_location || "no location"}
                  {v.id_number_last4 ? ` · ID ••${v.id_number_last4}` : ""}
                </p>
              </div>
              <div className="flex shrink-0 gap-1.5">
                {v.status === "pending" ? (
                  <>
                    <button onClick={() => decide(v.id, "approve")}
                      className="rounded-lg bg-emerald-50 px-2 py-1 text-[10px] font-extrabold uppercase text-emerald-700">Approve</button>
                    <button onClick={() => decide(v.id, "reject")}
                      className="rounded-lg bg-rose-50 px-2 py-1 text-[10px] font-extrabold uppercase text-rose-700">Reject</button>
                  </>
                ) : (
                  <span className="text-[10px] font-extrabold uppercase text-slate-500">{v.status}</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="text-[13px] font-black text-slate-800">Recent reviews</h2>
        <ul className="mt-3 space-y-2">
          {reviews.length === 0 && <li className="text-[12px] text-slate-400">No reviews yet.</li>}
          {reviews.map((r) => (
            <li key={r.id} className="rounded-xl bg-slate-50 px-3 py-2">
              <p className="text-[11px] font-extrabold text-amber-600">
                {"★".repeat(r.rating || 0)}{"☆".repeat(Math.max(0, 5 - (r.rating || 0)))}
                <span className="ml-2 text-slate-500">{r.reviewer}</span>
              </p>
              <p className="text-[11px] text-slate-600">{r.comment}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
