"use client";

import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";

type ToastTone = "success" | "error" | "info";

type ToastRecord = {
  id: number;
  tone: ToastTone;
  title: string;
  description?: string;
};

type ToastContextValue = {
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
  dismiss: (id: number) => void;
};

const TOAST_DURATION_MS = 4200;

const TOAST_STYLES: Record<
  ToastTone,
  {
    icon: typeof CheckCircle2;
    iconClassName: string;
    badgeClassName: string;
  }
> = {
  success: {
    icon: CheckCircle2,
    iconClassName: "text-[var(--accent-2)]",
    badgeClassName:
      "bg-[rgba(154,181,159,0.14)] text-[var(--accent-3)] ring-1 ring-[rgba(154,181,159,0.16)]",
  },
  error: {
    icon: AlertCircle,
    iconClassName: "text-[var(--accent)]",
    badgeClassName:
      "bg-[rgba(231,111,81,0.12)] text-[var(--accent)] ring-1 ring-[rgba(231,111,81,0.16)]",
  },
  info: {
    icon: Info,
    iconClassName: "text-[var(--foreground)]",
    badgeClassName:
      "bg-[rgba(210,180,140,0.1)] text-[var(--foreground)] ring-1 ring-[rgba(210,180,140,0.12)]",
  },
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const timeoutMapRef = useRef<Map<number, number>>(new Map());
  const nextIdRef = useRef(1);

  const dismiss = useCallback((id: number) => {
    const timeoutId = timeoutMapRef.current.get(id);

    if (timeoutId) {
      window.clearTimeout(timeoutId);
      timeoutMapRef.current.delete(id);
    }

    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const pushToast = useCallback(
    (tone: ToastTone, title: string, description?: string) => {
      const id = nextIdRef.current++;

      setToasts((current) => [...current, { id, tone, title, description }]);

      const timeoutId = window.setTimeout(() => {
        dismiss(id);
      }, TOAST_DURATION_MS);

      timeoutMapRef.current.set(id, timeoutId);
    },
    [dismiss],
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      success: (title, description) => pushToast("success", title, description),
      error: (title, description) => pushToast("error", title, description),
      info: (title, description) => pushToast("info", title, description),
      dismiss,
    }),
    [dismiss, pushToast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}

      <div
        aria-atomic="true"
        aria-live="polite"
        className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-[min(360px,calc(100vw-2rem))] flex-col gap-3"
      >
        {toasts.map((toast) => {
          const tone = TOAST_STYLES[toast.tone];
          const Icon = tone.icon;

          return (
            <div
              key={toast.id}
              className="toast-card pointer-events-auto flex items-start gap-3 rounded-[24px] border border-[var(--stroke)] bg-[rgba(255,255,255,0.92)] px-4 py-3 shadow-[0_24px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl"
              role="status"
            >
              <div
                className={[
                  "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl",
                  tone.badgeClassName,
                ].join(" ")}
              >
                <Icon className={["h-4 w-4", tone.iconClassName].join(" ")} />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-[var(--foreground)]">
                  {toast.title}
                </p>
                {toast.description ? (
                  <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                    {toast.description}
                  </p>
                ) : null}
              </div>

              <button
                aria-label="Fechar notificação"
                className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-full text-[var(--muted)] transition hover:bg-[rgba(15,23,42,0.04)] hover:text-[var(--foreground)]"
                type="button"
                onClick={() => dismiss(toast.id)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast precisa ser usado dentro de ToastProvider.");
  }

  return context;
}
