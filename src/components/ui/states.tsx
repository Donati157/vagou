import { AlertTriangle, Inbox, Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

export function EmptyState({ icon, title, description, action, className }: { icon?: React.ReactNode; title: string; description?: string; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center rounded-lg border border-dashed border-asphalt-200 bg-surface px-6 py-12 text-center", className)}>
      <div className="mb-4 grid size-12 place-items-center rounded-full bg-green-50 text-green-600">{icon ?? <Inbox className="size-6" aria-hidden />}</div>
      <h3 className="text-lg font-semibold">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-[15px] text-asphalt-500">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ title = "Algo deu errado", description = "Não foi possível carregar esta página agora. Tente novamente em instantes.", action, className }: { title?: string; description?: string; action?: React.ReactNode; className?: string }) {
  return (
    <div role="alert" className={cn("flex flex-col items-center justify-center rounded-lg border border-red-100 bg-surface px-6 py-12 text-center", className)}>
      <div className="mb-4 grid size-12 place-items-center rounded-full bg-red-50 text-danger">
        <AlertTriangle className="size-6" aria-hidden />
      </div>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-1 max-w-sm text-[15px] text-asphalt-500">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function LoadingState({ label = "Carregando…", className }: { label?: string; className?: string }) {
  return (
    <div role="status" aria-live="polite" className={cn("flex items-center justify-center gap-2 py-16 text-asphalt-500", className)}>
      <Loader2 className="size-5 animate-spin" aria-hidden />
      <span className="text-[15px]">{label}</span>
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-md bg-asphalt-100", className)} />;
}

export function PageSkeleton() {
  return (
    <div role="status" aria-label="Carregando" className="space-y-6">
      <Skeleton className="h-8 w-56" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-72" />
    </div>
  );
}

export function Alert({ tone = "info", title, children, className, icon }: { tone?: "info" | "success" | "warning" | "danger"; title?: string; children?: React.ReactNode; className?: string; icon?: React.ReactNode }) {
  const tones = {
    info: "bg-blue-50 border-blue-100 text-blue-900",
    success: "bg-green-50 border-green-100 text-green-700",
    warning: "bg-status-reserved-bg border-amber-200 text-reserved-fg",
    danger: "bg-red-50 border-red-100 text-red-800",
  };
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={cn("flex gap-3 rounded-md border px-4 py-3 text-sm", tones[tone], className)}>
      {icon && <span className="mt-0.5 shrink-0">{icon}</span>}
      <div>
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={title ? "mt-0.5" : ""}>{children}</div>}
      </div>
    </div>
  );
}
