/**
 * Toast Context
 *
 * Global toast notification system for showing errors, warnings, and info messages.
 */

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { AlertCircle, CheckCircle, AlertTriangle, Info, X } from 'lucide-react';
import { cn } from '../lib/utils';

export type ToastType = 'error' | 'success' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number; // ms, 0 = persistent
  dismissible?: boolean;
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => string;
  removeToast: (id: string) => void;
  clearToasts: () => void;
  // Convenience methods
  error: (message: string, title?: string) => string;
  success: (message: string, title?: string) => string;
  warning: (message: string, title?: string) => string;
  info: (message: string, title?: string) => string;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

// Generate unique ID
let toastIdCounter = 0;
const generateId = () => `toast-${++toastIdCounter}-${Date.now()}`;

// Default durations by type
const DEFAULT_DURATIONS: Record<ToastType, number> = {
  error: 8000,
  success: 4000,
  warning: 6000,
  info: 5000,
};

interface ToastProviderProps {
  children: React.ReactNode;
  maxToasts?: number;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({
  children,
  maxToasts = 5
}) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      timersRef.current.forEach((timer) => clearTimeout(timer));
    };
  }, []);

  const removeToast = useCallback((id: string) => {
    // Clear timer if exists
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }

    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((toast: Omit<Toast, 'id'>): string => {
    const id = generateId();
    const duration = toast.duration ?? DEFAULT_DURATIONS[toast.type];
    const dismissible = toast.dismissible ?? true;

    const newToast: Toast = {
      ...toast,
      id,
      duration,
      dismissible,
    };

    setToasts((prev) => {
      // Remove oldest if at max
      const updated = prev.length >= maxToasts ? prev.slice(1) : prev;
      return [...updated, newToast];
    });

    // Auto-dismiss after duration (if not 0)
    if (duration > 0) {
      const timer = setTimeout(() => {
        removeToast(id);
      }, duration);
      timersRef.current.set(id, timer);
    }

    return id;
  }, [maxToasts, removeToast]);

  const clearToasts = useCallback(() => {
    timersRef.current.forEach((timer) => clearTimeout(timer));
    timersRef.current.clear();
    setToasts([]);
  }, []);

  // Convenience methods
  const error = useCallback((message: string, title?: string) => {
    return addToast({ type: 'error', message, title });
  }, [addToast]);

  const success = useCallback((message: string, title?: string) => {
    return addToast({ type: 'success', message, title });
  }, [addToast]);

  const warning = useCallback((message: string, title?: string) => {
    return addToast({ type: 'warning', message, title });
  }, [addToast]);

  const info = useCallback((message: string, title?: string) => {
    return addToast({ type: 'info', message, title });
  }, [addToast]);

  const value: ToastContextValue = {
    toasts,
    addToast,
    removeToast,
    clearToasts,
    error,
    success,
    warning,
    info,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </ToastContext.Provider>
  );
};

// Toast Container - renders toasts in fixed position
interface ToastContainerProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}

const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
};

// Individual Toast Item
interface ToastItemProps {
  toast: Toast;
  onDismiss: (id: string) => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onDismiss }) => {
  const [isExiting, setIsExiting] = useState(false);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => onDismiss(toast.id), 200);
  };

  const icons: Record<ToastType, React.ReactNode> = {
    error: <AlertCircle size={18} />,
    success: <CheckCircle size={18} />,
    warning: <AlertTriangle size={18} />,
    info: <Info size={18} />,
  };

  const styles: Record<ToastType, string> = {
    error: 'bg-red-950/95 border-red-500/50 text-red-100',
    success: 'bg-green-950/95 border-green-500/50 text-green-100',
    warning: 'bg-amber-950/95 border-amber-500/50 text-amber-100',
    info: 'bg-blue-950/95 border-blue-500/50 text-blue-100',
  };

  const iconStyles: Record<ToastType, string> = {
    error: 'text-red-400',
    success: 'text-green-400',
    warning: 'text-amber-400',
    info: 'text-blue-400',
  };

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-3 rounded-lg border shadow-lg backdrop-blur-sm',
        'animate-in slide-in-from-right-full duration-300',
        isExiting && 'animate-out slide-out-to-right-full duration-200',
        styles[toast.type]
      )}
      role="alert"
    >
      <div className={cn('shrink-0 mt-0.5', iconStyles[toast.type])}>
        {icons[toast.type]}
      </div>

      <div className="flex-1 min-w-0">
        {toast.title && (
          <p className="font-medium text-sm mb-0.5">{toast.title}</p>
        )}
        <p className="text-sm opacity-90 break-words">{toast.message}</p>
      </div>

      {toast.dismissible && (
        <button
          onClick={handleDismiss}
          className="shrink-0 p-1 rounded hover:bg-white/10 transition-colors opacity-70 hover:opacity-100"
          aria-label="Dismiss"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
};
