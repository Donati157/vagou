import Link from "next/link";
import { PageHeader } from "@/components/ui/breadcrumb";
import { EmptyState } from "@/components/ui/states";
import { FilterBar, buildHref } from "@/components/ui/filter-bar";
import { Pagination, Table, TD, TH, THead, TR } from "@/components/ui/table";
import { getCurrentUser } from "@/modules/auth/session";
import { listOrganizations } from "@/modules/admin/service";
import { ORG_TYPE_LABEL } from "@/lib/labels";
import { formatFullDate } from "@/lib/format";

export const metadata = { title: "Empresas" };

export default async function AdminOrgs({ searchParams }: { searchParams: Promise<{ q?: string; tipo?: string; pagina?: string }> }) {
  const sp = await searchParams;
  const admin = (await getCurrentUser())!;
  const page = Number(sp.pagina) || 1;
  const data = await listOrganizations(admin, { q: sp.q, type: sp.tipo, page });
  return (
    <>
      <PageHeader title="Empresas" description="Organizações que administram shoppings." />
      <FilterBar q={sp.q} placeholder="Nome da empresa" selects={[{ name: "tipo", label: "Todos os tipos", value: sp.tipo, options: Object.entries(ORG_TYPE_LABEL).map(([value, label]) => ({ value, label })) }]} />
      {data.rows.length === 0 ? (
        <EmptyState title="Nenhuma empresa encontrada" />
      ) : (
        <>
          <Table>
            <THead>
              <tr>
                <TH>Empresa</TH>
                <TH>Tipo</TH>
                <TH className="text-right">Membros</TH>
                <TH className="text-right">Shoppings</TH>
                <TH>Desde</TH>
              </tr>
            </THead>
            <tbody>
              {data.rows.map((o) => (
                <TR key={o.id}>
                  <TD>
                    <Link href={`/admin/empresas/${o.id}`} className="font-semibold text-fg hover:underline">
                      {o.name}
                    </Link>
                  </TD>
                  <TD>{ORG_TYPE_LABEL[o.type]}</TD>
                  <TD className="text-right tabular-nums">{o.members}</TD>
                  <TD className="text-right tabular-nums">
                    {o.facilities} <span className="text-xs text-asphalt-500">({o.published} publicados)</span>
                  </TD>
                  <TD>{formatFullDate(o.createdAt)}</TD>
                </TR>
              ))}
            </tbody>
          </Table>
          <Pagination page={page} pageCount={data.pageCount} total={data.total} buildHref={(p) => buildHref("/admin/empresas", { q: sp.q, tipo: sp.tipo }, p)} />
        </>
      )}
    </>
  );
}
