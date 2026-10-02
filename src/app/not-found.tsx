import { MapPinOff } from "lucide-react";
import { SiteHeader } from "@/components/layout/site-header";
import { LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main id="conteudo" className="mx-auto max-w-xl px-4 py-20">
        <EmptyState icon={<MapPinOff className="size-6" aria-hidden />} title="Página não encontrada" description="O endereço pode estar errado ou a página foi removida." action={<LinkButton href="/">Voltar ao início</LinkButton>} />
      </main>
    </>
  );
}
