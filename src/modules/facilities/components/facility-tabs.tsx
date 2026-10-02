"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const TABS = [
  { seg: "", label: "Visão geral" },
  { seg: "operacao", label: "Operação" },
  { seg: "pisos", label: "Pisos e mapas" },
  { seg: "analytics", label: "Analytics" },
  { seg: "cadastro", label: "Cadastro" },
  { seg: "entradas", label: "Entradas" },
  { seg: "dados", label: "Fonte de dados" },
];

export function FacilityTabs({ facilityId }: { facilityId: string }) {
  const path = usePathname();
  const base = `/company/estacionamentos/${facilityId}`;
  const current = path.slice(base.length).split("/")[1] ?? "";
  return (
    <nav aria-label="Seções do shopping" className="no-scrollbar -mx-1 flex gap-1 overflow-x-auto border-b border-asphalt-100 px-1">
      {TABS.map((t) => {
        const active = current === t.seg;
        return (
          <Link
            key={t.seg}
            href={t.seg ? `${base}/${t.seg}` : base}
            aria-current={active ? "page" : undefined}
            className={cn("-mb-px inline-flex h-11 items-center border-b-2 px-3 text-sm font-semibold whitespace-nowrap", active ? "border-ink-900 text-ink-900" : "border-transparent text-asphalt-500 hover:text-ink-900")}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
