import "server-only";
import { and, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/server/db/client";
import { auditLogs, dataSources, facilities, organizationMembers, organizations, profiles, sessions, users } from "@/server/db/schema";
import { AppError, ForbiddenError } from "@/server/lib/errors";
import { audit } from "@/server/lib/audit";
import type { CurrentUser } from "@/modules/auth/session";

/** Platform-admin queries. Callers must have verified PLATFORM_ADMIN (layout + actions). */
export const PAGE_SIZE = 20;
const like = (q: string) => `%${q.replace(/[%_\\]/g, (c) => `\\${c}`)}%`;
const page = (p: number) => ({ limit: PAGE_SIZE, offset: (Math.max(1, p) - 1) * PAGE_SIZE });

function assertAdmin(user: CurrentUser) {
  if (user.role !== "PLATFORM_ADMIN") throw new ForbiddenError();
}

export async function listUsers(user: CurrentUser, opts: { q?: string; role?: string; status?: string; page: number }) {
  assertAdmin(user);
  const where: SQL[] = [];
  if (opts.q) where.push(or(ilike(users.email, like(opts.q)), ilike(profiles.fullName, like(opts.q)), sql`${users.id}::text = ${opts.q}`)!);
  if (opts.role === "DRIVER" || opts.role === "COMPANY_ADMIN" || opts.role === "PLATFORM_ADMIN") where.push(eq(users.role, opts.role));
  if (opts.status === "ACTIVE" || opts.status === "SUSPENDED") where.push(eq(users.status, opts.status));
  const cond = where.length ? and(...where) : undefined;
  const [{ total }] = await db.select({ total: sql<number>`count(*)::int` }).from(users).leftJoin(profiles, eq(profiles.userId, users.id)).where(cond);
  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      role: users.role,
      status: users.status,
      createdAt: users.createdAt,
      lastLoginAt: users.lastLoginAt,
      name: profiles.fullName,
      orgs: sql<string | null>`(select string_agg(o.name, ', ') from organization_members m join organizations o on o.id = m.organization_id where m.user_id = "users"."id")`,
    })
    .from(users)
    .leftJoin(profiles, eq(profiles.userId, users.id))
    .where(cond)
    .orderBy(desc(users.createdAt))
    .limit(page(opts.page).limit)
    .offset(page(opts.page).offset);
  return { total, pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)), rows };
}

export async function setUserStatus(admin: CurrentUser, userId: string, status: "ACTIVE" | "SUSPENDED") {
  assertAdmin(admin);
  if (userId === admin.id) throw new AppError("SELF", "Você não pode suspender a própria conta.");
  await db.transaction(async (tx) => {
    await tx.update(users).set({ status, updatedAt: new Date() }).where(eq(users.id, userId));
    if (status === "SUSPENDED") await tx.delete(sessions).where(eq(sessions.userId, userId)); // sign out everywhere
    await audit(tx, { actorId: admin.id, action: status === "SUSPENDED" ? "user.suspended" : "user.reactivated", entityType: "user", entityId: userId });
  });
}

export async function listOrganizations(user: CurrentUser, opts: { q?: string; type?: string; page: number }) {
  assertAdmin(user);
  const where: SQL[] = [];
  if (opts.q) where.push(ilike(organizations.name, like(opts.q)));
  if (opts.type) where.push(sql`${organizations.type}::text = ${opts.type}`);
  const cond = where.length ? and(...where) : undefined;
  const [{ total }] = await db.select({ total: sql<number>`count(*)::int` }).from(organizations).where(cond);
  const rows = await db
    .select({
      id: organizations.id,
      name: organizations.name,
      type: organizations.type,
      status: organizations.status,
      createdAt: organizations.createdAt,
      members: sql<number>`(select count(*)::int from organization_members m where m.organization_id = "organizations"."id")`,
      facilities: sql<number>`(select count(*)::int from facilities f where f.organization_id = "organizations"."id")`,
      published: sql<number>`(select count(*)::int from facilities f where f.organization_id = "organizations"."id" and f.is_published)`,
    })
    .from(organizations)
    .where(cond)
    .orderBy(organizations.name)
    .limit(page(opts.page).limit)
    .offset(page(opts.page).offset);
  return { total, pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)), rows };
}

export async function getOrganizationDetail(user: CurrentUser, orgId: string) {
  assertAdmin(user);
  const [org] = await db.select().from(organizations).where(eq(organizations.id, orgId));
  if (!org) return null;
  const [members, facs] = await Promise.all([
    db
      .select({ id: users.id, email: users.email, role: organizationMembers.role, name: profiles.fullName, status: users.status })
      .from(organizationMembers)
      .innerJoin(users, eq(users.id, organizationMembers.userId))
      .leftJoin(profiles, eq(profiles.userId, users.id))
      .where(eq(organizationMembers.organizationId, orgId)),
    db.select({ id: facilities.id, name: facilities.name, slug: facilities.slug, neighborhood: facilities.neighborhood, isPublished: facilities.isPublished, kind: facilities.kind }).from(facilities).where(eq(facilities.organizationId, orgId)).orderBy(facilities.name),
  ]);
  return { org, members, facilities: facs };
}

export async function listAllFacilities(user: CurrentUser, opts: { q?: string; published?: string; source?: string; page: number }) {
  assertAdmin(user);
  const where: SQL[] = [];
  if (opts.q) where.push(or(ilike(facilities.name, like(opts.q)), ilike(facilities.neighborhood, like(opts.q)), ilike(organizations.name, like(opts.q)))!);
  if (opts.published === "1") where.push(eq(facilities.isPublished, true));
  if (opts.published === "0") where.push(eq(facilities.isPublished, false));
  if (opts.source === "NONE") where.push(sql`not exists (select 1 from data_sources d where d.facility_id = "facilities"."id" and d.status = 'ACTIVE')`);
  else if (opts.source) where.push(sql`exists (select 1 from data_sources d where d.facility_id = "facilities"."id" and d.status = 'ACTIVE' and d.kind::text = ${opts.source})`);
  const cond = where.length ? and(...where) : undefined;
  const [{ total }] = await db.select({ total: sql<number>`count(*)::int` }).from(facilities).innerJoin(organizations, eq(organizations.id, facilities.organizationId)).where(cond);
  const rows = await db
    .select({
      id: facilities.id,
      name: facilities.name,
      slug: facilities.slug,
      kind: facilities.kind,
      neighborhood: facilities.neighborhood,
      isPublished: facilities.isPublished,
      declaredCapacity: facilities.declaredCapacity,
      org: organizations.name,
      orgId: organizations.id,
      spaces: sql<number>`(select count(*)::int from parking_spaces s where s.facility_id = "facilities"."id" and s.archived_at is null)`,
      source: sql<string | null>`(select d.kind::text from data_sources d where d.facility_id = "facilities"."id" and d.status = 'ACTIVE' limit 1)`,
    })
    .from(facilities)
    .innerJoin(organizations, eq(organizations.id, facilities.organizationId))
    .where(cond)
    .orderBy(facilities.name)
    .limit(page(opts.page).limit)
    .offset(page(opts.page).offset);
  return { total, pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)), rows };
}

/** Data sources with freshness; "stale" means no update within 15 min (3 h for manual). */
export async function listDataSources(user: CurrentUser, opts: { kind?: string; status?: string; page: number }) {
  assertAdmin(user);
  const where: SQL[] = [];
  if (opts.kind) where.push(sql`${dataSources.kind}::text = ${opts.kind}`);
  if (opts.status) where.push(sql`${dataSources.status}::text = ${opts.status}`);
  const cond = where.length ? and(...where) : undefined;
  const [{ total }] = await db.select({ total: sql<number>`count(*)::int` }).from(dataSources).where(cond);
  const rows = await db
    .select({
      id: dataSources.id,
      kind: dataSources.kind,
      granularity: dataSources.granularity,
      status: dataSources.status,
      name: dataSources.name,
      lastSyncAt: dataSources.lastSyncAt,
      lastError: dataSources.lastError,
      createdAt: dataSources.createdAt,
      facility: facilities.name,
      facilityId: facilities.id,
      org: organizations.name,
    })
    .from(dataSources)
    .innerJoin(facilities, eq(facilities.id, dataSources.facilityId))
    .innerJoin(organizations, eq(organizations.id, facilities.organizationId))
    .where(cond)
    .orderBy(desc(dataSources.status), facilities.name)
    .limit(page(opts.page).limit)
    .offset(page(opts.page).offset);
  const now = Date.now();
  return {
    total,
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    rows: rows.map((d) => ({ ...d, stale: d.status === "ACTIVE" && (!d.lastSyncAt || now - d.lastSyncAt.getTime() > (d.kind === "MANUAL" ? 180 : 15) * 60000) })),
  };
}

export async function listAudit(user: CurrentUser, opts: { q?: string; page: number }) {
  assertAdmin(user);
  const cond = opts.q ? or(ilike(auditLogs.action, like(opts.q)), ilike(auditLogs.entityType, like(opts.q)), sql`${auditLogs.entityId} = ${opts.q}`) : undefined;
  const [{ total }] = await db.select({ total: sql<number>`count(*)::int` }).from(auditLogs).where(cond);
  const rows = await db
    .select({ id: auditLogs.id, action: auditLogs.action, entityType: auditLogs.entityType, entityId: auditLogs.entityId, createdAt: auditLogs.createdAt, actor: profiles.fullName, actorEmail: users.email })
    .from(auditLogs)
    .leftJoin(users, eq(users.id, auditLogs.actorId))
    .leftJoin(profiles, eq(profiles.userId, auditLogs.actorId))
    .where(cond)
    .orderBy(desc(auditLogs.createdAt))
    .limit(page(opts.page).limit)
    .offset(page(opts.page).offset);
  return { total, pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)), rows };
}
