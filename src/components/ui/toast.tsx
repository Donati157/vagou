"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/cn";

type Tone = "success" | "error" | "info";
type Toast = { id: number; tone: Tone; message: string };

const ToastContext = createContext<(message: string, tone?: Tone) => void>(() => {});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((message: string, tone: Tone = "success") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, tone, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500);
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-20 z-[1000] flex flex-col items-center gap-2 px-4 sm:bottom-6 sm:items-end sm:px-6">
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.tone === "error" ? "alert" : "status"}
            className={cn(
              "pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-md px-4 py-3 text-sm text-white shadow-lg animate-slide-up",
              t.tone === "success" && "bg-ink-900",
              t.tone === "error" && "bg-red-700",
              t.tone === "info" && "bg-asphalt-800",
            )}
          >
            {t.tone === "success" ? <CheckCircle2 className="size-5 shrink-0 text-green-300" aria-hidden /> : t.tone === "error" ? <AlertCircle className="size-5 shrink-0" aria-hidden /> : <Info className="size-5 shrink-0" aria-hidden />}
            <p className="flex-1">{t.message}</p>
            <button onClick={() => setToasts((all) => all.filter((x) => x.id !== t.id))} aria-label="Fechar aviso" className="opacity-70 hover:opacity-100">
              <X className="size-4" aria-hidden />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
