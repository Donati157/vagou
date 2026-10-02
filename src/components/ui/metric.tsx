import { cn } from "@/lib/cn";

export function Metric({ label, value, hint, icon, className, trend }: { label: string; value: React.ReactNode; hint?: React.ReactNode; icon?: React.ReactNode; className?: string; trend?: { value: string; positive: boolean } }) {
  return (
    <div className={cn("rounded-lg border border-asphalt-100 bg-white p-4 shadow-xs", className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-asphalt-500">{label}</p>
        {icon && <span className="text-asphalt-400" aria-hidden>{icon}</span>}
      </div>
      <p className="mt-2 font-display text-2xl font-semibold tracking-tight text-ink-900 tabular-nums">{value}</p>
      {(hint || trend) && (
        <p className="mt-1 text-xs text-asphalt-500">
          {trend && <span className={cn("mr-1 font-semibold", trend.positive ? "text-green-600" : "text-danger")}>{trend.value}</span>}
          {hint}
        </p>
      )}
    </div>
  );
}
