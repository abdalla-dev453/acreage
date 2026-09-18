import { Link } from 'react-router-dom';

export default function Privacy() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] py-16 px-4">
      <div className="max-w-3xl mx-auto prose prose-slate prose-sm">
        <h1>Privacy Policy</h1>
        <p>
          At Acreage, we are committed to protecting your personal information and being
          transparent about how we collect, use, and share your data.
        </p>

        <h2>Information We Collect</h2>
        <p>
          We collect information you provide directly to us, including your name, email
          address, phone number, location, and business details when you register an account.
          We also collect information about your transactions, orders, and communications
          through our platform.
        </p>

        <h2>How We Use Your Information</h2>
        <p>
          We use your information to provide, maintain, and improve our services, process
          transactions, communicate with you, and ensure platform security. We may also use
          aggregated, anonymized data for analytics and product improvements.
        </p>

        <h2>Information Sharing</h2>
        <p>
          We do not sell your personal information. We may share your information with
          trusted service providers who assist us in operating our platform, and with other
          users as necessary to facilitate transactions (e.g., your username and location may
          be visible to trading partners).
        </p>

        <h2>Your Rights</h2>
        <p>
          You have the right to access, update, or delete your personal information through
          your account settings. You may also request account deletion by contacting us.
        </p>

        <h2>Data Security</h2>
        <p>
          We implement industry-standard security measures to protect your data. All passwords
          are hashed using Werkzeug's security module, and API communications are secured with
          JWT authentication.
        </p>

        <h2>Changes to This Policy</h2>
        <p>
          We may update this policy from time to time. We will notify you of any material
          changes by posting the new policy on this page.
        </p>

        <p className="text-xs text-slate-500">
          Last updated: September 17, 2026
        </p>

        <div className="mt-8 pt-6 border-t border-slate-200">
          <Link to="/" className="text-green-600 hover:underline font-medium">
            Back to Acreage
          </Link>
        </div>
      </div>
    </div>
  );
}
