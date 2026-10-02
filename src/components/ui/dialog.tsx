"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "./button";

type DialogProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  /** "modal" centers; "drawer" slides from the right on desktop and from the bottom on mobile (bottom sheet). */
  variant?: "modal" | "drawer";
  className?: string;
};

/** Accessible dialog on top of the native <dialog> element (focus trap, Esc, inert background). */
export function Dialog({ open, onClose, title, description, children, footer, variant = "modal", className }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      aria-labelledby="dialog-title"
      className={cn(
        "m-0 max-h-none max-w-none bg-transparent p-0 backdrop:animate-fade-in open:flex",
        variant === "modal" ? "fixed inset-0 h-full w-full items-end justify-center sm:items-center" : "fixed inset-0 h-full w-full items-end justify-end sm:items-stretch",
      )}
    >
      <div
        className={cn(
          "flex w-full flex-col bg-white shadow-lg animate-slide-up",
          variant === "modal" ? "max-h-[90dvh] rounded-t-xl sm:max-w-lg sm:rounded-xl" : "max-h-[85dvh] rounded-t-xl sm:h-full sm:max-h-none sm:max-w-md sm:rounded-none",
          className,
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-asphalt-100 px-5 py-4">
          <div>
            <h2 id="dialog-title" className="text-lg font-semibold">
              {title}
            </h2>
            {description && <p className="mt-0.5 text-sm text-asphalt-500">{description}</p>}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Fechar">
            <X className="size-5" aria-hidden />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-asphalt-100 px-5 py-3">{footer}</div>}
      </div>
    </dialog>
  );
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirmar",
  danger,
  loading,
  children,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  danger?: boolean;
  loading?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Voltar
          </Button>
          <Button variant={danger ? "danger" : "primary"} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {children}
    </Dialog>
  );
}
