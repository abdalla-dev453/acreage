import { useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { Smartphone } from 'lucide-react';

const HIDDEN_PATHS = ['/login', '/register', '/thank-you'];

export default function MobileCTA() {
  const { user } = useContext(AuthContext);
  const location = useLocation();

  if (HIDDEN_PATHS.includes(location.pathname) || user) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 shadow-xl px-4 py-3 md:hidden">
      <div className="flex items-center justify-between max-w-lg mx-auto">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-200/50 dark:border-emerald-800/50">
            <Smartphone className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Join Acreage today</p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">Direct trade, zero middlemen</p>
          </div>
        </div>
        <Link
          to="/register"
          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition shrink-0 ml-2 shadow-sm"
        >
          Get Started
        </Link>
      </div>
    </div>
  );
}
