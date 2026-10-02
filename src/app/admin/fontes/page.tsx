import Link from "next/link";
import { PageHeader } from "@/components/ui/breadcrumb";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/states";
import { FilterBar, buildHref } from "@/components/ui/filter-bar";
import { Pagination, Table, TD, TH, THead, TR } from "@/components/ui/table";
import { getCurrentUser } from "@/modules/auth/session";
import { listDataSources } from "@/modules/admin/service";
import { DATA_SOURCE_KIND_LABEL } from "@/lib/labels";
import { formatRelative } from "@/lib/format";

export const metadata = { title: "Fontes de dados" };

export default async function AdminSources({ searchParams }: { searchParams: Promise<{ tipo?: string; status?: string; pagina?: string }> }) {
  const sp = await searchParams;
  const admin = (await getCurrentUser())!;
  const page = Number(sp.pagina) || 1;
  const data = await listDataSources(admin, { kind: sp.tipo, status: sp.status, page });
  return (
    <>
      <PageHeader title="Fontes de dados" description="Origem da ocupação de cada shopping. Simulação é exibida como dado de demonstração." />
      <FilterBar
        selects={[
          { name: "tipo", label: "Todos os tipos", value: sp.tipo, options: Object.entries(DATA_SOURCE_KIND_LABEL).map(([value, label]) => ({ value, label })) },
          { name: "status", label: "Todos os status", value: sp.status, options: [{ value: "ACTIVE", label: "Ativas" }, { value: "INACTIVE", label: "Inativas" }, { value: "ERROR", label: "Com erro" }] },
        ]}
      />
      {data.rows.length === 0 ? (
        <EmptyState title="Nenhuma fonte encontrada" />
      ) : (
        <>
          <Table>
            <THead>
              <tr>
                <TH>Shopping</TH>
                <TH>Tipo</TH>
                <TH>Granularidade</TH>
                <TH>Status</TH>
                <TH>Última atualização</TH>
              </tr>
            </THead>
            <tbody>
              {data.rows.map((d) => {
                const stale = d.stale;
                return (
                  <TR key={d.id}>
                    <TD>
                      <Link href={`/company/estacionamentos/${d.facilityId}/dados`} className="font-semibold text-fg hover:underline">
                        {d.facility}
                      </Link>
                      <p className="text-xs text-asphalt-500">{d.org}</p>
                    </TD>
                    <TD>{d.kind === "SIMULATION" ? <Badge tone="amber">{DATA_SOURCE_KIND_LABEL[d.kind]}</Badge> : DATA_SOURCE_KIND_LABEL[d.kind]}</TD>
                    <TD>{d.granularity === "SPACE" ? "Por vaga" : "Por contagem"}</TD>
                    <TD>{d.status === "ACTIVE" ? stale ? <Badge tone="amber">Desatualizada</Badge> : <Badge tone="green">Ativa</Badge> : d.status === "ERROR" ? <Badge tone="red">Erro</Badge> : <Badge tone="outline">Inativa</Badge>}</TD>
                    <TD>
                      {d.lastSyncAt ? formatRelative(d.lastSyncAt) : "—"}
                      {d.lastError && <p className="text-xs text-danger">{d.lastError}</p>}
                    </TD>
                  </TR>
                );
              })}
            </tbody>
          </Table>
          <Pagination page={page} pageCount={data.pageCount} total={data.total} buildHref={(p) => buildHref("/admin/fontes", { tipo: sp.tipo, status: sp.status }, p)} />
        </>
      )}
    </>
  );
}
