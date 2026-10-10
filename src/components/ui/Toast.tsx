import React, { useState, useEffect, createContext, useContext } from 'react';
import { CheckCircle2, AlertCircle, Info, X, AlertTriangle } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextType {
  toasts: ToastItem[];
  showToast: (toast: Omit<ToastItem, 'id'>) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = (toast: Omit<ToastItem, 'id'>) => {
    // Prevent duplicate active toasts with the exact same title & message
    setToasts((prev) => {
      const isDuplicate = prev.some(
        (t) => t.title === toast.title && t.message === toast.message
      );
      if (isDuplicate) return prev;

      const id = Math.random().toString(36).substring(2, 9);
      const newToast: ToastItem = { ...toast, id };
      
      const duration = toast.duration || 4000;
      setTimeout(() => {
        removeToast(id);
      }, duration);

      return [...prev.slice(-3), newToast]; // Keep max 4 active toasts
    });
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ toasts, showToast, removeToast }}>
      {children}
      {/* Toast Notification Float Viewport */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto rounded-2xl p-4 shadow-2xl border transition-all duration-200 animate-in fade-in slide-in-from-bottom-3 ${
              toast.type === 'success'
                ? 'bg-emerald-950/95 text-emerald-100 border-emerald-700/80 shadow-emerald-950/50'
                : toast.type === 'error'
                ? 'bg-rose-950/95 text-rose-100 border-rose-700/80 shadow-rose-950/50'
                : toast.type === 'warning'
                ? 'bg-amber-950/95 text-amber-100 border-amber-700/80 shadow-amber-950/50'
                : 'bg-slate-900/95 text-slate-100 border-slate-700/80 shadow-slate-950/50'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="shrink-0 mt-0.5">
                {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-400" />}
                {toast.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-400" />}
                {toast.type === 'info' && <Info className="w-5 h-5 text-cyan-400" />}
              </div>

              <div className="flex-1 min-w-0 pr-1">
                <div className="text-xs font-bold leading-tight">{toast.title}</div>
                {toast.message && (
                  <div className="text-[11px] opacity-85 mt-1 leading-snug break-words">
                    {toast.message}
                  </div>
                )}
              </div>

              <button
                onClick={() => removeToast(toast.id)}
                className="shrink-0 opacity-60 hover:opacity-100 p-1 rounded-lg hover:bg-white/10 transition-opacity cursor-pointer"
                aria-label="Close notification"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    // Fallback if provider not wrapped
    return {
      toasts: [],
      showToast: (toast: Omit<ToastItem, 'id'>) => console.log('Toast:', toast.title, toast.message),
      removeToast: () => {},
    };
  }
  return context;
};
