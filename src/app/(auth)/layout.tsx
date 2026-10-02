import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { GarageVisual } from "@/components/brand/garage-visual";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_1.05fr]">
      <main id="conteudo" className="flex flex-col px-4 py-6 sm:px-10">
        <Link href="/" aria-label="Vagou — página inicial" className="press self-start text-[28px]">
          <Logo />
        </Link>
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-md animate-slide-up">{children}</div>
        </div>
      </main>
      <aside aria-hidden className="relative hidden overflow-hidden bg-ink-900 lg:block">
        <GarageVisual />
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-linear-to-t from-ink-950 via-ink-950/70 to-transparent" />
        <div className="relative flex h-full flex-col justify-end p-14 text-white">
          <p className="eyebrow text-green-300">Vagou</p>
          <p className="mt-5 max-w-md font-display text-[2.75rem] leading-[1.05] font-bold tracking-[-0.035em] text-white">Entre sabendo onde parar.</p>
          <p className="mt-4 max-w-sm text-white/70">Vagas livres agora e a planta do estacionamento, piso por piso, nos shoppings de São Paulo.</p>
        </div>
      </aside>
    </div>
  );
}
