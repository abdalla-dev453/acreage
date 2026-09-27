import { useContext, useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Bell,
  ChevronDown,
  LayoutGrid,
  LogOut,
  Menu,
  Moon,
  Phone,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sprout,
  Sun,
  Wallet,
  X,
} from "lucide-react";
import { AuthContext } from "../../context/AuthContext";
import { SettingsContext } from "../../context/SettingsContext";
import LanguageSelector from "./LanguageSelector";
import { SITE_MENU_GROUPS, isLinkActive, visibleLinks } from "./siteLinks";

const THEMES = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
  { value: "system", label: "System", Icon: LayoutGrid },
];

/** The next theme in the cycle, so one button covers light / dark / system. */
function ThemeToggle() {
  const { settings, updateSetting } = useContext(SettingsContext);
  const current = settings?.theme || "system";
  const index = THEMES.findIndex((theme) => theme.value === current);
  const next = THEMES[(index + 1) % THEMES.length];

  return (
    <button
      type="button"
      className="utility-button"
      onClick={() => updateSetting("theme", next.value)}
      aria-label={`Theme: ${current}. Switch to ${next.label.toLowerCase()}`}
      title={`Theme: ${current}`}
    >
      <next.Icon size={14} strokeWidth={2.4} />
      <span className="utility-button-label">{next.label}</span>
    </button>
  );
}

export default function PremiumSiteNav() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  const [openGroup, setOpenGroup] = useState(null);
  const [openSections, setOpenSections] = useState(() => new Set());
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const headerRef = useRef(null);

  const toggleSection = (id) => {
    setOpenSections((previous) => {
      const next = new Set(previous);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  };

  // A navigation always dismisses whatever was open, otherwise the mega-panel
  // keeps floating over the page the visitor just asked for.
  useEffect(() => {
    setOpenGroup(null);
    setOpenSections(new Set());
    setDrawerOpen(false);
    setSearchOpen(false);
  }, [location.pathname]);

  // Lock the page behind the mobile drawer so the menu scrolls on its own.
  useEffect(() => {
    if (!drawerOpen) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [drawerOpen]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key !== "Escape") return;
      setOpenGroup(null);
      setOpenSections(new Set());
      setDrawerOpen(false);
      setSearchOpen(false);
    };
    const onPointerDown = (event) => {
      if (!headerRef.current?.contains(event.target)) setOpenGroup(null);
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, []);

  const signOut = () => {
    logout();
    setDrawerOpen(false);
    navigate("/");
  };

  const submitSearch = (event) => {
    event.preventDefault();
    if (!search.trim()) return;
    navigate(`/search?q=${encodeURIComponent(search.trim())}`);
    setSearchOpen(false);
    setDrawerOpen(false);
  };

  const initials = (user?.username || "?").trim().slice(0, 2).toUpperCase();
  const groups = SITE_MENU_GROUPS.map((group) => ({
    ...group,
    links: visibleLinks(group, user),
  })).filter((group) => group.links.length > 0);
  const activeGroup = groups.find((group) =>
    group.links.some((link) => isLinkActive(location.pathname, link.path)),
  );

  return (
    <header className="premium-site-nav" ref={headerRef}>
      {/* ── Utility rail: trust signals + global preferences ─────────────── */}
      <div className="premium-utility">
        <div className="premium-utility-inner">
          <div className="utility-identity">
            <span className="utility-tagline">Be Today, Be Nature!</span>
            <span className="utility-rule" aria-hidden="true" />
            <span className="utility-item">
              <ShieldCheck size={13} strokeWidth={2.4} aria-hidden="true" />
              Escrow-protected settlements
            </span>
            <span className="utility-item">
              <Sprout size={13} strokeWidth={2.4} aria-hidden="true" />
              Verified farmers &amp; buyers
            </span>
          </div>
          <div className="utility-controls">
            <a className="utility-item utility-link" href="tel:+254700000000">
              <Phone size={13} strokeWidth={2.4} aria-hidden="true" />
              +254 700 000 000
            </a>
            <ThemeToggle />
            <LanguageSelector variant="ghost" />
          </div>
        </div>
      </div>

      {/* ── Main bar ─────────────────────────────────────────────────────── */}
      <div className="premium-site-nav-inner">
        <Link
          to={user ? "/dashboard" : "/"}
          className="brand-mark"
          onClick={() => setDrawerOpen(false)}
        >
          <span className="brand-icon">
            <Sprout size={19} strokeWidth={2.6} />
          </span>
          <span className="brand-copy">
            <span className="brand-name">ACREAGE</span>
          </span>
        </Link>

        {/* Every destination the old sidebar listed now lives here, grouped
            into panels so the bar stays one line tall on desktop. */}
        <nav className="premium-links" aria-label="Main navigation">
          {groups.map((group) => {
            const isOpen = openGroup === group.id;
            const isActive =
              activeGroup?.id === group.id ||
              group.links.some((link) => isLinkActive(location.pathname, link.path));
            return (
              <div
                key={group.id}
                className={`nav-group${isOpen ? " open" : ""}`}
                onMouseEnter={() => setOpenGroup(group.id)}
                onMouseLeave={() => setOpenGroup(null)}
              >
                <button
                  type="button"
                  className={`nav-group-trigger${isActive ? " active" : ""}`}
                  aria-expanded={isOpen}
                  aria-haspopup="true"
                  onClick={() => setOpenGroup(isOpen ? null : group.id)}
                >
                  {group.label}
                  <ChevronDown
                    size={13}
                    className={isOpen ? "nav-caret open" : "nav-caret"}
                  />
                </button>
              </div>
            );
          })}
        </nav>

        <div className="premium-actions">
          <form
            className={`nav-search${searchOpen ? " open" : ""}`}
            onSubmit={submitSearch}
            role="search"
          >
            <Search size={15} strokeWidth={2.4} aria-hidden="true" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onFocus={() => setSearchOpen(true)}
              placeholder="Search produce, orders…"
              aria-label="Search Acreage"
            />
          </form>

          {user ? (
            <>
              <Link className="nav-icon" to="/orders" aria-label="Orders" title="Orders">
                <ShoppingBag size={17} strokeWidth={2.2} />
              </Link>
              <Link className="nav-icon" to="/wallet" aria-label="Wallet" title="Wallet">
                <Wallet size={17} strokeWidth={2.2} />
              </Link>
              <Link
                className="nav-icon notification-icon"
                to="/profile"
                aria-label="Notifications"
                title="Notifications"
              >
                <Bell size={17} strokeWidth={2.2} />
                <i />
              </Link>
              <div className="user-menu">
                <span className="user-avatar">{initials}</span>
                <span className="user-name">{user.username}</span>
                <ChevronDown size={14} />
                <div className="user-dropdown">
                  <span className="user-dropdown-role">{user.role}</span>
                  <Link to="/profile">Profile</Link>
                  <Link to="/wallet">Wallet &amp; payouts</Link>
                  <Link to="/settings">Settings</Link>
                  <Link to="/trust-center">Trust center</Link>
                  <button type="button" onClick={signOut}>
                    <LogOut size={13} strokeWidth={2.4} />
                    Sign out
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="nav-auth">
              <Link to="/login" className="nav-signin">
                Sign in
              </Link>
              <Link to="/register" className="nav-login">
                Get started
              </Link>
            </div>
          )}

          <button
            type="button"
            className="nav-menu-button"
            onClick={() => setDrawerOpen((value) => !value)}
            aria-label={drawerOpen ? "Close menu" : "Open menu"}
            aria-expanded={drawerOpen}
          >
            {drawerOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* ── Mega panel ───────────────────────────────────────────────────── */}
      {openGroup && (
        <div
          className="nav-mega"
          onMouseEnter={() => setOpenGroup(openGroup)}
          onMouseLeave={() => setOpenGroup(null)}
        >
          <div className="nav-mega-inner">
            <aside className="nav-mega-aside">
              <p className="nav-mega-eyebrow">
                {groups.find((group) => group.id === openGroup)?.label}
              </p>
              <p className="nav-mega-title">
                {groups.find((group) => group.id === openGroup)?.blurb}
              </p>
              <p className="nav-mega-note">
                Every page in Acreage sits in this bar — nothing is hidden behind
                a sidebar.
              </p>
            </aside>
            <div className="nav-mega-grid">
              {groups
                .find((group) => group.id === openGroup)
                ?.links.map((link) => (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`nav-mega-link${
                      isLinkActive(location.pathname, link.path) ? " active" : ""
                    }`}
                    onClick={() => setOpenGroup(null)}
                  >
                    <span className="nav-mega-icon">
                      <link.icon size={17} strokeWidth={2.2} />
                    </span>
                    <span className="nav-mega-copy">
                      <span className="nav-mega-label">{link.label}</span>
                      <span className="nav-mega-blurb">{link.blurb}</span>
                    </span>
                  </Link>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Mobile drawer: the same registry, stacked ────────────────────── */}
      {drawerOpen && (
        <div className="premium-mobile-menu">
          <form className="mobile-search" onSubmit={submitSearch} role="search">
            <Search size={15} strokeWidth={2.4} aria-hidden="true" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search Acreage…"
              aria-label="Search Acreage"
            />
          </form>

          {groups.map((group, index) => {
            // The first group starts open so the drawer is useful on arrival
            // instead of presenting four collapsed labels. A Set keeps every
            // section independently collapsible.
            const expanded = openSections.has(group.id) || (openSections.size === 0 && index === 0);
            return (
              <div key={group.id} className="mobile-nav-group">
                <button
                  type="button"
                  className="mobile-nav-summary"
                  aria-expanded={expanded}
                  onClick={() => toggleSection(group.id)}
                >
                  {group.label}
                  <ChevronDown
                    size={15}
                    className={expanded ? "nav-caret open" : "nav-caret"}
                  />
                </button>
                {expanded && (
                  <div className="mobile-nav-links">
                    {group.links.map((link) => (
                      <NavLink
                        key={link.path}
                        to={link.path}
                        className={({ isActive }) => (isActive ? "active" : "")}
                        onClick={() => setDrawerOpen(false)}
                      >
                        <link.icon size={15} strokeWidth={2.2} aria-hidden="true" />
                        <span>
                          <span className="mobile-nav-label">{link.label}</span>
                          <span className="mobile-nav-blurb">{link.blurb}</span>
                        </span>
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {user ? (
            <div className="mobile-account">
              <div className="mobile-account-identity">
                <span className="user-avatar">{initials}</span>
                <span>
                  <span className="mobile-account-name">{user.username}</span>
                  <span className="mobile-account-role">{user.role}</span>
                </span>
              </div>
              <button type="button" onClick={signOut}>
                <LogOut size={14} strokeWidth={2.4} />
                Sign out
              </button>
            </div>
          ) : (
            <div className="mobile-account">
              <Link
                to="/login"
                className="mobile-signin"
                onClick={() => setDrawerOpen(false)}
              >
                Sign in
              </Link>
              <Link
                to="/register"
                className="mobile-cta"
                onClick={() => setDrawerOpen(false)}
              >
                Get started
              </Link>
            </div>
          )}

          {/* The utility rail's phone link is hidden on small screens, so the
              number moves here rather than disappearing entirely. */}
          <a className="mobile-support" href="tel:+254700000000">
            <Phone size={14} strokeWidth={2.4} aria-hidden="true" />
            <span>Call support · +254 700 000 000</span>
          </a>
        </div>
      )}
    </header>
  );
}
