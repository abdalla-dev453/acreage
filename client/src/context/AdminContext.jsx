import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import { AuthContext } from "./AuthContext";

/* ── The module map, mirroring PERMISSION_CATALOG on the server ──────────
   `permission` is checked against the caller's granted set, so a nav entry
   disappears rather than 403-ing when a role lacks the capability. The server
   still enforces it; this only keeps the UI honest about what is reachable.
   Phases 2-5 fill in the remaining modules. */
export const ADMIN_MODULES = [
  {
    id: "dashboard",
    label: "Dashboard",
    path: "/admin",
    icon: "LayoutDashboard",
    permission: "dashboard.view",
  },
  {
    id: "users",
    label: "Users",
    path: "/admin/users",
    icon: "Users",
    permission: "users.view",
    group: "Moderation",
  },
  {
    id: "admins",
    label: "Administrators",
    path: "/admin/administrators",
    icon: "ShieldCheck",
    permission: "admins.view",
    group: "Moderation",
  },
  {
    id: "roles",
    label: "Roles & permissions",
    path: "/admin/roles",
    icon: "KeyRound",
    permission: "admins.view",
    group: "Moderation",
  },
  {
    id: "products",
    label: "Listings",
    path: "/admin/products",
    icon: "Package",
    permission: "products.view",
    group: "Marketplace",
  },
  {
    id: "orders",
    label: "Orders",
    path: "/admin/orders",
    icon: "ShoppingBag",
    permission: "orders.view",
    group: "Marketplace",
  },
  {
    id: "escrow",
    label: "Escrow",
    path: "/admin/escrow",
    icon: "Landmark",
    permission: "escrow.view",
    group: "Finance",
  },
  {
    id: "payouts",
    label: "Payouts",
    path: "/admin/payouts",
    icon: "Wallet",
    permission: "payouts.view",
    group: "Finance",
  },
  {
    id: "disputes",
    label: "Disputes",
    path: "/admin/disputes",
    icon: "Scale",
    permission: "disputes.view",
    group: "Finance",
  },
  {
    id: "chat",
    label: "Chat moderation",
    path: "/admin/chat",
    icon: "MessagesSquare",
    permission: "chat.view",
    group: "Trust & safety",
  },
  {
    id: "sms",
    label: "SMS & campaigns",
    path: "/admin/sms",
    icon: "MessageSquareText",
    permission: "sms.view",
    group: "Trust & safety",
  },
  {
    id: "trust",
    label: "Trust centre",
    path: "/admin/trust",
    icon: "BadgeCheck",
    permission: "trust.view",
    group: "Trust & safety",
  },
  {
    id: "reports",
    label: "Reports",
    path: "/admin/reports",
    icon: "BarChart3",
    permission: "reports.view",
    group: "Platform",
  },
  {
    id: "support",
    label: "Support",
    path: "/admin/support",
    icon: "LifeBuoy",
    permission: "support.view",
    group: "Platform",
  },
  {
    id: "settings",
    label: "Site settings",
    path: "/admin/settings",
    icon: "Settings",
    permission: "settings.view",
    group: "Platform",
  },
  {
    id: "security",
    label: "Security",
    path: "/admin/security",
    icon: "ShieldAlert",
    permission: "security.view",
    group: "Platform",
  },
];

const AdminContext = createContext(null);

export function AdminProvider({ children }) {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await API.get("/admin/me");
      setProfile(data);
      setError(null);
    } catch (err) {
      const status = err?.response?.status;
      if (status === 401 || status === 403) {
        // Not an administrator, or the session was ended mid-visit. Either way
        // there is nothing to render here.
        setProfile(null);
        setError(status === 403 ? "forbidden" : "signed_out");
      } else {
        setError("unavailable");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) load();
    else setLoading(false);
  }, [user, load]);

  const permissions = useMemo(
    () => new Set(profile?.permissions || []),
    [profile]
  );

  const can = useCallback(
    (permission) => !permission || permissions.has(permission),
    [permissions]
  );

  const modules = useMemo(
    () => ADMIN_MODULES.filter((m) => can(m.permission)),
    [can]
  );

  const groups = useMemo(() => {
    const out = [];
    for (const module of modules) {
      const group = module.group || "Overview";
      let bucket = out.find((g) => g.name === group);
      if (!bucket) {
        bucket = { name: group, items: [] };
        out.push(bucket);
      }
      bucket.items.push(module);
    }
    return out;
  }, [modules]);

  const signOut = useCallback(() => {
    logout();
    navigate("/login");
  }, [logout, navigate]);

  const value = useMemo(
    () => ({
      profile,
      permissions,
      can,
      modules,
      groups,
      loading,
      error,
      reload: load,
      signOut,
      sidebarOpen,
      setSidebarOpen,
    }),
    [profile, permissions, can, modules, groups, loading, error, load, signOut, sidebarOpen]
  );

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) {
    throw new Error("useAdmin must be used inside <AdminProvider>");
  }
  return ctx;
}