import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FlaskConical, Layers, Navigation } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { SiteHeader } from "@/components/layout/site-header";
import { getPublicFloorMap } from "@/modules/facilities/public";
import { FloorMapView, SpaceLegend } from "@/modules/facilities/components/floor-map-view";
import { AvailabilityPill } from "@/modules/occupancy/components/availability-pill";
import { countStatuses, toPublicAvailability } from "@/modules/occupancy/availability";
import { SPACE_TYPE_LABEL, type SpaceType } from "@/lib/labels";
import { demoRoute } from "@/modules/floorplans/route";

type Props = { params: Promise<{ slug: string; floorId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, floorId } = await params;
  const data = await getPublicFloorMap(slug, floorId).catch(() => null);
  return data ? { title: `${data.facility.name} — piso ${data.floor.name}` } : { title: "Mapa do piso" };
}

export default async function FloorPage({ params }: Props) {
  const { slug, floorId } = await params;
  const data = await getPublicFloorMap(slug, floorId);
  if (!data) notFound();
  const { facility: f, floor, plan, spaces, sectors, elements } = data;
  const a = toPublicAvailability({ counts: countStatuses(spaces.map((s) => s.status)), capacity: spaces.length, updatedAt: f.availability.updatedAt, sourceKind: f.availability.sourceKind, now: new Date() });
  const ratio = plan.widthPx && plan.heightPx ? plan.heightPx / plan.widthPx : 0.625;
  const bySector = sectors.map((s) => ({ ...s, free: spaces.filter((x) => x.sectorId === s.id && x.status === "AVAILABLE").length, total: spaces.filter((x) => x.sectorId === s.id).length }));
  const freeByType = (["PCD", "EV", "MOTO"] as SpaceType[]).map((t) => ({ t, n: spaces.filter((s) => s.type === t && s.status === "AVAILABLE").length }));
  const nav = f.navigateTo;
  // "Inside the facility": recommend the sector with most free spaces and draw a demonstrative route.
  const best = [...bySector].sort((x, y) => y.free - x.free)[0];
  const target = best && best.free > 0 ? spaces.find((s) => s.sectorId === best.id && s.status === "AVAILABLE") : undefined;
  const entrance = elements.find((e) => e.kind === "ENTRANCE");
  const route = target ? demoRoute(entrance, target, elements.filter((e) => e.kind === "CIRCULATION")) : [];
  const mapped = f.floorsWithMap.filter((x) => x.hasMap);
  const bestFloor = [...mapped].sort((x, y) => y.counts.available - x.counts.available)[0];
  const total = spaces.length;
  return (
    <>
      <SiteHeader />
      <main id="conteudo" className="mx-auto max-w-6xl px-4 pt-4 pb-10 sm:px-6">
        <Link href={`/estacionamentos/${f.slug}`} className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-asphalt-600 hover:text-fg">
          <ArrowLeft className="size-4" aria-hidden /> {f.name}
        </Link>
        {/* What matters first: how many free spaces on this floor, and whether another floor is better. */}
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <div>
            <h1 className="text-title font-semibold">Piso {floor.name}</h1>
            <p className="mt-1 flex items-baseline gap-2">
              <span className={cn("font-display text-figure font-bold", a.state === "FULL" ? "text-status-occupied" : a.state === "UNKNOWN" ? "text-asphalt-500" : "text-fg")}>
                {a.state === "UNKNOWN" ? "—" : a.state === "FULL" ? "Lotado" : a.available}
              </span>
              {a.state !== "FULL" && a.state !== "UNKNOWN" && <span className="text-asphalt-600">{a.available === 1 ? "vaga livre" : "vagas livres"} de {total}</span>}
            </p>
            <div className="mt-2">
              <AvailabilityPill a={a} size="sm" showUpdated />
            </div>
          </div>
          {bestFloor && bestFloor.floorId !== floor.id && bestFloor.counts.available > (a.available ?? 0) && (
            <Link href={`/estacionamentos/${f.slug}/pisos/${bestFloor.floorId}`} className="press inline-flex min-h-11 items-center gap-2 rounded-full border border-green-300 bg-green-50 px-4 text-sm font-semibold text-fg hover:border-green-500">
              <Layers className="size-4 text-green-600" aria-hidden /> Melhor piso agora: {bestFloor.name} · {bestFloor.counts.available} livres
            </Link>
          )}
        </div>
        {/* Floor selector — stays reachable while scrolling the plan */}
        <nav aria-label="Pisos" className="sticky top-16 z-30 -mx-4 mt-4 border-b border-line bg-canvas/95 px-4 py-2 backdrop-blur sm:mx-0 sm:rounded-full sm:border sm:px-1.5 sm:py-1.5">
          <ul className="no-scrollbar flex gap-1.5 overflow-x-auto">
            {mapped.map((x) => {
              const on = x.floorId === floor.id;
              return (
                <li key={x.floorId} className="shrink-0">
                  <Link
                    href={`/estacionamentos/${f.slug}/pisos/${x.floorId}`}
                    aria-current={on ? "page" : undefined}
                    className={cn("press inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold", on ? "bg-ink-900 text-white dark:bg-green-400 dark:text-ink-950" : "text-asphalt-700 hover:bg-asphalt-100")}
                  >
                    {x.name}
                    <span className={cn("text-xs", on ? "opacity-80" : x.counts.available === 0 ? "text-status-occupied" : "text-status-available")}>{x.counts.available === 0 ? "Lotado" : `${x.counts.available} livres`}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="mt-5 grid gap-8 lg:grid-cols-[1fr_280px]">
          {/* key: a new floor fades in, so the change of floor is perceived as a transition, not a jump */}
          <div key={floor.id} className="animate-fade-in space-y-3">
            <FloorMapView imageUrl={plan.imageUrl} ratio={ratio} spaces={spaces} elements={elements} route={route} targetId={target?.id} />
            <SpaceLegend />
            {a.simulated && (
              <p className="flex items-center gap-1.5 text-xs text-reserved-fg">
                <FlaskConical className="size-3.5" aria-hidden /> Status das vagas simulado para demonstração.
              </p>
            )}
          </div>
          <aside className="space-y-6">
            {best && best.free > 0 && (
              <section className="rounded-lg border border-green-200 bg-green-50 p-4">
                <h2 className="font-semibold text-fg">Setor recomendado: {best.name}</h2>
                <p className="mt-1 text-sm text-asphalt-700">
                  {best.free} vagas livres agora. {entrance ? `Entre pela ${(entrance.label ?? "entrada principal").toLowerCase()} e siga a rota tracejada.` : "Siga a sinalização até o setor."}
                </p>
                <p className="mt-2 text-xs text-asphalt-500">Rota ilustrativa — ainda não há navegação interna em tempo real.</p>
              </section>
            )}
            <section>
              <h2 className="font-semibold">Vagas livres por setor</h2>
              <ul className="mt-2 divide-y divide-line border-y border-line text-sm">
                {bySector.map((s) => (
                  <li key={s.id} className="flex items-center justify-between py-2.5">
                    <span className="flex items-center gap-2"><span className="size-3 rounded-sm" style={{ background: s.color }} aria-hidden /> Setor {s.name}</span>
                    <span className="font-semibold text-fg">{s.free === 0 ? "Lotado" : `${s.free} de ${s.total}`}</span>
                  </li>
                ))}
              </ul>
            </section>
            <section>
              <h2 className="font-semibold">Vagas especiais livres</h2>
              <ul className="mt-2 divide-y divide-line border-y border-line text-sm">
                {freeByType.map(({ t, n }) => (
                  <li key={t} className="flex justify-between py-2.5"><span>{SPACE_TYPE_LABEL[t]}</span><span className="font-semibold">{n}</span></li>
                ))}
              </ul>
            </section>
            <a href={`https://www.google.com/maps/dir/?api=1&destination=${nav.lat},${nav.lng}`} target="_blank" rel="noopener noreferrer" className={buttonClasses("accent", "lg", "w-full")}>
              <Navigation className="size-5" aria-hidden /> Ir até lá
            </a>
          </aside>
        </div>
      </main>
    </>
  );
}
