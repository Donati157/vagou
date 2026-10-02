import Link from "next/link";
import { Logo, LogoMark } from "@/components/brand/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_1.05fr]">
      <main id="conteudo" className="flex flex-col px-4 py-6 sm:px-10">
        <Link href="/" aria-label="Vagou — página inicial" className="text-[28px]">
          <Logo />
        </Link>
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-md">{children}</div>
        </div>
      </main>
      <aside aria-hidden className="relative hidden overflow-hidden bg-ink-900 lg:block">
        <div className="road-grid absolute inset-0 opacity-40 [background-size:48px_48px] invert" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(92,184,116,0.35),transparent_55%)]" />
        <div className="relative flex h-full flex-col justify-end p-14 text-white">
          <LogoMark className="mb-8 h-20" />
          <p className="max-w-md font-display text-4xl leading-tight font-semibold tracking-tight">Saiba onde tem vaga antes de chegar ao shopping.</p>
          <p className="mt-4 max-w-md text-white/70">Shoppings de São Paulo com vagas livres em tempo real e a planta do estacionamento, piso por piso.</p>
        </div>
      </aside>
    </div>
  );
}
