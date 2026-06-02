import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmationDialogProps {
  isOpen: boolean;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmationDialog({
  isOpen,
  message,
  onConfirm,
  onCancel,
}: ConfirmationDialogProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Overlay backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
          />

          {/* Modal body */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="relative bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-sm overflow-hidden p-6 space-y-4 z-10"
          >
            <div className="flex items-center gap-3 text-amber-500">
              <AlertTriangle className="w-8 h-8 shrink-0" />
              <h3 className="font-bold text-slate-800 text-lg">Konfirmasi Tindakan</h3>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">{message}</p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-semibold text-slate-500 hover:bg-slate-50 transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl text-sm transition-all shadow-sm cursor-pointer"
              >
                Ya, Hapus
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
