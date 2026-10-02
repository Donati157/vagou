import Link from "next/link";
import { Logo } from "@/components/brand/logo";

export function SiteFooter() {
  return (
    <footer className="bg-ink-950 text-white/70">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <span className="text-[30px]">
            <Logo inverted />
          </span>
          <p className="mt-3 max-w-xs text-sm">Descubra onde tem vaga para estacionar em São Paulo — disponibilidade, preços, horários e mapas de vagas.</p>
        </div>
        <FooterCol title="Motoristas" links={[{ href: "/buscar", label: "Onde tem vaga" }, { href: "/app", label: "Meus favoritos" }, { href: "/cadastro", label: "Criar conta" }]} />
        <FooterCol title="Empresas" links={[{ href: "/empresas", label: "Vagou para empresas" }, { href: "/company", label: "Painel da empresa" }]} />
        <FooterCol title="Vagou" links={[{ href: "/entrar", label: "Entrar" }]} />
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-5 text-xs sm:flex-row sm:justify-between sm:px-6">
          <p>© {new Date().getFullYear()} Vagou. Versão de demonstração — estacionamentos fictícios e ocupação simulada.</p>
          <p>Feito em São Paulo.</p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: Array<{ href: string; label: string }> }) {
  return (
    <div>
      <h2 className="mb-3 font-display text-sm font-semibold tracking-wide text-white">{title}</h2>
      <ul className="space-y-2 text-sm">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="hover:text-white">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
