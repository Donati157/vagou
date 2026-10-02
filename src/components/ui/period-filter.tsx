import Link from "next/link";
import { cn } from "@/lib/cn";

const OPTIONS = [
  { key: "7d", label: "7 dias" },
  { key: "30d", label: "30 dias" },
  { key: "90d", label: "90 dias" },
];

/** Segmented period control (URL-driven). */
export function PeriodFilter({ active, basePath, extra = "" }: { active: string; basePath: string; extra?: string }) {
  return (
    <nav aria-label="Período" className="inline-flex rounded-md border border-asphalt-200 bg-surface p-0.5">
      {OPTIONS.map((o) => (
        <Link
          key={o.key}
          href={`${basePath}?periodo=${o.key}${extra}`}
          aria-current={active === o.key ? "page" : undefined}
          className={cn("rounded-sm px-3 py-1.5 text-sm font-semibold", active === o.key ? "bg-ink-900 text-white" : "text-asphalt-600 hover:text-fg")}
        >
          {o.label}
        </Link>
      ))}
    </nav>
  );
}
