import { cn } from "@/lib/cn";
import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type ToastTone = "success" | "error" | "info";
interface ToastItem {
  id: number;
  tone: ToastTone;
  message: string;
}
interface ToastApi {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const noop: ToastApi = { success() {}, error() {}, info() {} };
const ToastContext = createContext<ToastApi>(noop);

// Safe to call without a provider (it becomes a no-op), which keeps unit tests simple.
export const useToast = () => useContext(ToastContext);

const toneClass: Record<ToastTone, string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-900",
  error: "border-red-200 bg-red-50 text-red-900",
  info: "border-slate-200 bg-white text-slate-900",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);
  const timers = useRef<number[]>([]);

  useEffect(
    () => () => timers.current.forEach((t) => window.clearTimeout(t)),
    [],
  );

  const push = useCallback((tone: ToastTone, message: string) => {
    const id = nextId.current++;
    setItems((prev) => [...prev, { id, tone, message }]);
    timers.current.push(
      window.setTimeout(
        () => setItems((prev) => prev.filter((t) => t.id !== id)),
        tone === "error" ? 8000 : 4000,
      ),
    );
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      success: (m) => push("success", m),
      error: (m) => push("error", m),
      info: (m) => push("info", m),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 p-4 sm:items-end"
      >
        {items.map((t) => (
          <div
            key={t.id}
            role={t.tone === "error" ? "alert" : "status"}
            className={cn(
              "pointer-events-auto w-full max-w-sm rounded-lg border px-4 py-3 text-sm shadow-overlay",
              toneClass[t.tone],
            )}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
