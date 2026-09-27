import { Link } from 'react-router-dom';
import { CheckCircle, Sprout } from 'lucide-react';
export default function ThankYou() {
  return (
    <div className="status-page">
      <div className="status-icon">
        <CheckCircle size={32} strokeWidth={2} />
      </div>
      <h1>Registration complete</h1>
      <p>
        Your account has been created successfully. Sign in to start listing
        crops, taking orders, and tracking your harvest.
      </p>
      <Link to="/login" className="status-cta">
        Sign in
      </Link>
      <Link to="/marketplace" className="status-secondary">
        <Sprout size={14} strokeWidth={2.2} />
        Preview the marketplace
      </Link>
    </div>
  );
}
