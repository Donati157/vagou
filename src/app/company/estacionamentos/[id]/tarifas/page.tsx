import { asc, eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { facilities, facilityEntrances, parkingRates } from "@/server/db/schema";
import { getCurrentUser } from "@/modules/auth/session";
import { getFacilityHeader } from "@/modules/facilities/workspace";
import { EntrancesEditor, RatesEditor } from "@/modules/facilities/components/rates-editor";

export const metadata = { title: "Tarifas e entradas" };

export default async function RatesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = (await getCurrentUser())!;
  await getFacilityHeader(user, id); // authorization
  const [rates, entrances, [f]] = await Promise.all([
    db.select().from(parkingRates).where(eq(parkingRates.facilityId, id)).orderBy(asc(parkingRates.sortOrder)),
    db.select().from(facilityEntrances).where(eq(facilityEntrances.facilityId, id)),
    db.select({ lat: facilities.lat, lng: facilities.lng }).from(facilities).where(eq(facilities.id, id)),
  ]);
  return (
    <div className="space-y-6">
      <RatesEditor
        facilityId={id}
        initial={rates.map((r) => ({
          label: r.label,
          vehicleType: r.vehicleType,
          firstPeriodMinutes: r.firstPeriodMinutes,
          firstPeriod: r.firstPeriodCents / 100,
          additionalHour: r.additionalHourCents === null ? null : r.additionalHourCents / 100,
          dailyMax: r.dailyMaxCents === null ? null : r.dailyMaxCents / 100,
          notes: r.notes,
        }))}
      />
      <EntrancesEditor facilityId={id} fallback={f} initial={entrances.map((e) => ({ name: e.name, kind: e.kind, addressLine: e.addressLine, lat: e.lat, lng: e.lng, isPrimary: e.isPrimary, notes: e.notes }))} />
    </div>
  );
}
