import { Search } from "lucide-react";
import { Button } from "./button";
import { inputClasses } from "./field";
import { cn } from "@/lib/cn";

type SelectFilter = { name: string; label: string; value?: string; options: Array<{ value: string; label: string }> };

/** GET-form filter bar: works without JavaScript and keeps filters in the URL. */
export function FilterBar({ q, placeholder = "Buscar…", selects = [] }: { q?: string; placeholder?: string; selects?: SelectFilter[] }) {
  return (
    <form method="get" role="search" className="mb-4 flex flex-wrap items-end gap-2">
      <label className="relative min-w-56 flex-1">
        <span className="sr-only">Buscar</span>
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-asphalt-400" aria-hidden />
        <input name="q" defaultValue={q} placeholder={placeholder} className={cn(inputClasses, "h-10 pl-9")} />
      </label>
      {selects.map((s) => (
        <label key={s.name}>
          <span className="sr-only">{s.label}</span>
          <select name={s.name} defaultValue={s.value ?? ""} className={cn(inputClasses, "h-10 w-auto pr-8")}>
            <option value="">{s.label}</option>
            {s.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      ))}
      <Button type="submit" size="sm" className="h-10">
        Filtrar
      </Button>
    </form>
  );
}

export function buildHref(base: string, params: Record<string, string | undefined>, page: number) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) sp.set(k, v);
  sp.set("pagina", String(page));
  return `${base}?${sp.toString()}`;
}
