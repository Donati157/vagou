"use server";

import { redirect } from "next/navigation";
import { runAction } from "@/server/lib/action";
import type { ActionResult } from "@/server/lib/errors";
import { DEMO_MODE } from "@/lib/site";
import { createSession, destroySession, requireUser } from "./session";
import { authenticate, registerUser, requestPasswordReset, resetPassword, updateProfile } from "./service";
import { forgotSchema, loginSchema, profileSchema, registerSchema, resetSchema, safeNext } from "./schemas";
import { ROLE_HOME } from "./roles";
import { revalidatePath } from "next/cache";

const form = (fd: FormData) => Object.fromEntries(fd.entries());

export async function loginAction(_prev: ActionResult<null> | null, fd: FormData): Promise<ActionResult<null>> {
  let target = "/";
  const res = await runAction("login", async () => {
    const input = loginSchema.parse(form(fd));
    const user = await authenticate(input.email, input.password);
    await createSession(user.id);
    target = safeNext(input.next) ?? ROLE_HOME[user.role];
    return null;
  });
  if (res.ok) redirect(target);
  return res;
}

export async function registerAction(_prev: ActionResult<null> | null, fd: FormData): Promise<ActionResult<null>> {
  let target = "/";
  const res = await runAction("register", async () => {
    const input = registerSchema.parse(form(fd));
    const user = await registerUser(input);
    await createSession(user.id);
    target = safeNext(input.next) ?? ROLE_HOME[user.role];
    return null;
  });
  if (res.ok) redirect(target);
  return res;
}

export async function logoutAction() {
  await destroySession();
  redirect("/");
}

export async function forgotPasswordAction(_prev: ActionResult<{ devLink: string | null }> | null, fd: FormData): Promise<ActionResult<{ devLink: string | null }>> {
  return runAction("forgot_password", async () => {
    const input = forgotSchema.parse(form(fd));
    const token = await requestPasswordReset(input.email);
    // Demo mode only: no email provider is configured, so the link is shown on screen.
    const devLink = DEMO_MODE && process.env.NODE_ENV !== "production" && token ? `/redefinir-senha/${token}` : null;
    return { devLink };
  });
}

export async function resetPasswordAction(_prev: ActionResult<null> | null, fd: FormData): Promise<ActionResult<null>> {
  const res = await runAction("reset_password", async () => {
    const input = resetSchema.parse(form(fd));
    await resetPassword(input.token, input.password);
    return null;
  });
  if (res.ok) redirect("/entrar?redefinida=1");
  return res;
}

export async function updateProfileAction(_prev: ActionResult<null> | null, fd: FormData): Promise<ActionResult<null>> {
  return runAction("update_profile", async () => {
    const user = await requireUser();
    const input = profileSchema.parse(form(fd));
    await updateProfile(user.id, input);
    revalidatePath("/app", "layout");
    return null;
  });
}

export async function requestDeletionAction(): Promise<ActionResult<null>> {
  return runAction("request_deletion", async () => {
    const user = await requireUser();
    const { requestAccountDeletion } = await import("./privacy");
    await requestAccountDeletion(user.id);
    return null;
  });
}
