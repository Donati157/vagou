import Link from "next/link";
import { ArrowRight, Clock, FlaskConical, Radar, ShieldCheck } from "lucide-react";
import { SiteHeader } from "@/components/layout/site-header";
import { LinkButton } from "@/components/ui/button";
import { CountUp } from "@/components/brand/count-up";
import { HeroRoute } from "@/components/brand/hero-route";
import { PlanDemo } from "@/components/brand/plan-demo";
import { SearchForm } from "@/modules/search/components/search-form";
import { getPublicStats } from "@/modules/search/stats";

export const dynamic = "force-dynamic";

const STEPS = [
  { title: "Diga para onde vai", text: "Nome do shopping, bairro ou a sua localização." },
  { title: "Veja onde tem vaga", text: "Vagas livres agora, em cada shopping e em cada piso." },
  { title: "Entre sabendo onde parar", text: "Abra a planta, escolha o piso e vá direto." },
];

export default async function HomePage() {
  const stats = await getPublicStats();
  const proof = [
    { n: stats.facilities, label: "shoppings na Vagou" },
    { n: stats.mappedSpaces, label: "vagas mapeadas, uma a uma" },
    { n: stats.neighborhoods, label: "bairros de São Paulo" },
  ];
  return (
    <>
      {/* 1 — Hero: the promise + the demonstration */}
      <section className="relative overflow-hidden bg-ink-900 text-white">
        <div className="texture texture-grid texture-fade text-white/[0.06]" aria-hidden />
        <SiteHeader variant="transparent" />
        <main id="conteudo" className="relative mx-auto max-w-7xl px-4 pt-8 pb-14 sm:px-6 sm:pt-14 sm:pb-24">
          <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
            <div>
              <p className="eyebrow text-green-300">Shoppings de São Paulo</p>
              <h1 className="mt-5 text-display font-bold text-white">
                Pare de procurar <span className="text-green-400">vaga.</span>
              </h1>
              <p className="mt-6 max-w-lg text-lg text-white/75 sm:text-xl">Veja quantas vagas estão livres agora, em qual piso — e chegue direto nelas.</p>
              <div className="mt-9 max-w-2xl text-asphalt-900">
                <SearchForm initial={{}} />
              </div>
              <p className="mt-4 text-sm text-white/55">Sem cadastro. Abra, pesquise e vá.</p>
            </div>
            <HeroRoute />
          </div>
        </main>
      </section>

      {/* 2 — Proof: real numbers from the demo dataset */}
      <section aria-label="A Vagou em números" className="border-b border-line">
        <div className="mx-auto grid max-w-7xl gap-px px-4 sm:grid-cols-3 sm:px-6">
          {proof.map((p, i) => (
            <div key={p.label} className="flex items-baseline gap-3 py-7 sm:flex-col sm:gap-1 sm:py-10 sm:pl-8 sm:first:pl-0 sm:[&:not(:first-child)]:border-l sm:[&:not(:first-child)]:border-line">
              <CountUp to={p.n} delay={i * 120} className="font-display text-figure font-bold text-fg" />
              <span className="text-asphalt-600">{p.label}</span>
            </div>
          ))}
        </div>
        <p className="mx-auto max-w-7xl px-4 pb-6 text-xs text-asphalt-500 sm:px-6">
          <FlaskConical className="mr-1 inline size-3.5 align-[-2px]" aria-hidden />
          Versão de demonstração: shoppings fictícios e ocupação simulada.
        </p>
      </section>

      {/* 3 — How it works, told as a route */}
      <section aria-labelledby="como-funciona" className="mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32">
        <p className="eyebrow">Como funciona</p>
        <h2 id="como-funciona" className="mt-4 max-w-3xl text-headline font-bold">
          Chega de dar voltas.
        </h2>
        <div className="relative mt-14 sm:mt-20">
          {/* The route that links the steps (desktop) */}
          <svg className="absolute top-[11px] right-0 left-0 hidden h-6 w-full md:block" viewBox="0 0 1000 24" preserveAspectRatio="none" aria-hidden>
            <path d="M12 12 H 988" stroke="currentColor" className="text-asphalt-200" strokeWidth="2" strokeDasharray="6 8" fill="none" vectorEffect="non-scaling-stroke" />
            <path d="M12 12 H 988" stroke="currentColor" className="reveal-draw text-green-500" strokeWidth="2.5" fill="none" pathLength={1} vectorEffect="non-scaling-stroke" />
          </svg>
          <ol className="relative grid gap-10 border-l-2 border-dashed border-asphalt-200 pl-8 md:grid-cols-3 md:gap-12 md:border-l-0 md:pl-0">
            {STEPS.map((s, i) => (
              <li key={s.title} className="reveal relative">
                <span
                  className={`absolute top-0 -left-[45px] grid size-6 place-items-center rounded-full border-2 md:static md:mb-8 ${i === STEPS.length - 1 ? "border-green-500 bg-green-500" : "border-green-500 bg-canvas"}`}
                  aria-hidden
                >
                  {i === STEPS.length - 1 && <span className="size-2 rounded-full bg-white" />}
                </span>
                <span className="font-display text-sm font-bold text-asphalt-400">0{i + 1}</span>
                <h3 className="mt-2 text-title font-semibold">{s.title}</h3>
                <p className="mt-2 max-w-xs text-asphalt-600">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 4 — The plan: the product's signature */}
      <section aria-labelledby="planta" className="relative overflow-hidden border-y border-line bg-surface">
        <div className="texture texture-stalls texture-fade text-fg/[0.035]" aria-hidden />
        <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-4 py-24 sm:px-6 sm:py-32 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <p className="eyebrow">Planta do shopping</p>
            <h2 id="planta" className="mt-4 text-headline font-bold">
              Entre sabendo onde parar.
            </h2>
            <p className="mt-6 max-w-md text-lg text-asphalt-600">Cada shopping tem a planta digital do estacionamento. Você vê as vagas livres por piso e setor — inclusive PcD.</p>
            <dl className="mt-10 max-w-sm divide-y divide-line border-y border-line">
              {[
                { floor: "G1", free: "34 livres", tone: "text-status-available" },
                { floor: "G2", free: "18 livres", tone: "text-status-available" },
                { floor: "G3", free: "Lotado", tone: "text-status-occupied" },
              ].map((f) => (
                <div key={f.floor} className="flex items-center justify-between py-3.5">
                  <dt className="font-display text-lg font-semibold text-fg">Piso {f.floor}</dt>
                  <dd className={`font-semibold ${f.tone}`}>{f.free}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-xs text-asphalt-500">Exemplo ilustrativo.</p>
            <LinkButton href="/buscar?q=An%C3%A1lia%20Franco&lat=-23.56230&lng=-46.55940" size="lg" className="mt-10">
              Ver um shopping de exemplo <ArrowRight className="size-5" aria-hidden />
            </LinkButton>
          </div>
          <div className="reveal">
            <PlanDemo />
            <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-asphalt-600" aria-label="Legenda">
              <li className="flex items-center gap-2">
                <span className="size-3 rounded-[3px] bg-status-available" aria-hidden /> Livre
              </li>
              <li className="flex items-center gap-2">
                <span className="relative size-3 rounded-[3px] bg-status-occupied" aria-hidden /> Ocupada
              </li>
              <li className="flex items-center gap-2">
                <span className="pattern-hatch size-3 rounded-[3px] bg-status-unavailable" aria-hidden /> Sem informação / indisponível
              </li>
              <li className="flex items-center gap-2">
                <span className="size-3 rounded-full border-2 border-green-400" aria-hidden /> Vaga sugerida
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* 5 — Trust: typography, not boxes */}
      <section aria-labelledby="dados" className="mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32">
        <div className="grid gap-14 lg:grid-cols-[1fr_1.3fr]">
          <div>
            <p className="eyebrow">Transparência</p>
            <h2 id="dados" className="mt-4 max-w-md text-headline font-bold">
              Você sempre sabe de onde vem o número.
            </h2>
          </div>
          <ul className="divide-y divide-line border-y border-line">
            {[
              { Icon: Radar, t: "Fontes conectadas", d: "Sensores, câmeras, cancelas ou o sistema do próprio shopping alimentam a disponibilidade." },
              { Icon: Clock, t: "Atualização visível", d: "Mostramos quando o dado foi atualizado. Informação antiga não aparece como atual." },
              { Icon: ShieldCheck, t: "Sem dados? Avisamos", d: "Sem informação, a vaga aparece em cinza. Na dúvida, nunca verde." },
              { Icon: FlaskConical, t: "Fase de demonstração", d: "Nesta versão os shoppings são fictícios e a ocupação é simulada — e sinalizada como tal." },
            ].map(({ Icon, t, d }) => (
              <li key={t} className="reveal grid gap-1 py-6 sm:grid-cols-[2.5rem_12rem_1fr] sm:items-baseline sm:gap-4">
                <Icon className="size-5 text-green-600" aria-hidden />
                <h3 className="text-lg font-semibold">{t}</h3>
                <p className="text-asphalt-600">{d}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 6 — For malls: the other side of the map */}
      <section aria-labelledby="empresas" className="relative overflow-hidden bg-ink-950 text-white">
        <div className="texture texture-stalls texture-fade text-white/[0.05]" aria-hidden />
        <div className="relative mx-auto grid max-w-7xl gap-14 px-4 py-24 sm:px-6 sm:py-32 lg:grid-cols-2 lg:items-end">
          <div>
            <p className="eyebrow text-green-300">Vagou para shoppings</p>
            <h2 id="empresas" className="mt-4 text-headline font-bold text-white">
              Seu estacionamento, no mapa.
            </h2>
            <p className="mt-6 max-w-md text-lg text-white/70">Digitalize a planta, acompanhe a ocupação por piso e setor e apareça para quem está chegando.</p>
            <LinkButton href="/empresas" variant="accent" size="lg" className="mt-10">
              Conhecer a Vagou para shoppings <ArrowRight className="size-5" aria-hidden />
            </LinkButton>
          </div>
          <ol className="grid grid-cols-2 gap-x-8 gap-y-10">
            {[
              { t: "Planta", d: "Da imagem do piso ao mapa digital de vagas." },
              { t: "Ocupação", d: "Sensores, câmeras, cancelas ou atualização manual." },
              { t: "Pisos e setores", d: "Vários shoppings, pisos e setores em um painel." },
              { t: "Visibilidade", d: "Quem procura vaga por perto encontra você." },
            ].map((x, i) => (
              <li key={x.t} className="reveal border-t border-white/15 pt-5">
                <span className="font-display text-sm font-bold text-green-300">0{i + 1}</span>
                <p className="mt-2 font-display text-xl font-semibold text-white">{x.t}</p>
                <p className="mt-1 text-sm text-white/60">{x.d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 7 — Arrival: the route ends at a pin */}
      <section aria-labelledby="cta" className="relative overflow-hidden">
        <div className="mx-auto flex max-w-7xl flex-col items-center px-4 py-24 text-center sm:px-6 sm:py-32">
          <svg viewBox="0 0 120 160" className="h-28 w-auto" aria-hidden>
            <path d="M60 0 V 92" stroke="currentColor" className="reveal-draw text-green-500" strokeWidth="3" strokeLinecap="round" strokeDasharray="1" pathLength={1} fill="none" />
            <path d="M60 158c0 0-30-27-30-50a30 30 0 0 1 60 0c0 23-30 50-30 50Z" className="reveal fill-green-400" />
            <circle cx="60" cy="108" r="11" className="fill-canvas" />
          </svg>
          <h2 id="cta" className="mt-8 text-display font-bold">
            Onde tem vaga?
          </h2>
          <p className="mt-5 max-w-md text-lg text-asphalt-600">Abra a Vagou e descubra. Grátis para motoristas, sem cadastro para pesquisar.</p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <LinkButton href="/buscar" size="lg">
              Ver shoppings com vaga <ArrowRight className="size-5" aria-hidden />
            </LinkButton>
            <Link href="/empresas" className="inline-flex h-13 items-center px-4 font-semibold text-fg underline-offset-4 hover:underline">
              Tenho um shopping
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
