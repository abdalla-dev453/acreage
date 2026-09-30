import { Suspense, lazy, useContext, useEffect } from "react";
import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import {
  Activity,
  BadgeCheck,
  BarChart3,
  KeyRound,
  Landmark,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Menu,
  MessageSquareText,
  MessagesSquare,
  Package,
  Scale,
  Settings,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShoppingBag,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { AdminProvider, useAdmin } from "../../context/AdminContext";
import { AuthContext } from "../../context/AuthContext";
import AdminDashboard from "./AdminDashboard";
import AdminUsers from "./AdminUsers";
import AdminAdministrators from "./AdminAdministrators";
import AdminRoles from "./AdminRoles";
import AdminSecurity from "./AdminSecurity";
import PhasePlaceholder from "./PhasePlaceholder";


const ICONS = {
  Activity, BadgeCheck, BarChart3, KeyRound, Landmark, LayoutDashboard,
  LifeBuoy, MessageSquareText, MessagesSquare, Package, Scale, Settings,
  Shield, ShieldAlert, ShieldCheck, ShoppingBag, Users, Wallet,
};

/* ── Sidebar ───────────────────────────────────────────────────────────── */

function SidebarNav({ onNavigate }) {
  const { groups, profile, can } = useAdmin();

  return (
    <nav className="admin-sidebar-nav" aria-label="Admin sections">
      {groups.map((group) => (
        <div className="admin-sidebar-group" key={group.name}>
          <p className="admin-sidebar-group-label">{group.name}</p>
          <ul>
            {group.items.map((item) => {
              const Icon = ICONS[item.icon] || Activity;
              return (
                <li key={item.id}>
                  <NavLink to={item.path} onClick={onNavigate}>
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    <span>{item.label}</span>
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </div>
      ))}

      <div className="admin-sidebar-group">
        <p className="admin-sidebar-group-label">Account</p>
        <ul>
          <li>
            <NavLink to="/admin/mfa" onClick={onNavigate}>
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              <span>Two-factor auth</span>
              {!profile?.mfa_enabled && (
                <span
                  className="ml-auto rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-black uppercase text-amber-700"
                  title="Strongly recommended for administrators"
                >
                  Off
                </span>
              )}
            </NavLink>
          </li>
        </ul>
      </div>
    </nav>
  );
}

function AdminLoading() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="h-7 w-7 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
    </div>
  );
}

/* ── Shell ─────────────────────────────────────────────────────────────── */

function AdminShell({ children }) {
  const { profile, loading, error, signOut, sidebarOpen, setSidebarOpen } = useAdmin();
  const { user } = useContext(AuthContext);

  useEffect(() => {
    if (error === "signed_out") signOut();
  }, [error, signOut]);

  if (loading) return <AdminShellLoading />;

  if (error === "forbidden") {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-3 text-center">
        <Shield className="h-10 w-10 text-slate-300" aria-hidden="true" />
        <h1 className="text-lg font-black text-slate-800">Administrator access required</h1>
        <p className="max-w-md text-[13px] text-slate-500">
          This account is signed in but has not been granted an administrator
          role. If you believe that is wrong, ask an existing super admin to
          assign one.
        </p>
      </div>
    );
  }

  return (
    <div className="admin-shell">
      {/* ── Top bar ─────────────────────────────────────────────── */}
      <header className="admin-topbar">
        <button
          type="button"
          className="admin-topbar-menu"
          onClick={() => setSidebarOpen((v) => !v)}
          aria-label={sidebarOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={sidebarOpen}
        >
          {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>

        <div className="admin-topbar-brand">
          <Shield className="h-4 w-4 text-emerald-600" aria-hidden="true" />
          <span className="font-display text-[15px] font-black tracking-[0.18em] text-slate-900 dark:text-slate-50">
            ACREAGE
          </span>
          <span className="rounded-md bg-slate-900 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-white dark:bg-emerald-600">
            Admin
          </span>
        </div>

        <div className="ml-auto flex items-center gap-3">
          {profile?.session && (
            <span
              className="hidden text-[10px] font-bold text-slate-400 sm:inline"
              title={`Session expires ${new Date(profile.session.expires_at).toLocaleString()}`}
            >
              Session {Math.max(0, Math.round((new Date(profile.session.expires_at).getTime() - Date.now()) / 60000))}m left
            </span>
          )}
          <div className="text-right leading-tight">
            <p className="text-[12px] font-extrabold text-slate-800 dark:text-slate-100">
              {profile?.username || user?.username}
            </p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
              {profile?.is_super_admin ? "Super admin" : profile?.admin_role_name || "Admin"}
            </p>
          </div>
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-slate-900 text-[10px] font-black text-white">
            {(profile?.username || "?").slice(0, 2).toUpperCase()}
          </span>
          <button
            type="button"
            onClick={signOut}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
            aria-label="Sign out of the admin panel"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="admin-body">
        {/* ── Sidebar ───────────────────────────────────────────── */}
        {sidebarOpen && (
          <button
            type="button"
            className="admin-scrim"
            aria-label="Close navigation"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        <aside
          className={`admin-sidebar${sidebarOpen ? " open" : ""}`}
          aria-label="Admin navigation"
        >
          <SidebarNav onNavigate={() => setSidebarOpen(false)} />
        </aside>

        {/* ── Content ───────────────────────────────────────────── */}
        <main className="admin-content">{children}</main>
      </div>
    </div>
  );
}

function AdminShellLoading() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-3">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
        Verifying administrator session
      </p>
    </div>
  );
}

/* ── Router ────────────────────────────────────────────────────────────── */

function AdminRoutes() {
  return (
    <Routes>
      <Route index element={<AdminDashboard />} />
      <Route path="users" element={<AdminUsers />} />
      <Route path="administrators" element={<AdminAdministrators />} />
      <Route path="roles" element={<AdminRoles />} />
      <Route path="mfa" element={<Suspense fallback={<AdminLoading />}><AdminMfa /></Suspense>} />
      <Route path="security" element={<AdminSecurity />} />
      {/*
        Phases 2-5 land here. Each module is gated by its own permission in
        AdminContext, so a role that lacks `escrow.release` never sees the
        button and the server would refuse the call anyway.
      */}
      <Route
        path="products"
        element={<PhasePlaceholder module="Listings" phase="Phase 2" permission="products.view" />}
      />
      <Route
        path="orders"
        element={<PhasePlaceholder module="Orders" phase="Phase 2" permission="orders.view" />}
      />
      <Route
        path="escrow"
        element={<PhasePlaceholder module="Escrow" phase="Phase 3" permission="escrow.view" />}
      />
      <Route
        path="payouts"
        element={<PhasePlaceholder module="Payouts" phase="Phase 3" permission="payouts.view" />}
      />
      <Route
        path="disputes"
        element={<PhasePlaceholder module="Disputes" phase="Phase 3" permission="disputes.view" />}
      />
      <Route
        path="chat"
        element={<PhasePlaceholder module="Chat moderation" phase="Phase 4" permission="chat.view" />}
      />
      <Route
        path="sms"
        element={<PhasePlaceholder module="SMS & campaigns" phase="Phase 4" permission="sms.view" />}
      />
      <Route
        path="trust"
        element={<PhasePlaceholder module="Trust centre" phase="Phase 4" permission="trust.view" />}
      />
      <Route
        path="reports"
        element={<PhasePlaceholder module="Reports" phase="Phase 5" permission="reports.view" />}
      />
      <Route
        path="support"
        element={<PhasePlaceholder module="Support" phase="Phase 5" permission="support.view" />}
      />
      <Route
        path="settings"
        element={<PhasePlaceholder module="Site settings" phase="Phase 5" permission="settings.view" />}
      />
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
}

const AdminMfa = lazy(() => import("./AdminMfa"));

export default function AdminLayout() {
  return (
    <AdminProvider>
      <AdminShell>
        <Suspense fallback={<AdminLoading />}>
          <AdminRoutes />
        </Suspense>
      </AdminShell>
    </AdminProvider>
  );
}