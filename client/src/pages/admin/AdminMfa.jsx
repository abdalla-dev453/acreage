import { useContext, useState } from "react";
import { ShieldCheck, ShieldAlert } from "lucide-react";
import API from "../../services/api";
import PageHeader from "../../components/common/PageHeader";
import { useAdmin } from "../../context/AdminContext";
import { AuthContext } from "../../context/AuthContext";

/* Self-service TOTP enrolment. The provisioning URI is shown as text rather
   than a rendered QR because a QR needs a QR library; most authenticator apps
   also accept the URI pasted in, and `otpauth://` is what they read. */

export default function AdminMfa() {
  const { profile, reload } = useAdmin();
  const { logout } = useContext(AuthContext);
  const [step, setStep] = useState("idle");
  const [uri, setUri] = useState("");
  const [codes, setCodes] = useState([]);
  const [code, setCode] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function begin() {
    setBusy(true); setError(null);
    try {
      const { data } = await API.post("/admin/mfa/setup");
      setUri(data.provisioning_uri);
      setCodes(data.recovery_codes);
      setStep("confirm");
    } catch (err) {
      setError(err?.response?.data?.message || "Could not start enrolment.");
    } finally { setBusy(false); }
  }

  async function confirm(e) {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      await API.post("/admin/mfa/confirm", { code });
      setStep("done");
      await reload();
    } catch (err) {
      setError(err?.response?.data?.message || "That code was not accepted.");
    } finally { setBusy(false); }
  }

  async function disable() {
    setBusy(true); setError(null);
    try {
      await API.post("/admin/mfa/disable", { code });
      setStep("idle"); setCodes([]); setUri(""); setCode("");
      await reload();
    } catch (err) {
      setError(err?.response?.data?.message || "A valid current code is required.");
    } finally { setBusy(false); }
  }

  const enabled = profile?.mfa_enabled;

  return (
    <div className="max-w-2xl space-y-5">
      <PageHeader
        title="Two-factor authentication"
        description="A second factor on an administrator account. Passwords alone are not enough for the people who can move money."
      />

      {error && <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-[12px] font-bold text-rose-800 ring-1 ring-rose-200">{error}</p>}

      <div className={`rounded-2xl border p-5 ${
        enabled ? "border-emerald-200 bg-emerald-50/50" : "border-amber-200 bg-amber-50/50"
      }`}>
        <p className="flex items-center gap-2 text-sm font-black text-slate-800">
          {enabled ? <ShieldCheck className="h-4 w-4 text-emerald-600" /> : <ShieldAlert className="h-4 w-4 text-amber-600" />}
          {enabled ? "Two-factor authentication is active" : "Two-factor authentication is off"}
        </p>
        {enabled && (
          <p className="mt-1 text-[12px] text-slate-600">
            {profile.mfa_recovery_codes_left} recovery code(s) remaining. Regenerate if you
            are running low — losing both the app and every code locks you out.
          </p>
        )}
      </div>

      {step === "idle" && (
        <div className="space-y-3">
          {!enabled && (
            <button onClick={begin} disabled={busy}
              className="rounded-xl bg-slate-900 px-4 py-2.5 text-[11px] font-extrabold uppercase tracking-wider text-white disabled:opacity-50">
              {busy ? "Starting…" : "Set up two-factor authentication"}
            </button>
          )}
          {enabled && (
            <form onSubmit={(e) => { e.preventDefault(); disable(); }} className="space-y-3">
              <input required value={code} onChange={(e) => setCode(e.target.value)}
                placeholder="current code" aria-label="Current code" inputMode="numeric"
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-[13px] outline-none focus:border-rose-400" />
              <button disabled={busy}
                className="rounded-xl bg-rose-600 px-4 py-2.5 text-[11px] font-extrabold uppercase tracking-wider text-white disabled:opacity-50">
                {busy ? "Disabling…" : "Disable two-factor authentication"}
              </button>
              <button type="button" onClick={() => { logout(); }}
                className="ml-2 rounded-xl border border-slate-200 px-4 py-2.5 text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
                Sign out instead
              </button>
            </form>
          )}
        </div>
      )}

      {step === "confirm" && (
        <div className="space-y-4">
          <ol className="list-decimal space-y-2 pl-5 text-[13px] text-slate-700">
            <li>Open your authenticator app and add an account.</li>
            <li>Enter this setup key if your app asks for it manually:</li>
          </ol>
          <code className="block break-all rounded-xl bg-slate-900 p-4 font-mono text-[12px] text-emerald-300">
            {uri}
          </code>
          <div>
            <p className="text-[12px] font-bold text-slate-700">
              Save these recovery codes. Each works once.
            </p>
            <ul className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
              {codes.map((c) => (
                <li key={c} className="rounded-lg bg-slate-100 px-2 py-1.5 text-center font-mono text-[12px] font-bold text-slate-700">
                  {c}
                </li>
              ))}
            </ul>
          </div>
          <form onSubmit={confirm} className="flex gap-2">
            <input required value={code} onChange={(e) => setCode(e.target.value)}
              placeholder="6-digit code" aria-label="Verification code" inputMode="numeric"
              className="rounded-xl border border-slate-200 px-3 py-2.5 text-[13px] outline-none focus:border-emerald-400" />
            <button disabled={busy}
              className="rounded-xl bg-emerald-600 px-4 py-2.5 text-[11px] font-extrabold uppercase tracking-wider text-white disabled:opacity-50">
              {busy ? "Confirming…" : "Activate"}
            </button>
          </form>
        </div>
      )}

      {step === "done" && (
        <p className="rounded-xl bg-emerald-50 px-4 py-3 text-[12px] font-bold text-emerald-800 ring-1 ring-emerald-200">
          Two-factor authentication is active. It will be required at your next sign-in.
        </p>
      )}
    </div>
  );
}
