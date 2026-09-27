import { Link } from 'react-router-dom';
import { ArrowLeft, Compass, Sprout } from 'lucide-react';
export default function NotFound() {
  return (
    <div className="status-page">
      <div className="status-icon">
        <Compass size={30} strokeWidth={2} />
      </div>
      <p className="status-code">Error 404</p>
      <h1>This field came up empty</h1>
      <p>
        The page you were looking for does not exist, or it has been moved
        somewhere else in the field. Try heading back to the marketplace.
      </p>
      <Link to="/" className="status-cta">
        <ArrowLeft size={15} strokeWidth={2.5} />
        Return home
      </Link>
      <Link to="/marketplace" className="status-secondary">
        <Sprout size={14} strokeWidth={2.2} />
        Browse the marketplace instead
      </Link>
    </div>
  );
}
