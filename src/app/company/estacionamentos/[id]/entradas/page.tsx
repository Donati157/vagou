import { eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { facilities, facilityEntrances } from "@/server/db/schema";
import { getCurrentUser } from "@/modules/auth/session";
import { getFacilityHeader } from "@/modules/facilities/workspace";
import { EntrancesEditor } from "@/modules/facilities/components/entrances-editor";

export const metadata = { title: "Entradas" };

export default async function EntrancesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = (await getCurrentUser())!;
  await getFacilityHeader(user, id); // authorization
  const [entrances, [f]] = await Promise.all([
    db.select().from(facilityEntrances).where(eq(facilityEntrances.facilityId, id)),
    db.select({ lat: facilities.lat, lng: facilities.lng }).from(facilities).where(eq(facilities.id, id)),
  ]);
  return <EntrancesEditor facilityId={id} fallback={f} initial={entrances.map((e) => ({ name: e.name, kind: e.kind, addressLine: e.addressLine, lat: e.lat, lng: e.lng, isPrimary: e.isPrimary, notes: e.notes }))} />;
}
