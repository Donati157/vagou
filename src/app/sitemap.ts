import type { MetadataRoute } from "next";
import { and, eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { facilities } from "@/server/db/schema";
import { SITE } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const rows = await db.select({ slug: facilities.slug, updatedAt: facilities.updatedAt }).from(facilities).where(and(eq(facilities.isPublished, true), eq(facilities.status, "ACTIVE")));
  return [
    { url: `${SITE.url}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE.url}/buscar`, changeFrequency: "always", priority: 0.9 },
    { url: `${SITE.url}/empresas`, changeFrequency: "monthly", priority: 0.6 },
    ...rows.map((r) => ({ url: `${SITE.url}/estacionamentos/${r.slug}`, lastModified: r.updatedAt, changeFrequency: "hourly" as const, priority: 0.8 })),
  ];
}
