"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Crosshair, Loader2, MapPin, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { inputClasses } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import { geocoder, SAO_PAULO_PLACES, type Place } from "@/modules/geo/geocoding";

type Initial = { q?: string; lat?: number; lng?: number };

/** Destination search ("para onde você vai?") with suggestions and "near me". */
export function SearchForm({ initial, variant = "hero", className, onSubmitted, autoFocus }: { initial: Initial; variant?: "hero" | "bar"; className?: string; onSubmitted?: () => void; autoFocus?: boolean }) {
  const router = useRouter();
  const [q, setQ] = useState(initial.q ?? "");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(initial.lat !== undefined && initial.lng !== undefined ? { lat: initial.lat, lng: initial.lng } : null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [geoState, setGeoState] = useState<"idle" | "loading" | "error">("idle");

  const suggestions = useMemo(() => (q.trim() ? geocoder.search(q).slice(0, 6) : SAO_PAULO_PLACES.slice(0, 6)), [q]);

  function go(target: { q: string; lat?: number; lng?: number }) {
    const sp = new URLSearchParams();
    if (target.q) sp.set("q", target.q);
    if (target.lat !== undefined && target.lng !== undefined) {
      sp.set("lat", target.lat.toFixed(5));
      sp.set("lng", target.lng.toFixed(5));
    }
    onSubmitted?.();
    router.push(`/buscar?${sp.toString()}`);
  }

  function choose(p: Place) {
    setQ(p.name);
    setCoords({ lat: p.lat, lng: p.lng });
    setOpen(false);
    go({ q: p.name, lat: p.lat, lng: p.lng });
  }

  function nearMe() {
    if (!("geolocation" in navigator)) return setGeoState("error");
    setGeoState("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoState("idle");
        go({ q: "Minha localização", lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => setGeoState("error"),
      { timeout: 8000 },
    );
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (coords && q) return go({ q, ...coords });
    const match = q.trim() ? geocoder.search(q)[0] : undefined;
    go(match ? { q: match.name, lat: match.lat, lng: match.lng } : { q: q.trim() });
  }

  const hero = variant === "hero";
  return (
    <form onSubmit={submit} role="search" aria-label="Buscar estacionamentos" className={cn(hero && "rounded-xl bg-white p-2 shadow-lg", className)}>
      <div className={cn("flex gap-2", hero ? "flex-col sm:flex-row" : "")}>
        <div className="relative flex-1">
          <label htmlFor="destino" className="sr-only">
            Para onde você vai?
          </label>
          <MapPin className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-green-600" aria-hidden />
          <input
            id="destino"
            role="combobox"
            aria-expanded={open}
            aria-controls="destino-list"
            aria-autocomplete="list"
            aria-activedescendant={active >= 0 ? `destino-opt-${active}` : undefined}
            autoComplete="off"
            autoFocus={autoFocus}
            placeholder="Para onde você vai? Ex.: Anália Franco, Paulista"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setCoords(null);
              setOpen(true);
              setActive(-1);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 120)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setOpen(true);
                setActive((a) => Math.min(a + 1, suggestions.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => Math.max(a - 1, 0));
              } else if (e.key === "Enter" && open && active >= 0) {
                e.preventDefault();
                choose(suggestions[active]);
              } else if (e.key === "Escape") setOpen(false);
            }}
            className={cn(inputClasses, "pl-11", hero ? "h-13 border-transparent text-base hover:border-transparent" : "h-11")}
          />
          {open && suggestions.length > 0 && (
            <ul id="destino-list" role="listbox" aria-label="Sugestões de destino" className="absolute z-[700] mt-1 max-h-80 w-full overflow-auto rounded-md border border-asphalt-100 bg-white py-1 shadow-lg">
              <li role="option" aria-selected={false} onMouseDown={(e) => { e.preventDefault(); nearMe(); }} className="flex cursor-pointer items-center gap-2.5 px-3 py-2.5 text-sm font-semibold text-green-700 hover:bg-asphalt-50">
                <Crosshair className="size-4" aria-hidden /> Usar minha localização
              </li>
              {suggestions.map((p, i) => (
                <li
                  key={p.name}
                  id={`destino-opt-${i}`}
                  role="option"
                  aria-selected={i === active}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    choose(p);
                  }}
                  className={cn("flex cursor-pointer items-center gap-2.5 px-3 py-2.5 text-sm", i === active ? "bg-green-50" : "hover:bg-asphalt-50")}
                >
                  <MapPin className="size-4 text-asphalt-400" aria-hidden />
                  <span className="font-medium text-ink-900">{p.name}</span>
                  <span className="text-asphalt-500">· {p.region}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <Button type="button" variant="secondary" size={hero ? "lg" : "md"} onClick={nearMe} aria-label="Estacionamentos perto de mim" className={cn(hero ? "sm:w-auto" : "px-3")} disabled={geoState === "loading"}>
          {geoState === "loading" ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <Crosshair className="size-5" aria-hidden />}
          <span className={hero ? "" : "sr-only"}>Perto de mim</span>
        </Button>
        <Button type="submit" variant={hero ? "accent" : "primary"} size={hero ? "lg" : "md"}>
          <Search className="size-5" aria-hidden />
          <span className={hero ? "" : "hidden xl:inline"}>Ver vagas</span>
        </Button>
      </div>
      {geoState === "error" && (
        <p className="mt-2 px-1 text-sm text-danger" role="alert">
          Não foi possível obter sua localização. Digite um destino.
        </p>
      )}
    </form>
  );
}
