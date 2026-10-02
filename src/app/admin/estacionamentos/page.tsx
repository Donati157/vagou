import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { PageHeader } from "@/components/ui/breadcrumb";
import { Badge } from "@/components/ui/badge";
import { DemoBadge } from "@/components/ui/demo-badge";
import { EmptyState } from "@/components/ui/states";
import { FilterBar, buildHref } from "@/components/ui/filter-bar";
import { Pagination, Table, TD, TH, THead, TR } from "@/components/ui/table";
import { getCurrentUser } from "@/modules/auth/session";
import { listAllFacilities } from "@/modules/admin/service";
import { DATA_SOURCE_KIND_LABEL, FACILITY_KIND_LABEL, type DataSourceKind } from "@/lib/labels";

export const metadata = { title: "Shoppings" };

export default async function AdminFacilities({ searchParams }: { searchParams: Promise<{ q?: string; publicado?: string; fonte?: string; pagina?: string }> }) {
  const sp = await searchParams;
  const admin = (await getCurrentUser())!;
  const page = Number(sp.pagina) || 1;
  const data = await listAllFacilities(admin, { q: sp.q, published: sp.publicado, source: sp.fonte, page });
  return (
    <>
      <PageHeader title="Shoppings" description="Todos os shoppings da plataforma." />
      <FilterBar
        q={sp.q}
        placeholder="Nome, bairro ou empresa"
        selects={[
          { name: "publicado", label: "Publicação", value: sp.publicado, options: [{ value: "1", label: "Publicados" }, { value: "0", label: "Não publicados" }] },
          { name: "fonte", label: "Fonte de dados", value: sp.fonte, options: [...Object.entries(DATA_SOURCE_KIND_LABEL).map(([value, label]) => ({ value, label })), { value: "NONE", label: "Sem fonte" }] },
        ]}
      />
      {data.rows.length === 0 ? (
        <EmptyState title="Nenhum shopping encontrado" />
      ) : (
        <>
          <Table>
            <THead>
              <tr>
                <TH>Shopping</TH>
                <TH>Empresa</TH>
                <TH className="text-right">Vagas mapeadas</TH>
                <TH>Fonte</TH>
                <TH>Status</TH>
              </tr>
            </THead>
            <tbody>
              {data.rows.map((f) => (
                <TR key={f.id}>
                  <TD>
                    <Link href={`/company/estacionamentos/${f.id}`} className="font-semibold text-ink-900 hover:underline">
                      {f.name}
                    </Link>
                    <p className="text-xs text-asphalt-500">
                      {FACILITY_KIND_LABEL[f.kind]} · {f.neighborhood}
                    </p>
                  </TD>
                  <TD>
                    <Link href={`/admin/empresas/${f.orgId}`} className="hover:underline">
                      {f.org}
                    </Link>
                  </TD>
                  <TD className="text-right tabular-nums">{f.spaces || <span className="text-asphalt-400">— ({f.declaredCapacity} declaradas)</span>}</TD>
                  <TD>{f.source ? f.source === "SIMULATION" ? <DemoBadge label="Simulação" /> : <Badge tone="blue">{DATA_SOURCE_KIND_LABEL[f.source as DataSourceKind]}</Badge> : <Badge tone="outline">Sem fonte</Badge>}</TD>
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
          <Pagination page={page} pageCount={data.pageCount} total={data.total} buildHref={(p) => buildHref("/admin/estacionamentos", { q: sp.q, publicado: sp.publicado, fonte: sp.fonte }, p)} />
        </>
      )}
    </>
  );
}
