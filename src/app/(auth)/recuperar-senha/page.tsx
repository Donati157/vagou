import type { Metadata } from "next";
import Link from "next/link";
import { ForgotForm } from "@/modules/auth/components/auth-forms";

export const metadata: Metadata = { title: "Recuperar senha", robots: { index: false } };

export default function ForgotPage() {
  return (
    <>
      <h1 className="text-3xl font-semibold">Recuperar senha</h1>
      <p className="mt-2 mb-6 text-asphalt-500">Informe o e-mail da sua conta e enviaremos um link para criar uma nova senha.</p>
      <ForgotForm />
      <p className="mt-6 text-sm">
        <Link href="/entrar" className="font-semibold text-green-700 hover:underline">
          Voltar para o login
        </Link>
      </p>
    </>
  );
}
