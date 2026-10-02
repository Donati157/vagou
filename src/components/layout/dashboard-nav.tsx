"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  BarChart3,
  Building2,
  CalendarCheck,
  CarFront,
  LayoutDashboard,
  Layers,
  Menu,
  MonitorDot,
  ParkingSquare,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { Dialog } from "@/components/ui/dialog";

// Explicit icon map keeps the client bundle small (no wildcard import of the icon set).
const ICONS = { BarChart3, Building2, CalendarCheck, CarFront, LayoutDashboard, Layers, MonitorDot, ParkingSquare, Users, Wallet } satisfies Record<string, LucideIcon>;
export type NavItem = { href: string; label: string; icon: keyof typeof ICONS; exact?: boolean };

function Item({ item, onNavigate }: { item: NavItem; onNavigate?: () => void }) {
  const path = usePathname();
  const active = item.exact ? path === item.href : path === item.href || path.startsWith(item.href + "/");
  const Icon = ICONS[item.icon];
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn("flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-semibold transition-colors", active ? "bg-green-50 text-fg" : "text-asphalt-600 hover:bg-asphalt-50 hover:text-fg")}
    >
      <Icon className={cn("size-[18px]", active ? "text-green-600" : "text-asphalt-400")} aria-hidden />
      {item.label}
    </Link>
  );
}

export function DashboardNav({ items }: { items: NavItem[] }) {
  return (
    <nav aria-label="Menu do painel" className="space-y-0.5 px-3">
      {items.map((i) => (
        <Item key={i.href} item={i} />
      ))}
    </nav>
  );
}

export function MobileDashboardNav({ items, area }: { items: NavItem[]; area: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="grid size-10 place-items-center rounded-md hover:bg-asphalt-100" aria-label="Abrir menu">
        <Menu className="size-5" aria-hidden />
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} title={area} variant="drawer">
        <nav aria-label="Menu do painel" className="space-y-0.5">
          {items.map((i) => (
            <Item key={i.href} item={i} onNavigate={() => setOpen(false)} />
          ))}
        </nav>
      </Dialog>
    </>
  );
}
