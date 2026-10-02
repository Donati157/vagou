import { PageHeader } from "@/components/ui/breadcrumb";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/states";
import { FilterBar, buildHref } from "@/components/ui/filter-bar";
import { Pagination, Table, TD, TH, THead, TR } from "@/components/ui/table";
import { getCurrentUser } from "@/modules/auth/session";
import { ROLE_LABEL } from "@/modules/auth/roles";
import { listUsers } from "@/modules/admin/service";
import { UserStatusButton } from "@/modules/admin/components";
import { formatDateTime, formatFullDate } from "@/lib/format";

export const metadata = { title: "Usuários" };

export default async function AdminUsers({ searchParams }: { searchParams: Promise<{ q?: string; papel?: string; status?: string; pagina?: string }> }) {
  const sp = await searchParams;
  const admin = (await getCurrentUser())!;
  const page = Number(sp.pagina) || 1;
  const data = await listUsers(admin, { q: sp.q, role: sp.papel, status: sp.status, page });
  return (
    <>
      <PageHeader title="Usuários" description="Motoristas, equipes de empresas e administradores." />
      <FilterBar
        q={sp.q}
        placeholder="Nome, e-mail ou ID"
        selects={[
          { name: "papel", label: "Todos os perfis", value: sp.papel, options: Object.entries(ROLE_LABEL).map(([value, label]) => ({ value, label })) },
          { name: "status", label: "Todos os status", value: sp.status, options: [{ value: "ACTIVE", label: "Ativos" }, { value: "SUSPENDED", label: "Suspensos" }] },
        ]}
      />
      {data.rows.length === 0 ? (
        <EmptyState title="Nenhum usuário encontrado" description="Ajuste a busca ou os filtros." />
      ) : (
        <>
          <Table>
            <THead>
              <tr>
                <TH>Usuário</TH>
                <TH>Perfil</TH>
                <TH>Empresa</TH>
                <TH>Status</TH>
                <TH>Cadastro</TH>
                <TH>Último acesso</TH>
                <TH>
                  <span className="sr-only">Ações</span>
                </TH>
              </tr>
            </THead>
            <tbody>
              {data.rows.map((u) => (
                <TR key={u.id}>
                  <TD>
                    <p className="font-semibold text-fg">{u.name ?? "—"}</p>
                    <p className="text-xs text-asphalt-500">{u.email}</p>
                  </TD>
                  <TD>{ROLE_LABEL[u.role]}</TD>
                  <TD className="max-w-48 truncate">{u.orgs ?? "—"}</TD>
                  <TD>{u.status === "ACTIVE" ? <Badge tone="green">Ativo</Badge> : <Badge tone="red">Suspenso</Badge>}</TD>
                  <TD className="whitespace-nowrap">{formatFullDate(u.createdAt)}</TD>
                  <TD className="whitespace-nowrap">{u.lastLoginAt ? formatDateTime(u.lastLoginAt) : "—"}</TD>
                  <TD className="text-right">{u.id !== admin.id && <UserStatusButton userId={u.id} status={u.status} email={u.email} />}</TD>
                </TR>
              ))}
            </tbody>
          </Table>
          <Pagination page={page} pageCount={data.pageCount} total={data.total} buildHref={(p) => buildHref("/admin/usuarios", { q: sp.q, papel: sp.papel, status: sp.status }, p)} />
        </>
      )}
    </>
  );
}
