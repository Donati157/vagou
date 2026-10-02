import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { Accessibility, BatteryCharging, Building2, Car, Clock, DoorOpen, Footprints, Info, Layers, MapPin, Navigation, Phone, Ruler, ShieldCheck, Umbrella, UserRound } from "lucide-react";
import { SiteHeader } from "@/components/layout/site-header";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Badge } from "@/components/ui/badge";
import { getPublicFacility } from "@/modules/facilities/public";
import { weekSummary } from "@/modules/facilities/hours";
import { MallPlan } from "@/modules/facilities/components/mall-plan";
import { LazyLocationMap } from "@/modules/facilities/components/lazy-location-map";
import { FavoriteButton } from "@/modules/facilities/components/favorite-button";
import { AvailabilityPill } from "@/modules/occupancy/components/availability-pill";
import { getCurrentUser } from "@/modules/auth/session";
import { haversineMeters } from "@/modules/geo/geo";
import { db } from "@/server/db/client";
import { favorites } from "@/server/db/schema";
import { ENTRANCE_KIND_LABEL, VEHICLE_TYPE_LABEL } from "@/lib/labels";
import { formatDistance, formatNumber } from "@/lib/format";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ lat?: string; lng?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const f = await getPublicFacility(slug);
  if (!f) return { title: "Shopping não encontrado" };
  const description = `${f.name} em ${f.neighborhood}, São Paulo: quantas vagas tem, quantas estão livres agora e a planta do estacionamento.`;
  return { title: f.name, description, alternates: { canonical: `/estacionamentos/${f.slug}` }, openGraph: { title: f.name, description } };
}

export default async function FacilityPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const f = await getPublicFacility(slug);
  if (!f) notFound();
  const user = await getCurrentUser();
  const isFav = user ? (await db.select().from(favorites).where(and(eq(favorites.userId, user.id), eq(favorites.facilityId, f.id)))).length > 0 : false;
  const origin = sp.lat && sp.lng ? { lat: Number(sp.lat), lng: Number(sp.lng) } : null;
  const distance = origin && Number.isFinite(origin.lat) && Number.isFinite(origin.lng) ? haversineMeters(origin, f) : null;
  const a = f.availability;
  const nav = f.navigateTo;
  const gmaps = `https://www.google.com/maps/dir/?api=1&destination=${nav.lat},${nav.lng}`;
  const waze = `https://waze.com/ul?ll=${nav.lat},${nav.lng}&navigate=yes`;

  return (
    <>
      <SiteHeader />
      <main id="conteudo" className="mx-auto max-w-6xl px-4 pt-4 pb-32 sm:px-6 lg:pb-16">
        <Breadcrumb items={[{ label: "Início", href: "/" }, { label: "Onde tem vaga", href: `/buscar?q=${encodeURIComponent(f.neighborhood ?? "")}` }, { label: f.name }]} />

        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="outline" icon={<Building2 className="size-3.5" aria-hidden />}>
                Shopping
              </Badge>
              <Badge tone={f.open.open ? "green" : "red"} icon={<Clock className="size-3.5" aria-hidden />}>
                {f.open.label}
              </Badge>
            </div>
            <h1 className="mt-3 text-3xl font-semibold sm:text-[36px]">{f.name}</h1>
            <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[15px] text-asphalt-600">
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="size-4 text-green-600" aria-hidden /> {f.addressLine} — {f.neighborhood}
              </span>
              {distance !== null && (
                <span className="inline-flex items-center gap-1.5 font-medium text-asphalt-800">
                  <Footprints className="size-4" aria-hidden /> {formatDistance(distance)} do seu destino
                </span>
              )}
            </p>

            {/* Spaces: how many the mall has and how many are free now */}
            <section aria-labelledby="vagas" className="mt-6 rounded-xl border border-asphalt-100 bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 id="vagas" className="text-sm font-semibold tracking-wide text-asphalt-500 uppercase">
                  Vagas do shopping
                </h2>
                <AvailabilityPill a={a} showUpdated />
              </div>
              <dl className="mt-4 grid grid-cols-3 gap-3">
                <div className="rounded-lg bg-asphalt-25 p-3">
                  <dt className="text-xs font-semibold text-asphalt-500">Total de vagas</dt>
                  <dd className="mt-1 font-display text-3xl font-bold text-ink-900 tabular-nums">{formatNumber(f.totalSpaces)}</dd>
                </div>
                <div className="rounded-lg bg-status-available-bg p-3">
                  <dt className="text-xs font-semibold text-status-available">Livres agora</dt>
                  <dd className="mt-1 font-display text-3xl font-bold text-ink-900 tabular-nums">{a.state === "UNKNOWN" ? "—" : formatNumber(a.available ?? 0)}</dd>
                </div>
                <div className="rounded-lg bg-asphalt-25 p-3">
                  <dt className="text-xs font-semibold text-asphalt-500">Ocupadas</dt>
                  <dd className="mt-1 font-display text-3xl font-bold text-ink-900 tabular-nums">{a.counts && a.state !== "UNKNOWN" ? formatNumber(a.counts.occupied + a.counts.reserved) : "—"}</dd>
                </div>
              </dl>
              {(f.freeByType.PCD > 0 || f.freeByType.EV > 0 || f.freeByType.MOTO > 0) && a.state !== "UNKNOWN" && (
                <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-asphalt-600">
                  {f.freeByType.PCD > 0 && <span className="inline-flex items-center gap-1.5"><Accessibility className="size-4" aria-hidden /> {f.freeByType.PCD} PCD livres</span>}
                  {f.freeByType.EV > 0 && <span className="inline-flex items-center gap-1.5"><BatteryCharging className="size-4" aria-hidden /> {f.freeByType.EV} com carregador livres</span>}
                  {f.freeByType.MOTO > 0 && <span className="inline-flex items-center gap-1.5"><Layers className="size-4" aria-hidden /> {f.freeByType.MOTO} de moto livres</span>}
                </p>
              )}
              {a.state === "UNKNOWN" && <p className="mt-3 text-sm text-asphalt-600">Este shopping ainda não compartilha a ocupação em tempo real com a Vagou.</p>}
              {a.simulated && a.state !== "UNKNOWN" && (
                <p className="mt-3 rounded-md border border-dashed border-amber-300 bg-status-reserved-bg/50 px-3 py-2 text-xs text-[#7a5200]">
                  Dados simulados para demonstração — não representam a ocupação real deste shopping.
                </p>
              )}
            </section>

            <section className="mt-8" aria-labelledby="planta">
              <h2 id="planta" className="mb-3 text-xl font-semibold">
                Planta do shopping
              </h2>
              {f.floorMaps.length === 0 ? (
                <p className="rounded-lg border border-dashed border-asphalt-200 bg-white p-4 text-sm text-asphalt-600">A planta digital deste shopping ainda não foi publicada.</p>
              ) : (
                <MallPlan slug={f.slug} floors={f.floorMaps} simulated={a.simulated} />
              )}
            </section>

            {f.description && <p className="mt-8 leading-relaxed text-asphalt-700">{f.description}</p>}

            <section className="mt-8" aria-labelledby="horarios">
              <h2 id="horarios" className="text-xl font-semibold">Horário de funcionamento</h2>
              <dl className="mt-3 grid grid-cols-2 gap-x-8 gap-y-1.5 text-[15px] sm:grid-cols-4">
                {weekSummary(f.hours).map((d) => (
                  <div key={d.weekday} className="flex justify-between gap-2 sm:block">
                    <dt className="font-semibold text-ink-900">{d.day}</dt>
                    <dd className={d.text === "Fechado" ? "text-asphalt-400" : "text-asphalt-600"}>{d.text}</dd>
                  </div>
                ))}
              </dl>
            </section>

            <section className="mt-8" aria-labelledby="estrutura">
              <h2 id="estrutura" className="text-xl font-semibold">Estrutura e acessibilidade</h2>
              <ul className="mt-3 grid gap-3 text-[15px] text-asphalt-700 sm:grid-cols-2">
                <li className="flex items-center gap-3"><Accessibility className="size-5 text-ink-800" aria-hidden /> {f.accessible ? `${f.accessibleSpaces} vagas PCD` : "Sem vagas PCD informadas"}</li>
                <li className="flex items-center gap-3"><BatteryCharging className="size-5 text-ink-800" aria-hidden /> {f.evChargers > 0 ? `${f.evChargers} carregadores para veículos elétricos` : "Sem carregadores EV"}</li>
                <li className="flex items-center gap-3"><Car className="size-5 text-ink-800" aria-hidden /> Aceita: {f.vehicleTypes.map((v) => VEHICLE_TYPE_LABEL[v]).join(", ") || "não informado"}</li>
                <li className="flex items-center gap-3"><Umbrella className="size-5 text-ink-800" aria-hidden /> {f.covered ? "Coberto" : "Descoberto"}</li>
                {f.maxHeightCm && <li className="flex items-center gap-3"><Ruler className="size-5 text-ink-800" aria-hidden /> Altura máxima {(f.maxHeightCm / 100).toFixed(2).replace(".", ",")} m</li>}
                {f.valet && <li className="flex items-center gap-3"><UserRound className="size-5 text-ink-800" aria-hidden /> Manobrista</li>}
                {f.security24h && <li className="flex items-center gap-3"><ShieldCheck className="size-5 text-ink-800" aria-hidden /> Segurança 24h</li>}
              </ul>
            </section>

            <section className="mt-8" aria-labelledby="entradas">
              <h2 id="entradas" className="text-xl font-semibold">Entradas</h2>
              <ul className="mt-3 space-y-2">
                {f.entrances.map((e) => (
                  <li key={e.id} className="flex items-start gap-3 rounded-lg border border-asphalt-100 bg-white p-3">
                    <DoorOpen className="mt-0.5 size-5 text-green-600" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-ink-900">
                        {e.name} {e.isPrimary && <Badge tone="green" className="ml-1">Recomendada</Badge>}
                      </p>
                      <p className="text-sm text-asphalt-500">{ENTRANCE_KIND_LABEL[e.kind]}{e.addressLine ? ` · ${e.addressLine}` : ""}</p>
                    </div>
                    <a href={`https://www.google.com/maps/dir/?api=1&destination=${e.lat},${e.lng}`} target="_blank" rel="noopener noreferrer" className="shrink-0 text-sm font-semibold text-green-700 hover:underline">
                      Rota
                    </a>
                  </li>
                ))}
              </ul>
            </section>

            {f.usefulInfo && (
              <section className="mt-8" aria-labelledby="info">
                <h2 id="info" className="flex items-center gap-2 text-xl font-semibold"><Info className="size-5 text-asphalt-400" aria-hidden /> Informações úteis</h2>
                <p className="mt-2 text-asphalt-700">{f.usefulInfo}</p>
              </section>
            )}

            <section className="mt-8" aria-labelledby="mapa">
              <h2 id="mapa" className="text-xl font-semibold">Localização</h2>
              <div className="mt-3 h-64 overflow-hidden rounded-lg border border-asphalt-100">
                <LazyLocationMap lat={nav.lat} lng={nav.lng} approximate={false} />
              </div>
              <p className="mt-2 text-sm text-asphalt-500">Operado por {f.operator}.{f.phone ? ` Telefone: ${f.phone}.` : ""}</p>
            </section>
          </div>

          {/* Action card */}
          <aside className="lg:sticky lg:top-24 lg:self-start" aria-label="Como chegar">
            <div className="hidden rounded-xl border border-asphalt-100 bg-white p-5 shadow-md lg:block">
              <AvailabilityPill a={a} size="lg" />
              <p className="mt-3 text-sm text-asphalt-600">Entrada recomendada: <strong className="text-ink-900">{f.primaryEntrance?.name ?? f.addressLine}</strong></p>
              <a href={gmaps} target="_blank" rel="noopener noreferrer" className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-md bg-green-400 font-semibold text-ink-950 hover:bg-green-300">
                <Navigation className="size-5" aria-hidden /> Ir até lá
              </a>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <a href={waze} target="_blank" rel="noopener noreferrer" className="flex h-10 items-center justify-center rounded-md border border-asphalt-200 text-sm font-semibold hover:bg-asphalt-50">Abrir no Waze</a>
                <FavoriteButton facilityId={f.id} initial={isFav} loggedIn={!!user} returnTo={`/estacionamentos/${f.slug}`} />
              </div>
              {f.phone && (
                <a href={`tel:${f.phone.replace(/\D/g, "")}`} className="mt-3 flex items-center gap-2 text-sm font-semibold text-asphalt-600 hover:text-ink-900">
                  <Phone className="size-4" aria-hidden /> Ligar para o shopping
                </a>
              )}
            </div>
          </aside>
        </div>
      </main>

      {/* Mobile fixed CTA */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-asphalt-100 bg-white px-4 py-3 shadow-[0_-8px_24px_-12px_rgba(12,34,25,.25)] lg:hidden">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <AvailabilityPill a={a} size="sm" />
          </div>
          <a href={gmaps} target="_blank" rel="noopener noreferrer" className="flex h-12 items-center gap-2 rounded-md bg-green-400 px-5 font-semibold text-ink-950">
            <Navigation className="size-5" aria-hidden /> Ir até lá
          </a>
        </div>
      </div>
    </>
  );
}
