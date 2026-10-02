import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { Alert } from "@/components/ui/states";
import { LoginForm } from "@/modules/auth/components/auth-forms";
import { getCurrentUser } from "@/modules/auth/session";
import { ROLE_HOME } from "@/modules/auth/roles";
import { safeNext } from "@/modules/auth/schemas";
import { DEMO_MODE } from "@/lib/site";

export const metadata: Metadata = { title: "Entrar", robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; redefinida?: string }> }) {
  const sp = await searchParams;
  const user = await getCurrentUser();
  if (user) redirect(safeNext(sp.next) ?? ROLE_HOME[user.role]);
  const showDemo = DEMO_MODE && process.env.NODE_ENV !== "production";
  return (
    <>
      <h1 className="text-3xl font-semibold">Entrar na Vagou</h1>
      <p className="mt-2 mb-6 text-asphalt-500">
        Ainda não tem conta?{" "}
        <Link href={`/cadastro${sp.next ? `?next=${encodeURIComponent(sp.next)}` : ""}`} className="font-semibold text-green-700 hover:underline">
          Cadastre-se grátis
        </Link>
      </p>
      {sp.redefinida && (
        <Alert tone="success" className="mb-4" icon={<CheckCircle2 className="size-4" />}>
          Senha redefinida. Entre com a nova senha.
        </Alert>
      )}
      <LoginForm next={safeNext(sp.next) ?? undefined} demoMode={showDemo} demoPassword={showDemo ? (process.env.DEMO_PASSWORD ?? "Vagou@2026") : undefined} />
    </>
  );
}
