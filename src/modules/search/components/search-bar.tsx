"use client";

import { useState } from "react";
import { MapPin, Search } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { SearchForm } from "./search-form";

/** Desktop: inline search. Mobile: compact pill opening the search in a bottom sheet. */
export function SearchBar({ initial, place }: { initial: { q?: string; lat?: number; lng?: number }; place: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="hidden lg:block">
        <SearchForm initial={initial} variant="bar" />
      </div>
      <button type="button" onClick={() => setOpen(true)} className="flex w-full items-center gap-3 rounded-full border border-asphalt-200 bg-surface px-4 py-3 text-left shadow-xs lg:hidden" aria-label={`Alterar destino (atual: ${place})`}>
        <MapPin className="size-5 shrink-0 text-green-600" aria-hidden />
        <span className="min-w-0 flex-1 truncate text-[15px] font-semibold text-fg">{place}</span>
        <Search className="size-5 text-asphalt-500" aria-hidden />
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Para onde você vai?">
        <SearchForm initial={initial} variant="bar" onSubmitted={() => setOpen(false)} autoFocus />
      </Dialog>
    </>
  );
}
