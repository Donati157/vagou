"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { AlertTriangle, History, Layers, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DemoBadge } from "@/components/ui/demo-badge";
import { Select } from "@/components/ui/field";
import { Metric } from "@/components/ui/metric";
import { SPACE_STATUS_STYLE, SpaceStatusBadge } from "@/components/ui/space-status";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { formatNumber, formatPercent, formatRelative } from "@/lib/format";
import { DATA_SOURCE_KIND_LABEL, SPACE_STATUS_LABEL, SPACE_STATUSES, SPACE_TYPE_LABEL, SPACE_TYPES, type DataSourceKind, type SpaceStatus, type SpaceType } from "@/lib/labels";
import type { OperationalState } from "../operations";
import { setSpaceStatusAction, spaceHistoryAction } from "../actions";

type State = Omit<OperationalState, "serverTime" | "source"> & { serverTime: string | Date; source: (Omit<NonNullable<OperationalState["source"]>, "lastSyncAt"> & { lastSyncAt: string | Date | null }) | null };
type HistoryRow = { id: string; from: string | null; to: string; source: string; at: Date | string; actor: string | null };

const POLL_MS = 10_000;

export function OperationalMap({ facilityId, initial }: { facilityId: string; initial: State }) {
  const toast = useToast();
  const [state, setState] = useState<State>(initial);
  const [floorId, setFloorId] = useState<string | null>(initial.map?.floorId ?? null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastFetch, setLastFetch] = useState(() => new Date());
  const [, setTick] = useState(0);
  const [statusFilter, setStatusFilter] = useState<Set<SpaceStatus>>(new Set());
  const [sectorFilter, setSectorFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryRow[] | null>(null);
  const [pending, start] = useTransition();

  const load = useCallback(
    async (floor: string | null) => {
      setLoading(true);
      try {
        const res = await fetch(`/api/company/facilities/${facilityId}/occupancy${floor ? `?piso=${floor}` : ""}`, { cache: "no-store" });
        if (!res.ok) throw new Error();
        setState(await res.json());
        setError(null);
        setLastFetch(new Date());
      } catch {
        setError("Não foi possível atualizar a ocupação agora. Tentaremos de novo em instantes.");
      } finally {
        setLoading(false);
      }
    },
    [facilityId],
  );

  useEffect(() => {
    const t = setInterval(() => {
      if (document.visibilityState === "visible") load(floorId);
    }, POLL_MS);
    const s = setInterval(() => setTick((x) => x + 1), 5000);
    return () => {
      clearInterval(t);
      clearInterval(s);
    };
  }, [load, floorId]);

  const map = state.map;
  const selected = map?.spaces.find((s) => s.id === selectedId) ?? null;
  const sectorById = useMemo(() => new Map((map?.sectors ?? []).map((s) => [s.id, s])), [map]);
  const matches = (s: NonNullable<State["map"]>["spaces"][number]) => (statusFilter.size === 0 || statusFilter.has(s.status)) && (!sectorFilter || s.sectorId === sectorFilter) && (!typeFilter || s.type === typeFilter);
  const counts = useMemo(() => {
    const c = { AVAILABLE: 0, OCCUPIED: 0, RESERVED: 0, UNAVAILABLE: 0 } as Record<SpaceStatus, number>;
    for (const s of map?.spaces ?? []) c[s.status]++;
    return c;
  }, [map]);
  const total = (map?.spaces.length ?? 0) || 1;
  const operational = counts.AVAILABLE + counts.OCCUPIED + counts.RESERVED;
  const simulated = state.source?.kind === "SIMULATION";
  const H = map ? 1000 * map.ratio : 625;

  useEffect(() => {
    if (!selectedId) return;
    let alive = true;
    spaceHistoryAction(facilityId, selectedId).then((res) => alive && setHistory(res.ok ? (res.data as HistoryRow[]) : []));
    return () => {
      alive = false;
    };
  }, [selectedId, facilityId, state.serverTime]);

  function changeStatus(status: SpaceStatus) {
    if (!selected) return;
    start(async () => {
      const res = await setSpaceStatusAction(facilityId, selected.id, status);
      if (res.ok) {
        toast(`Vaga ${selected.code}: ${SPACE_STATUS_LABEL[status].toLowerCase()}.`);
        await load(floorId);
      } else toast(res.error, "error");
    });
  }

  return (
    <div className="space-y-4">
      {/* status bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-sm text-asphalt-600">
          {simulated ? <DemoBadge label="Modo demonstração — ocupação simulada" /> : state.source ? <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">{DATA_SOURCE_KIND_LABEL[state.source.kind as DataSourceKind]}</span> : <span className="rounded-full bg-asphalt-100 px-2.5 py-0.5 text-xs font-semibold">Sem fonte de ocupação</span>}
          <span aria-live="polite">Última atualização: {formatRelative(lastFetch)}</span>
        </div>
        <Button size="sm" variant="secondary" onClick={() => load(floorId)} loading={loading}>
          <RefreshCw className="size-4" aria-hidden /> Atualizar
        </Button>
      </div>
      {error && (
        <p className="flex items-center gap-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          <AlertTriangle className="size-4" aria-hidden /> {error}
        </p>
      )}

      {!map ? (
        <div className="space-y-4">
          <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Metric label="Vagas livres" value={state.live.available === null ? "—" : formatNumber(state.live.available)} hint={simulated ? "simulado" : undefined} />
            <Metric label="Capacidade" value={formatNumber(state.live.capacity)} />
            <Metric label="Ocupação" value={state.live.occupancy === null ? "—" : formatPercent(state.live.occupancy)} />
            <Metric label="Atualizado" value={state.live.updatedAt ? formatRelative(new Date(state.live.updatedAt)) : "—"} />
          </section>
          <div className="rounded-xl border border-dashed border-asphalt-200 bg-surface p-6 text-center">
            <Layers className="mx-auto size-8 text-asphalt-400" aria-hidden />
            <p className="mt-2 font-semibold">Mapa operacional indisponível</p>
            <p className="mt-1 text-sm text-asphalt-500">Publique o mapa digital de um piso para acompanhar a ocupação vaga a vaga.</p>
            <Link href={`/company/estacionamentos/${facilityId}/pisos`} className="mt-4 inline-flex h-10 items-center rounded-md bg-ink-900 px-4 text-sm font-semibold text-white">
              Ir para Pisos e mapas
            </Link>
          </div>
        </div>
      ) : (
        <>
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5" aria-label="Indicadores do piso">
            {SPACE_STATUSES.map((s) => {
              const st = SPACE_STATUS_STYLE[s];
              return <Metric key={s} label={SPACE_STATUS_LABEL[s] === "Livre" ? "Livres" : SPACE_STATUS_LABEL[s] === "Ocupada" ? "Ocupadas" : SPACE_STATUS_LABEL[s] === "Reservada" ? "Reservadas" : "Indisponíveis"} value={counts[s]} icon={<st.Icon className={`size-4 ${st.text}`} />} hint={formatPercent(counts[s] / total)} />;
            })}
            <Metric label="Ocupação do piso" value={operational ? formatPercent((counts.OCCUPIED + counts.RESERVED) / operational) : "—"} className="col-span-2 sm:col-span-1" />
          </section>

          {/* filters */}
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-asphalt-100 bg-surface p-2" role="group" aria-label="Filtros">
            <nav aria-label="Pisos" className="flex flex-wrap gap-1">
              {state.floors.map((f) => {
                const fc = state.live.floors.find((x) => x.floorId === f.id);
                return (
                  <button
                    key={f.id}
                    type="button"
                    disabled={!f.published}
                    aria-current={f.id === map.floorId ? "page" : undefined}
                    onClick={() => {
                      setFloorId(f.id);
                      setSelectedId(null);
                      setSectorFilter("");
                      load(f.id);
                    }}
                    className={cn("rounded-full px-3 py-1.5 text-sm font-semibold", f.id === map.floorId ? "bg-ink-900 text-white dark:bg-green-400 dark:text-ink-950" : "border border-asphalt-200 text-asphalt-700 disabled:opacity-40")}
                    title={f.published ? undefined : "Piso sem mapa publicado"}
                  >
                    {f.name}
                    {fc ? ` · ${fc.counts.available}` : ""}
                  </button>
                );
              })}
            </nav>
            <span className="mx-1 hidden h-6 w-px bg-asphalt-200 sm:block" aria-hidden />
            {SPACE_STATUSES.map((s) => {
              const on = statusFilter.has(s);
              const st = SPACE_STATUS_STYLE[s];
              return (
                <button
                  key={s}
                  type="button"
                  aria-pressed={on}
                  onClick={() =>
                    setStatusFilter((f) => {
                      const n = new Set(f);
                      if (n.has(s)) n.delete(s);
                      else n.add(s);
                      return n;
                    })
                  }
                  className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-sm font-medium", on ? "border-fg bg-ink-900 text-white dark:bg-green-400 dark:text-ink-950" : "border-asphalt-200 text-asphalt-700")}
                >
                  <st.Icon className="size-3.5" aria-hidden /> {SPACE_STATUS_LABEL[s]}
                </button>
              );
            })}
            <label className="sr-only" htmlFor="op-sector">
              Setor
            </label>
            <Select id="op-sector" className="h-9 w-36 py-0 text-sm" value={sectorFilter} onChange={(e) => setSectorFilter(e.target.value)}>
              <option value="">Todos os setores</option>
              {map.sectors.map((s) => (
                <option key={s.id} value={s.id}>
                  Setor {s.name}
                </option>
              ))}
            </Select>
            <label className="sr-only" htmlFor="op-type">
              Tipo
            </label>
            <Select id="op-type" className="h-9 w-36 py-0 text-sm" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="">Todos os tipos</option>
              {SPACE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {SPACE_TYPE_LABEL[t as SpaceType]}
                </option>
              ))}
            </Select>
          </div>

          <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
            <div className="relative w-full overflow-hidden rounded-xl border border-asphalt-100 bg-surface" style={{ aspectRatio: `${1 / map.ratio}` }}>
              {map.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={map.imageUrl} alt="" className="pointer-events-none absolute inset-0 h-full w-full opacity-60" />
              )}
              <svg viewBox={`0 0 1000 ${H}`} className="absolute inset-0 h-full w-full" role="group" aria-label="Mapa operacional — selecione uma vaga">
                {map.elements
                  .filter((e) => e.kind === "ENTRANCE" || e.kind === "EXIT")
                  .map((e) => (
                    <rect key={e.id} x={e.x * 1000} y={e.y * H} width={e.w * 1000} height={e.h * H} fill={e.kind === "ENTRANCE" ? "#2f8048" : "#d63c3c"} opacity={0.8}>
                      <title>{e.label ?? e.kind}</title>
                    </rect>
                  ))}
                {map.spaces.map((s) => {
                  const st = SPACE_STATUS_STYLE[s.status];
                  const x = s.x * 1000;
                  const y = s.y * H;
                  const w = s.w * 1000;
                  const h = s.h * H;
                  const on = matches(s);
                  const isSel = s.id === selectedId;
                  return (
                    <g
                      key={s.id}
                      transform={s.rotation ? `rotate(${s.rotation} ${x + w / 2} ${y + h / 2})` : undefined}
                      opacity={on ? 1 : 0.18}
                      className="cursor-pointer focus:outline-none"
                      tabIndex={on ? 0 : -1}
                      role="button"
                      aria-label={`Vaga ${s.code}: ${SPACE_STATUS_LABEL[s.status]}`}
                      onClick={() => {
                        setHistory(null);
                        setSelectedId(s.id);
                      }}
                      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setSelectedId(s.id)}
                    >
                      <title>{`${s.code} — ${SPACE_STATUS_LABEL[s.status]}`}</title>
                      <rect x={x} y={y} width={w} height={h} rx={2} fill={st.fill} stroke={isSel ? "#0c2219" : "#fff"} strokeWidth={isSel ? 3.5 : 1.2} />
                      {s.status === "UNAVAILABLE" && <line x1={x + 2} y1={y + 2} x2={x + w - 2} y2={y + h - 2} stroke="rgba(0,0,0,.45)" strokeWidth={1.5} />}
                      {s.status === "RESERVED" && <circle cx={x + w / 2} cy={y + h / 2} r={Math.min(w, h) * 0.18} fill="rgba(0,0,0,.35)" />}
                      {s.status === "OCCUPIED" && <rect x={x + w * 0.25} y={y + h * 0.2} width={w * 0.5} height={h * 0.6} rx={2} fill="rgba(255,255,255,.45)" />}
                    </g>
                  );
                })}
              </svg>
            </div>

            <aside className={cn("rounded-xl border border-asphalt-100 bg-surface p-4", !selected && "hidden xl:block")} aria-label="Detalhes da vaga" aria-live="polite">
              {!selected ? (
                <div className="text-sm text-asphalt-600">
                  <p className="font-semibold text-fg">Selecione uma vaga</p>
                  <p className="mt-1">Clique em uma vaga no mapa para ver detalhes, histórico e alterar o status manualmente.</p>
                  <ul className="mt-4 space-y-1.5">
                    {map.sectors.map((sec) => {
                      const mine = map.spaces.filter((s) => s.sectorId === sec.id);
                      return (
                        <li key={sec.id} className="flex items-center justify-between">
                          <span className="flex items-center gap-2">
                            <span className="size-3 rounded-sm" style={{ background: sec.color }} aria-hidden /> Setor {sec.name}
                          </span>
                          <span className="font-semibold text-fg">
                            {mine.filter((s) => s.status === "AVAILABLE").length}/{mine.length} livres
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs text-asphalt-500">Vaga</p>
                      <p className="font-display text-2xl font-bold text-fg">{selected.code}</p>
                    </div>
                    <button onClick={() => setSelectedId(null)} className="grid size-8 place-items-center rounded-full hover:bg-asphalt-100" aria-label="Fechar detalhes">
                      <X className="size-4" aria-hidden />
                    </button>
                  </div>
                  <SpaceStatusBadge status={selected.status} />
                  <dl className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <dt className="text-asphalt-500">Setor</dt>
                      <dd className="font-medium">{selected.sectorId ? `Setor ${sectorById.get(selected.sectorId)?.name ?? "—"}` : "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-asphalt-500">Tipo</dt>
                      <dd className="font-medium">{SPACE_TYPE_LABEL[selected.type as SpaceType]}</dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-asphalt-500">Última mudança</dt>
                      <dd className="font-medium">
                        {formatRelative(new Date(selected.updatedAt))} · {DATA_SOURCE_KIND_LABEL[selected.source as DataSourceKind]}
                      </dd>
                    </div>
                  </dl>
                  <div>
                    <p className="mb-2 text-xs font-semibold text-asphalt-500 uppercase">Alterar status manualmente</p>
                    <div className="grid grid-cols-2 gap-2">
                      {SPACE_STATUSES.map((s) => (
                        <Button key={s} size="sm" variant={selected.status === s ? "primary" : "secondary"} disabled={pending || selected.status === s} onClick={() => changeStatus(s)}>
                          {SPACE_STATUS_LABEL[s]}
                        </Button>
                      ))}
                    </div>
                    {simulated && <p className="mt-2 text-xs text-asphalt-500">Com a simulação ativa, a vaga pode voltar a mudar automaticamente (exceto reservada e indisponível).</p>}
                  </div>
                  <div>
                    <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-asphalt-500 uppercase">
                      <History className="size-3.5" aria-hidden /> Histórico recente
                    </p>
                    {history === null ? (
                      <p className="text-sm text-asphalt-400">Carregando…</p>
                    ) : history.length === 0 ? (
                      <p className="text-sm text-asphalt-500">Sem mudanças registradas.</p>
                    ) : (
                      <ol className="space-y-1.5 text-sm">
                        {history.map((h) => (
                          <li key={h.id} className="flex justify-between gap-2">
                            <span>
                              {h.from ? `${SPACE_STATUS_LABEL[h.from as SpaceStatus]} → ` : ""}
                              <strong>{SPACE_STATUS_LABEL[h.to as SpaceStatus]}</strong>
                              <span className="block text-xs text-asphalt-500">
                                {DATA_SOURCE_KIND_LABEL[h.source as DataSourceKind]}
                                {h.actor ? ` · ${h.actor.split(" ")[0]}` : ""}
                              </span>
                            </span>
                            <span className="shrink-0 text-xs text-asphalt-500">{formatRelative(new Date(h.at))}</span>
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>
                </div>
              )}
            </aside>
          </div>
        </>
      )}
    </div>
  );
}
