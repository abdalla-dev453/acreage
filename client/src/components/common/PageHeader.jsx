import { useContext } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { AuthContext } from "../../context/AuthContext";
import { SITE_MENU_GROUPS, isLinkActive } from "./siteLinks";

/** Which menu group owns a path, so the crumb can name the section. */
function groupForPath(pathname) {
  for (const group of SITE_MENU_GROUPS) {
    if (group.links.some((link) => isLinkActive(pathname, link.path))) {
      return group;
    }
  }
  return null;
}

/**
 * The in-page heading. The old per-page `Navbar` repeated the global search,
 * notification bell, avatar and language switch that the top bar now owns, so
 * every authenticated page rendered two navigation bars. This keeps only what
 * a page header is actually for: where you are, what the page is, who you are.
 */
export default function PageHeader({ title, description, actions }) {
  const { user } = useContext(AuthContext);
  const { pathname } = useLocation();
  const group = groupForPath(pathname);

  return (
    <motion.header
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="page-header"
    >
      <div className="page-header-main">
        <nav className="page-breadcrumb" aria-label="Breadcrumb">
          <Link to={user ? "/dashboard" : "/"}>Acreage</Link>
          {group && (
            <>
              <ChevronRight size={12} strokeWidth={2.6} aria-hidden="true" />
              <span>{group.label}</span>
            </>
          )}
          {title && (
            <>
              <ChevronRight size={12} strokeWidth={2.6} aria-hidden="true" />
              <span aria-current="page">{title}</span>
            </>
          )}
        </nav>

        <div className="page-header-titles">
          <h1 className="page-header-title">{title}</h1>
          {description && <p className="page-header-description">{description}</p>}
        </div>
      </div>

      <div className="page-header-aside">
        {actions}
        {user?.role && <span className="page-header-role">{user.role}</span>}
      </div>
    </motion.header>
  );
}
