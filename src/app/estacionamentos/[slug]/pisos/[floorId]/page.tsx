import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Navigation } from "lucide-react";
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
  return (
    <>
      <SiteHeader />
      <main id="conteudo" className="mx-auto max-w-6xl px-4 py-5 sm:px-6">
        <Link href={`/estacionamentos/${f.slug}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-asphalt-600 hover:text-fg">
          <ArrowLeft className="size-4" aria-hidden /> {f.name}
        </Link>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold">Piso {floor.name}</h1>
            <div className="mt-2">
              <AvailabilityPill a={a} showUpdated />
            </div>
          </div>
          <nav aria-label="Outros pisos" className="flex flex-wrap gap-2">
            {f.floorsWithMap.filter((x) => x.hasMap).map((x) => (
              <Link key={x.floorId} href={`/estacionamentos/${f.slug}/pisos/${x.floorId}`} aria-current={x.floorId === floor.id ? "page" : undefined} className={x.floorId === floor.id ? "rounded-full bg-ink-900 px-4 py-2 text-sm font-semibold text-white" : "rounded-full border border-asphalt-200 bg-surface px-4 py-2 text-sm font-semibold hover:border-fg"}>
                {x.name} · {x.counts.available === 0 ? "Lotado" : `${x.counts.available} livres`}
              </Link>
            ))}
          </nav>
        </div>
        <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_280px]">
          <div className="space-y-3">
            <FloorMapView imageUrl={plan.imageUrl} ratio={ratio} spaces={spaces} elements={elements} route={route} />
            <SpaceLegend />
            {a.simulated && <p className="text-xs text-reserved-fg">Status das vagas simulado para demonstração.</p>}
          </div>
          <aside className="space-y-4">
            {best && best.free > 0 && (
              <section className="rounded-lg border border-green-200 bg-green-50 p-4">
                <h2 className="font-semibold text-fg">Setor recomendado: {best.name}</h2>
                <p className="mt-1 text-sm text-asphalt-700">
                  {best.free} vagas livres agora. {entrance ? `Entre pela ${(entrance.label ?? "entrada principal").toLowerCase()} e siga a rota tracejada.` : "Siga a sinalização até o setor."}
                </p>
                <p className="mt-2 text-xs text-asphalt-500">Rota ilustrativa — ainda não há navegação interna em tempo real.</p>
              </section>
            )}
            <section className="rounded-lg border border-asphalt-100 bg-surface p-4">
              <h2 className="font-semibold">Vagas livres por setor</h2>
              <ul className="mt-3 space-y-2 text-sm">
                {bySector.map((s) => (
                  <li key={s.id} className="flex items-center justify-between">
                    <span className="flex items-center gap-2"><span className="size-3 rounded-sm" style={{ background: s.color }} aria-hidden /> Setor {s.name}</span>
                    <span className="font-semibold text-fg">{s.free === 0 ? "Lotado" : `${s.free} de ${s.total}`}</span>
                  </li>
                ))}
              </ul>
            </section>
            <section className="rounded-lg border border-asphalt-100 bg-surface p-4">
              <h2 className="font-semibold">Vagas especiais livres</h2>
              <ul className="mt-3 space-y-1.5 text-sm">
                {freeByType.map(({ t, n }) => (
                  <li key={t} className="flex justify-between"><span>{SPACE_TYPE_LABEL[t]}</span><span className="font-semibold">{n}</span></li>
                ))}
              </ul>
            </section>
            <a href={`https://www.google.com/maps/dir/?api=1&destination=${nav.lat},${nav.lng}`} target="_blank" rel="noopener noreferrer" className="flex h-12 items-center justify-center gap-2 rounded-md bg-green-400 font-semibold text-ink-950 hover:bg-green-300">
              <Navigation className="size-5" aria-hidden /> Ir até lá
            </a>
          </aside>
        </div>
      </main>
    </>
  );
}
