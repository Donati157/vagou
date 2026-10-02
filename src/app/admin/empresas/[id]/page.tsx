import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Breadcrumb, PageHeader } from "@/components/ui/breadcrumb";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { getCurrentUser } from "@/modules/auth/session";
import { getOrganizationDetail } from "@/modules/admin/service";
import { FACILITY_KIND_LABEL, ORG_TYPE_LABEL } from "@/lib/labels";
import { z } from "@/lib/zod";

export const metadata = { title: "Empresa" };

export default async function AdminOrgDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const admin = (await getCurrentUser())!;
  const data = await getOrganizationDetail(admin, id);
  if (!data) notFound();
  return (
    <>
      <PageHeader title={data.org.name} description={ORG_TYPE_LABEL[data.org.type]}>
        <Breadcrumb items={[{ label: "Empresas", href: "/admin/empresas" }, { label: data.org.name }]} />
      </PageHeader>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Membros" />
          <CardBody>
            <ul className="divide-y divide-asphalt-100 text-sm">
              {data.members.map((m) => (
                <li key={m.id} className="flex items-center justify-between py-2">
                  <span>
                    <span className="font-medium text-ink-900">{m.name}</span> <span className="text-asphalt-500">· {m.email}</span>
                  </span>
                  {m.status === "SUSPENDED" ? <Badge tone="red">Suspenso</Badge> : <Badge tone="outline">{m.role === "OWNER" ? "Responsável" : m.role === "ADMIN" ? "Administrador" : "Operador"}</Badge>}
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Shoppings" />
          <CardBody>
            <ul className="divide-y divide-asphalt-100 text-sm">
              {data.facilities.map((f) => (
                <li key={f.id} className="flex items-center justify-between gap-2 py-2">
                  <Link href={`/company/estacionamentos/${f.id}`} className="font-medium text-ink-900 hover:underline">
                    {f.name}
                  </Link>
                  <span className="flex items-center gap-2 text-asphalt-500">
                    {FACILITY_KIND_LABEL[f.kind]} · {f.neighborhood}
                    {f.isPublished ? <Badge tone="green">Publicado</Badge> : <Badge tone="outline">Rascunho</Badge>}
                  </span>
                </li>
              ))}
              {data.facilities.length === 0 && <li className="py-2 text-asphalt-500">Nenhum shopping.</li>}
            </ul>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
