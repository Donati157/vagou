import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";

export function Table({ className, ...props }: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="overflow-x-auto rounded-lg border border-asphalt-100 bg-surface">
      <table className={cn("w-full text-left text-sm", className)} {...props} />
    </div>
  );
}
export function THead(props: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className="border-b border-asphalt-100 bg-asphalt-25 text-xs font-semibold tracking-wide text-asphalt-500 uppercase" {...props} />;
}
export function TH({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return <th scope="col" className={cn("px-4 py-3 whitespace-nowrap", className)} {...props} />;
}
export function TR({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cn("border-b border-asphalt-100 last:border-0 hover:bg-asphalt-25", className)} {...props} />;
}
export function TD({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn("px-4 py-3 align-middle text-asphalt-700", className)} {...props} />;
}

/** Server-friendly pagination built from links (keeps current query params). */
export function Pagination({ page, pageCount, total, buildHref }: { page: number; pageCount: number; total: number; buildHref: (page: number) => string }) {
  if (pageCount <= 1) return <p className="mt-3 text-sm text-asphalt-500">{total} resultado(s)</p>;
  const linkCls = "inline-flex h-9 items-center gap-1 rounded-sm border border-asphalt-200 bg-surface px-3 text-sm font-medium hover:bg-asphalt-50";
  return (
    <nav aria-label="Paginação" className="mt-3 flex items-center justify-between gap-3">
      <p className="text-sm text-asphalt-500">
        Página {page} de {pageCount} · {total} resultado(s)
      </p>
      <div className="flex gap-2">
        {page > 1 ? (
          <Link className={linkCls} href={buildHref(page - 1)} rel="prev">
            <ChevronLeft className="size-4" aria-hidden /> Anterior
          </Link>
        ) : (
          <span className={cn(linkCls, "pointer-events-none opacity-40")} aria-disabled>
            <ChevronLeft className="size-4" aria-hidden /> Anterior
          </span>
        )}
        {page < pageCount ? (
          <Link className={linkCls} href={buildHref(page + 1)} rel="next">
            Próxima <ChevronRight className="size-4" aria-hidden />
          </Link>
        ) : (
          <span className={cn(linkCls, "pointer-events-none opacity-40")} aria-disabled>
            Próxima <ChevronRight className="size-4" aria-hidden />
          </span>
        )}
      </div>
    </nav>
  );
}
