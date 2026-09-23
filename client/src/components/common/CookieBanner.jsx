import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function CookieBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const accepted = localStorage.getItem('cookies-accepted');
    if (!accepted) {
      setShow(true);
    }
  }, []);

  const accept = () => {
    localStorage.setItem('cookies-accepted', 'true');
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 shadow-2xl px-4 py-4 md:py-3">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 text-xs sm:text-sm">
        <p className="text-slate-600 dark:text-slate-300 font-medium text-center sm:text-left">
          We use cookies to improve your experience and for analytics. By continuing, you accept our{' '}
          <Link to="/privacy" className="text-green-600 dark:text-emerald-400 font-bold hover:underline">Privacy Policy</Link> and{' '}
          <Link to="/terms" className="text-green-600 dark:text-emerald-400 font-bold hover:underline">Terms of Use</Link>.
        </p>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={accept}
            className="px-5 py-2 bg-green-600 hover:bg-green-700 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white font-bold rounded-xl transition text-xs uppercase tracking-wider shadow-sm"
          >
            Accept All
          </button>
        </div>
      </div>
    </div>
  );
}
