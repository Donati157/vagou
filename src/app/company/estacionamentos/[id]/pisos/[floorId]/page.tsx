import { notFound } from "next/navigation";
import { AlertTriangle, Check, CheckCircle2, FlaskConical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { getCurrentUser } from "@/modules/auth/session";
import { getFloorEditorData } from "@/modules/floorplans/service";
import { MapEditor } from "@/modules/floorplans/components/map-editor";
import { PlanUploader } from "@/modules/floorplans/components/plan-uploader";
import { PublishPlanButton, ReanalyzeButton } from "@/modules/floorplans/components/plan-actions";
import { ForbiddenError, NotFoundError } from "@/server/lib/errors";
import { MAX_UPLOAD_BYTES } from "@/modules/storage/storage";
import { cn } from "@/lib/cn";
import { formatDateTime, formatPercent } from "@/lib/format";
import { FLOOR_PLAN_STATUS_LABEL } from "@/lib/labels";

export const metadata = { title: "Mapa Inteligente" };

const STEPS = ["Upload", "Processamento", "Resultado", "Revisão", "Publicação"];

/** Remounts the editor whenever persisted map content changes (fresh baseline after saving). */
function contentHash(items: Array<Record<string, unknown>>) {
  let h = 2166136261;
  const str = JSON.stringify(items);
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return (h >>> 0).toString(36);
}

export default async function SmartMapPage({ params, searchParams }: { params: Promise<{ id: string; floorId: string }>; searchParams: Promise<{ nova?: string }> }) {
  const { id, floorId } = await params;
  const sp = await searchParams;
  const user = (await getCurrentUser())!;
  let data;
  try {
    data = await getFloorEditorData(user, floorId);
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ForbiddenError) notFound();
    throw err;
  }
  if (data.facilityId !== id) notFound();
  const { plan, floor, spaces } = data;
  const step = !plan ? 0 : plan.status === "PROCESSING" || plan.status === "UPLOADED" ? 1 : plan.status === "PUBLISHED" ? 4 : 3;
  const ratio = plan?.widthPx && plan?.heightPx ? plan.heightPx / plan.widthPx : 0.625;
  const showUploader = !plan || sp.nova === "1";

  return (
    <div className="space-y-5">
      <Breadcrumb items={[{ label: "Pisos e mapas", href: `/company/estacionamentos/${id}/pisos` }, { label: `Piso ${floor.name}` }]} />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Mapa Inteligente · piso {floor.name}</h2>
          {plan && (
            <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-asphalt-500">
              <Badge tone={plan.status === "PUBLISHED" ? "green" : plan.status === "FAILED" ? "red" : "amber"}>{FLOOR_PLAN_STATUS_LABEL[plan.status]}</Badge>
              {plan.originalName}
              {plan.publishedAt && ` · publicado em ${formatDateTime(plan.publishedAt)}`}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {plan && !showUploader && (
            <a href={`?nova=1`} className="inline-flex h-11 items-center rounded-md border border-asphalt-200 bg-surface px-4 text-[15px] font-semibold hover:bg-asphalt-50">
              Enviar nova planta
            </a>
          )}
          {plan && (plan.status === "ANALYZED" || plan.status === "FAILED") && <PublishPlanButton planId={plan.id} spaces={spaces.length} />}
        </div>
      </div>

      <ol className="flex flex-wrap gap-2" aria-label="Etapas">
        {STEPS.map((s, i) => (
          <li key={s} aria-current={i === step ? "step" : undefined} className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold", i < step ? "bg-green-100 text-green-700" : i === step ? "bg-ink-900 text-white" : "bg-asphalt-100 text-asphalt-500")}>
            {i < step ? <Check className="size-3.5" aria-hidden /> : <span className="text-xs">{i + 1}</span>} {s}
          </li>
        ))}
      </ol>

      {showUploader && (
        <div className="space-y-3">
          {data.analyzerIsDemo && (
            <p className="flex items-start gap-2 rounded-md border border-dashed border-amber-300 bg-status-reserved-bg/60 px-3 py-2 text-sm text-reserved-fg">
              <FlaskConical className="mt-0.5 size-4 shrink-0" aria-hidden /> Modo demonstração: a análise automática é simulada e propõe um layout padrão sobre a sua planta. Revise e corrija as vagas no editor antes de publicar.
            </p>
          )}
          <PlanUploader floorId={floorId} hasSpaces={spaces.length > 0} maxBytes={MAX_UPLOAD_BYTES - 64 * 1024} />
        </div>
      )}

      {plan && !showUploader && (
        <>
          {plan.status === "FAILED" ? (
            <div className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-red-100 bg-red-50 p-4 text-sm text-red-800" role="alert">
              <p className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden /> <span><strong>A análise falhou.</strong> {plan.analysisError}</span>
              </p>
              <ReanalyzeButton planId={plan.id} />
            </div>
          ) : plan.status === "ANALYZED" ? (
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg border border-asphalt-100 bg-surface p-4 text-sm">
              <span className="flex items-center gap-2 font-semibold text-fg">
                <CheckCircle2 className="size-5 text-green-600" aria-hidden /> Resultado da análise
              </span>
              <span>{spaces.length} vagas</span>
              <span>{data.sectors.length} setores</span>
              <span>{data.elements.filter((e) => e.kind === "ENTRANCE").length} entrada(s) · {data.elements.filter((e) => e.kind === "EXIT").length} saída(s)</span>
              {plan.confidence !== null && <span>confiança {formatPercent(plan.confidence)}</span>}
              {data.analyzerIsDemo && (
                <span className="inline-flex items-center gap-1 font-semibold text-reserved-fg">
                  <FlaskConical className="size-4" aria-hidden /> análise simulada (modo demonstração)
                </span>
              )}
            </div>
          ) : null}
          {spaces.length === 0 && plan.status !== "PROCESSING" && (
            <p className="rounded-md bg-asphalt-50 px-3 py-2 text-sm text-asphalt-600">O mapa está vazio. Use “Adicionar vaga” para desenhar as vagas sobre a planta.</p>
          )}
          <MapEditor key={`${plan.id}-${contentHash(spaces)}`} floorId={floorId} imageUrl={plan.imageUrl} ratio={ratio} spaces={spaces} sectors={data.sectors} elements={data.elements} />
        </>
      )}
    </div>
  );
}
