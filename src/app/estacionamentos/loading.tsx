import { Skeleton } from "@/components/ui/states";

export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl space-y-4 px-4 py-8 sm:px-6" role="status" aria-label="Carregando estacionamento">
      <Skeleton className="h-6 w-40" />
      <Skeleton className="h-10 w-2/3" />
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
