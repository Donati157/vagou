import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { LinkButton } from "@/components/ui/button";
import { getCurrentUser } from "@/modules/auth/session";
import { ROLE_HOME } from "@/modules/auth/roles";
import { UserMenu } from "./user-menu";

export async function SiteHeader({ variant = "solid" }: { variant?: "solid" | "transparent" }) {
  const user = await getCurrentUser();
  return (
    <header className={variant === "solid" ? "sticky top-0 z-40 border-b border-asphalt-100 bg-white/95 backdrop-blur" : "relative z-40"}>
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" aria-label="Vagou — página inicial" className="text-[28px]">
          <Logo inverted={variant === "transparent"} />
        </Link>
        <nav aria-label="Principal" className="hidden items-center gap-1 md:flex">
          {[
            { href: "/buscar", label: "Onde tem vaga" },
            { href: "/empresas", label: "Para empresas" },
          ].map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={
                variant === "transparent"
                  ? "rounded-md px-3 py-2 text-[15px] font-medium text-white/85 hover:bg-white/10 hover:text-white"
                  : "rounded-md px-3 py-2 text-[15px] font-medium text-asphalt-600 hover:bg-asphalt-50 hover:text-ink-900"
              }
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          {user ? (
            <UserMenu name={user.firstName} role={user.role} home={ROLE_HOME[user.role]} inverted={variant === "transparent"} />
          ) : (
            <>
              <LinkButton href="/entrar" variant={variant === "transparent" ? "ghost" : "ghost"} size="sm" className={variant === "transparent" ? "text-white hover:bg-white/10" : ""}>
                Entrar
              </LinkButton>
              <LinkButton href="/cadastro" variant={variant === "transparent" ? "accent" : "primary"} size="sm">
                Criar conta
              </LinkButton>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
