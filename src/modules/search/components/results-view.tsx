"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, SearchX, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { EmptyState, Skeleton } from "@/components/ui/states";
import { LinkButton } from "@/components/ui/button";
import type { FacilityResult } from "@/modules/facilities/public";
import { FacilityCard } from "./result-card";

const ResultsMap = dynamic(() => import("./results-map"), { ssr: false, loading: () => <Skeleton className="h-full w-full rounded-none" /> });

type Props = {
  results: FacilityResult[];
  center: { lat: number; lng: number };
  hasCenter: boolean;
  originQuery: string;
  emptyResetHref: string;
  header: React.ReactNode;
  title: string;
};

/**
 * Discovery view — list and map stay in sync (hover/select a card ↔ highlight its pin).
 * Desktop: list (~40%) | map (~60%). Mobile: full-bleed map + bottom sheet.
 */
export function ResultsView({ results, center, hasCenter, originQuery, emptyResetHref, header, title }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const cardRefs = useRef(new Map<string, HTMLElement>());
  const carouselRefs = useRef(new Map<string, HTMLLIElement>());

  useEffect(() => {
    if (!selectedId) return;
    cardRefs.current.get(selectedId)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    carouselRefs.current.get(selectedId)?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [selectedId]);

  const href = (r: FacilityResult) => `/estacionamentos/${r.slug}${originQuery ? `?${originQuery}` : ""}`;
  const empty = results.length === 0;
  const selected = results.find((r) => r.id === selectedId) ?? null;

  const emptyState = (
    <EmptyState
      icon={<SearchX className="size-6" aria-hidden />}
      title="Nenhum shopping encontrado"
      description="Tente outro destino, aumente a distância ou remova alguns filtros."
      action={
        <LinkButton href={emptyResetHref} variant="secondary">
          Limpar filtros
        </LinkButton>
      }
    />
  );

  return (
    <div className="relative flex min-h-0 flex-1">
      {/* Desktop list (~40%) */}
      <section aria-label="Shoppings" className="hidden min-h-0 w-[40%] max-w-[560px] min-w-[400px] shrink-0 overflow-y-auto border-r border-asphalt-100 bg-white lg:block">
        <div className="space-y-3 px-6 py-5">
          {header}
          {empty ? (
            emptyState
          ) : (
            <ul className="space-y-3">
              {results.map((r) => (
                <li key={r.id}>
                  <FacilityCard
                    ref={(el) => {
                      if (el) cardRefs.current.set(r.id, el);
                    }}
                    r={r}
                    href={href(r)}
                    selected={r.id === selectedId || r.id === hoveredId}
                    onHover={setHoveredId}
                    onSelect={setSelectedId}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Map (~60% desktop, full-bleed mobile) */}
      <section aria-label="Mapa de shoppings" className="relative min-h-0 flex-1">
        <ResultsMap
          results={results}
          center={center}
          hasCenter={hasCenter}
          selectedId={selectedId}
          hoveredId={hoveredId}
          onSelect={(id) => {
            setSelectedId(id);
            setSheetExpanded(false);
          }}
        />

        {/* Mobile bottom sheet */}
        <div
          className={cn("absolute inset-x-0 bottom-0 z-[500] flex flex-col rounded-t-xl bg-white shadow-[0_-10px_30px_-12px_rgba(12,34,25,.35)] lg:hidden", sheetExpanded ? "h-[82%]" : "h-auto")}
          role="region"
          aria-label="Shoppings encontrados"
        >
          <button type="button" onClick={() => setSheetExpanded((v) => !v)} className="flex w-full flex-col items-center px-4 pt-2 pb-2" aria-expanded={sheetExpanded}>
            <span className="h-1.5 w-10 rounded-full bg-asphalt-200" aria-hidden />
            <span className="mt-2 flex w-full items-center justify-between">
              <span className="text-left text-[15px] font-semibold text-ink-900">{title}</span>
              <span className="inline-flex items-center gap-1 text-sm font-semibold text-green-700">
                {sheetExpanded ? (
                  <>
                    Ver mapa <ChevronDown className="size-4" aria-hidden />
                  </>
                ) : (
                  <>
                    Ver lista <ChevronUp className="size-4" aria-hidden />
                  </>
                )}
              </span>
            </span>
          </button>
          {sheetExpanded ? (
            <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6">
              {header}
              <div className="mt-3">
                {empty ? (
                  emptyState
                ) : (
                  <ul className="space-y-3">
                    {results.map((r) => (
                      <li key={r.id}>
                        <FacilityCard r={r} href={href(r)} selected={r.id === selectedId} />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ) : selected ? (
            <div className="relative px-4 pb-4" aria-live="polite">
              <button onClick={() => setSelectedId(null)} className="absolute top-1 right-5 z-10 grid size-8 place-items-center rounded-full bg-asphalt-50 hover:bg-asphalt-100" aria-label="Fechar">
                <X className="size-4" aria-hidden />
              </button>
              <FacilityCard r={selected} href={href(selected)} compact />
            </div>
          ) : empty ? (
            <p className="px-4 pb-5 text-sm text-asphalt-500">Nenhum shopping nesta região. Tente outro destino ou remova filtros.</p>
          ) : (
            <ul className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-4" aria-label="Shoppings próximos">
              {results.slice(0, 12).map((r) => (
                <li
                  key={r.id}
                  ref={(el) => {
                    if (el) carouselRefs.current.set(r.id, el);
                  }}
                  className="w-[84%] max-w-sm shrink-0 snap-center"
                >
                  <FacilityCard r={r} href={href(r)} compact onSelect={setSelectedId} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
