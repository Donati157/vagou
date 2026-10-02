import Link from "next/link";
import { ArrowRight, Layers, Upload } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Metric } from "@/components/ui/metric";
import { LinkButton } from "@/components/ui/button";
import { getCurrentUser } from "@/modules/auth/session";
import { getFacilityHeader } from "@/modules/facilities/workspace";
import { getLiveAvailability, refreshOccupancy } from "@/modules/occupancy/service";
import { AvailabilityPill } from "@/modules/occupancy/components/availability-pill";
import { formatNumber, formatPercent } from "@/lib/format";

export const metadata = { title: "Visão geral do shopping" };

export default async function FacilityOverview({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = (await getCurrentUser())!;
  const f = await getFacilityHeader(user, id);
  await refreshOccupancy([id]);
  const a = (await getLiveAvailability([{ id, declaredCapacity: f.declaredCapacity }])).get(id)!;
  const base = `/company/estacionamentos/${id}`;
  return (
    <div className="space-y-6">
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric label="Vagas livres" value={a.available === null ? "—" : formatNumber(a.available)} hint={a.simulated ? "dados simulados" : undefined} />
        <Metric label="Capacidade" value={formatNumber(a.capacity)} hint={a.hasDigitalMap ? "vagas mapeadas" : "capacidade declarada"} />
        <Metric label="Ocupação" value={a.occupancy === null ? "—" : formatPercent(a.occupancy)} />
        <Metric label="Indisponíveis" value={a.counts ? formatNumber(a.counts.unavailable) : "—"} hint="manutenção ou bloqueio" />
      </section>
      <Card>
        <CardHeader title="Disponibilidade por piso" action={<AvailabilityPill a={a} size="sm" showUpdated />} />
        <CardBody>
          {a.floors.length === 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed border-asphalt-200 p-4">
              <p className="text-sm text-asphalt-600">Este shopping ainda não tem mapa digital. Importe a planta para acompanhar vaga a vaga.</p>
              <LinkButton href={`${base}/pisos`} size="sm">
                <Upload className="size-4" aria-hidden /> Importar planta
              </LinkButton>
            </div>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-3">
              {a.floors.map((fl) => {
                const total = fl.counts.available + fl.counts.occupied + fl.counts.reserved + fl.counts.unavailable;
                return (
                  <li key={fl.floorId} className="rounded-lg border border-asphalt-100 p-4">
                    <p className="flex items-center gap-2 font-semibold"><Layers className="size-4 text-asphalt-400" aria-hidden /> {fl.name}</p>
                    <p className="mt-2 font-display text-2xl font-bold text-ink-900">{fl.counts.available === 0 ? "Lotado" : `${fl.counts.available} livres`}</p>
                    <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-asphalt-100" role="img" aria-label={`${fl.counts.occupied + fl.counts.reserved} de ${total} ocupadas`}>
                      <span className="bg-status-occupied" style={{ width: `${(fl.counts.occupied / total) * 100}%` }} />
                      <span className="bg-[#e8a317]" style={{ width: `${(fl.counts.reserved / total) * 100}%` }} />
                      <span className="bg-status-unavailable" style={{ width: `${(fl.counts.unavailable / total) * 100}%` }} />
                    </div>
                    <p className="mt-1 text-xs text-asphalt-500">{fl.counts.occupied} ocupadas · {fl.counts.reserved} reservadas · {fl.counts.unavailable} indisponíveis</p>
                  </li>
                );
              })}
            </ul>
          )}
        </CardBody>
      </Card>
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { href: `${base}/operacao`, t: "Mapa operacional", d: "Status de cada vaga em tempo real" },
          { href: `${base}/analytics`, t: "Analytics", d: "Ocupação por hora, histórico e capacidade ociosa" },
          { href: `${base}/dados`, t: "Fonte de dados", d: f.source ? "Gerenciar a origem da ocupação" : "Conecte uma fonte de ocupação" },
        ].map((l) => (
          <Link key={l.href} href={l.href} className="group rounded-lg border border-asphalt-100 bg-white p-4 hover:border-asphalt-300">
            <p className="flex items-center justify-between font-semibold text-ink-900">{l.t} <ArrowRight className="size-4 text-asphalt-400 group-hover:text-ink-900" aria-hidden /></p>
            <p className="mt-1 text-sm text-asphalt-500">{l.d}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
