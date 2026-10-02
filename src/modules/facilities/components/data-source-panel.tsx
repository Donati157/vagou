"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, CircuitBoard, DoorClosed, FlaskConical, Hand, Plug, Server } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Alert } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { formatRelative } from "@/lib/format";
import { disconnectDataSourceAction, recordManualCountAction, setDataSourceAction } from "../actions";

type Source = { kind: string; granularity: "SPACE" | "AGGREGATE"; lastSyncAt: Date | null; name: string } | null;

const OPTIONS = [
  { kind: "SIMULATION", label: "Simulação (demonstração)", desc: "Gera ocupação plausível para testes e demonstrações. Sempre exibida como “simulado”.", Icon: FlaskConical, available: true },
  { kind: "MANUAL", label: "Atualização manual", desc: "A equipe atualiza vagas no mapa operacional ou informa a contagem de vagas livres.", Icon: Hand, available: true },
  { kind: "SENSOR", label: "Sensores de vaga", desc: "Sensores por vaga (ultrassom, magnético).", Icon: CircuitBoard, available: false },
  { kind: "CAMERA", label: "Câmeras", desc: "Visão computacional sobre câmeras existentes.", Icon: Camera, available: false },
  { kind: "GATE", label: "Cancelas", desc: "Contagem de entradas e saídas.", Icon: DoorClosed, available: false },
  { kind: "PARKING_MANAGEMENT", label: "Sistema do shopping", desc: "Integração com o software de gestão já usado.", Icon: Server, available: false },
  { kind: "API", label: "API própria", desc: "Envio de ocupação via API.", Icon: Plug, available: false },
] as const;

export function DataSourcePanel({ facilityId, source, hasDigitalMap, capacity }: { facilityId: string; source: Source; hasDigitalMap: boolean; capacity: number }) {
  const [pending, start] = useTransition();
  const [available, setAvailable] = useState("");
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();
  const router = useRouter();
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, msg: string) =>
    start(async () => {
      setError(null);
      const res = await fn();
      if (res.ok) {
        toast(msg);
        router.refresh();
      } else setError(res.error ?? "Não foi possível salvar.");
    });
  const granularity = hasDigitalMap ? "SPACE" : "AGGREGATE";

  return (
    <div className="space-y-6">
      {error && <Alert tone="danger">{error}</Alert>}
      <section className="rounded-xl border border-asphalt-100 bg-surface p-5">
        <h2 className="text-lg font-semibold">Fonte atual</h2>
        {source ? (
          <p className="mt-2 flex flex-wrap items-center gap-2 text-[15px]">
            <strong>{source.name}</strong>
            <Badge tone={source.kind === "SIMULATION" ? "amber" : "blue"}>{source.granularity === "SPACE" ? "Por vaga" : "Por contagem"}</Badge>
            <span className="text-sm text-asphalt-500">{source.lastSyncAt ? `última atualização ${formatRelative(new Date(source.lastSyncAt))}` : "ainda sem atualização"}</span>
          </p>
        ) : (
          <p className="mt-2 text-asphalt-600">Nenhuma fonte conectada. A página pública mostra “Sem dados de ocupação”.</p>
        )}
        {source && (
          <Button variant="ghost" size="sm" className="mt-3 text-danger" loading={pending} onClick={() => run(() => disconnectDataSourceAction(facilityId), "Fonte desconectada.")}>
            Desconectar fonte
          </Button>
        )}
      </section>

      {source?.kind === "MANUAL" && source.granularity === "AGGREGATE" && (
        <section className="rounded-xl border border-asphalt-100 bg-surface p-5">
          <h2 className="text-lg font-semibold">Informar vagas livres agora</h2>
          <p className="mt-1 text-sm text-asphalt-500">Capacidade: {capacity} vagas. A contagem fica visível por até 3 horas.</p>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <Field label="Vagas livres" htmlFor="manual-available">
              <Input id="manual-available" type="number" min={0} max={capacity} value={available} onChange={(e) => setAvailable(e.target.value)} className="w-40" />
            </Field>
            <Button loading={pending} disabled={available === ""} onClick={() => run(() => recordManualCountAction(facilityId, { available: Number(available) }), "Contagem registrada.")}>
              Registrar contagem
            </Button>
          </div>
        </section>
      )}

      <section className="rounded-xl border border-asphalt-100 bg-surface p-5">
        <h2 className="text-lg font-semibold">Conectar fonte</h2>
        <p className="mt-1 text-sm text-asphalt-500">{hasDigitalMap ? "Este shopping tem mapa digital: a ocupação será acompanhada vaga a vaga." : "Sem mapa digital: a ocupação será por contagem de vagas livres."}</p>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {OPTIONS.map((o) => {
            const current = source?.kind === o.kind;
            return (
              <li key={o.kind} className={cn("flex flex-col rounded-lg border p-4", current ? "border-fg bg-green-50" : "border-asphalt-100", !o.available && "opacity-70")}>
                <p className="flex items-center gap-2 font-semibold text-fg">
                  <o.Icon className="size-5 text-asphalt-500" aria-hidden /> {o.label}
                </p>
                <p className="mt-1 flex-1 text-sm text-asphalt-600">{o.desc}</p>
                <div className="mt-3">
                  {o.available ? (
                    <Button size="sm" variant={current ? "secondary" : "primary"} disabled={pending || current} onClick={() => run(() => setDataSourceAction(facilityId, { kind: o.kind, granularity }), "Fonte conectada.")}>
                      {current ? "Conectada" : "Usar esta fonte"}
                    </Button>
                  ) : (
                    <Badge tone="outline">Integração sob demanda</Badge>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
