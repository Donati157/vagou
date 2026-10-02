import type { Metadata } from "next";
import { ArrowRight, BarChart3, Building2, Check, Cpu, Layers, MapPinned, Radar, Upload } from "lucide-react";
import { SiteHeader } from "@/components/layout/site-header";
import { LinkButton } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Vagou para shoppings",
  description: "Digitalize o estacionamento do seu shopping, acompanhe a ocupação e mostre aos clientes onde há vagas livres.",
  alternates: { canonical: "/empresas" },
};

export default function EmpresasPage() {
  return (
    <>
      <section className="relative overflow-hidden bg-ink-900 pb-20 text-white">
        <div className="road-grid pointer-events-none absolute inset-0 opacity-25 invert" />
        <SiteHeader variant="transparent" />
        <main id="conteudo" className="relative mx-auto max-w-7xl px-4 pt-14 sm:px-6">
          <p className="text-sm font-semibold tracking-wide text-green-300 uppercase">Vagou para shoppings</p>
          <h1 className="mt-3 max-w-3xl font-display text-[40px] leading-[1.05] font-bold tracking-[-0.03em] text-white sm:text-6xl">
            Mostre aos seus clientes onde tem vaga no seu shopping.
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-white/75">
            Digitalize os pisos e vagas do seu estacionamento, acompanhe a ocupação e apareça para quem está indo ao seu shopping.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <LinkButton href="/cadastro?tipo=empresa" variant="accent" size="lg">
              Conhecer a plataforma <ArrowRight className="size-5" aria-hidden />
            </LinkButton>
            <LinkButton href="/entrar" variant="ghost" size="lg" className="text-white ring-1 ring-white/25 hover:bg-white/10">
              Já sou cliente
            </LinkButton>
          </div>
        </main>
      </section>

      <section aria-labelledby="pilares" className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <h2 id="pilares" className="sr-only">
          Pilares
        </h2>
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { Icon: Layers, t: "Digitalização", d: "Transforme o estacionamento do shopping em infraestrutura digital: importe a planta, revise as vagas propostas e publique o mapa." },
            { Icon: BarChart3, t: "Inteligência", d: "Entenda a ocupação por hora, piso e setor, os picos de demanda e a capacidade ociosa." },
            { Icon: MapPinned, t: "Visibilidade", d: "Mostre a disponibilidade para motoristas na Vagou e direcione-os à entrada certa." },
          ].map(({ Icon, t, d }) => (
            <article key={t} className="rounded-lg border border-asphalt-100 bg-surface p-6">
              <Icon className="size-7 text-green-600" aria-hidden />
              <h3 className="mt-4 text-xl font-semibold">{t}</h3>
              <p className="mt-2 text-asphalt-600">{d}</p>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="mapa" className="border-y border-asphalt-100 bg-surface">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2">
          <div>
            <h2 id="mapa" className="text-3xl font-semibold">
              Mapa Inteligente: da planta à operação.
            </h2>
            <ol className="mt-6 space-y-4">
              {[
                { Icon: Upload, t: "Envie a planta", d: "PNG, JPG ou PDF de cada piso." },
                { Icon: Cpu, t: "Análise da planta", d: "Propomos setores, vagas, entradas e circulação (em modo demonstração nesta versão)." },
                { Icon: Layers, t: "Revise e publique", d: "Ajuste as vagas no editor: mover, redimensionar, girar, renomear, tipo e status." },
                { Icon: Radar, t: "Opere ao vivo", d: "Acompanhe o mapa operacional e conecte sua fonte de ocupação." },
              ].map(({ Icon, t, d }, i) => (
                <li key={t} className="flex gap-4">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-green-50 font-display font-bold text-green-700">{i + 1}</span>
                  <div>
                    <p className="flex items-center gap-2 font-semibold">
                      <Icon className="size-4 text-asphalt-400" aria-hidden /> {t}
                    </p>
                    <p className="text-asphalt-600">{d}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <div>
            <h2 className="text-3xl font-semibold">Conecte a fonte de ocupação que você já tem.</h2>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {["Sensores de vaga", "Câmeras", "Cancelas e catracas", "Sistema de gestão do estacionamento do shopping", "API própria", "Atualização manual pela equipe"].map((t) => (
                <li key={t} className="flex items-center gap-2 rounded-md border border-asphalt-100 px-4 py-3 text-[15px]">
                  <Check className="size-4 text-green-600" aria-hidden /> {t}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-sm text-asphalt-500">
              Nesta versão, integrações com sensores, câmeras, cancelas e sistemas estão preparadas na arquitetura e são conectadas sob demanda. Atualização manual e simulação de
              demonstração já funcionam.
            </p>
          </div>
        </div>
      </section>

      <section className="px-4 py-20 sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 rounded-xl bg-ink-900 px-6 py-12 text-white sm:px-12 md:flex-row md:items-center">
          <div className="flex items-center gap-4">
            <Building2 className="size-10 shrink-0 text-green-300" aria-hidden />
            <div>
              <h2 className="text-2xl font-semibold text-white">Leve seu shopping para a Vagou.</h2>
              <p className="mt-1 text-white/70">Crie a conta do seu shopping e publique a planta do estacionamento.</p>
            </div>
          </div>
          <LinkButton href="/cadastro?tipo=empresa" variant="accent" size="lg">
            Conhecer a plataforma
          </LinkButton>
        </div>
      </section>
    </>
  );
}
