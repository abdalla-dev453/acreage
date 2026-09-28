/**
 * Single source of truth for every navigable page in the app.
 *
 * There is no sidebar: the premium top bar carries the whole product, so this
 * registry drives the desktop mega-menu, the mobile drawer and the footer.
 * Each link carries an icon and a one-line description because the top bar
 * renders a full mega-panel rather than a bare list of labels.
 *
 * `roles` mirrors the old sidebar gate — an entry is hidden from signed-out
 * visitors unless it is in `public: true`, and from a signed-in user unless
 * their role is listed. `admin` and `buyer` are always allowed so nothing in
 * the product becomes unreachable after a role change.
 */

import {
  BarChart2,
  CalendarDays,
  ClipboardList,
  Compass,
  FileText,
  Handshake,
  LayoutDashboard,
  LineChart,
  Lock,
  MessageSquare,
  MessageSquareText,
  Search,
  Settings,
  Shield,
  ShieldCheck,
  ShoppingBag,
  Sprout,
  Star,
  TrendingUp,
  User,
  UserPlus,
  Users,
  UsersRound,
  Wallet,
} from "lucide-react";

const EVERY_ROLE = ["farmer", "buyer", "admin"];

export const SITE_MENU_GROUPS = [
  {
    id: "platform",
    label: "Platform",
    blurb: "The daily trading desk",
    links: [
      {
        label: "Overview",
        path: "/dashboard",
        icon: LayoutDashboard,
        blurb: "Season snapshot, revenue and open orders at a glance.",
        roles: EVERY_ROLE,
      },
      {
        label: "Marketplace",
        path: "/marketplace",
        icon: Sprout,
        blurb: "Browse and list live produce from verified growers.",
        roles: EVERY_ROLE,
      },
      {
        label: "Market prices",
        path: "/market-prices",
        icon: TrendingUp,
        blurb: "ShambaRecords benchmarks across all 47 counties.",
        roles: EVERY_ROLE,
      },
      {
        label: "Orders",
        path: "/orders",
        icon: ShoppingBag,
        blurb: "Track every order from acceptance through settlement.",
        roles: EVERY_ROLE,
      },
      {
        label: "Chats",
        path: "/chats",
        icon: MessageSquare,
        blurb: "Negotiate directly with buyers and other farmers.",
        roles: EVERY_ROLE,
      },
    ],
  },
  {
    id: "tools",
    label: "Tools",
    blurb: "Plan, pool and publish",
    links: [
      {
        label: "Harvest planner",
        path: "/harvest",
        icon: CalendarDays,
        blurb: "Publish harvest windows and let buyers pre-order.",
        roles: EVERY_ROLE,
      },
      {
        label: "Farm logs",
        path: "/farm-logs",
        icon: ClipboardList,
        blurb: "Your digital field diary and activity scheduler.",
        roles: ["farmer", "admin"],
      },
      {
        label: "Group commerce",
        path: "/groups",
        icon: UsersRound,
        blurb: "Pool demand, commit to lots, share transport.",
        roles: EVERY_ROLE,
      },
      {
        label: "Customer reviews",
        path: "/reviews",
        icon: Star,
        blurb: "Read and post verified feedback on produce.",
        roles: EVERY_ROLE,
      },
      {
        label: "SMS hub",
        path: "/sms",
        icon: MessageSquareText,
        blurb: "Run ordering and stock alerts over SMS.",
        roles: EVERY_ROLE,
      },
      {
        label: "Search",
        path: "/search",
        icon: Search,
        blurb: "Find produce, growers and buyers in one query.",
        roles: EVERY_ROLE,
      },
    ],
  },
  {
    id: "account",
    label: "Account",
    blurb: "Money, identity and insight",
    links: [
      {
        label: "Wallet & payouts",
        path: "/wallet",
        icon: Wallet,
        blurb: "Escrow balance, M-Pesa and bank payouts.",
        roles: EVERY_ROLE,
      },
      {
        label: "Customers",
        path: "/customers",
        icon: Users,
        blurb: "Your buyer directory and relationship history.",
        roles: ["farmer", "admin"],
      },
      {
        label: "Analytics",
        path: "/analytics",
        icon: BarChart2,
        blurb: "Yield, revenue and order trends by season.",
        roles: ["farmer", "admin"],
      },
      {
        label: "Trust center",
        path: "/trust-center",
        icon: ShieldCheck,
        blurb: "Verify identity, farm, photos and video evidence.",
        roles: EVERY_ROLE,
      },
      {
        label: "Administration",
        path: "/admin",
        icon: Shield,
        blurb: "Platform control: accounts, moderation and the audit log.",
        roles: EVERY_ROLE,
        // Only rendered for a superadmin. The server rejects every
        // /api/admin route for anyone else, so this is a convenience
        // rather than the access control.
        superadminOnly: true,
      },
      {
        label: "My profile",
        path: "/profile",
        icon: User,
        blurb: "Personal details, payment channels and credentials.",
        roles: EVERY_ROLE,
      },
      {
        label: "Settings",
        path: "/settings",
        icon: Settings,
        blurb: "Theme, language, notifications and preferences.",
        roles: EVERY_ROLE,
      },
    ],
  },
  {
    id: "company",
    label: "Company",
    blurb: "How Acreage works",
    links: [
      {
        label: "How it works",
        path: "/",
        icon: Compass,
        blurb: "Field to buyer in three steps.",
        roles: EVERY_ROLE,
        public: true,
      },
      {
        label: "Privacy policy",
        path: "/privacy",
        icon: Lock,
        blurb: "What we collect and how we protect it.",
        roles: EVERY_ROLE,
        public: true,
      },
      {
        label: "Terms of use",
        path: "/terms",
        icon: FileText,
        blurb: "The agreement between you and Acreage.",
        roles: EVERY_ROLE,
        public: true,
      },
      {
        label: "Sign in",
        path: "/login",
        icon: Handshake,
        blurb: "Pick up where your season left off.",
        roles: EVERY_ROLE,
        public: true,
      },
      {
        label: "Create account",
        path: "/register",
        icon: UserPlus,
        blurb: "Join as a farmer or a buyer in minutes.",
        roles: EVERY_ROLE,
        public: true,
      },
    ],
  },
];

/** Flat list of every path, handy for tests and for the footer. */
export const ALL_SITE_LINKS = SITE_MENU_GROUPS.flatMap((group) => group.links);

/** The handful of links worth promoting to the top bar. */
export const PRIMARY_LINKS = SITE_MENU_GROUPS[0].links;

/** Marks the link live when the router is on it (or one of its children). */
export function isLinkActive(pathname, path) {
  if (path === "/") return pathname === "/";
  return pathname === path || pathname.startsWith(`${path}/`);
}

/**
 * Signed-out visitors only see pages that render without an account, so the
 * mega-menu never advertises a route that would bounce them to /login.
 */
export function visibleLinks(group, user) {
  if (!user) return group.links;
  return group.links.filter((link) => {
    if (link.superadminOnly && !user.is_superadmin) return false;
    return link.roles.includes(user.role);
  });
}

/** The register CTA is redundant once you already have an account. */
export function isGroupVisible(group, user) {
  return visibleLinks(group, user).length > 0;
}

/** Per-route label + group, used by the page header breadcrumb. */
export const ROUTE_META = ALL_SITE_LINKS.reduce((map, link) => {
  map[link.path] = { label: link.label, group: link.label };
  return map;
}, {});
