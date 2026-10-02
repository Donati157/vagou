import { SearchX } from "lucide-react";
import { SiteHeader } from "@/components/layout/site-header";
import { LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";

export default function FacilityNotFound() {
  return (
    <>
      <SiteHeader />
      <main id="conteudo" className="mx-auto max-w-xl px-4 py-20">
        <EmptyState icon={<SearchX className="size-6" aria-hidden />} title="Shopping não encontrado" description="Ele pode ter sido removido ou ainda não está publicado." action={<LinkButton href="/buscar">Ver shoppings</LinkButton>} />
      </main>
    </>
  );
}
