import { useEffect } from 'react';
import { createPortal } from 'react-dom'; // 1. Added React Portal engine binding
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

  // 2. Wrap layout structure inside createPortal to mount directly at the HTML document body root level
  return createPortal(
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"      // Accessibility tag
      aria-modal="true"  // Traps keyboard visibility reader scopes
    >
      {/* Dynamic Backdrop Layer */}
      <div 
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300 animate-fade-in"
        onClick={onClose}
      />

      {/* Modal Dialog Card Panel */}
      <div className={`relative w-full ${maxWidth} bg-white rounded-2xl shadow-xl border border-slate-100 p-6 z-10 transform transition-all duration-300 scale-100 max-h-[90vh] flex flex-col`}>
        {/* Banner Section Header bar */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
          <h3 className="text-lg font-extrabold text-slate-800 tracking-tight">{title}</h3>
          <button
            onClick={onClose}
            aria-label="Close modal dialog"
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all active:scale-95"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Interior Context Wrapper Area: Added auto overflow scroll for massive modal content items */}
        <div className="mt-4 overflow-y-auto pr-1 flex-1 text-sm text-slate-600 leading-relaxed">
          {children}
        </div>
      </div>
    </div>,
    document.body // Appends modal HTML elements out of deeply nested DOM hierarchies directly to body root
  );
}
