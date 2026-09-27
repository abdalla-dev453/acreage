import { useContext, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  Mail,
  MapPin,
  Phone,
  Sprout,
} from "lucide-react";
import { AuthContext } from "../../context/AuthContext";
import { useTranslation } from "react-i18next";
import { SITE_MENU_GROUPS, visibleLinks } from "./siteLinks";

const TRUST_POINTS = [
  "Verified farmers & buyers",
  "Escrow-protected settlements",
  "M-Pesa & bank payouts",
];

/** The three menu groups worth repeating in the footer, minus the auth rows. */
const FOOTER_GROUP_IDS = ["platform", "tools", "account"];

export default function PremiumFooter() {
  const { user } = useContext(AuthContext);
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (event) => {
    event.preventDefault();
    if (!email.trim()) return;
    setSubscribed(true);
    setEmail("");
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const year = new Date().getFullYear();

  // Built from the same registry the navbar reads, so a new route appears in
  // the footer for free instead of needing a second hand-maintained list.
  const columns = SITE_MENU_GROUPS.filter((group) =>
    FOOTER_GROUP_IDS.includes(group.id),
  ).map((group) => ({ ...group, links: visibleLinks(group, user) }));

  return (
    <footer className="premium-footer" role="contentinfo">
      <div className="footer-accent" aria-hidden="true" />

      <div className="footer-inner">
        {/* ── Brand + newsletter ─────────────────────────────────── */}
        <div className="footer-brand">
          <Link to={user ? "/dashboard" : "/"} className="footer-brand-mark">
            <span className="footer-brand-icon">
              <Sprout size={20} strokeWidth={2.5} />
            </span>
            <span>
              <span className="footer-brand-name">ACREAGE</span>
              <span className="footer-brand-sub">Be Today, Be Nature!</span>
            </span>
          </Link>
          <p className="footer-tagline">
            {t(
              "footer.tagline",
              "The ledger for your whole harvest — list crops, take orders and settle payouts in one place.",
            )}
          </p>

          <ul className="footer-trust">
            {TRUST_POINTS.map((point) => (
              <li key={point}>
                <CheckCircle2 size={15} strokeWidth={2.5} aria-hidden="true" />
                <span>{point}</span>
              </li>
            ))}
          </ul>

          <form className="footer-newsletter" onSubmit={handleSubscribe}>
            <label
              htmlFor="footer-newsletter-email"
              className="footer-newsletter-label"
            >
              {t("footer.newsletter", "Market briefs, monthly")}
            </label>
            {subscribed ? (
              <p className="footer-newsletter-done" role="status">
                {t("footer.newsletterDone", "You're on the list. Talk soon.")}
              </p>
            ) : (
              <div className="footer-newsletter-row">
                <input
                  id="footer-newsletter-email"
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder={t("footer.emailPlaceholder", "you@farm.co.ke")}
                />
                <button type="submit" aria-label={t("footer.subscribe", "Subscribe")}>
                  <ArrowRight size={16} strokeWidth={2.5} />
                </button>
              </div>
            )}
          </form>
        </div>

        {/* ── Link columns ────────────────────────────────────────── */}
        <nav
          className="footer-columns"
          aria-label={t("footer.linksLabel", "Footer navigation")}
        >
          {columns.map((group) => (
            <div className="footer-column" key={group.id}>
              <h3>{group.label}</h3>
              <ul>
                {group.links.map((link) => (
                  <li key={link.path}>
                    <Link to={link.path}>
                      <link.icon size={13} strokeWidth={2.2} aria-hidden="true" />
                      <span>{link.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div className="footer-column footer-column-contact">
            <h3>{t("footer.contact", "Contact")}</h3>
            <ul>
              <li>
                <a href="mailto:hello@acreage.co.ke">
                  <Mail size={14} strokeWidth={2.2} aria-hidden="true" />
                  <span>hello@acreage.co.ke</span>
                </a>
              </li>
              <li>
                <a href="tel:+254700000000">
                  <Phone size={14} strokeWidth={2.2} aria-hidden="true" />
                  <span>+254 700 000 000</span>
                </a>
              </li>
              <li>
                <span className="footer-static">
                  <MapPin size={14} strokeWidth={2.2} aria-hidden="true" />
                  <span>Nairobi, Kenya</span>
                </span>
              </li>
            </ul>
            <p className="footer-hours">
              {t("footer.hours", "Mon–Fri · 8:00–18:00 EAT")}
            </p>
            <button type="button" className="footer-top" onClick={scrollToTop}>
              Back to top
              <ArrowRight size={14} strokeWidth={2.5} />
            </button>
          </div>
        </nav>
      </div>

      {/* ── Bottom bar ───────────────────────────────────────────── */}
      <div className="footer-bottom">
        <p className="footer-copy">
          © {year} {t("footer.copy", "Acreage — grown for the local trade.")}
        </p>
        <div className="footer-legal">
          <Link to="/privacy">{t("footer.privacy", "Privacy")}</Link>
          <Link to="/terms">{t("footer.terms", "Terms")}</Link>
          <Link to="/trust-center">{t("footer.trust", "Trust center")}</Link>
          <Link to="/login">{t("footer.support", "Support")}</Link>
        </div>
        <p className="footer-made">
          {t("footer.madeIn", "Built for African growers")}
        </p>
      </div>
    </footer>
  );
}
