import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { getCurrentUser } from "@/modules/auth/session";
import { ROLE_HOME, ROLE_LABEL } from "@/modules/auth/roles";
import { DashboardNav, MobileDashboardNav, type NavItem } from "./dashboard-nav";
import { UserMenu } from "./user-menu";

/** Sidebar layout for management areas (company, admin). */
export async function DashboardShell({ area, items, children, context }: { area: string; items: NavItem[]; children: React.ReactNode; context?: React.ReactNode }) {
  const user = (await getCurrentUser())!;
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[256px_1fr]">
      <aside className="hidden border-r border-asphalt-100 bg-surface lg:flex lg:flex-col">
        <div className="flex h-16 items-center px-5">
          <Link href="/" aria-label="Vagou — página inicial" className="text-[26px]">
            <Logo />
          </Link>
        </div>
        <p className="px-5 pb-2 text-xs font-semibold tracking-wide text-asphalt-400 uppercase">{area}</p>
        {context && <div className="px-3 pb-3">{context}</div>}
        <DashboardNav items={items} />
        <div className="mt-auto border-t border-asphalt-100 p-4 text-xs text-asphalt-500">
          Conectado como <strong className="text-asphalt-700">{ROLE_LABEL[user.role]}</strong>
        </div>
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-asphalt-100 bg-surface/95 px-4 backdrop-blur sm:px-6">
          <div className="flex items-center gap-2 lg:hidden">
            <MobileDashboardNav items={items} area={area} />
            <Link href="/" aria-label="Vagou" className="text-[22px]">
              <Logo />
            </Link>
          </div>
          <div className="hidden text-sm text-asphalt-500 lg:block">{area}</div>
          <UserMenu name={user.firstName} role={user.role} home={ROLE_HOME[user.role]} />
        </header>
        <main id="conteudo" className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
