import { getCurrentUser } from "@/modules/auth/session";
import { listFloorsWithSectors } from "@/modules/facilities/manage";
import { FloorsManager } from "@/modules/facilities/components/floors-manager";

export const metadata = { title: "Pisos e mapas" };

export default async function FloorsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = (await getCurrentUser())!;
  const floors = await listFloorsWithSectors(user, id);
  return <FloorsManager facilityId={id} floors={floors} />;
}
