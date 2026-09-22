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
      // Try to fetch a small resource to test connection
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
    <div className={`fixed top-0 left-0 right-0 z-50 px-4 py-3 ${
      isOnline ? 'bg-green-50 border-b border-green-200' : 'bg-amber-50 border-b border-amber-200'
    }`}>
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          {isOnline ? (
            <Wifi className="w-5 h-5 text-green-600" />
          ) : (
            <WifiOff className="w-5 h-5 text-amber-600" />
          )}
          <div>
            <p className={`text-sm font-semibold ${isOnline ? 'text-green-800' : 'text-amber-800'}`}>
              {isOnline ? 'Connection Restored' : 'You\'re Offline'}
            </p>
            <p className={`text-xs ${isOnline ? 'text-green-600' : 'text-amber-600'}`}>
              {isOnline 
                ? 'Your data is syncing...' 
                : 'Working with cached data. Changes will sync when connection is restored.'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {!isOnline && (
            <button
              onClick={handleRetry}
              disabled={isRetrying}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-100 hover:bg-amber-200 rounded-lg transition disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
              Retry
            </button>
          )}
          <button
            onClick={() => setShowBanner(false)}
            className="p-1 hover:bg-white/50 rounded-lg transition"
          >
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>
      </div>
    </div>
  );
}
