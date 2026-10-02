import { BarChart3, Clock, Gauge, ParkingSquare, Timer } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { DemoBadge } from "@/components/ui/demo-badge";
import { EmptyState } from "@/components/ui/states";
import { Metric } from "@/components/ui/metric";
import { PeriodFilter } from "@/components/ui/period-filter";
import { Table, TD, TH, THead, TR } from "@/components/ui/table";
import { Chart, CHART_COLORS } from "@/components/charts/charts";
import { getCurrentUser } from "@/modules/auth/session";
import { getFacilityAnalytics, parseAnalyticsPeriod } from "@/modules/occupancy/analytics-service";
import { formatDateTime, formatNumber, formatPercent } from "@/lib/format";

export const metadata = { title: "Analytics" };

export default async function FacilityAnalyticsPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ periodo?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const user = (await getCurrentUser())!;
  const period = parseAnalyticsPeriod(sp.periodo);
  const a = await getFacilityAnalytics(user, id, period);
  const base = `/company/estacionamentos/${id}/analytics`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-xl font-semibold">Ocupação e capacidade</h2>
          {a.simulated && <DemoBadge label="Dados simulados" />}
        </div>
        <PeriodFilter active={period} basePath={base} />
      </div>

      {!a.hasData || !a.summary ? (
        <EmptyState icon={<BarChart3 className="size-6" aria-hidden />} title="Ainda sem dados de ocupação" description="Conecte uma fonte de dados (ou use a atualização manual) para acompanhar a ocupação ao longo do tempo." />
      ) : (
        <>
          <section className="grid grid-cols-2 gap-3 lg:grid-cols-5" aria-label="Indicadores do período">
            <Metric label="Ocupação média" value={formatPercent(a.summary.avgOccupancy)} icon={<Gauge className="size-4" />} hint="no horário de funcionamento" />
            <Metric label="Pico" value={formatPercent(a.summary.peakOccupancy)} icon={<BarChart3 className="size-4" />} hint={formatDateTime(a.summary.peakAt)} />
            <Metric label="Horário de pico" value={a.summary.peakHour === null ? "—" : `${a.summary.peakHour}h`} icon={<Clock className="size-4" />} hint={a.summary.quietHour === null ? undefined : `mais tranquilo às ${a.summary.quietHour}h`} />
            <Metric label="Capacidade ociosa" value={`${formatNumber(Math.round(a.summary.avgFree))} vagas`} icon={<ParkingSquare className="size-4" />} hint={`${formatNumber(a.summary.idleSpaceHours)} vaga-horas no período`} />
            <Metric label="Tempo lotado" value={formatPercent(a.summary.fullShare, 1)} icon={<Timer className="size-4" />} hint="das medições" className="col-span-2 lg:col-span-1" />
          </section>

          <div className="grid gap-6 xl:grid-cols-2">
            <Card>
              <CardHeader title="Ocupação por hora do dia" description="Média do período, no horário de funcionamento" />
              <CardBody>
                <Chart title="Ocupação por hora do dia" data={a.hourly.filter((h) => h.samples > 0)} xKey="hora" series={[{ key: "ocupacao", label: "Ocupação", color: CHART_COLORS.primary }]} format="percent" />
              </CardBody>
            </Card>
            <Card>
              <CardHeader title="Capacidade utilizada x disponível" description="Vagas em uso e livres, em média, por hora" />
              <CardBody>
                <Chart
                  title="Capacidade utilizada x disponível"
                  data={a.hourly.filter((h) => h.samples > 0)}
                  xKey="hora"
                  stacked
                  series={[
                    { key: "utilizadas", label: "Utilizadas", color: CHART_COLORS.primary },
                    { key: "livres", label: "Livres", color: CHART_COLORS.remainder },
                  ]}
                  format="number"
                />
              </CardBody>
            </Card>
            <Card>
              <CardHeader title="Ocupação histórica" description="Média e pico diários" />
              <CardBody>
                <Chart
                  title="Ocupação histórica"
                  data={a.daily}
                  xKey="dia"
                  kind="area"
                  series={[
                    { key: "media", label: "Média", color: CHART_COLORS.primary },
                    { key: "pico", label: "Pico", color: CHART_COLORS.secondary },
                  ]}
                  format="percent"
                />
              </CardBody>
            </Card>
            <Card>
              <CardHeader title="Ocupação por dia da semana" />
              <CardBody>
                <Chart title="Ocupação por dia da semana" data={a.weekday} xKey="dia" series={[{ key: "ocupacao", label: "Ocupação", color: CHART_COLORS.primary }]} format="percent" />
              </CardBody>
            </Card>
          </div>
        </>
      )}

      <Card>
        <CardHeader title="Setores" description="Situação atual e giro (chegadas registradas) no período" />
        <CardBody>
          {a.sectors.length === 0 ? (
            <p className="text-sm text-asphalt-500">Sem setores mapeados. Importe a planta de um piso para ver a utilização por setor.</p>
          ) : (
            <Table>
              <THead>
                <tr>
                  <TH>Piso / setor</TH>
                  <TH className="text-right">Vagas</TH>
                  <TH className="text-right">Livres agora</TH>
                  <TH className="text-right">Ocupação agora</TH>
                  <TH className="text-right">Chegadas</TH>
                  <TH className="text-right">Giro (por vaga/dia)</TH>
                </tr>
              </THead>
              <tbody>
                {a.sectors.map((s) => (
                  <TR key={s.sectorId}>
                    <TD>
                      <span className="flex items-center gap-2">
                        <span className="size-3 rounded-sm" style={{ background: s.color }} aria-hidden /> {s.floor} · Setor {s.sector}
                      </span>
                    </TD>
                    <TD className="text-right tabular-nums">{s.total}</TD>
                    <TD className="text-right tabular-nums">{s.free}</TD>
                    <TD className="text-right tabular-nums">{formatPercent(s.occupancy)}</TD>
                    <TD className="text-right tabular-nums">{formatNumber(s.arrivals)}</TD>
                    <TD className="text-right tabular-nums">{s.turnoverPerSpaceDay.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}</TD>
                  </TR>
                ))}
              </tbody>
            </Table>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
