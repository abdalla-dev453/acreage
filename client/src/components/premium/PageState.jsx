import { AlertTriangle, Inbox, Loader2 } from 'lucide-react';

export function LoadingState({ label = 'Loading live data...' }) {
  return (
    <div className="flex min-h-[18rem] flex-col items-center justify-center rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800/80 p-8 text-center" role="status" aria-live="polite">
      <Loader2 className="h-7 w-7 animate-spin text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
      <p className="mt-3 text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">{label}</p>
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="flex min-h-[18rem] flex-col items-center justify-center rounded-2xl border border-rose-100 dark:border-rose-900/40 bg-rose-50/60 dark:bg-rose-950/30 p-8 text-center" role="alert">
      <AlertTriangle className="h-7 w-7 text-rose-500 dark:text-rose-400" aria-hidden="true" />
      <p className="mt-3 max-w-md text-sm font-bold text-rose-700 dark:text-rose-300">{message || 'Unable to load this workspace.'}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 rounded-xl bg-rose-600 dark:bg-rose-700 px-4 py-2 text-xs font-bold text-white transition hover:bg-rose-700 dark:hover:bg-rose-600 disabled:opacity-50"
        >
          Try Again
        </button>
      )}
    </div>
  );
}

export function EmptyState({ icon: Icon = Inbox, title, description, action }) {
  return (
    <div className="flex min-h-[15rem] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 p-8 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 dark:bg-slate-900 text-slate-400 dark:text-slate-500">
        <Icon className="h-6 w-6" aria-hidden="true" />
      </div>
      <h3 className="mt-4 text-sm font-bold text-slate-800 dark:text-white">{title || 'Nothing here'}</h3>
      {description && <p className="mt-1 max-w-md text-xs leading-relaxed text-slate-500 dark:text-slate-400">{description}</p>}
      {action}
    </div>
  );
}
