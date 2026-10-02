"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Heart, LayoutDashboard, LogOut, User } from "lucide-react";
import { cn } from "@/lib/cn";
import { ROLE_LABEL, type Role } from "@/modules/auth/roles";
import { logoutAction } from "@/modules/auth/actions";

export function UserMenu({ name, role, home, inverted }: { name: string; role: Role; home: string; inverted?: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("click", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, []);
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((o) => !o)}
        className={cn("flex h-10 items-center gap-2 rounded-full pr-2 pl-1 text-sm font-semibold", inverted ? "text-white hover:bg-white/10" : "text-ink-900 hover:bg-asphalt-100")}
      >
        <span className="grid size-8 place-items-center rounded-full bg-green-400 font-display text-ink-950">{name.charAt(0).toUpperCase()}</span>
        <span className="hidden sm:inline">{name}</span>
        <ChevronDown className="size-4" aria-hidden />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 mt-2 w-60 overflow-hidden rounded-md border border-asphalt-100 bg-white py-1 shadow-lg animate-fade-in">
          <p className="px-4 py-2 text-xs text-asphalt-500">Conectado como {ROLE_LABEL[role]}</p>
          <MenuLink href={home} icon={<LayoutDashboard className="size-4" />}>
            Meu painel
          </MenuLink>
          <MenuLink href="/app" icon={<Heart className="size-4" />}>
            Favoritos
          </MenuLink>
          <MenuLink href="/app/perfil" icon={<User className="size-4" />}>
            Perfil
          </MenuLink>
          <form action={logoutAction}>
            <button role="menuitem" className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-asphalt-700 hover:bg-asphalt-50">
              <LogOut className="size-4" aria-hidden /> Sair
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function MenuLink({ href, icon, children }: { href: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Link role="menuitem" href={href} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-asphalt-700 hover:bg-asphalt-50">
      <span aria-hidden>{icon}</span>
      {children}
    </Link>
  );
}
