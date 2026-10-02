import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { facilities, favorites, notifications, organizationMembers, organizations, profiles, users } from "@/server/db/schema";
import { audit, notify } from "@/server/lib/audit";

/** LGPD-oriented data export: everything we hold about the requesting user (and nothing about others). */
export async function exportUserData(userId: string) {
  const [account] = await db.select({ id: users.id, email: users.email, role: users.role, createdAt: users.createdAt, lastLoginAt: users.lastLoginAt }).from(users).where(eq(users.id, userId));
  const [profile] = await db.select().from(profiles).where(eq(profiles.userId, userId));
  const myFavorites = await db.select({ facility: facilities.name, savedAt: favorites.createdAt }).from(favorites).innerJoin(facilities, eq(facilities.id, favorites.facilityId)).where(eq(favorites.userId, userId));
  const memberships = await db.select({ organization: organizations.name, role: organizationMembers.role }).from(organizationMembers).innerJoin(organizations, eq(organizations.id, organizationMembers.organizationId)).where(eq(organizationMembers.userId, userId));
  const myNotifications = await db.select({ title: notifications.title, createdAt: notifications.createdAt }).from(notifications).where(eq(notifications.userId, userId));
  await audit(db, { actorId: userId, action: "user.data_exported", entityType: "user", entityId: userId });
  return { exportedAt: new Date().toISOString(), account, profile, favorites: myFavorites, organizations: memberships, notifications: myNotifications };
}

/** Records an account-deletion request for the support team (PREPARADO: anonymization runs manually in V1). */
export async function requestAccountDeletion(userId: string) {
  const admins = await db.select({ id: users.id }).from(users).where(eq(users.role, "PLATFORM_ADMIN"));
  await audit(db, { actorId: userId, action: "user.deletion_requested", entityType: "user", entityId: userId });
  await notify(db, admins.map((a) => ({ userId: a.id, type: "DELETION_REQUEST", title: "Pedido de exclusão de conta", body: `Usuário ${userId.slice(0, 8)} solicitou a exclusão dos dados.`, link: "/admin" })));
}
