import { CircleSlash, FlaskConical, HelpCircle, ParkingSquare, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatRelative } from "@/lib/format";
import type { AvailabilityState, PublicAvailability } from "../availability";

export const AVAILABILITY_STYLE: Record<AvailabilityState, { bg: string; fg: string; pin: string; pinFg: string; Icon: typeof ParkingSquare }> = {
  AVAILABLE: { bg: "bg-status-available-bg", fg: "text-status-available", pin: "#2f8048", pinFg: "#ffffff", Icon: ParkingSquare },
  FEW: { bg: "bg-status-reserved-bg", fg: "text-[#8a5d00]", pin: "#e8a317", pinFg: "#3b2a00", Icon: TriangleAlert },
  FULL: { bg: "bg-status-occupied-bg", fg: "text-status-occupied", pin: "#d63c3c", pinFg: "#ffffff", Icon: CircleSlash },
  UNKNOWN: { bg: "bg-asphalt-100", fg: "text-asphalt-600", pin: "#8c9893", pinFg: "#ffffff", Icon: HelpCircle },
};

/** Headline availability with icon + text (never color alone) and an explicit "simulated" marker. */
export function AvailabilityPill({ a, size = "md", showUpdated = false, className }: { a: PublicAvailability; size?: "sm" | "md" | "lg"; showUpdated?: boolean; className?: string }) {
  const st = AVAILABILITY_STYLE[a.state];
  const text = a.state === "UNKNOWN" ? "Sem dados de ocupação" : a.state === "FULL" ? "Lotado" : `${a.available} ${a.available === 1 ? "vaga livre" : "vagas livres"}`;
  return (
    <span className={cn("inline-flex flex-wrap items-center gap-x-2 gap-y-1", className)}>
      <span className={cn("inline-flex items-center gap-1.5 rounded-full font-semibold whitespace-nowrap", st.bg, st.fg, size === "sm" ? "px-2 py-0.5 text-xs" : size === "lg" ? "px-3.5 py-1.5 text-base" : "px-2.5 py-1 text-sm")}>
        <st.Icon className={size === "lg" ? "size-5" : "size-4"} aria-hidden />
        {text}
        {a.state === "FEW" && <span className="sr-only">(poucas vagas)</span>}
      </span>
      {a.simulated && a.state !== "UNKNOWN" && (
        <span title="Dados simulados para demonstração — não representam a ocupação real." className="inline-flex items-center gap-1 text-xs font-semibold text-[#7a5200]">
          <FlaskConical className="size-3.5" aria-hidden /> simulado
        </span>
      )}
      {showUpdated && a.updatedAt && a.state !== "UNKNOWN" && <span className="text-xs text-asphalt-500">atualizado {formatRelative(a.updatedAt)}</span>}
    </span>
  );
}
