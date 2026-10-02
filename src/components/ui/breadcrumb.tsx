import Link from "next/link";
import { ChevronRight } from "lucide-react";

export function Breadcrumb({ items }: { items: Array<{ label: string; href?: string }> }) {
  return (
    <nav aria-label="Navegação estrutural" className="mb-3">
      <ol className="flex flex-wrap items-center gap-1 text-sm text-asphalt-500">
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="size-3.5 text-asphalt-300" aria-hidden />}
            {item.href ? (
              <Link href={item.href} className="hover:text-ink-900 hover:underline">
                {item.label}
              </Link>
            ) : (
              <span aria-current="page" className="font-medium text-asphalt-700">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function PageHeader({ title, description, actions, children }: { title: string; description?: React.ReactNode; actions?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {children}
        <h1 className="text-2xl font-semibold sm:text-[28px]">{title}</h1>
        {description && <p className="mt-1 text-[15px] text-asphalt-500">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </header>
  );
}
