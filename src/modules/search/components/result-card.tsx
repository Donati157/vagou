import Link from "next/link";
import { forwardRef } from "react";
import { Accessibility, BatteryCharging, Clock, Footprints, Layers, Umbrella } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatDistance, formatNumber } from "@/lib/format";
import { AvailabilityPill } from "@/modules/occupancy/components/availability-pill";
import type { FacilityResult } from "@/modules/facilities/public";

type Props = {
  r: FacilityResult;
  href: string;
  selected?: boolean;
  compact?: boolean;
  onHover?: (id: string | null) => void;
  onSelect?: (id: string) => void;
};

export const FacilityCard = forwardRef<HTMLElement, Props>(function FacilityCard({ r, href, selected, compact, onHover, onSelect }, ref) {
  return (
    <article
      ref={ref}
      onMouseEnter={() => onHover?.(r.id)}
      onMouseLeave={() => onHover?.(null)}
      onClick={() => onSelect?.(r.id)}
      aria-current={selected ? "true" : undefined}
      className={cn(
        "group rounded-lg border bg-surface transition-all",
        compact ? "p-3" : "p-4",
        selected ? "border-fg shadow-md ring-2 ring-green-300" : "border-asphalt-100 hover:border-asphalt-300 hover:shadow-sm",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className={cn("font-semibold text-fg", compact ? "line-clamp-1 text-[15px]" : "text-base leading-snug")}>{r.name}</h3>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-asphalt-500">
            <span>{r.neighborhood}</span>
            {r.distanceMeters !== null && (
              <span className="inline-flex items-center gap-1 font-medium text-asphalt-700">
                <Footprints className="size-3.5" aria-hidden /> {formatDistance(r.distanceMeters)}
              </span>
            )}
          </p>
        </div>
        {r.availability.capacity > 0 && (
          <p className="shrink-0 text-right">
            <span className="font-display text-lg leading-none font-bold text-fg">{formatNumber(r.availability.capacity)}</span>
            <span className="block text-[11px] text-asphalt-500">vagas no total</span>
          </p>
        )}
      </div>

      <div className="mt-3">
        <AvailabilityPill a={r.availability} />
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-asphalt-600">
          <span className={cn("inline-flex items-center gap-1 font-semibold", r.open ? "text-status-available" : "text-danger")}>
            <Clock className="size-3.5" aria-hidden /> {r.openLabel}
          </span>
          {r.covered && (
            <span className="inline-flex items-center gap-1">
              <Umbrella className="size-3.5" aria-hidden /> Coberto
            </span>
          )}
          {r.accessible && (
            <span className="inline-flex items-center gap-1">
              <Accessibility className="size-3.5" aria-hidden /> PCD
            </span>
          )}
          {r.mappedFloors > 0 && (
            <span className="inline-flex items-center gap-1">
              <Layers className="size-3.5" aria-hidden /> Planta de {r.mappedFloors} {r.mappedFloors === 1 ? "piso" : "pisos"}
            </span>
          )}
          {r.evChargers > 0 && (
            <span className="inline-flex items-center gap-1">
              <BatteryCharging className="size-3.5" aria-hidden /> EV
            </span>
          )}
        </p>
        {!compact && (
          <Link href={href} onClick={(e) => e.stopPropagation()} className="inline-flex h-9 items-center rounded-md bg-green-400 px-4 text-sm font-semibold text-ink-950 hover:bg-green-300">
            Ver shopping
          </Link>
        )}
      </div>
      {compact && (
        <Link href={href} className="mt-3 flex h-10 w-full items-center justify-center rounded-md bg-green-400 text-sm font-semibold text-ink-950 hover:bg-green-300">
          Ver shopping
        </Link>
      )}
    </article>
  );
});
