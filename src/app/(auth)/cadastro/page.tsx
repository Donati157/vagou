import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { RegisterForm } from "@/modules/auth/components/auth-forms";
import { getCurrentUser } from "@/modules/auth/session";
import { ROLE_HOME } from "@/modules/auth/roles";
import { safeNext } from "@/modules/auth/schemas";

export const metadata: Metadata = { title: "Criar conta", description: "Crie sua conta na Vagou para salvar estacionamentos ou digitalizar o seu." };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string; tipo?: string }> }) {
  const sp = await searchParams;
  const user = await getCurrentUser();
  if (user) redirect(ROLE_HOME[user.role]);
  const initialType = sp.tipo === "empresa" ? "COMPANY_ADMIN" : "DRIVER";
  return (
    <>
      <h1 className="text-3xl font-semibold">Criar sua conta</h1>
      <p className="mt-2 mb-6 text-asphalt-500">
        Já tem conta?{" "}
        <Link href="/entrar" className="font-semibold text-green-700 hover:underline">
          Entrar
        </Link>
      </p>
      <RegisterForm next={safeNext(sp.next) ?? undefined} initialType={initialType} />
    </>
  );
}
