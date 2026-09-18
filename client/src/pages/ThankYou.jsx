import { Link } from 'react-router-dom';
import { CheckCircle, Sprout } from 'lucide-react';

export default function ThankYou() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center px-4 py-16">
      <div className="text-center max-w-md bg-white rounded-2xl border border-slate-100 shadow-sm p-8">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
            <CheckCircle className="w-8 h-8" />
          </div>
        </div>
        <h1 className="font-bold text-2xl text-slate-900 mb-2">Registration Complete</h1>
        <p className="text-slate-500 font-medium mb-6">
          Your account has been created successfully. You can now sign in to start
          listing crops, taking orders, and tracking your harvest.
        </p>
        <Link
          to="/login"
          className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition text-sm uppercase tracking-wider"
        >
          Sign In
        </Link>
      </div>
    </div>
  );
}
