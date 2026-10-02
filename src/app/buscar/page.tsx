import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { FlaskConical, Info } from "lucide-react";
import { SiteHeader } from "@/components/layout/site-header";
import { LogoMark } from "@/components/brand/logo";
import { searchParamsSchema } from "@/modules/search/params";
import { searchFacilities } from "@/modules/facilities/public";
import { ResultsView } from "@/modules/search/components/results-view";
import { SearchFilters } from "@/modules/search/components/filters";
import { SearchBar } from "@/modules/search/components/search-bar";

export const metadata: Metadata = {
  title: "Shoppings com vaga",
  description: "Veja no mapa os shoppings de São Paulo, quantas vagas cada um tem e quantas estão livres agora.",
  alternates: { canonical: "/buscar" },
};

type SP = Record<string, string | string[] | undefined>;

export default async function SearchPage({ searchParams }: { searchParams: Promise<SP> }) {
  const raw = await searchParams;
  const flat = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]).filter(([, v]) => v !== undefined && v !== "")) as Record<string, string>;
  const parsed = searchParamsSchema.safeParse(flat);
  const params = parsed.success ? parsed.data : searchParamsSchema.parse({});
  const data = await searchFacilities(params);

  const originQuery = data.hasCenter ? new URLSearchParams({ lat: data.center.lat.toFixed(5), lng: data.center.lng.toFixed(5) }).toString() : "";
  const resetSp = new URLSearchParams({ ...(params.q ? { q: params.q } : {}), ...(params.lat !== undefined ? { lat: String(params.lat), lng: String(params.lng) } : {}) });
  const place = data.centerLabel ?? (params.q || "Toda São Paulo");
  const title = data.results.length === 0 ? "Nenhum shopping" : `${data.withSpots} com vagas · ${data.results.length} ${data.results.length === 1 ? "shopping" : "shoppings"}`;

  return (
    <div className="flex h-dvh flex-col">
      <div className="hidden lg:block">
        <SiteHeader />
      </div>
      <div className="relative z-[600] border-b border-asphalt-100 bg-white px-4 pt-3 pb-2 lg:px-6 lg:py-3">
        <div className="flex items-center gap-2 lg:block">
          <Link href="/" aria-label="Vagou — página inicial" className="shrink-0 lg:hidden">
            <LogoMark className="h-9" />
          </Link>
          <div className="min-w-0 flex-1">
            <SearchBar initial={{ q: params.q, lat: params.lat, lng: params.lng }} place={place} />
          </div>
        </div>
        <div className="mt-2 lg:mt-3">
          <Suspense>
            <SearchFilters />
          </Suspense>
        </div>
      </div>
      <main id="conteudo" className="flex min-h-0 flex-1">
        <ResultsView
          results={data.results}
          center={data.center}
          hasCenter={data.hasCenter}
          originQuery={originQuery}
          emptyResetHref={`/buscar?${resetSp.toString()}`}
          title={title}
          header={
            <div className="space-y-2">
              <h1 className="text-xl font-semibold">{data.centerLabel ? `Shoppings perto de ${data.centerLabel}` : "Shoppings em São Paulo"}</h1>
              <p className="text-sm text-asphalt-500">
                {data.withSpots} de {data.results.length} com vagas livres agora
              </p>
              {data.unresolvedQuery && (
                <p className="flex items-start gap-2 rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-900" role="status">
                  <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
                  Não encontramos “{params.q}”. Mostrando shoppings de toda a cidade — escolha um local da lista de sugestões.
                </p>
              )}
              {data.anySimulated && (
                <p className="flex items-start gap-2 rounded-md border border-dashed border-amber-300 bg-status-reserved-bg/60 px-3 py-2 text-xs text-[#7a5200]" role="note">
                  <FlaskConical className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                  Versão de demonstração: a disponibilidade marcada como “simulado” é gerada para demonstração e não representa a ocupação real.
                </p>
              )}
            </div>
          }
        />
      </main>
    </div>
  );
}
