import { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, X } from 'lucide-react';

export default function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showBanner, setShowBanner] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowBanner(true);
      setTimeout(() => setShowBanner(false), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowBanner(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      await fetch('/', { method: 'HEAD', cache: 'no-store' });
      setIsOnline(true);
      setTimeout(() => setShowBanner(false), 2000);
    } catch (error) {
      setIsOnline(false);
    } finally {
      setIsRetrying(false);
    }
  };

  if (!showBanner) return null;

  return (
    <div className={`fixed top-0 left-0 right-0 z-50 px-4 py-3 shadow-md ${
      isOnline
        ? 'bg-emerald-50 dark:bg-emerald-950/90 border-b border-emerald-200 dark:border-emerald-800'
        : 'bg-amber-50 dark:bg-amber-950/90 border-b border-amber-200 dark:border-amber-800'
    }`}>
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          {isOnline ? (
            <Wifi className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          ) : (
            <WifiOff className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
          )}
          <div>
            <p className={`text-sm font-semibold ${isOnline ? 'text-emerald-800 dark:text-emerald-200' : 'text-amber-800 dark:text-amber-200'}`}>
              {isOnline ? 'Connection Restored' : 'You\'re Offline'}
            </p>
            <p className={`text-xs ${isOnline ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
              {isOnline 
                ? 'Your data is syncing...' 
                : 'Working with cached data. Changes will sync when connection is restored.'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 shrink-0">
          {!isOnline && (
            <button
              onClick={handleRetry}
              disabled={isRetrying}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-amber-800 dark:text-amber-200 bg-amber-100 dark:bg-amber-900/60 hover:bg-amber-200 dark:hover:bg-amber-900 border border-amber-300 dark:border-amber-700 rounded-lg transition disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
              Retry
            </button>
          )}
          <button
            onClick={() => setShowBanner(false)}
            className="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg transition"
            aria-label="Close banner"
          >
            <X className="w-4 h-4 text-slate-500 dark:text-slate-400" />
          </button>
        </div>
      </div>
    </div>
  );
}
