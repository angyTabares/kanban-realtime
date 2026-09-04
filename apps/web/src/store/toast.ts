import { create } from 'zustand';

type ToastType = 'success' | 'error' | 'info';
interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastState {
  toasts: Toast[];
  push: (message: string, type?: ToastType) => void;
  dismiss: (id: string) => void;
}

export const useToast = create<ToastState>((set) => ({
  toasts: [],
  push: (message, type = 'info') => {
    const id = Math.random().toString(36).slice(2, 9);
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 4000);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

/** Mensaje seguro para el usuario (no expone stack ni detalles internos) */
export function toUserMessage(err: unknown, fallback = 'Ocurrió un error. Intenta de nuevo.'): string {
  if (err instanceof Error) {
    const m = err.message?.trim();
    if (m && m.length < 200 && !m.includes(' at ') && !m.includes('Exception')) return m;
  }
  if (typeof err === 'string' && err.length < 200) return err;
  return fallback;
}
