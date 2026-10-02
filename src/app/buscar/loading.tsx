import { Skeleton } from "@/components/ui/states";

export default function Loading() {
  return (
    <div className="flex h-dvh flex-col" role="status" aria-label="Procurando estacionamentos">
      <div className="hidden h-16 border-b border-asphalt-100 bg-white lg:block" />
      <div className="space-y-3 border-b border-asphalt-100 bg-white p-4">
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-9 w-2/3" />
      </div>
      <div className="flex flex-1">
        <div className="hidden w-[40%] space-y-3 p-6 lg:block">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-36 w-full" />
          ))}
        </div>
        <Skeleton className="flex-1 rounded-none" />
      </div>
    </div>
  );
}
