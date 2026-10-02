import Link from "next/link";
import { Building2, ExternalLink, Layers, Plus } from "lucide-react";
import { LinkButton } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/breadcrumb";
import { Badge } from "@/components/ui/badge";
import { DemoBadge } from "@/components/ui/demo-badge";
import { Metric } from "@/components/ui/metric";
import { Alert, EmptyState } from "@/components/ui/states";
import { Table, TD, TH, THead, TR } from "@/components/ui/table";
import { getCurrentUser } from "@/modules/auth/session";
import { listCompanyFacilities } from "@/modules/facilities/company";
import { getCompanyHourly } from "@/modules/occupancy/analytics-service";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Chart, CHART_COLORS } from "@/components/charts/charts";
import { AvailabilityPill } from "@/modules/occupancy/components/availability-pill";
import { DATA_SOURCE_KIND_LABEL, FACILITY_KIND_LABEL } from "@/lib/labels";
import { formatNumber, formatPercent } from "@/lib/format";

export const metadata = { title: "Estacionamentos" };

export default async function CompanyHome({ searchParams }: { searchParams: Promise<{ negado?: string }> }) {
  const sp = await searchParams;
  const user = (await getCurrentUser())!;
  const { orgs, facilities } = await listCompanyFacilities(user);
  const capacity = facilities.reduce((a, f) => a + f.availability.capacity, 0);
  const free = facilities.reduce((a, f) => a + (f.availability.available ?? 0), 0);
  const known = facilities.filter((f) => f.availability.occupancy !== null);
  const occupancy = known.length ? known.reduce((a, f) => a + (f.availability.occupancy ?? 0) * f.availability.capacity, 0) / known.reduce((a, f) => a + f.availability.capacity, 0) : null;
  const anySim = facilities.some((f) => f.source?.kind === "SIMULATION");
  const hourly = await getCompanyHourly(facilities.map((f) => f.id));
  const capacityRows = facilities
    .filter((f) => f.availability.counts)
    .map((f) => ({ nome: f.name.length > 18 ? `${f.name.slice(0, 17)}…` : f.name, utilizadas: (f.availability.counts!.occupied + f.availability.counts!.reserved), livres: f.availability.counts!.available }));

  return (
    <>
      {sp.negado && <Alert tone="warning" className="mb-4">Você não tem acesso àquela área com este perfil.</Alert>}
      <PageHeader
        title={orgs.length === 1 ? orgs[0].name : "Estacionamentos"}
        description="Visão em tempo real dos seus estacionamentos."
        actions={
          <>
            {anySim && <DemoBadge />}
            <LinkButton href="/company/estacionamentos/novo" size="sm">
              <Plus className="size-4" aria-hidden /> Novo estacionamento
            </LinkButton>
          </>
        }
      />
      {facilities.length === 0 ? (
        <EmptyState icon={<Building2 className="size-6" aria-hidden />} title="Nenhum estacionamento cadastrado" description="Cadastre seu primeiro estacionamento para começar a digitalizar pisos e vagas." />
      ) : (
        <>
          <section aria-label="Indicadores" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Metric label="Estacionamentos" value={facilities.length} />
            <Metric label="Capacidade total" value={formatNumber(capacity)} hint="vagas" />
            <Metric label="Vagas livres agora" value={formatNumber(free)} hint={anySim ? "inclui dados simulados" : undefined} />
            <Metric label="Ocupação atual" value={occupancy === null ? "—" : formatPercent(occupancy)} />
          </section>
          <div className="mt-6 grid gap-6 xl:grid-cols-2">
            <Card>
              <CardHeader title="Ocupação por hora" description="Todas as unidades, últimos 7 dias (ponderada pela capacidade)" />
              <CardBody>
                <Chart title="Ocupação por hora" data={hourly} xKey="hora" series={[{ key: "ocupacao", label: "Ocupação", color: CHART_COLORS.primary }]} format="percent" />
              </CardBody>
            </Card>
            <Card>
              <CardHeader title="Capacidade utilizada x disponível agora" description="Por estacionamento" />
              <CardBody>
                <Chart
                  title="Capacidade utilizada x disponível agora"
                  data={capacityRows}
                  xKey="nome"
                  stacked
                  series={[
                    { key: "utilizadas", label: "Utilizadas", color: CHART_COLORS.primary },
                    { key: "livres", label: "Livres", color: CHART_COLORS.remainder },
                  ]}
                  format="number"
                />
              </CardBody>
            </Card>
          </div>
          <div className="mt-6">
            <Table>
              <THead>
                <tr>
                  <TH>Estacionamento</TH>
                  <TH>Disponibilidade</TH>
                  <TH>Fonte de ocupação</TH>
                  <TH>Mapa digital</TH>
                  <TH>Publicação</TH>
                </tr>
              </THead>
              <tbody>
                {facilities.map((f) => (
                  <TR key={f.id}>
                    <TD>
                      <Link href={`/company/estacionamentos/${f.id}`} className="font-semibold text-ink-900 hover:underline">{f.name}</Link>
                      <p className="text-xs text-asphalt-500">
                        {FACILITY_KIND_LABEL[f.kind]} · {f.neighborhood} · {formatNumber(f.availability.capacity)} vagas
                      </p>
                    </TD>
                    <TD>
                      <AvailabilityPill a={f.availability} size="sm" />
                    </TD>
                    <TD>
                      {f.source ? (
                        f.source.kind === "SIMULATION" ? (
                          <DemoBadge label="Simulação" />
                        ) : (
                          <Badge tone="blue">{DATA_SOURCE_KIND_LABEL[f.source.kind]}</Badge>
                        )
                      ) : (
                        <Badge tone="outline">Não conectada</Badge>
                      )}
                    </TD>
                    <TD>
                      <span className="inline-flex items-center gap-1.5 text-sm">
                        <Layers className="size-4 text-asphalt-400" aria-hidden />
                        {f.mappedFloors}/{f.floors} pisos
                      </span>
                    </TD>
                    <TD>
                      {f.isPublished ? (
                        <Link href={`/estacionamentos/${f.slug}`} className="inline-flex items-center gap-1 text-sm font-semibold text-green-700 hover:underline">
                          Publicado <ExternalLink className="size-3.5" aria-hidden />
                        </Link>
                      ) : (
                        <Badge tone="outline">Rascunho</Badge>
                      )}
                    </TD>
                  </TR>
                ))}
              </tbody>
            </Table>
          </div>
        </>
      )}
    </>
  );
}
