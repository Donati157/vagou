"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, Search, User } from "lucide-react";
import { cn } from "@/lib/cn";

const ITEMS = [
  { href: "/buscar", label: "Onde tem vaga", Icon: Search },
  { href: "/app", label: "Favoritos", Icon: Heart, exact: true },
  { href: "/app/perfil", label: "Perfil", Icon: User },
];

/** Mobile bottom navigation for the driver area. */
export function DriverBottomNav() {
  const path = usePathname();
  return (
    <nav aria-label="Navegação do motorista" className="fixed inset-x-0 bottom-0 z-40 border-t border-asphalt-100 bg-white pb-[env(safe-area-inset-bottom)] md:hidden">
      <ul className="grid grid-cols-3">
        {ITEMS.map(({ href, label, Icon, exact }) => {
          const active = exact ? path === href : path.startsWith(href);
          return (
            <li key={href}>
              <Link href={href} aria-current={active ? "page" : undefined} className={cn("flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-semibold", active ? "text-ink-900" : "text-asphalt-400")}>
                <Icon className={cn("size-5", active && "text-green-600")} aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function DriverTopNav() {
  const path = usePathname();
  return (
    <nav aria-label="Área do motorista" className="hidden gap-1 md:flex">
      {ITEMS.filter((i) => i.href !== "/buscar").map(({ href, label, exact }) => {
        const active = exact ? path === href : path.startsWith(href);
        return (
          <Link key={href} href={href} aria-current={active ? "page" : undefined} className={cn("rounded-md px-3 py-2 text-sm font-semibold", active ? "bg-asphalt-100 text-ink-900" : "text-asphalt-500 hover:text-ink-900")}>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
