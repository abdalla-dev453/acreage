import { Link } from 'react-router-dom';
import { Sprout, Home, ShoppingBag, ArrowRight } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center px-4 py-16">
      <div className="text-center max-w-md">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-xl bg-green-100 text-green-600 flex items-center justify-center">
            <Sprout className="w-8 h-8" />
          </div>
        </div>
        <h1 className="font-bold text-6xl text-slate-900 mb-2">404</h1>
        <p className="text-slate-500 font-medium mb-6">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition text-sm uppercase tracking-wider"
        >
          <Home className="w-4 h-4" />
          Return Home
        </Link>
      </div>
    </div>
  );
}
