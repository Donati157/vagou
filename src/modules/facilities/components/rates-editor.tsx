"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { Alert } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import { ENTRANCE_KIND_LABEL, VEHICLE_TYPE_LABEL } from "@/lib/labels";
import { saveEntrancesAction, saveRatesAction } from "../actions";

type Rate = { label: string; vehicleType: "CAR" | "MOTORCYCLE" | "VAN"; firstPeriodMinutes: number; firstPeriod: number; additionalHour: number | null; dailyMax: number | null; notes: string | null };
type Entrance = { name: string; kind: "VEHICLE_ENTRY" | "VEHICLE_EXIT" | "VEHICLE_BOTH" | "PEDESTRIAN"; addressLine: string | null; lat: number; lng: number; isPrimary: boolean; notes: string | null };

const numOrNull = (v: string) => (v.trim() === "" ? null : Number(v.replace(",", ".")));

export function RatesEditor({ facilityId, initial }: { facilityId: string; initial: Rate[] }) {
  const [rates, setRates] = useState<Rate[]>(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  const update = (i: number, patch: Partial<Rate>) => setRates((r) => r.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  return (
    <section className="rounded-xl border border-asphalt-100 bg-white p-5">
      <h2 className="text-lg font-semibold">Tarifas</h2>
      <p className="mt-1 text-sm text-asphalt-500">Informativas para o motorista — a Vagou não processa pagamentos.</p>
      {error && <Alert tone="danger" className="mt-4">{error}</Alert>}
      <div className="mt-4 space-y-3">
        {rates.length === 0 && <p className="text-sm text-asphalt-500">Nenhuma tarifa cadastrada.</p>}
        {rates.map((r, i) => (
          <fieldset key={i} className="grid gap-3 rounded-md border border-asphalt-100 p-3 sm:grid-cols-6">
            <legend className="sr-only">Tarifa {i + 1}</legend>
            <label className="sm:col-span-2">
              <span className="mb-1 block text-xs font-semibold text-asphalt-500">Descrição</span>
              <Input value={r.label} onChange={(e) => update(i, { label: e.target.value })} placeholder="Carro — primeira hora" />
            </label>
            <label>
              <span className="mb-1 block text-xs font-semibold text-asphalt-500">Veículo</span>
              <Select value={r.vehicleType} onChange={(e) => update(i, { vehicleType: e.target.value as Rate["vehicleType"] })}>
                {Object.entries(VEHICLE_TYPE_LABEL).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </Select>
            </label>
            <label>
              <span className="mb-1 block text-xs font-semibold text-asphalt-500">1º período (min)</span>
              <Input type="number" min={15} value={r.firstPeriodMinutes} onChange={(e) => update(i, { firstPeriodMinutes: Number(e.target.value) })} />
            </label>
            <label>
              <span className="mb-1 block text-xs font-semibold text-asphalt-500">Valor 1º período (R$)</span>
              <Input inputMode="decimal" value={String(r.firstPeriod)} onChange={(e) => update(i, { firstPeriod: Number(e.target.value.replace(",", ".")) || 0 })} />
            </label>
            <label>
              <span className="mb-1 block text-xs font-semibold text-asphalt-500">Hora adicional (R$)</span>
              <Input inputMode="decimal" value={r.additionalHour ?? ""} onChange={(e) => update(i, { additionalHour: numOrNull(e.target.value) })} />
            </label>
            <label>
              <span className="mb-1 block text-xs font-semibold text-asphalt-500">Diária máx. (R$)</span>
              <Input inputMode="decimal" value={r.dailyMax ?? ""} onChange={(e) => update(i, { dailyMax: numOrNull(e.target.value) })} />
            </label>
            <label className="sm:col-span-4">
              <span className="mb-1 block text-xs font-semibold text-asphalt-500">Observações</span>
              <Input value={r.notes ?? ""} onChange={(e) => update(i, { notes: e.target.value || null })} />
            </label>
            <div className="flex items-end">
              <Button type="button" variant="ghost" size="sm" className="text-danger" onClick={() => setRates((x) => x.filter((_, j) => j !== i))}>
                <Trash2 className="size-4" aria-hidden /> Remover
              </Button>
            </div>
          </fieldset>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap justify-between gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={() => setRates((r) => [...r, { label: "", vehicleType: "CAR", firstPeriodMinutes: 60, firstPeriod: 10, additionalHour: null, dailyMax: null, notes: null }])}>
          <Plus className="size-4" aria-hidden /> Adicionar tarifa
        </Button>
        <Button
          type="button"
          loading={pending}
          onClick={() =>
            start(async () => {
              setError(null);
              const res = await saveRatesAction(facilityId, { rates });
              if (res.ok) {
                toast("Tarifas salvas.");
                router.refresh();
              } else setError(res.fieldErrors ? Object.values(res.fieldErrors).flat()[0] ?? res.error : res.error);
            })
          }
        >
          Salvar tarifas
        </Button>
      </div>
    </section>
  );
}

export function EntrancesEditor({ facilityId, initial, fallback }: { facilityId: string; initial: Entrance[]; fallback: { lat: number; lng: number } }) {
  const [items, setItems] = useState<Entrance[]>(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  const update = (i: number, patch: Partial<Entrance>) => setItems((r) => r.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  return (
    <section className="rounded-xl border border-asphalt-100 bg-white p-5">
      <h2 className="text-lg font-semibold">Entradas</h2>
      <p className="mt-1 text-sm text-asphalt-500">A entrada recomendada é usada no botão “Ir até lá”. Coordenadas em graus decimais.</p>
      {error && <Alert tone="danger" className="mt-4">{error}</Alert>}
      <div className="mt-4 space-y-3">
        {items.map((e, i) => (
          <fieldset key={i} className="grid gap-3 rounded-md border border-asphalt-100 p-3 sm:grid-cols-6">
            <legend className="sr-only">Entrada {i + 1}</legend>
            <label className="sm:col-span-2">
              <span className="mb-1 block text-xs font-semibold text-asphalt-500">Nome</span>
              <Input value={e.name} onChange={(ev) => update(i, { name: ev.target.value })} />
            </label>
            <label className="sm:col-span-2">
              <span className="mb-1 block text-xs font-semibold text-asphalt-500">Tipo</span>
              <Select value={e.kind} onChange={(ev) => update(i, { kind: ev.target.value as Entrance["kind"] })}>
                {Object.entries(ENTRANCE_KIND_LABEL).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </Select>
            </label>
            <label>
              <span className="mb-1 block text-xs font-semibold text-asphalt-500">Latitude</span>
              <Input inputMode="decimal" value={String(e.lat)} onChange={(ev) => update(i, { lat: Number(ev.target.value) })} />
            </label>
            <label>
              <span className="mb-1 block text-xs font-semibold text-asphalt-500">Longitude</span>
              <Input inputMode="decimal" value={String(e.lng)} onChange={(ev) => update(i, { lng: Number(ev.target.value) })} />
            </label>
            <label className="sm:col-span-3">
              <span className="mb-1 block text-xs font-semibold text-asphalt-500">Endereço</span>
              <Input value={e.addressLine ?? ""} onChange={(ev) => update(i, { addressLine: ev.target.value || null })} />
            </label>
            <div className="flex items-end gap-2 sm:col-span-3">
              <Button type="button" size="sm" variant={e.isPrimary ? "accent" : "secondary"} aria-pressed={e.isPrimary} onClick={() => setItems((all) => all.map((x, j) => ({ ...x, isPrimary: j === i })))}>
                <Star className="size-4" aria-hidden /> {e.isPrimary ? "Recomendada" : "Marcar como recomendada"}
              </Button>
              <Button type="button" variant="ghost" size="sm" className="text-danger" onClick={() => setItems((x) => x.filter((_, j) => j !== i))}>
                <Trash2 className="size-4" aria-hidden /> Remover
              </Button>
            </div>
          </fieldset>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap justify-between gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={() => setItems((r) => [...r, { name: "", kind: "VEHICLE_BOTH", addressLine: null, lat: fallback.lat, lng: fallback.lng, isPrimary: r.length === 0, notes: null }])}>
          <Plus className="size-4" aria-hidden /> Adicionar entrada
        </Button>
        <Button
          type="button"
          loading={pending}
          onClick={() =>
            start(async () => {
              setError(null);
              const res = await saveEntrancesAction(facilityId, { entrances: items });
              if (res.ok) {
                toast("Entradas salvas.");
                router.refresh();
              } else setError(res.fieldErrors ? Object.values(res.fieldErrors).flat()[0] ?? res.error : res.error);
            })
          }
        >
          Salvar entradas
        </Button>
      </div>
    </section>
  );
}
