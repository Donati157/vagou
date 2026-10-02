import { z } from "zod";

export const emailSchema = z.string().trim().toLowerCase().email("Informe um e-mail válido.").max(160);
export const passwordSchema = z
  .string()
  .min(8, "A senha precisa ter pelo menos 8 caracteres.")
  .max(128, "A senha é longa demais.")
  .regex(/[A-Za-z]/, "Use ao menos uma letra.")
  .regex(/[0-9]/, "Use ao menos um número.");

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Informe sua senha.").max(128),
  next: z.string().optional(),
});

export const registerSchema = z
  .object({
    fullName: z.string().trim().min(3, "Informe seu nome.").max(100),
    email: emailSchema,
    password: passwordSchema,
    accountType: z.enum(["DRIVER", "COMPANY_ADMIN"]),
    organizationName: z.string().trim().max(120).optional(),
    acceptTerms: z.literal("on", { message: "É preciso aceitar os termos para continuar." }),
    next: z.string().optional(),
  })
  .refine((v) => v.accountType !== "COMPANY_ADMIN" || (v.organizationName?.length ?? 0) >= 2, {
    path: ["organizationName"],
    message: "Informe o nome da empresa.",
  });

export const forgotSchema = z.object({ email: emailSchema });
export const resetSchema = z
  .object({ token: z.string().min(20).max(200), password: passwordSchema, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "As senhas não conferem." });

export const profileSchema = z.object({
  fullName: z.string().trim().min(3, "Informe seu nome.").max(100),
  phone: z
    .string()
    .trim()
    .max(20)
    .regex(/^[0-9()+\-\s]*$/, "Telefone inválido.")
    .optional()
    .transform((v) => v || null),
});

/** Only allow internal redirects after login (prevents open redirects). */
export function safeNext(next: string | undefined | null) {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return null;
  return next;
}
