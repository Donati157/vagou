"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { AlertCircle, Building2, Car, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Alert } from "@/components/ui/states";
import { cn } from "@/lib/cn";
import type { ActionResult } from "@/server/lib/errors";
import { forgotPasswordAction, loginAction, registerAction, resetPasswordAction } from "../actions";

function fe(state: ActionResult<unknown> | null, key: string) {
  return state && !state.ok ? state.fieldErrors?.[key] : undefined;
}

function FormError({ state }: { state: ActionResult<unknown> | null }) {
  if (!state || state.ok) return null;
  return (
    <Alert tone="danger" icon={<AlertCircle className="size-4" />}>
      {state.error}
    </Alert>
  );
}

const DEMO_ACCOUNTS = [
  { label: "Motorista", email: "motorista@vagou.demo" },
  { label: "Empresa", email: "empresa@vagou.demo" },
  { label: "Admin", email: "admin@vagou.demo" },
];

export function LoginForm({ next, demoMode, demoPassword }: { next?: string; demoMode: boolean; demoPassword?: string }) {
  const [state, action, pending] = useActionState(loginAction, null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormError state={state} />
      <input type="hidden" name="next" value={next ?? ""} />
      <Field label="E-mail" htmlFor="email" error={fe(state, "email")}>
        <Input id="email" name="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!fe(state, "email")} />
      </Field>
      <Field label="Senha" htmlFor="password" error={fe(state, "password")}>
        <Input id="password" name="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
      </Field>
      <div className="flex justify-end">
        <Link href="/recuperar-senha" className="text-sm font-medium text-green-700 hover:underline">
          Esqueci minha senha
        </Link>
      </div>
      <Button type="submit" className="w-full" size="lg" loading={pending}>
        Entrar
      </Button>
      {demoMode && demoPassword && (
        <div className="rounded-md border border-dashed border-asphalt-300 bg-asphalt-25 p-4">
          <p className="text-sm font-semibold text-asphalt-700">Contas de demonstração</p>
          <p className="mt-0.5 text-xs text-asphalt-500">Disponível apenas em ambiente de desenvolvimento.</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {DEMO_ACCOUNTS.map((a) => (
              <button
                key={a.email}
                type="button"
                onClick={() => {
                  setEmail(a.email);
                  setPassword(demoPassword);
                }}
                className="rounded-sm border border-asphalt-200 bg-white px-3 py-2 text-left text-sm font-medium hover:border-ink-700"
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </form>
  );
}

const ACCOUNT_TYPES = [
  { value: "DRIVER", label: "Sou motorista", hint: "Salvar estacionamentos favoritos", Icon: Car },
  { value: "COMPANY_ADMIN", label: "Sou uma empresa", hint: "Digitalizar e gerir estacionamentos", Icon: Building2 },
] as const;

export function RegisterForm({ next, initialType }: { next?: string; initialType?: string }) {
  const [state, action, pending] = useActionState(registerAction, null);
  const [type, setType] = useState<string>(ACCOUNT_TYPES.some((t) => t.value === initialType) ? initialType! : "DRIVER");
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormError state={state} />
      <input type="hidden" name="next" value={next ?? ""} />
      <fieldset>
        <legend className="mb-2 text-sm font-medium text-asphalt-700">Como você vai usar a Vagou?</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {ACCOUNT_TYPES.map(({ value, label, hint, Icon }) => (
            <label
              key={value}
              className={cn(
                "flex cursor-pointer flex-col gap-1 rounded-md border p-3 transition-colors has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-green-200",
                type === value ? "border-ink-900 bg-green-50" : "border-asphalt-200 bg-white hover:border-asphalt-300",
              )}
            >
              <input type="radio" name="accountType" value={value} checked={type === value} onChange={() => setType(value)} className="sr-only" />
              <Icon className="size-5 text-ink-800" aria-hidden />
              <span className="text-sm font-semibold text-ink-900">{label}</span>
              <span className="text-xs text-asphalt-500">{hint}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <Field label="Nome completo" htmlFor="fullName" error={fe(state, "fullName")}>
        <Input id="fullName" name="fullName" autoComplete="name" required />
      </Field>
      {type === "COMPANY_ADMIN" && (
        <Field label="Nome da empresa" htmlFor="organizationName" error={fe(state, "organizationName")}>
          <Input id="organizationName" name="organizationName" autoComplete="organization" />
        </Field>
      )}
      <Field label="E-mail" htmlFor="email" error={fe(state, "email")}>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </Field>
      <Field label="Senha" htmlFor="password" hint="Mínimo de 8 caracteres, com letras e números." error={fe(state, "password")}>
        <Input id="password" name="password" type="password" autoComplete="new-password" required />
      </Field>
      <label className="flex items-start gap-2.5 text-sm text-asphalt-600">
        <input type="checkbox" name="acceptTerms" className="mt-0.5 size-4 accent-ink-900" />
        <span>
          Li e aceito os termos de uso e a política de privacidade. Usamos seus dados apenas para operar sua conta.
        </span>
      </label>
      {fe(state, "acceptTerms") && <p className="text-sm text-danger">{fe(state, "acceptTerms")?.[0]}</p>}
      <Button type="submit" className="w-full" size="lg" loading={pending}>
        Criar conta
      </Button>
    </form>
  );
}

export function ForgotForm() {
  const [state, action, pending] = useActionState(forgotPasswordAction, null);
  if (state?.ok) {
    return (
      <div className="space-y-4">
        <Alert tone="success" icon={<CheckCircle2 className="size-4" />} title="Verifique seu e-mail">
          Se existir uma conta com esse e-mail, enviaremos um link para redefinir a senha. O link expira em 30 minutos.
        </Alert>
        {state.data.devLink && (
          <Alert tone="warning" title="Modo demonstração">
            Nenhum provedor de e-mail está configurado. Use este link de desenvolvimento:{" "}
            <Link href={state.data.devLink} className="font-semibold underline">
              redefinir senha
            </Link>
          </Alert>
        )}
      </div>
    );
  }
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormError state={state} />
      <Field label="E-mail da conta" htmlFor="email" error={fe(state, "email")}>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </Field>
      <Button type="submit" className="w-full" size="lg" loading={pending}>
        Enviar link de redefinição
      </Button>
    </form>
  );
}

export function ResetForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(resetPasswordAction, null);
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormError state={state} />
      <input type="hidden" name="token" value={token} />
      <Field label="Nova senha" htmlFor="password" hint="Mínimo de 8 caracteres, com letras e números." error={fe(state, "password")}>
        <Input id="password" name="password" type="password" autoComplete="new-password" required />
      </Field>
      <Field label="Confirme a nova senha" htmlFor="confirm" error={fe(state, "confirm")}>
        <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required />
      </Field>
      <Button type="submit" className="w-full" size="lg" loading={pending}>
        Salvar nova senha
      </Button>
    </form>
  );
}
