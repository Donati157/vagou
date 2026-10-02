import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/server/db/client";
import { parkingSpaces } from "@/server/db/schema";
import { getCurrentUser } from "@/modules/auth/session";
import { getFacilityHeader } from "@/modules/facilities/workspace";
import { DataSourcePanel } from "@/modules/facilities/components/data-source-panel";

export const metadata = { title: "Fonte de dados" };

export default async function DataSourcePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = (await getCurrentUser())!;
  const f = await getFacilityHeader(user, id);
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(parkingSpaces).where(and(eq(parkingSpaces.facilityId, id), isNull(parkingSpaces.archivedAt)));
  return (
    <DataSourcePanel
      facilityId={id}
      hasDigitalMap={n > 0}
      capacity={n > 0 ? n : f.declaredCapacity}
      source={f.source ? { kind: f.source.kind, granularity: f.source.granularity, lastSyncAt: f.source.lastSyncAt, name: f.source.name } : null}
    />
  );
}
