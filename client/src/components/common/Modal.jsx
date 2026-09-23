import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export default function Modal({ isOpen, onClose, title, children, maxWidth = 'max-w-md' }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity duration-300 animate-fade-in"
        onClick={onClose}
      />

      <div className={`relative w-full ${maxWidth} bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700 p-5 sm:p-6 z-10 transform transition-all duration-300 scale-100 max-h-[90vh] flex flex-col`}>
        <div className="flex items-center justify-between pb-3.5 sm:pb-4 border-b border-slate-100 dark:border-slate-700 shrink-0">
          <h3 className="text-base sm:text-lg font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">{title}</h3>
          <button
            onClick={onClose}
            aria-label="Close modal dialog"
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-all active:scale-95"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-4 overflow-y-auto pr-1 flex-1 text-sm text-slate-600 dark:text-slate-300 leading-relaxed custom-scrollbar">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
