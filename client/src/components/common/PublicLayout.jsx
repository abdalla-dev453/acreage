import { Outlet } from "react-router-dom";
import PremiumSiteNav from "./PremiumSiteNav";
import PremiumFooter from "./PremiumFooter";
import ErrorBoundary from "./ErrorBoundary";

/**
 * Shared chrome for every public (unauthenticated) route: sticky premium
 * navigation, the routed page, and the premium footer. The main area flexes
 * so short pages (login, 404) still pin the footer to the bottom of the
 * viewport instead of floating it mid-screen.
 */
export default function PublicLayout() {
  return (
    <div className="site-shell">
      <PremiumSiteNav />
      <main className="site-main site-main-public">
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>
      <PremiumFooter />
    </div>
  );
}
