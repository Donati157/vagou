import { FlaskConical } from "lucide-react";
import { cn } from "@/lib/cn";

/** Marks simulated data/features. Never let simulated data look like real telemetry. */
export function DemoBadge({ label = "Modo demonstração", className, title }: { label?: string; className?: string; title?: string }) {
  return (
    <span
      title={title ?? "Dados simulados para demonstração — não representam medições reais."}
      className={cn("inline-flex items-center gap-1.5 rounded-full border border-dashed border-amber-400 bg-status-reserved-bg px-2.5 py-0.5 text-xs font-semibold text-[#7a5200]", className)}
    >
      <FlaskConical className="size-3.5" aria-hidden />
      {label}
    </span>
  );
}
