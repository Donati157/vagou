"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy, MousePointer2, Plus, RotateCcw, RotateCw, Save, SquarePlus, Trash2, Undo2, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { SPACE_STATUS_STYLE } from "@/components/ui/space-status";
import { cn } from "@/lib/cn";
import { SPACE_STATUS_LABEL, SPACE_STATUSES, SPACE_TYPE_LABEL, SPACE_TYPES, type SpaceStatus, type SpaceType } from "@/lib/labels";
import { saveEditorAction } from "../actions";

export type EditorSpace = { id: string; code: string; type: SpaceType; status: SpaceStatus; sectorId: string | null; x: number; y: number; w: number; h: number; rotation: number };
type Item = EditorSpace & { key: string; isNew: boolean };
type Sector = { id: string; name: string; color: string };
type PlanElement = { id: string; kind: string; label: string | null; x: number; y: number; w: number; h: number };

const VB = 1000; // viewBox width; height = VB * ratio (uniform scale keeps rotations undistorted)
const round = (v: number) => Math.round(v * 10000) / 10000;

type Drag =
  | { mode: "move"; startX: number; startY: number; origin: Map<string, { x: number; y: number }> }
  | { mode: "resize"; key: string; startX: number; startY: number; origin: Item };

export function MapEditor({ floorId, imageUrl, ratio, spaces, sectors, elements, readOnlyReason }: { floorId: string; imageUrl: string | null; ratio: number; spaces: EditorSpace[]; sectors: Sector[]; elements: PlanElement[]; readOnlyReason?: string | null }) {
  const router = useRouter();
  const toast = useToast();
  const H = VB * ratio;
  const baseline = useMemo(() => new Map(spaces.map((s) => [s.id, s])), [spaces]);
  const [items, setItems] = useState<Item[]>(() => spaces.map((s) => ({ ...s, key: s.id, isNew: false })));
  const [deleted, setDeleted] = useState<string[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [tool, setTool] = useState<"select" | "add">("select");
  const [zoom, setZoom] = useState(1);
  const [colorBy, setColorBy] = useState<"status" | "sector">("status");
  const [lastSector, setLastSector] = useState<string | null>(sectors[0]?.id ?? null);
  const [pending, start] = useTransition();
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<Drag | null>(null);
  const counter = useRef(1);

  const sectorById = useMemo(() => new Map(sectors.map((s) => [s.id, s])), [sectors]);
  const selectedItems = items.filter((i) => selected.has(i.key));
  const single = selectedItems.length === 1 ? selectedItems[0] : null;

  const dirty = useMemo(() => {
    const updated = items.filter((i) => {
      if (i.isNew) return false;
      const b = baseline.get(i.id);
      return !!b && (b.code !== i.code || b.type !== i.type || b.status !== i.status || b.sectorId !== i.sectorId || b.x !== i.x || b.y !== i.y || b.w !== i.w || b.h !== i.h || b.rotation !== i.rotation);
    });
    return { created: items.filter((i) => i.isNew), updated, count: items.filter((i) => i.isNew).length + updated.length + deleted.length };
  }, [items, baseline, deleted]);

  // warn before leaving with unsaved changes
  useEffect(() => {
    const onBefore = (e: BeforeUnloadEvent) => {
      if (dirty.count > 0) e.preventDefault();
    };
    window.addEventListener("beforeunload", onBefore);
    return () => window.removeEventListener("beforeunload", onBefore);
  }, [dirty.count]);

  const toRel = useCallback(
    (clientX: number, clientY: number) => {
      const r = svgRef.current!.getBoundingClientRect();
      return { x: (clientX - r.left) / r.width, y: (clientY - r.top) / r.height };
    },
    [],
  );

  const patch = (keys: Set<string> | string[], fn: (i: Item) => Partial<Item>) => {
    const set = keys instanceof Set ? keys : new Set(keys);
    setItems((all) => all.map((i) => (set.has(i.key) ? { ...i, ...fn(i) } : i)));
  };

  const nextCode = useCallback(() => {
    const codes = new Set(items.map((i) => i.code));
    let code = `V-${counter.current}`;
    while (codes.has(code)) code = `V-${++counter.current}`;
    counter.current++;
    return code;
  }, [items]);

  const defaultSize = useMemo(() => {
    if (items.length === 0) return { w: 0.034, h: 0.09 };
    const ws = items.map((i) => i.w).sort((a, b) => a - b);
    const hs = items.map((i) => i.h).sort((a, b) => a - b);
    return { w: ws[Math.floor(ws.length / 2)], h: hs[Math.floor(hs.length / 2)] };
  }, [items]);

  function addAt(x: number, y: number) {
    const key = `new-${crypto.randomUUID()}`;
    const item: Item = { key, id: key, isNew: true, code: nextCode(), type: "COMMON", status: "AVAILABLE", sectorId: lastSector, x: round(Math.max(0, x - defaultSize.w / 2)), y: round(Math.max(0, y - defaultSize.h / 2)), w: defaultSize.w, h: defaultSize.h, rotation: 0 };
    setItems((all) => [...all, item]);
    setSelected(new Set([key]));
  }

  function removeSelected() {
    const keys = new Set(selected);
    setDeleted((d) => [...d, ...items.filter((i) => keys.has(i.key) && !i.isNew).map((i) => i.id)]);
    setItems((all) => all.filter((i) => !keys.has(i.key)));
    setSelected(new Set());
  }

  function duplicateSelected() {
    const copies = selectedItems.map((i) => {
      const key = `new-${crypto.randomUUID()}`;
      return { ...i, key, id: key, isNew: true, code: nextCode(), x: round(Math.min(1 - i.w, i.x + i.w + 0.004)) };
    });
    setItems((all) => [...all, ...copies]);
    setSelected(new Set(copies.map((c) => c.key)));
  }

  // keyboard: arrows nudge, Delete removes, R rotates, Ctrl+D duplicates, Esc clears
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("input, select, textarea") || readOnlyReason) return;
      if (selected.size === 0) return;
      const step = e.shiftKey ? 0.01 : 0.002;
      const move: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
      if (move[e.key]) {
        e.preventDefault();
        const [dx, dy] = move[e.key];
        patch(selected, (i) => ({ x: round(Math.min(1 - i.w, Math.max(0, i.x + dx))), y: round(Math.min(1 - i.h, Math.max(0, i.y + dy))) }));
      } else if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        removeSelected();
      } else if (e.key.toLowerCase() === "r") {
        patch(selected, (i) => ({ rotation: (i.rotation + (e.shiftKey ? -90 : 90) + 360) % 360 }));
      } else if (e.key.toLowerCase() === "d" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        duplicateSelected();
      } else if (e.key === "Escape") setSelected(new Set());
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function onSpacePointerDown(e: React.PointerEvent, item: Item) {
    if (readOnlyReason || tool !== "select") return;
    e.stopPropagation();
    const next = new Set(selected);
    if (e.shiftKey) {
      if (next.has(item.key)) next.delete(item.key);
      else next.add(item.key);
    } else if (!next.has(item.key)) {
      next.clear();
      next.add(item.key);
    }
    setSelected(next);
    const p = toRel(e.clientX, e.clientY);
    drag.current = { mode: "move", startX: p.x, startY: p.y, origin: new Map(items.filter((i) => next.has(i.key)).map((i) => [i.key, { x: i.x, y: i.y }])) };
    (e.currentTarget as SVGElement).setPointerCapture?.(e.pointerId);
  }

  function onHandlePointerDown(e: React.PointerEvent, item: Item) {
    e.stopPropagation();
    const p = toRel(e.clientX, e.clientY);
    drag.current = { mode: "resize", key: item.key, startX: p.x, startY: p.y, origin: { ...item } };
    (e.currentTarget as SVGElement).setPointerCapture?.(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    const d = drag.current;
    if (!d) return;
    const p = toRel(e.clientX, e.clientY);
    const dx = p.x - d.startX;
    const dy = p.y - d.startY;
    if (d.mode === "move") {
      setItems((all) =>
        all.map((i) => {
          const o = d.origin.get(i.key);
          return o ? { ...i, x: round(Math.min(1 - i.w, Math.max(0, o.x + dx))), y: round(Math.min(1 - i.h, Math.max(0, o.y + dy))) } : i;
        }),
      );
    } else {
      // resize in the space's local (rotated) frame, keeping the opposite corner fixed
      const o = d.origin;
      const th = (o.rotation * Math.PI) / 180;
      const dxv = dx * VB;
      const dyv = dy * H;
      const lw = dxv * Math.cos(th) + dyv * Math.sin(th);
      const lh = -dxv * Math.sin(th) + dyv * Math.cos(th);
      const wv = Math.max(4, o.w * VB + lw);
      const hv = Math.max(4, o.h * H + lh);
      const cxv = o.x * VB + (o.w * VB) / 2 + ((wv - o.w * VB) / 2) * Math.cos(th) - ((hv - o.h * H) / 2) * Math.sin(th);
      const cyv = o.y * H + (o.h * H) / 2 + ((wv - o.w * VB) / 2) * Math.sin(th) + ((hv - o.h * H) / 2) * Math.cos(th);
      patch([d.key], () => ({ w: round(wv / VB), h: round(hv / H), x: round(Math.max(0, (cxv - wv / 2) / VB)), y: round(Math.max(0, (cyv - hv / 2) / H)) }));
    }
  }

  function onCanvasPointerDown(e: React.PointerEvent) {
    if (readOnlyReason) return;
    if (tool === "add") {
      const p = toRel(e.clientX, e.clientY);
      addAt(p.x, p.y);
    } else setSelected(new Set());
  }

  function save() {
    start(async () => {
      const strip = (i: Item) => ({ code: i.code.trim(), type: i.type, status: i.status, sectorId: i.sectorId, x: i.x, y: i.y, w: i.w, h: i.h, rotation: i.rotation });
      const res = await saveEditorAction(floorId, { created: dirty.created.map(strip), updated: dirty.updated.map((i) => ({ id: i.id, ...strip(i) })), deleted });
      if (res.ok) {
        toast("Mapa salvo.");
        setDeleted([]);
        router.refresh();
      } else toast(res.fieldErrors ? (Object.values(res.fieldErrors).flat()[0] ?? res.error) : res.error, "error");
    });
  }

  function discard() {
    setItems(spaces.map((s) => ({ ...s, key: s.id, isNew: false })));
    setDeleted([]);
    setSelected(new Set());
  }

  const fillFor = (i: Item) => (colorBy === "sector" ? (i.sectorId ? (sectorById.get(i.sectorId)?.color ?? "#94a3b8") : "#cbd5e1") : SPACE_STATUS_STYLE[i.status].fill);

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_300px]">
      <div className="min-w-0">
        {/* Toolbar */}
        <div role="toolbar" aria-label="Ferramentas do editor" className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-asphalt-100 bg-white p-2">
          <div className="flex rounded-md border border-asphalt-200 p-0.5">
            <button type="button" aria-pressed={tool === "select"} onClick={() => setTool("select")} className={cn("flex h-8 items-center gap-1.5 rounded-sm px-2.5 text-sm font-semibold", tool === "select" ? "bg-ink-900 text-white" : "text-asphalt-600")} disabled={!!readOnlyReason}>
              <MousePointer2 className="size-4" aria-hidden /> Selecionar
            </button>
            <button type="button" aria-pressed={tool === "add"} onClick={() => setTool("add")} className={cn("flex h-8 items-center gap-1.5 rounded-sm px-2.5 text-sm font-semibold", tool === "add" ? "bg-ink-900 text-white" : "text-asphalt-600")} disabled={!!readOnlyReason}>
              <SquarePlus className="size-4" aria-hidden /> Adicionar vaga
            </button>
          </div>
          <Button size="sm" variant="ghost" onClick={() => setZoom((z) => Math.max(1, z - 0.25))} aria-label="Diminuir zoom">
            <ZoomOut className="size-4" aria-hidden />
          </Button>
          <span className="w-12 text-center text-sm tabular-nums text-asphalt-600">{Math.round(zoom * 100)}%</span>
          <Button size="sm" variant="ghost" onClick={() => setZoom((z) => Math.min(3, z + 0.25))} aria-label="Aumentar zoom">
            <ZoomIn className="size-4" aria-hidden />
          </Button>
          <label className="ml-1 flex items-center gap-2 text-sm text-asphalt-600">
            Colorir por
            <Select className="h-8 w-28 py-0 text-sm" value={colorBy} onChange={(e) => setColorBy(e.target.value as "status" | "sector")}>
              <option value="status">Status</option>
              <option value="sector">Setor</option>
            </Select>
          </label>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-sm text-asphalt-500" aria-live="polite">
              {dirty.count > 0 ? `${dirty.count} alteração(ões) não salvas` : `${items.length} vagas`}
            </span>
            <Button size="sm" variant="ghost" onClick={discard} disabled={dirty.count === 0 || pending}>
              <Undo2 className="size-4" aria-hidden /> Descartar
            </Button>
            <Button size="sm" onClick={save} loading={pending} disabled={dirty.count === 0 || !!readOnlyReason}>
              <Save className="size-4" aria-hidden /> Salvar mapa
            </Button>
          </div>
        </div>
        {readOnlyReason && <p className="mb-2 text-sm text-asphalt-500">{readOnlyReason}</p>}

        {/* Canvas */}
        <div className="overflow-auto rounded-lg border border-asphalt-200 bg-asphalt-50" style={{ maxHeight: "72vh" }}>
          <div className="relative" style={{ width: `${zoom * 100}%`, aspectRatio: `${1 / ratio}` }}>
            {imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageUrl} alt="Planta do piso" className="pointer-events-none absolute inset-0 h-full w-full select-none" draggable={false} />
            )}
            <svg
              ref={svgRef}
              viewBox={`0 0 ${VB} ${H}`}
              className={cn("absolute inset-0 h-full w-full touch-none", tool === "add" ? "cursor-crosshair" : "cursor-default")}
              onPointerDown={onCanvasPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={() => (drag.current = null)}
              onPointerLeave={() => (drag.current = null)}
              role="application"
              aria-label="Editor de vagas. Use a lista ao lado ou as setas do teclado para mover a vaga selecionada."
            >
              {elements.map((el) => (
                <rect key={el.id} x={el.x * VB} y={el.y * H} width={el.w * VB} height={el.h * H} fill={el.kind === "ENTRANCE" ? "rgba(47,128,72,.35)" : el.kind === "EXIT" ? "rgba(214,60,60,.35)" : el.kind === "CIRCULATION" ? "rgba(37,99,235,.06)" : "rgba(100,116,139,.2)"} stroke={el.kind === "CIRCULATION" ? "rgba(37,99,235,.25)" : "none"} strokeDasharray="6 4" pointerEvents="none">
                  <title>{el.label ?? el.kind}</title>
                </rect>
              ))}
              {items.map((i) => {
                const x = i.x * VB;
                const y = i.y * H;
                const w = i.w * VB;
                const h = i.h * H;
                const cx = x + w / 2;
                const cy = y + h / 2;
                const isSel = selected.has(i.key);
                return (
                  <g key={i.key} transform={`rotate(${i.rotation} ${cx} ${cy})`} onPointerDown={(e) => onSpacePointerDown(e, i)} className={tool === "select" && !readOnlyReason ? "cursor-move" : undefined}>
                    <title>{`${i.code} · ${SPACE_STATUS_LABEL[i.status]} · ${SPACE_TYPE_LABEL[i.type]}`}</title>
                    <rect x={x} y={y} width={w} height={h} rx={2} fill={fillFor(i)} fillOpacity={0.88} stroke={isSel ? "#0c2219" : "#fff"} strokeWidth={isSel ? 3 : 1.2} />
                    {i.status === "UNAVAILABLE" && colorBy === "status" && <line x1={x + 2} y1={y + 2} x2={x + w - 2} y2={y + h - 2} stroke="rgba(0,0,0,.45)" strokeWidth={1.5} />}
                    {i.type !== "COMMON" && (
                      <text x={cx} y={cy + 4} textAnchor="middle" fontSize={Math.min(w, h) * 0.4} fontWeight={700} fill="#fff" pointerEvents="none">
                        {i.type === "PCD" ? "♿" : i.type === "EV" ? "⚡" : i.type === "MOTO" ? "M" : "★"}
                      </text>
                    )}
                    {isSel && single?.key === i.key && !readOnlyReason && (
                      <rect x={x + w - 7} y={y + h - 7} width={14} height={14} rx={3} fill="#5CB874" stroke="#0c2219" strokeWidth={2} className="cursor-nwse-resize" onPointerDown={(e) => onHandlePointerDown(e, i)}>
                        <title>Arraste para redimensionar</title>
                      </rect>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
        <p className="mt-2 text-xs text-asphalt-500">
          Dicas: clique para selecionar (Shift para várias) · arraste para mover · alça verde redimensiona · setas movem (Shift = mais rápido) · R gira 90° · Ctrl/⌘+D duplica · Delete remove.
        </p>
      </div>

      {/* Inspector */}
      <aside className="rounded-lg border border-asphalt-100 bg-white p-4" aria-label="Propriedades da vaga">
        {selectedItems.length === 0 ? (
          <div className="space-y-3 text-sm text-asphalt-600">
            <p className="font-semibold text-ink-900">Nenhuma vaga selecionada</p>
            <p>Selecione uma vaga no mapa para editar nome, setor, tipo, status, posição e rotação.</p>
            <Button size="sm" variant="secondary" onClick={() => setTool("add")} disabled={!!readOnlyReason}>
              <Plus className="size-4" aria-hidden /> Adicionar vaga
            </Button>
            <div className="pt-2">
              <p className="mb-2 text-xs font-semibold text-asphalt-500 uppercase">Legenda</p>
              <ul className="space-y-1.5">
                {SPACE_STATUSES.map((s) => {
                  const st = SPACE_STATUS_STYLE[s];
                  return (
                    <li key={s} className="flex items-center gap-2">
                      <span className="size-3.5 rounded-sm" style={{ background: st.fill }} aria-hidden />
                      <st.Icon className={`size-4 ${st.text}`} aria-hidden /> {SPACE_STATUS_LABEL[s]}
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="font-semibold text-ink-900">{single ? `Vaga ${single.code}` : `${selectedItems.length} vagas selecionadas`}</p>
            {single && (
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-asphalt-500">Nome</span>
                <Input value={single.code} maxLength={20} onChange={(e) => patch([single.key], () => ({ code: e.target.value }))} disabled={!!readOnlyReason} />
              </label>
            )}
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-asphalt-500">Setor</span>
              <Select
                value={single ? (single.sectorId ?? "__none__") : ""}
                onChange={(e) => {
                  if (e.target.value === "") return; // "keep" option for multi-selection
                  const v = e.target.value === "__none__" ? null : e.target.value;
                  setLastSector(v);
                  patch(selected, () => ({ sectorId: v }));
                }}
                disabled={!!readOnlyReason}
              >
                {!single && <option value="">— manter —</option>}
                <option value="__none__">Sem setor</option>
                {sectors.map((s) => (
                  <option key={s.id} value={s.id}>
                    Setor {s.name}
                  </option>
                ))}
              </Select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-asphalt-500">Tipo</span>
              <Select value={single?.type ?? ""} onChange={(e) => e.target.value && patch(selected, () => ({ type: e.target.value as SpaceType }))} disabled={!!readOnlyReason}>
                {!single && <option value="">— manter —</option>}
                {SPACE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {SPACE_TYPE_LABEL[t]}
                  </option>
                ))}
              </Select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-asphalt-500">Status</span>
              <Select value={single?.status ?? ""} onChange={(e) => e.target.value && patch(selected, () => ({ status: e.target.value as SpaceStatus }))} disabled={!!readOnlyReason}>
                {!single && <option value="">— manter —</option>}
                {SPACE_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {SPACE_STATUS_LABEL[s]}
                  </option>
                ))}
              </Select>
            </label>
            {single && (
              <div className="grid grid-cols-2 gap-2">
                {(["x", "y", "w", "h"] as const).map((k) => (
                  <label key={k} className="block">
                    <span className="mb-1 block text-xs font-semibold text-asphalt-500">{k === "x" ? "Posição X" : k === "y" ? "Posição Y" : k === "w" ? "Largura" : "Altura"} (%)</span>
                    <Input type="number" step="0.1" value={round(single[k] * 100)} onChange={(e) => patch([single.key], () => ({ [k]: Math.max(0, Math.min(100, Number(e.target.value))) / 100 }))} disabled={!!readOnlyReason} />
                  </label>
                ))}
              </div>
            )}
            <div>
              <span className="mb-1 block text-xs font-semibold text-asphalt-500">Rotação {single ? `(${single.rotation}°)` : ""}</span>
              <div className="flex gap-1.5">
                <Button size="sm" variant="secondary" onClick={() => patch(selected, (i) => ({ rotation: (i.rotation + 345) % 360 }))} aria-label="Girar 15° anti-horário" disabled={!!readOnlyReason}>
                  <RotateCcw className="size-4" aria-hidden />
                </Button>
                <Button size="sm" variant="secondary" onClick={() => patch(selected, (i) => ({ rotation: (i.rotation + 15) % 360 }))} aria-label="Girar 15° horário" disabled={!!readOnlyReason}>
                  <RotateCw className="size-4" aria-hidden />
                </Button>
                <Button size="sm" variant="secondary" onClick={() => patch(selected, (i) => ({ rotation: (i.rotation + 90) % 360 }))} disabled={!!readOnlyReason}>
                  90°
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 border-t border-asphalt-100 pt-3">
              <Button size="sm" variant="secondary" onClick={duplicateSelected} disabled={!!readOnlyReason}>
                <Copy className="size-4" aria-hidden /> Duplicar
              </Button>
              <Button size="sm" variant="ghost" className="text-danger" onClick={removeSelected} disabled={!!readOnlyReason}>
                <Trash2 className="size-4" aria-hidden /> Remover
              </Button>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
