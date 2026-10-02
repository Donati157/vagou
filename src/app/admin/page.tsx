import { sql } from "drizzle-orm";
import { PageHeader } from "@/components/ui/breadcrumb";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Metric } from "@/components/ui/metric";
import { db } from "@/server/db/client";
import { dataSources, facilities, organizations, parkingSpaces, users } from "@/server/db/schema";
import { DATA_SOURCE_KIND_LABEL, type DataSourceKind } from "@/lib/labels";
import { formatNumber } from "@/lib/format";

export const metadata = { title: "Visão geral" };

export default async function AdminHome() {
  const [[u], [o], [f], [sp], bySource, byRole, byCity] = await Promise.all([
    db.select({ n: sql<number>`count(*)::int` }).from(users),
    db.select({ n: sql<number>`count(*)::int` }).from(organizations),
    db.select({ n: sql<number>`count(*)::int`, published: sql<number>`count(*) filter (where ${facilities.isPublished})::int` }).from(facilities),
    db.select({ n: sql<number>`count(*)::int` }).from(parkingSpaces).where(sql`${parkingSpaces.archivedAt} is null`),
    db.select({ kind: dataSources.kind, n: sql<number>`count(*)::int` }).from(dataSources).where(sql`${dataSources.status} = 'ACTIVE'`).groupBy(dataSources.kind),
    db.select({ role: users.role, n: sql<number>`count(*)::int` }).from(users).groupBy(users.role),
    db.select({ region: facilities.neighborhood, n: sql<number>`count(*)::int` }).from(facilities).groupBy(facilities.neighborhood).orderBy(sql`count(*) desc`).limit(8),
  ]);
  const role = (r: string) => byRole.find((x) => x.role === r)?.n ?? 0;
  return (
    <>
      <PageHeader title="Visão geral da plataforma" description="Números consolidados da base." />
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric label="Usuários" value={formatNumber(u.n)} hint={`${role("DRIVER")} motoristas · ${role("COMPANY_ADMIN")} de empresas`} />
        <Metric label="Empresas" value={formatNumber(o.n)} />
        <Metric label="Shoppings" value={formatNumber(f.n)} hint={`${f.published} publicados`} />
        <Metric label="Vagas mapeadas" value={formatNumber(sp.n)} />
      </section>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Fontes de ocupação ativas" />
          <CardBody>
            <ul className="space-y-2 text-sm">
              {bySource.map((s) => (
                <li key={s.kind} className="flex justify-between">
                  <span>{DATA_SOURCE_KIND_LABEL[s.kind as DataSourceKind]}</span>
                  <span className="font-semibold">{s.n}</span>
                </li>
              ))}
              <li className="flex justify-between text-asphalt-500">
                <span>Sem fonte conectada</span>
                <span className="font-semibold">{f.n - bySource.reduce((a, s) => a + s.n, 0)}</span>
              </li>
            </ul>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Shoppings por região" />
          <CardBody>
            <ul className="space-y-2 text-sm">
              {byCity.map((c) => (
                <li key={c.region ?? "—"} className="flex justify-between">
                  <span>{c.region ?? "Sem bairro"}</span>
                  <span className="font-semibold">{c.n}</span>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
