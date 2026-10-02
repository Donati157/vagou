import { PageHeader } from "@/components/ui/breadcrumb";
import { EmptyState } from "@/components/ui/states";
import { FilterBar, buildHref } from "@/components/ui/filter-bar";
import { Pagination, Table, TD, TH, THead, TR } from "@/components/ui/table";
import { getCurrentUser } from "@/modules/auth/session";
import { listAudit } from "@/modules/admin/service";
import { formatDateTime } from "@/lib/format";

export const metadata = { title: "Atividade" };

const ACTION_LABEL: Record<string, string> = {
  "user.registered": "Cadastro de usuário",
  "user.suspended": "Conta suspensa",
  "user.reactivated": "Conta reativada",
  "user.password_reset": "Senha redefinida",
  "user.data_exported": "Exportação de dados (LGPD)",
  "user.deletion_requested": "Pedido de exclusão (LGPD)",
  "facility.created": "Estacionamento criado",
  "facility.updated": "Estacionamento atualizado",
  "facility.published": "Estacionamento publicado",
  "facility.unpublished": "Estacionamento despublicado",
  "facility.rates_updated": "Tarifas atualizadas",
  "facility.entrances_updated": "Entradas atualizadas",
  "floor.created": "Piso criado",
  "floor.deleted": "Piso excluído",
  "floor_plan.uploaded": "Planta enviada",
  "floor_plan.analyzed": "Planta analisada",
  "floor_plan.published": "Mapa publicado",
  "floor_map.edited": "Mapa editado",
  "data_source.changed": "Fonte de dados alterada",
  "data_source.disconnected": "Fonte de dados desconectada",
  "occupancy.manual_count": "Contagem manual registrada",
};

export default async function AdminActivity({ searchParams }: { searchParams: Promise<{ q?: string; pagina?: string }> }) {
  const sp = await searchParams;
  const admin = (await getCurrentUser())!;
  const page = Number(sp.pagina) || 1;
  const data = await listAudit(admin, { q: sp.q, page });
  return (
    <>
      <PageHeader title="Atividade" description="Registro de auditoria das ações sensíveis na plataforma." />
      <FilterBar q={sp.q} placeholder="Ação (ex.: floor_plan), entidade ou ID" />
      {data.rows.length === 0 ? (
        <EmptyState title="Nenhum registro encontrado" />
      ) : (
        <>
          <Table>
            <THead>
              <tr>
                <TH>Quando</TH>
                <TH>Ação</TH>
                <TH>Quem</TH>
                <TH>Entidade</TH>
              </tr>
            </THead>
            <tbody>
              {data.rows.map((r) => (
                <TR key={r.id}>
                  <TD className="whitespace-nowrap">{formatDateTime(r.createdAt)}</TD>
                  <TD>{ACTION_LABEL[r.action] ?? r.action}</TD>
                  <TD>{r.actor ?? r.actorEmail ?? "Sistema"}</TD>
                  <TD className="font-mono text-xs text-asphalt-500">
                    {r.entityType}
                    {r.entityId ? ` · ${r.entityId.slice(0, 8)}` : ""}
                  </TD>
                </TR>
              ))}
            </tbody>
          </Table>
          <Pagination page={page} pageCount={data.pageCount} total={data.total} buildHref={(p) => buildHref("/admin/atividade", { q: sp.q }, p)} />
        </>
      )}
    </>
  );
}
