import { Link } from 'react-router-dom';
import { CheckCircle, Sprout } from 'lucide-react';
export default function ThankYou() {
  return (
    <main className="status-page" data-testid="thank-you-container">
      <div className="status-icon" aria-hidden="true">
        <CheckCircle size={32} strokeWidth={2} />
      </div>
      <h1 data-testid="thank-you-heading">Registration complete</h1>
      <p>
        Your account has been created successfully. Sign in to start listing
        crops, taking orders, and tracking your harvest.
      </p>
      <Link to="/login" className="status-cta" data-testid="thank-you-signin-btn">
        Sign in
      </Link>
      <Link to="/marketplace" className="status-secondary" data-testid="thank-you-marketplace-btn">
        <Sprout size={14} strokeWidth={2.2} />
        Preview the marketplace
      </Link>
    </main>
  );
}
