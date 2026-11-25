import { createContext, useCallback, useContext, useState } from 'react';
import type { ReactNode } from 'react';

type Kind = 'ok' | 'error';
interface ToastItem {
  id: number;
  text: string;
  kind: Kind;
}
interface ToastApi {
  show: (text: string, kind?: Kind) => void;
}

const ToastContext = createContext<ToastApi | null>(null);
let nextId = 1;

/** Notifikasi singkat di pojok bawah (di mobile di atas navigasi bawah). */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const show = useCallback((text: string, kind: Kind = 'ok') => {
    const id = nextId++;
    setItems((list) => [...list, { id, text, kind }]);
    window.setTimeout(() => setItems((list) => list.filter((t) => t.id !== id)), 3200);
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`toast ${t.kind}`}>{t.text}</div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast harus dipakai di dalam ToastProvider');
  return ctx;
}
