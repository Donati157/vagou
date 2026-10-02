import { getCurrentUser } from "@/modules/auth/session";
import { getFacilityForEdit } from "@/modules/facilities/manage";
import { FacilityForm } from "@/modules/facilities/components/facility-form";

export const metadata = { title: "Cadastro do estacionamento" };

export default async function FacilityEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = (await getCurrentUser())!;
  const { input } = await getFacilityForEdit(user, id);
  return <FacilityForm facilityId={id} initial={input} />;
}
