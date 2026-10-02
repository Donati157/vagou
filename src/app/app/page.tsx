import { Heart, Search } from "lucide-react";
import { PageHeader } from "@/components/ui/breadcrumb";
import { LinkButton } from "@/components/ui/button";
import { Alert, EmptyState } from "@/components/ui/states";
import { getCurrentUser } from "@/modules/auth/session";
import { listFavoriteFacilities } from "@/modules/facilities/driver";
import { FacilityCard } from "@/modules/search/components/result-card";

export const metadata = { title: "Favoritos" };

export default async function DriverHome({ searchParams }: { searchParams: Promise<{ negado?: string }> }) {
  const user = (await getCurrentUser())!;
  const sp = await searchParams;
  const favs = await listFavoriteFacilities(user.id);
  return (
    <>
      {sp.negado && <Alert tone="warning" className="mb-4">Você não tem acesso àquela área com este perfil.</Alert>}
      <PageHeader
        title={`Olá, ${user.firstName}`}
        description="Seus estacionamentos favoritos com a disponibilidade de agora."
        actions={
          <LinkButton href="/buscar" size="sm">
            <Search className="size-4" aria-hidden /> Onde tem vaga
          </LinkButton>
        }
      />
      {favs.length === 0 ? (
        <EmptyState icon={<Heart className="size-6" aria-hidden />} title="Nenhum favorito ainda" description="Salve os estacionamentos que você usa com frequência para ver as vagas livres de um jeito rápido." action={<LinkButton href="/buscar">Procurar estacionamentos</LinkButton>} />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {favs.map((f) => (
            <li key={f.id}>
              <FacilityCard r={f} href={`/estacionamentos/${f.slug}`} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
