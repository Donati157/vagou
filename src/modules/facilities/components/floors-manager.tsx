"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Layers, Map as MapIcon, Pencil, Plus, Trash2, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, LinkButton } from "@/components/ui/button";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import { FLOOR_PLAN_STATUS_LABEL } from "@/lib/labels";
import { createFloorAction, createSectorAction, deleteFloorAction, deleteSectorAction, updateFloorAction, updateSectorAction } from "../actions";

type Floor = {
  id: string;
  name: string;
  level: number;
  spaces: number;
  sectors: Array<{ id: string; name: string; color: string }>;
  publishedPlan: { id: string } | null;
  latestPlan: { id: string; status: keyof typeof FLOOR_PLAN_STATUS_LABEL } | null;
};

const PALETTE = ["#3B82F6", "#8B5CF6", "#0EA5E9", "#F97316", "#14B8A6", "#EC4899", "#64748B"];

function useRun() {
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, success: string, after?: () => void) =>
    start(async () => {
      const res = await fn();
      if (res.ok) {
        toast(success);
        after?.();
        router.refresh();
      } else toast(res.error ?? "Não foi possível salvar.", "error");
    });
  return { pending, run };
}

export function FloorsManager({ facilityId, floors }: { facilityId: string; floors: Floor[] }) {
  const { pending, run } = useRun();
  const [floorDialog, setFloorDialog] = useState<{ id: string | null; name: string; level: number } | null>(null);
  const [sectorDialog, setSectorDialog] = useState<{ floorId: string; id: string | null; name: string; color: string } | null>(null);
  const [confirm, setConfirm] = useState<{ kind: "floor" | "sector"; id: string; label: string } | null>(null);

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button size="sm" onClick={() => setFloorDialog({ id: null, name: "", level: floors.length ? Math.min(...floors.map((f) => f.level)) - 1 : 0 })}>
          <Plus className="size-4" aria-hidden /> Novo piso
        </Button>
      </div>
      {floors.length === 0 ? (
        <EmptyState icon={<Layers className="size-6" aria-hidden />} title="Nenhum piso cadastrado" description="Crie os pisos do shopping para importar a planta e digitalizar as vagas." />
      ) : (
        <ul className="space-y-3">
          {floors.map((f) => (
            <li key={f.id} className="rounded-xl border border-asphalt-100 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="flex items-center gap-2 text-lg font-semibold">
                    <Layers className="size-5 text-asphalt-400" aria-hidden /> {f.name}
                    <span className="text-sm font-normal text-asphalt-500">nível {f.level}</span>
                  </h3>
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-asphalt-500">
                    {f.spaces} vagas mapeadas
                    {f.publishedPlan ? <Badge tone="green">Mapa publicado</Badge> : f.latestPlan ? <Badge tone="amber">{FLOOR_PLAN_STATUS_LABEL[f.latestPlan.status]}</Badge> : <Badge tone="outline">Sem planta</Badge>}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <LinkButton href={`/company/estacionamentos/${facilityId}/pisos/${f.id}`} size="sm" variant={f.latestPlan ? "secondary" : "primary"}>
                    {f.latestPlan ? <MapIcon className="size-4" aria-hidden /> : <Upload className="size-4" aria-hidden />}
                    {f.latestPlan ? "Mapa Inteligente" : "Importar planta"}
                  </LinkButton>
                  <Button size="sm" variant="ghost" onClick={() => setFloorDialog({ id: f.id, name: f.name, level: f.level })} aria-label={`Editar piso ${f.name}`}>
                    <Pencil className="size-4" aria-hidden />
                  </Button>
                  <Button size="sm" variant="ghost" className="text-danger" onClick={() => setConfirm({ kind: "floor", id: f.id, label: f.name })} aria-label={`Excluir piso ${f.name}`}>
                    <Trash2 className="size-4" aria-hidden />
                  </Button>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-asphalt-500 uppercase">Setores</span>
                {f.sectors.length === 0 && <span className="text-sm text-asphalt-400">nenhum</span>}
                {f.sectors.map((s) => (
                  <span key={s.id} className="inline-flex items-center gap-1 rounded-full border border-asphalt-200 py-0.5 pr-1 pl-2.5 text-sm">
                    <span className="size-2.5 rounded-full" style={{ background: s.color }} aria-hidden /> {s.name}
                    <button className="grid size-6 place-items-center rounded-full hover:bg-asphalt-100" onClick={() => setSectorDialog({ floorId: f.id, id: s.id, name: s.name, color: s.color })} aria-label={`Editar setor ${s.name}`}>
                      <Pencil className="size-3" aria-hidden />
                    </button>
                    <button className="grid size-6 place-items-center rounded-full text-danger hover:bg-red-50" onClick={() => setConfirm({ kind: "sector", id: s.id, label: s.name })} aria-label={`Excluir setor ${s.name}`}>
                      <Trash2 className="size-3" aria-hidden />
                    </button>
                  </span>
                ))}
                <Button size="sm" variant="ghost" onClick={() => setSectorDialog({ floorId: f.id, id: null, name: "", color: PALETTE[f.sectors.length % PALETTE.length] })}>
                  <Plus className="size-4" aria-hidden /> Setor
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog
        open={!!floorDialog}
        onClose={() => setFloorDialog(null)}
        title={floorDialog?.id ? "Editar piso" : "Novo piso"}
        footer={
          <Button
            loading={pending}
            onClick={() =>
              floorDialog &&
              run(
                () => (floorDialog.id ? updateFloorAction(floorDialog.id, { name: floorDialog.name, level: floorDialog.level }) : createFloorAction(facilityId, { name: floorDialog.name, level: floorDialog.level })),
                "Piso salvo.",
                () => setFloorDialog(null),
              )
            }
          >
            Salvar
          </Button>
        }
      >
        {floorDialog && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nome" htmlFor="floor-name" hint="Ex.: G1, Térreo, Subsolo 2">
              <Input id="floor-name" value={floorDialog.name} onChange={(e) => setFloorDialog({ ...floorDialog, name: e.target.value })} autoFocus />
            </Field>
            <Field label="Nível" htmlFor="floor-level" hint="Negativo para subsolos">
              <Input id="floor-level" type="number" value={floorDialog.level} onChange={(e) => setFloorDialog({ ...floorDialog, level: Number(e.target.value) })} />
            </Field>
          </div>
        )}
      </Dialog>

      <Dialog
        open={!!sectorDialog}
        onClose={() => setSectorDialog(null)}
        title={sectorDialog?.id ? "Editar setor" : "Novo setor"}
        footer={
          <Button
            loading={pending}
            onClick={() =>
              sectorDialog &&
              run(
                () => (sectorDialog.id ? updateSectorAction(sectorDialog.id, { name: sectorDialog.name, color: sectorDialog.color }) : createSectorAction(sectorDialog.floorId, { name: sectorDialog.name, color: sectorDialog.color })),
                "Setor salvo.",
                () => setSectorDialog(null),
              )
            }
          >
            Salvar
          </Button>
        }
      >
        {sectorDialog && (
          <div className="space-y-4">
            <Field label="Nome" htmlFor="sector-name" hint="Ex.: A, B, Azul">
              <Input id="sector-name" value={sectorDialog.name} onChange={(e) => setSectorDialog({ ...sectorDialog, name: e.target.value })} autoFocus />
            </Field>
            <fieldset>
              <legend className="mb-2 text-sm font-medium text-asphalt-700">Cor</legend>
              <div className="flex flex-wrap gap-2">
                {PALETTE.map((c) => (
                  <button key={c} type="button" onClick={() => setSectorDialog({ ...sectorDialog, color: c })} aria-label={`Cor ${c}`} aria-pressed={sectorDialog.color === c} className={`size-9 rounded-full ring-offset-2 ${sectorDialog.color === c ? "ring-2 ring-ink-900" : ""}`} style={{ background: c }} />
                ))}
              </div>
            </fieldset>
          </div>
        )}
      </Dialog>

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        danger
        loading={pending}
        title={confirm?.kind === "floor" ? `Excluir o piso ${confirm?.label}?` : `Excluir o setor ${confirm?.label}?`}
        confirmLabel="Excluir"
        onConfirm={() => confirm && run(() => (confirm.kind === "floor" ? deleteFloorAction(confirm.id) : deleteSectorAction(confirm.id)), "Excluído.", () => setConfirm(null))}
      >
        <p className="text-[15px] text-asphalt-700">
          {confirm?.kind === "floor" ? "Plantas, setores e vagas deste piso serão removidos permanentemente." : "As vagas deste setor continuam no mapa, sem setor definido."}
        </p>
      </ConfirmDialog>
      <p className="mt-6 text-sm text-asphalt-500">
        Dica: o Mapa Inteligente cria setores e vagas automaticamente a partir da planta. <Link href="/empresas" className="font-semibold text-green-700 hover:underline">Saiba mais</Link>
      </p>
    </>
  );
}
