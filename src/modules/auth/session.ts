import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/server/db/client";
import { profiles, sessions, users } from "@/server/db/schema";
import { AuthError, ForbiddenError } from "@/server/lib/errors";
import { randomToken, sha256 } from "./password";
import { canAccess, ROLE_HOME, type Area, type Role } from "./roles";

export const SESSION_COOKIE = "vagou_session";
const SESSION_DAYS = 30;

export type CurrentUser = {
  id: string;
  email: string;
  role: Role;
  fullName: string;
  firstName: string;
};

export async function createSession(userId: string) {
  const token = randomToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400_000);
  await db.insert(sessions).values({ id: sha256(token), userId, expiresAt });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db.delete(sessions).where(eq(sessions.id, sha256(token)));
  jar.delete(SESSION_COOKIE);
}

/** Resolves the logged-in user from the session cookie (memoized per request). */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const [row] = await db
    .select({ id: users.id, email: users.email, role: users.role, status: users.status, fullName: profiles.fullName })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .leftJoin(profiles, eq(profiles.userId, users.id))
    .where(and(eq(sessions.id, sha256(token)), gt(sessions.expiresAt, new Date())))
    .limit(1);
  if (!row || row.status !== "ACTIVE") return null;
  const fullName = row.fullName ?? row.email;
  return { id: row.id, email: row.email, role: row.role, fullName, firstName: fullName.split(" ")[0] };
});

/** For server actions / route handlers: throws instead of redirecting. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new AuthError();
  return user;
}

export async function requireRole(...roles: Role[]): Promise<CurrentUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) throw new ForbiddenError();
  return user;
}

/** For pages/layouts: redirects to login or to the user's own home. */
export async function requireAreaPage(area: Area, returnTo: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/entrar?next=${encodeURIComponent(returnTo)}`);
  if (!canAccess(user.role, area)) redirect(`${ROLE_HOME[user.role]}?negado=1`);
  return user;
}
