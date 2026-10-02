import Link from "next/link";
import { ArrowRight, Building2, Clock, Cpu, Eye, Layers, MapPinned, Navigation, Radar, Search, ShieldCheck } from "lucide-react";
import { SiteHeader } from "@/components/layout/site-header";
import { LinkButton } from "@/components/ui/button";
import { HeroMap } from "@/components/brand/hero-map";
import { SearchForm } from "@/modules/search/components/search-form";
import { getPublicStats } from "@/modules/search/stats";
import { formatNumber } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const stats = await getPublicStats();
  return (
    <>
      <section className="relative overflow-hidden bg-ink-900 pb-16 text-white sm:pb-24">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_80%_0%,rgba(92,184,116,0.25),transparent_55%)]" />
        <SiteHeader variant="transparent" />
        <main id="conteudo" className="relative mx-auto max-w-7xl px-4 pt-10 sm:px-6 sm:pt-16">
          <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_1fr]">
            <div>
              <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-sm text-green-200">
                <span className="size-2 rounded-full bg-green-400" aria-hidden /> {formatNumber(stats.facilities)} estacionamentos em {formatNumber(stats.neighborhoods)} bairros de São Paulo
              </p>
              <h1 className="font-display text-[44px] leading-[1.02] font-bold tracking-[-0.035em] text-white sm:text-6xl lg:text-[72px]">
                Pare de procurar <span className="text-green-400">vaga.</span>
              </h1>
              <p className="mt-5 max-w-xl text-lg text-white/75">
                A Vagou ajuda você a descobrir onde tem vaga para estacionar. Diga para onde vai e veja no mapa os estacionamentos próximos e quantas vagas estão livres.
              </p>
              <div className="mt-8 max-w-2xl text-asphalt-900">
                <SearchForm initial={{}} />
              </div>
              <p className="mt-3 text-sm text-white/55">Sem cadastro. Abra, pesquise e vá direto para onde tem vaga.</p>
            </div>
            <div className="hidden lg:block">
              <HeroMap />
            </div>
          </div>
        </main>
      </section>

      <section aria-labelledby="como-funciona" className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <p className="text-sm font-semibold tracking-wide text-green-600 uppercase">Como funciona</p>
        <h2 id="como-funciona" className="mt-2 max-w-2xl text-3xl font-semibold sm:text-4xl">Do destino à vaga, sem rodar o quarteirão.</h2>
        <ol className="mt-10 grid gap-6 md:grid-cols-3">
          {[
            { Icon: Search, title: "Diga para onde vai", text: "Digite o destino ou use sua localização. Mostramos os estacionamentos ao redor." },
            { Icon: Eye, title: "Veja onde tem vaga", text: "Cada pin mostra quantas vagas estão livres agora, a distância, o preço e se está aberto." },
            { Icon: Navigation, title: "Vá direto", text: "Escolha o estacionamento e toque em “Ir até lá”. Indicamos a melhor entrada." },
          ].map(({ Icon, title, text }, i) => (
            <li key={title} className="rounded-lg border border-asphalt-100 bg-white p-6">
              <span className="font-display text-sm font-bold text-asphalt-300">0{i + 1}</span>
              <Icon className="mt-3 size-7 text-green-600" aria-hidden />
              <h3 className="mt-4 text-lg font-semibold">{title}</h3>
              <p className="mt-2 text-[15px] text-asphalt-600">{text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="dentro" className="border-y border-asphalt-100 bg-white">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2">
          <div>
            <p className="text-sm font-semibold tracking-wide text-green-600 uppercase">Dentro do estacionamento</p>
            <h2 id="dentro" className="mt-2 text-3xl font-semibold sm:text-4xl">Saiba qual piso tem vaga antes de entrar.</h2>
            <p className="mt-4 max-w-lg text-asphalt-600">Em estacionamentos com mapa digital, você vê as vagas livres por piso e setor — inclusive PCD e com carregador para elétricos.</p>
            <ul className="mt-6 space-y-3 text-[15px] text-asphalt-700">
              {[
                { Icon: Layers, t: "G1 — 34 vagas livres · G2 — 18 · G3 — Lotado" },
                { Icon: MapPinned, t: "Mapa das vagas com status por cor, ícone e padrão" },
                { Icon: Clock, t: "Horários, preços e entradas sempre à mão" },
              ].map(({ Icon, t }) => (
                <li key={t} className="flex gap-3">
                  <Icon className="mt-0.5 size-5 shrink-0 text-ink-800" aria-hidden /> {t}
                </li>
              ))}
            </ul>
            <LinkButton href="/buscar?q=An%C3%A1lia%20Franco&lat=-23.56230&lng=-46.55940" className="mt-8">
              Ver um exemplo <ArrowRight className="size-4" aria-hidden />
            </LinkButton>
          </div>
          <div aria-hidden className="rounded-xl border border-asphalt-100 bg-asphalt-25 p-5">
            <div className="grid grid-cols-10 gap-1.5">
              {Array.from({ length: 60 }).map((_, i) => {
                const s = i % 7 === 3 ? "bg-status-unavailable pattern-hatch" : i % 3 === 0 ? "bg-status-available" : i % 11 === 5 ? "bg-[#e8a317] pattern-dots" : "bg-status-occupied";
                return <span key={i} className={`h-10 rounded-sm ${s}`} />;
              })}
            </div>
            <div className="mt-4 flex flex-wrap gap-4 text-xs text-asphalt-600">
              <span className="flex items-center gap-1.5"><span className="size-3 rounded-sm bg-status-available" /> Livre</span>
              <span className="flex items-center gap-1.5"><span className="size-3 rounded-sm bg-status-occupied" /> Ocupada</span>
              <span className="flex items-center gap-1.5"><span className="pattern-dots size-3 rounded-sm bg-[#e8a317]" /> Reservada pelo estacionamento</span>
              <span className="flex items-center gap-1.5"><span className="pattern-hatch size-3 rounded-sm bg-status-unavailable" /> Indisponível</span>
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="dados" className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <p className="text-sm font-semibold tracking-wide text-green-600 uppercase">Transparência</p>
            <h2 id="dados" className="mt-2 text-3xl font-semibold sm:text-4xl">Você sempre sabe de onde vem o número.</h2>
          </div>
          <ul className="grid gap-6 sm:grid-cols-2">
            {[
              { Icon: Radar, t: "Fontes conectadas", d: "Sensores, câmeras, cancelas ou o sistema do próprio estacionamento alimentam a disponibilidade." },
              { Icon: Clock, t: "Atualização visível", d: "Mostramos quando o dado foi atualizado. Informação antiga não aparece como atual." },
              { Icon: ShieldCheck, t: "Sem dados? Avisamos", d: "Se um estacionamento não compartilha ocupação, dizemos isso claramente." },
              { Icon: Cpu, t: "Fase de demonstração", d: "Nesta versão, a ocupação de vários estacionamentos é simulada e sinalizada como tal." },
            ].map(({ Icon, t, d }) => (
              <li key={t} className="flex gap-4">
                <span className="grid size-11 shrink-0 place-items-center rounded-md bg-green-50 text-green-600">
                  <Icon className="size-5" aria-hidden />
                </span>
                <div>
                  <h3 className="font-semibold">{t}</h3>
                  <p className="mt-1 text-[15px] text-asphalt-600">{d}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="empresas" className="relative overflow-hidden bg-ink-950 text-white">
        <div className="road-grid pointer-events-none absolute inset-0 opacity-30 invert" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2">
          <div>
            <p className="text-sm font-semibold tracking-wide text-green-300 uppercase">Vagou para empresas</p>
            <h2 id="empresas" className="mt-2 text-3xl font-semibold text-white sm:text-4xl">Mostre aos motoristas que você tem vaga.</h2>
            <p className="mt-4 max-w-lg text-white/70">Shoppings, edifícios, hospitais e operadores digitalizam o estacionamento a partir da planta, acompanham a ocupação por piso e setor e aparecem para quem está procurando vaga por perto.</p>
            <LinkButton href="/empresas" variant="accent" size="lg" className="mt-8">
              Vagou para empresas <ArrowRight className="size-5" aria-hidden />
            </LinkButton>
          </div>
          <dl className="grid grid-cols-2 gap-4">
            {[
              { Icon: Layers, t: "Mapa inteligente", d: "Da planta ao mapa digital de vagas." },
              { Icon: Radar, t: "Ocupação ao vivo", d: "Integração com sensores, câmeras e cancelas." },
              { Icon: Building2, t: "Multiunidade", d: "Vários estacionamentos, pisos e setores." },
              { Icon: Eye, t: "Mais visibilidade", d: "Apareça quando o motorista mais precisa." },
            ].map(({ Icon, t, d }) => (
              <div key={t} className="rounded-lg border border-white/10 bg-white/[0.04] p-5">
                <Icon className="size-6 text-green-300" aria-hidden />
                <dt className="mt-3 font-display font-semibold text-white">{t}</dt>
                <dd className="mt-1 text-sm text-white/65">{d}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="px-4 py-20 sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 rounded-xl bg-green-400 px-6 py-12 sm:px-12 md:flex-row md:items-center">
          <div>
            <h2 className="text-3xl font-semibold text-ink-950">Abra a Vagou e descubra onde tem vaga.</h2>
            <p className="mt-2 text-ink-800">Grátis para motoristas. Sem cadastro para pesquisar.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <LinkButton href="/buscar" size="lg">
              Onde tem vaga agora?
            </LinkButton>
            <Link href="/empresas" className="inline-flex h-13 items-center px-4 font-semibold text-ink-950 underline-offset-4 hover:underline">
              Tenho um estacionamento
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
