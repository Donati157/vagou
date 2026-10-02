import { getCurrentUser } from "@/modules/auth/session";
import { getOperationalState } from "@/modules/occupancy/operations";
import { OperationalMap } from "@/modules/occupancy/components/operational-map";

export const metadata = { title: "Operação" };

export default async function OperationPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ piso?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const user = (await getCurrentUser())!;
  const state = await getOperationalState(user, id, sp.piso ?? null);
  return <OperationalMap facilityId={id} initial={JSON.parse(JSON.stringify(state))} />;
}
