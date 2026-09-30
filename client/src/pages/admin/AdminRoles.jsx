import { useCallback, useEffect, useState } from "react";
import { Plus, Shield, Trash2 } from "lucide-react";
import API from "../../services/api";
import PageHeader from "../../components/common/PageHeader";
import { useAdmin } from "../../context/AdminContext";

/* Role and permission matrix. Roles can be created and edited by anyone with
   `roles.manage`, but the server refuses to grant a permission the caller does
   not hold, so this screen cannot be used to escalate. */

export default function AdminRoles() {
  const { can, permissions } = useAdmin();
  const [roles, setRoles] = useState([]);
  const [modules, setModules] = useState([]);
  const [error, setError] = useState(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState({ key: "", name: "", description: "", permissions: [] });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [r, c] = await Promise.all([
        API.get("/admin/roles"),
        API.get("/admin/permissions"),
      ]);
      setRoles(r.data.items || []);
      setModules(c.data.modules || []);
      setError(null);
    } catch (err) {
      setError(err?.response?.data?.message || "Could not load roles.");
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function create() {
    setBusy(true);
    setError(null);
    try {
      await API.post("/admin/roles", draft);
      setCreating(false);
      setDraft({ key: "", name: "", description: "", permissions: [] });
      await load();
    } catch (err) {
      const body = err?.response?.data;
      setError(
        body?.escalation
          ? `${body.message}: ${body.escalation.join(", ")}`
          : body?.message || "Could not create the role."
      );
    } finally {
      setBusy(false);
    }
  }

  async function remove(role) {
    setBusy(true);
    try {
      await API.delete(`/admin/roles/${role.id}`);
      await load();
    } catch (err) {
      setError(err?.response?.data?.message || "Could not delete the role.");
    } finally {
      setBusy(false);
    }
  }

  const toggle = (key) =>
    setDraft((d) => ({
      ...d,
      permissions: d.permissions.includes(key)
        ? d.permissions.filter((p) => p !== key)
        : [...d.permissions, key],
    }));

  if (!can("admins.view")) {
    return <p className="py-16 text-center text-sm font-bold text-slate-500">Not permitted.</p>;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Roles & permissions"
        description="What each administrator role is allowed to do. System roles are defined in code and cannot be edited."
        actions={
          can("roles.manage") ? (
            <button
              onClick={() => setCreating((v) => !v)}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3.5 py-2.5 text-[11px] font-extrabold uppercase tracking-wider text-white"
            >
              <Plus className="h-3.5 w-3.5" /> New role
            </button>
          ) : null
        }
      />

      {error && (
        <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-[12px] font-bold text-rose-800 ring-1 ring-rose-200">
          {error}
        </p>
      )}

      {creating && (
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="grid gap-3 sm:grid-cols-3">
            <input value={draft.key} onChange={(e) => setDraft({ ...draft, key: e.target.value })}
              placeholder="key (e.g. support_lead)" aria-label="Role key"
              className="rounded-xl border border-slate-200 px-3 py-2.5 text-[13px] outline-none focus:border-emerald-400" />
            <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              placeholder="Display name" aria-label="Role name"
              className="rounded-xl border border-slate-200 px-3 py-2.5 text-[13px] outline-none focus:border-emerald-400" />
            <input value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              placeholder="What is this role for?" aria-label="Role description"
              className="rounded-xl border border-slate-200 px-3 py-2.5 text-[13px] outline-none focus:border-emerald-400" />
          </div>

          <div>
            <p className="mb-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              Permissions — you can only grant what you hold yourself
            </p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {modules.map((m) => (
                <div key={m.name} className="rounded-xl border border-slate-100 p-2.5 dark:border-slate-800">
                  <p className="mb-1 text-[9px] font-black uppercase tracking-widest text-slate-400">{m.name}</p>
                  {m.permissions.map((p) => {
                    const held = permissions.has(p.key);
                    const checked = draft.permissions.includes(p.key);
                    return (
                      <label key={p.key}
                        className={`flex items-start gap-1.5 py-0.5 text-[11px] ${
                          held ? "cursor-pointer text-slate-700 dark:text-slate-200" : "text-slate-300"
                        }`}
                        title={held ? p.description : `You do not hold ${p.key}`}>
                        <input type="checkbox" checked={checked} disabled={!held}
                          onChange={() => toggle(p.key)} className="mt-0.5" />
                        <span>{p.action}</span>
                      </label>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          <button onClick={create} disabled={busy || !draft.key || !draft.name}
            className="rounded-xl bg-emerald-600 px-4 py-2.5 text-[11px] font-extrabold uppercase tracking-wider text-white disabled:opacity-50">
            {busy ? "Creating…" : `Create role (${draft.permissions.length} permissions)`}
          </button>
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        {roles.map((role) => (
          <article key={role.id} className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <header className="flex items-start justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 text-sm font-black text-slate-800 dark:text-slate-100">
                  <Shield className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                  {role.name}
                </h2>
                <p className="mt-0.5 text-[11px] text-slate-500">{role.description}</p>
              </div>
              {role.is_system ? (
                <span className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-slate-500">System</span>
              ) : can("roles.manage") ? (
                <button onClick={() => remove(role)} disabled={busy}
                  className="rounded-lg p-1.5 text-slate-300 hover:bg-rose-50 hover:text-rose-600"
                  aria-label={`Delete role ${role.name}`}>
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </header>
            <p className="mt-3 text-[11px] font-bold text-slate-500">
              {role.permission_count} permissions · {role.holder_count} holder(s)
            </p>
            <div className="mt-2 flex flex-wrap gap-1">
              {role.permissions.slice(0, 14).map((p) => (
                <span key={p} className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[9px] text-slate-600 dark:bg-slate-800 dark:text-slate-300">{p}</span>
              ))}
              {role.permission_count > 14 && (
                <span className="text-[10px] font-bold text-slate-400">+{role.permission_count - 14} more</span>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
