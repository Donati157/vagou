import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Badge } from "@/components/ui/badge";
import { DemoBadge } from "@/components/ui/demo-badge";
import { getCurrentUser } from "@/modules/auth/session";
import { getFacilityHeader } from "@/modules/facilities/workspace";
import { FacilityTabs } from "@/modules/facilities/components/facility-tabs";
import { ForbiddenError, NotFoundError } from "@/server/lib/errors";
import { DATA_SOURCE_KIND_LABEL } from "@/lib/labels";

export default async function FacilityWorkspaceLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = (await getCurrentUser())!;
  let f;
  try {
    f = await getFacilityHeader(user, id);
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ForbiddenError) notFound();
    throw err;
  }
  return (
    <>
      <Breadcrumb items={[{ label: "Shoppings", href: "/company" }, { label: f.name }]} />
      <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold sm:text-[28px]">{f.name}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-asphalt-500">
            {f.orgName} · {f.neighborhood}
            {f.isPublished ? <Badge tone="green">Publicado</Badge> : <Badge tone="outline">Não publicado</Badge>}
            {f.source ? f.source.kind === "SIMULATION" ? <DemoBadge label="Ocupação simulada" /> : <Badge tone="blue">{DATA_SOURCE_KIND_LABEL[f.source.kind]}</Badge> : <Badge tone="outline">Sem fonte de ocupação</Badge>}
          </p>
        </div>
        {f.isPublished && (
          <Link href={`/estacionamentos/${f.slug}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-green-700 hover:underline">
            Ver página pública <ExternalLink className="size-3.5" aria-hidden />
          </Link>
        )}
      </header>
      <FacilityTabs facilityId={f.id} />
      <div className="pt-6">{children}</div>
    </>
  );
}
