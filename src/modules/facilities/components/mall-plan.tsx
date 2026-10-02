"use client";

import Link from "next/link";
import { useState } from "react";
import { Expand, Layers } from "lucide-react";
import { cn } from "@/lib/cn";
import type { SpaceStatus } from "@/lib/labels";
import { FloorMapView, SpaceLegend } from "./floor-map-view";

type Counts = { available: number; occupied: number; reserved: number; unavailable: number };
type FloorMap = {
  floorId: string;
  name: string;
  counts: Counts;
  imageUrl: string | null;
  ratio: number;
  spaces: Array<{ id: string; code: string; type: string; status: SpaceStatus; x: number; y: number; w: number; h: number; rotation: number }>;
  elements: Array<{ id: string; kind: string; label: string | null; x: number; y: number; w: number; h: number }>;
  sectors: Array<{ id: string; name: string; color: string; total: number; free: number }>;
};

/** The mall's plan on the public page: one tab per floor with its digital map of spaces. */
export function MallPlan({ slug, floors, simulated }: { slug: string; floors: FloorMap[]; simulated: boolean }) {
  const [active, setActive] = useState(floors[0]?.floorId ?? null);
  const floor = floors.find((f) => f.floorId === active) ?? floors[0];
  if (!floor) return null;
  const total = floor.counts.available + floor.counts.occupied + floor.counts.reserved + floor.counts.unavailable;

  return (
    <div className="space-y-4">
      <div role="tablist" aria-label="Pisos do shopping" className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1">
        {floors.map((f) => {
          const on = f.floorId === floor.floorId;
          return (
            <button
              key={f.floorId}
              type="button"
              role="tab"
              aria-selected={on}
              aria-controls="planta-piso"
              onClick={() => setActive(f.floorId)}
              className={cn("press inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-semibold", on ? "border-ink-900 bg-ink-900 text-white dark:border-green-400 dark:bg-green-400 dark:text-ink-950" : "border-asphalt-200 bg-surface text-asphalt-700 hover:border-fg")}
            >
              <Layers className="size-4" aria-hidden />
              {f.name}
              <span className={cn("rounded-full px-2 py-0.5 text-xs", on ? "bg-white/15 dark:bg-ink-950/15" : f.counts.available === 0 ? "bg-status-occupied-bg text-status-occupied" : "bg-status-available-bg text-status-available")}>
                {f.counts.available === 0 ? "Lotado" : `${f.counts.available} livres`}
              </span>
            </button>
          );
        })}
      </div>

      <div key={floor.floorId} id="planta-piso" role="tabpanel" aria-label={`Planta do piso ${floor.name}`} className="animate-fade-in space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-asphalt-600">
          <p>
            Piso <strong className="text-fg">{floor.name}</strong>: {floor.counts.available} livres de {total} vagas
            {simulated && <span className="ml-2 text-xs font-semibold text-reserved-fg">(status simulado)</span>}
          </p>
          <Link href={`/estacionamentos/${slug}/pisos/${floor.floorId}`} className="inline-flex items-center gap-1.5 font-semibold text-green-700 hover:underline">
            <Expand className="size-4" aria-hidden /> Ver planta em tela cheia
          </Link>
        </div>
        <FloorMapView imageUrl={floor.imageUrl} ratio={floor.ratio} spaces={floor.spaces} elements={floor.elements} />
        <SpaceLegend />
        {floor.sectors.length > 0 && (
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4" aria-label="Vagas livres por setor">
            {floor.sectors.map((s) => (
              <li key={s.id} className="flex items-center justify-between rounded-md border border-asphalt-100 bg-surface px-3 py-2 text-sm">
                <span className="flex items-center gap-2">
                  <span className="size-3 rounded-sm" style={{ background: s.color }} aria-hidden /> Setor {s.name}
                </span>
                <span className="font-semibold text-fg">{s.free === 0 ? "Lotado" : `${s.free}/${s.total}`}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
