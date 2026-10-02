import Link from "next/link";
import { cn } from "@/lib/cn";

/** Link-based tabs (state lives in the URL, works without JS). */
export function LinkTabs({ tabs, active, label }: { tabs: Array<{ key: string; label: string; href: string; count?: number }>; active: string; label: string }) {
  return (
    <nav aria-label={label} className="-mx-1 flex gap-1 overflow-x-auto border-b border-asphalt-100 px-1">
      {tabs.map((t) => {
        const isActive = t.key === active;
        return (
          <Link
            key={t.key}
            href={t.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "relative -mb-px inline-flex h-11 items-center gap-2 border-b-2 px-3 text-sm font-semibold whitespace-nowrap transition-colors",
              isActive ? "border-fg text-fg" : "border-transparent text-asphalt-500 hover:text-fg",
            )}
          >
            {t.label}
            {t.count !== undefined && <span className="rounded-full bg-asphalt-100 px-1.5 text-xs text-asphalt-600">{t.count}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
