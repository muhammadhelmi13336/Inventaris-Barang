import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertOctagon, Info } from 'lucide-react';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning';
}

interface ToastContainerProps {
  toasts: Toast[];
  onRemove: (id: string) => void;
}

export default function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  return (
    <div className="fixed top-5 right-5 z-[110] flex flex-col gap-2 pointer-events-none max-w-sm w-full">
      <AnimatePresence>
        {toasts.map((toast) => {
          let wrapperClass = 'bg-white border-slate-100 text-slate-800';
          let icon = <Info className="w-5 h-5 text-slate-600 shrink-0" />;

          if (toast.type === 'success') {
            wrapperClass = 'border-emerald-100 text-emerald-800 bg-emerald-50/90 backdrop-blur-xs';
            icon = <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />;
          } else if (toast.type === 'error') {
            wrapperClass = 'border-rose-100 text-rose-800 bg-rose-50/90 backdrop-blur-xs';
            icon = <AlertOctagon className="w-5 h-5 text-rose-600 shrink-0" />;
          } else if (toast.type === 'warning') {
            wrapperClass = 'border-amber-100 text-amber-800 bg-amber-50/90 backdrop-blur-xs';
            icon = <AlertOctagon className="w-5 h-5 text-amber-600 shrink-0" />;
          }

          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 15, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
              layout
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-semibold shadow-lg pointer-events-auto ${wrapperClass}`}
            >
              {icon}
              <span className="flex-1 leading-snug">{toast.message}</span>
              <button
                type="button"
                onClick={() => onRemove(toast.id)}
                className="text-slate-400 hover:text-slate-600 font-bold ml-1 text-xs cursor-pointer focus:outline-none"
              >
                ✕
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
