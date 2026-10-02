import "server-only";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { db } from "@/server/db/client";
import { organizationMembers, organizations, passwordResetTokens, profiles, sessions, users } from "@/server/db/schema";
import { AppError } from "@/server/lib/errors";
import { audit } from "@/server/lib/audit";
import { logger } from "@/server/lib/logger";
import { pgErrorCode, PG_UNIQUE_VIOLATION } from "@/server/lib/pg";
import { hashPassword, randomToken, sha256, verifyPassword } from "./password";
import type { Role } from "./roles";

// Equalizes timing between "unknown email" and "wrong password".
const DUMMY_HASH = "scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA$" + "A".repeat(86);

export async function authenticate(email: string, password: string) {
  const [u] = await db
    .select({ id: users.id, passwordHash: users.passwordHash, role: users.role, status: users.status })
    .from(users)
    .where(and(sql`lower(${users.email}) = ${email.toLowerCase()}`, isNull(users.deletedAt)));
  const ok = await verifyPassword(password, u?.passwordHash ?? DUMMY_HASH);
  if (!u || !ok) throw new AppError("INVALID_CREDENTIALS", "E-mail ou senha incorretos.", 401);
  if (u.status !== "ACTIVE") throw new AppError("SUSPENDED", "Sua conta está suspensa. Fale com o suporte.", 403);
  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, u.id));
  return { id: u.id, role: u.role as Role };
}

export async function registerUser(input: { fullName: string; email: string; password: string; accountType: "DRIVER" | "COMPANY_ADMIN"; organizationName?: string }) {
  const passwordHash = await hashPassword(input.password);
  try {
    return await db.transaction(async (tx) => {
      const [u] = await tx.insert(users).values({ email: input.email, passwordHash, role: input.accountType }).returning({ id: users.id, role: users.role });
      await tx.insert(profiles).values({ userId: u.id, fullName: input.fullName });
      if (input.accountType === "COMPANY_ADMIN" && input.organizationName) {
        const base = input.organizationName
          .toLowerCase()
          .normalize("NFD")
          .replace(/[̀-ͯ]/g, "")
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "");
        const [org] = await tx
          .insert(organizations)
          .values({ name: input.organizationName, slug: `${base || "empresa"}-${randomToken(3).toLowerCase()}`, type: "OTHER" })
          .returning({ id: organizations.id });
        await tx.insert(organizationMembers).values({ organizationId: org.id, userId: u.id, role: "OWNER" });
      }
      await audit(tx, { actorId: u.id, action: "user.registered", entityType: "user", entityId: u.id, metadata: { role: input.accountType } });
      return { id: u.id, role: u.role as Role };
    });
  } catch (err) {
    if (pgErrorCode(err) === PG_UNIQUE_VIOLATION) throw new AppError("EMAIL_TAKEN", "Já existe uma conta com este e-mail. Tente entrar.");
    throw err;
  }
}

/**
 * Creates a password-reset token. Always behaves the same whether or not the email exists
 * (no account enumeration). Returns the raw token only so the dev email adapter can show it.
 */
export async function requestPasswordReset(email: string): Promise<string | null> {
  const [u] = await db.select({ id: users.id }).from(users).where(sql`lower(${users.email}) = ${email.toLowerCase()}`);
  if (!u) return null;
  const token = randomToken();
  await db.insert(passwordResetTokens).values({ tokenHash: sha256(token), userId: u.id, expiresAt: new Date(Date.now() + 30 * 60000) });
  await sendPasswordResetEmail(email, token);
  return token;
}

/** Email adapter (PREPARADO): V1 logs that an email would be sent; no external provider configured. */
async function sendPasswordResetEmail(email: string, token: string) {
  void email;
  void token;
  logger.info("password_reset_email_queued", { provider: "dev-log" });
}

export async function resetPassword(token: string, password: string) {
  const hash = sha256(token);
  const [row] = await db
    .select()
    .from(passwordResetTokens)
    .where(and(eq(passwordResetTokens.tokenHash, hash), isNull(passwordResetTokens.usedAt), gt(passwordResetTokens.expiresAt, new Date())));
  if (!row) throw new AppError("RESET_INVALID", "Este link de redefinição é inválido ou expirou. Solicite um novo.");
  const passwordHash = await hashPassword(password);
  await db.transaction(async (tx) => {
    await tx.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, row.userId));
    await tx.update(passwordResetTokens).set({ usedAt: new Date() }).where(eq(passwordResetTokens.tokenHash, hash));
    // Invalidate every existing session after a password change.
    await tx.delete(sessions).where(eq(sessions.userId, row.userId));
    await audit(tx, { actorId: row.userId, action: "user.password_reset", entityType: "user", entityId: row.userId });
  });
}

export async function getProfile(userId: string) {
  const [p] = await db
    .select({ fullName: profiles.fullName, phone: profiles.phone, email: users.email, createdAt: users.createdAt })
    .from(users)
    .leftJoin(profiles, eq(profiles.userId, users.id))
    .where(eq(users.id, userId));
  return p;
}

export async function updateProfile(userId: string, data: { fullName: string; phone: string | null }) {
  await db
    .insert(profiles)
    .values({ userId, ...data })
    .onConflictDoUpdate({ target: profiles.userId, set: { ...data, updatedAt: new Date() } });
}
