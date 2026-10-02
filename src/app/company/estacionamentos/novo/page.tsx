import { Breadcrumb, PageHeader } from "@/components/ui/breadcrumb";
import { getCurrentUser } from "@/modules/auth/session";
import { getUserOrganizations } from "@/modules/facilities/access";
import { FacilityForm } from "@/modules/facilities/components/facility-form";
import { db } from "@/server/db/client";
import { organizations } from "@/server/db/schema";
import { EmptyState } from "@/components/ui/states";

export const metadata = { title: "Novo shopping" };

export default async function NewFacilityPage() {
  const user = (await getCurrentUser())!;
  const orgs = user.role === "PLATFORM_ADMIN" ? await db.select({ id: organizations.id, name: organizations.name }).from(organizations).orderBy(organizations.name) : await getUserOrganizations(user.id);
  return (
    <>
      <PageHeader title="Novo shopping" description="Cadastre os dados básicos. Pisos, mapa digital, entradas e fonte de ocupação vêm em seguida.">
        <Breadcrumb items={[{ label: "Shoppings", href: "/company" }, { label: "Novo" }]} />
      </PageHeader>
      {orgs.length === 0 ? <EmptyState title="Conta sem empresa vinculada" description="Peça ao administrador da sua empresa para convidar você." /> : <FacilityForm facilityId={null} organizations={orgs.map((o) => ({ id: o.id, name: o.name }))} />}
    </>
  );
}
