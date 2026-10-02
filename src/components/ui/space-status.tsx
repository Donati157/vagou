import { Ban, CarFront, CheckCircle2, Clock } from "lucide-react";
import { cn } from "@/lib/cn";
import { SPACE_STATUS_LABEL, type SpaceStatus } from "@/lib/labels";

/** Color + icon + label + pattern, so status never depends on color alone. */
export const SPACE_STATUS_STYLE: Record<SpaceStatus, { fill: string; stroke: string; text: string; bg: string; pattern: string; Icon: typeof CheckCircle2 }> = {
  AVAILABLE: { fill: "#1f9d55", stroke: "#147a40", text: "text-status-available", bg: "bg-status-available-bg", pattern: "", Icon: CheckCircle2 },
  OCCUPIED: { fill: "#d63c3c", stroke: "#a82a2a", text: "text-status-occupied", bg: "bg-status-occupied-bg", pattern: "", Icon: CarFront },
  RESERVED: { fill: "#e8a317", stroke: "#a67406", text: "text-reserved-fg", bg: "bg-status-reserved-bg", pattern: "pattern-dots", Icon: Clock },
  UNAVAILABLE: { fill: "#8c9893", stroke: "#5f6965", text: "text-status-unavailable", bg: "bg-status-unavailable-bg", pattern: "pattern-hatch", Icon: Ban },
};

export function SpaceStatusBadge({ status, className }: { status: SpaceStatus; className?: string }) {
  const s = SPACE_STATUS_STYLE[status];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold", s.bg, s.text, className)}>
      <s.Icon className="size-3.5" aria-hidden />
      {SPACE_STATUS_LABEL[status]}
    </span>
  );
}
