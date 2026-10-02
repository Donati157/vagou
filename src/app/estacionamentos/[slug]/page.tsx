import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { Accessibility, ArrowRight, BatteryCharging, Building2, Car, Clock, DoorOpen, Footprints, Info, Layers, MapPin, Navigation, Phone, Ruler, ShieldCheck, Umbrella, UserRound } from "lucide-react";
import { SiteHeader } from "@/components/layout/site-header";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Badge } from "@/components/ui/badge";
import { getPublicFacility } from "@/modules/facilities/public";
import { weekSummary } from "@/modules/facilities/hours";
import { estimateCost } from "@/modules/facilities/rates";
import { LazyLocationMap } from "@/modules/facilities/components/lazy-location-map";
import { FavoriteButton } from "@/modules/facilities/components/favorite-button";
import { AvailabilityPill } from "@/modules/occupancy/components/availability-pill";
import { toPublicAvailability } from "@/modules/occupancy/availability";
import { getCurrentUser } from "@/modules/auth/session";
import { haversineMeters } from "@/modules/geo/geo";
import { db } from "@/server/db/client";
import { favorites } from "@/server/db/schema";
import { ENTRANCE_KIND_LABEL, FACILITY_KIND_LABEL, VEHICLE_TYPE_LABEL } from "@/lib/labels";
import { formatDistance, formatMoney, formatNumber } from "@/lib/format";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ lat?: string; lng?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const f = await getPublicFacility(slug);
  if (!f) return { title: "Estacionamento não encontrado" };
  const description = `${f.name} em ${f.neighborhood}, São Paulo: disponibilidade de vagas, preços, horários e como chegar.`;
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
  const carRate = f.rates.find((r) => r.vehicleType === "CAR");

  return (
    <>
      <SiteHeader />
      <main id="conteudo" className="mx-auto max-w-6xl px-4 pt-4 pb-32 sm:px-6 lg:pb-16">
        <Breadcrumb items={[{ label: "Início", href: "/" }, { label: "Onde tem vaga", href: `/buscar?q=${encodeURIComponent(f.neighborhood ?? "")}` }, { label: f.name }]} />

        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="outline" icon={<Building2 className="size-3.5" aria-hidden />}>
                {FACILITY_KIND_LABEL[f.kind]}
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

            {/* Availability hero */}
            <section aria-labelledby="disp" className="mt-6 rounded-xl border border-asphalt-100 bg-white p-5">
              <h2 id="disp" className="text-sm font-semibold tracking-wide text-asphalt-500 uppercase">
                Disponibilidade agora
              </h2>
              <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="font-display text-4xl font-bold text-ink-900 tabular-nums">
                    {a.state === "UNKNOWN" ? "—" : a.state === "FULL" ? "Lotado" : formatNumber(a.available ?? 0)}
                    {a.state !== "UNKNOWN" && a.state !== "FULL" && <span className="ml-2 text-lg font-semibold text-asphalt-500">vagas livres</span>}
                  </p>
                  <p className="mt-1 text-sm text-asphalt-500">Capacidade total: {formatNumber(a.capacity)} vagas</p>
                </div>
                <AvailabilityPill a={a} showUpdated />
              </div>
              {a.state === "UNKNOWN" && <p className="mt-3 text-sm text-asphalt-600">Este estacionamento ainda não compartilha a ocupação em tempo real com a Vagou. Confira preços, horários e como chegar abaixo.</p>}
              {a.simulated && a.state !== "UNKNOWN" && (
                <p className="mt-3 rounded-md border border-dashed border-amber-300 bg-status-reserved-bg/50 px-3 py-2 text-xs text-[#7a5200]">
                  Dados simulados para demonstração — não representam a ocupação real deste estacionamento.
                </p>
              )}
              {f.floorsWithMap.length > 0 && (
                <ul className="mt-5 grid gap-2 sm:grid-cols-3">
                  {f.floorsWithMap.map((fl) => {
                    const flAvail = toPublicAvailability({ counts: fl.counts, capacity: 0, updatedAt: a.updatedAt, sourceKind: a.sourceKind, now: new Date() });
                    const label = flAvail.state === "FULL" ? "Lotado" : flAvail.state === "UNKNOWN" ? "Sem dados" : `${fl.counts.available} livres`;
                    const inner = (
                      <>
                        <span className="flex items-center gap-2 font-semibold text-ink-900">
                          <Layers className="size-4 text-asphalt-400" aria-hidden /> {fl.name}
                        </span>
                        <span className={flAvail.state === "FULL" ? "font-semibold text-status-occupied" : flAvail.state === "FEW" ? "font-semibold text-[#8a5d00]" : "font-semibold text-status-available"}>{label}</span>
                      </>
                    );
                    return (
                      <li key={fl.floorId}>
                        {fl.hasMap ? (
                          <Link href={`/estacionamentos/${f.slug}/pisos/${fl.floorId}`} className="flex items-center justify-between gap-2 rounded-md border border-asphalt-200 px-3 py-2.5 text-sm hover:border-ink-700" aria-label={`Piso ${fl.name}: ${label}. Ver mapa das vagas`}>
                            {inner}
                            <ArrowRight className="size-4 text-asphalt-400" aria-hidden />
                          </Link>
                        ) : (
                          <div className="flex items-center justify-between gap-2 rounded-md border border-asphalt-100 px-3 py-2.5 text-sm">{inner}</div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
              {(f.freeByType.PCD > 0 || f.freeByType.EV > 0 || f.freeByType.MOTO > 0) && a.state !== "UNKNOWN" && (
                <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-asphalt-600">
                  {f.freeByType.PCD > 0 && <span className="inline-flex items-center gap-1.5"><Accessibility className="size-4" aria-hidden /> {f.freeByType.PCD} PCD livres</span>}
                  {f.freeByType.EV > 0 && <span className="inline-flex items-center gap-1.5"><BatteryCharging className="size-4" aria-hidden /> {f.freeByType.EV} com carregador livres</span>}
                </p>
              )}
            </section>

            {f.description && <p className="mt-6 leading-relaxed text-asphalt-700">{f.description}</p>}

            <section className="mt-8" aria-labelledby="precos">
              <h2 id="precos" className="text-xl font-semibold">Preços</h2>
              {f.rates.length === 0 ? (
                <p className="mt-2 text-asphalt-500">Preços não informados.</p>
              ) : (
                <ul className="mt-3 divide-y divide-asphalt-100 rounded-lg border border-asphalt-100 bg-white">
                  {f.rates.map((r) => (
                    <li key={r.id} className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
                      <div>
                        <p className="font-medium text-ink-900">{r.label}</p>
                        <p className="text-sm text-asphalt-500">
                          {r.additionalHourCents ? `Hora adicional ${formatMoney(r.additionalHourCents)}` : ""}
                          {r.dailyMaxCents ? `${r.additionalHourCents ? " · " : ""}Diária máx. ${formatMoney(r.dailyMaxCents)}` : ""}
                          {r.notes ? ` · ${r.notes}` : ""}
                        </p>
                      </div>
                      <p className="font-display text-lg font-bold text-ink-900">{formatMoney(r.firstPeriodCents)}</p>
                    </li>
                  ))}
                </ul>
              )}
              {carRate && <p className="mt-2 text-sm text-asphalt-500">Estimativa para 2 horas de carro: {formatMoney(estimateCost(carRate, 120))}. Valores informados pelo estacionamento; o pagamento é feito no local.</p>}
            </section>

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
                  <Phone className="size-4" aria-hidden /> Ligar para o estacionamento
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
