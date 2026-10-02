import type { Metadata } from "next";
import { ResetForm } from "@/modules/auth/components/auth-forms";

export const metadata: Metadata = { title: "Redefinir senha", robots: { index: false } };

export default async function ResetPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <>
      <h1 className="text-3xl font-semibold">Criar nova senha</h1>
      <p className="mt-2 mb-6 text-asphalt-500">Escolha uma senha forte. Por segurança, você será desconectado de outros dispositivos.</p>
      <ResetForm token={token} />
    </>
  );
}
