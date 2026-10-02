"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Accessibility, BatteryCharging, Clock, Loader2, Motorbike, ParkingSquare, Umbrella } from "lucide-react";
import { cn } from "@/lib/cn";

const TOGGLES = [
  { key: "comVagas", label: "Com vagas agora", Icon: ParkingSquare },
  { key: "aberto", label: "Aberto agora", Icon: Clock },
  { key: "acessivel", label: "Vagas PCD", Icon: Accessibility },
  { key: "ev", label: "Carregador EV", Icon: BatteryCharging },
  { key: "coberto", label: "Coberto", Icon: Umbrella },
  { key: "moto", label: "Aceita moto", Icon: Motorbike },
] as const;

const selectCls =
  "h-9 rounded-full border border-asphalt-200 bg-white pr-8 pl-3 text-sm font-medium text-asphalt-700 hover:border-asphalt-300 appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2214%22 height=%2214%22 fill=%22none%22 stroke=%22%2367736e%22 stroke-width=%222%22 viewBox=%220 0 24 24%22><path d=%22m6 9 6 6 6-6%22/></svg>')] bg-[length:14px] bg-[right_10px_center] bg-no-repeat";

/** Filter controls write straight to the URL (shareable searches, server-side filtering). */
export function SearchFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [pending, start] = useTransition();

  function set(key: string, value: string | null) {
    const next = new URLSearchParams(sp.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("pagina");
    start(() => router.replace(`${pathname}?${next.toString()}`, { scroll: false }));
  }

  return (
    <div className="no-scrollbar -mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:px-0" aria-label="Filtros" role="group">
      {TOGGLES.map(({ key, label, Icon }) => {
        const on = sp.get(key) === "1";
        return (
          <button
            key={key}
            type="button"
            aria-pressed={on}
            onClick={() => set(key, on ? null : "1")}
            className={cn(
              "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition-colors",
              on ? "border-ink-900 bg-ink-900 text-white" : "border-asphalt-200 bg-white text-asphalt-700 hover:border-asphalt-300",
            )}
          >
            <Icon className="size-4" aria-hidden /> {label}
          </button>
        );
      })}
      <label className="sr-only" htmlFor="f-preco">
        Preço máximo da primeira hora
      </label>
      <select id="f-preco" className={selectCls} value={sp.get("precoMax") ?? ""} onChange={(e) => set("precoMax", e.target.value || null)}>
        <option value="">Qualquer preço</option>
        {[10, 12, 15, 20].map((v) => (
          <option key={v} value={v}>
            1ª hora até R$ {v}
          </option>
        ))}
      </select>
      <label className="sr-only" htmlFor="f-raio">
        Distância máxima
      </label>
      <select id="f-raio" className={selectCls} value={sp.get("raio") ?? ""} onChange={(e) => set("raio", e.target.value || null)}>
        <option value="">Até 3 km</option>
        <option value="800">Até 800 m</option>
        <option value="1500">Até 1,5 km</option>
        <option value="8000">Até 8 km</option>
        <option value="30000">Toda a cidade</option>
      </select>
      <label className="sr-only" htmlFor="f-ordem">
        Ordenar por
      </label>
      <select id="f-ordem" className={selectCls} value={sp.get("ordem") ?? ""} onChange={(e) => set("ordem", e.target.value || null)}>
        <option value="">Melhor opção</option>
        <option value="distancia">Mais perto</option>
        <option value="vagas">Mais vagas livres</option>
        <option value="preco">Menor preço</option>
      </select>
      {pending && <Loader2 className="size-4 shrink-0 animate-spin text-asphalt-500" aria-label="Atualizando resultados" />}
    </div>
  );
}
