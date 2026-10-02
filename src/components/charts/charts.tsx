"use client";

import { useId, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Table2 } from "lucide-react";
import { formatMoney, formatNumber, formatPercent } from "@/lib/format";

/** Validated chart palette (see dataviz validator): fixed order, never cycled. */
export const CHART_COLORS = { primary: "#3f9e5a", secondary: "#2563eb", tertiary: "#d97706", remainder: "#d7ddda" } as const;

export type ValueFormat = "money" | "number" | "percent";
const fmt = (v: number, f: ValueFormat) => (f === "money" ? formatMoney(v) : f === "percent" ? formatPercent(v) : formatNumber(v));
const fmtAxis = (v: number, f: ValueFormat) =>
  f === "money" ? (v >= 100000 ? `R$ ${Math.round(v / 100000)} mil` : `R$ ${Math.round(v / 100)}`) : f === "percent" ? `${Math.round(v * 100)}%` : formatNumber(v);

const axisProps = { stroke: "#b9c2be", tick: { fill: "#67736e", fontSize: 12 }, tickLine: false, axisLine: false } as const;

function ChartTooltip({ active, payload, label, format }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string; format: ValueFormat }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-asphalt-100 bg-white px-3 py-2 text-sm shadow-md">
      <p className="mb-1 font-semibold text-ink-900">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="flex items-center gap-2 text-asphalt-700">
          <span className="size-2.5 rounded-full" style={{ background: p.color }} aria-hidden />
          {payload.length > 1 && <span>{p.name}:</span>}
          <span className="font-semibold tabular-nums">{fmt(p.value, format)}</span>
        </p>
      ))}
    </div>
  );
}

type Series = { key: string; label: string; color?: string };

type ChartProps = {
  data: Array<Record<string, string | number>>;
  xKey: string;
  series: Series[];
  format: ValueFormat;
  kind?: "bar" | "area";
  stacked?: boolean;
  height?: number;
  title: string;
};

/** Accessible chart: hover tooltips + a toggleable data table (identity never by color alone). */
export function Chart({ data, xKey, series, format, kind = "bar", stacked, height = 240, title }: ChartProps) {
  const [table, setTable] = useState(false);
  const gid = useId().replace(/:/g, "");
  const empty = data.length === 0 || data.every((d) => series.every((s) => !Number(d[s.key])));
  return (
    <figure>
      <figcaption className="sr-only">{title}</figcaption>
      <div className="mb-2 flex justify-end">
        <button type="button" onClick={() => setTable((t) => !t)} className="inline-flex items-center gap-1.5 rounded-sm px-2 py-1 text-xs font-semibold text-asphalt-500 hover:bg-asphalt-50 hover:text-ink-900" aria-pressed={table}>
          <Table2 className="size-3.5" aria-hidden /> {table ? "Ver gráfico" : "Ver tabela"}
        </button>
      </div>
      {empty ? (
        <div className="grid place-items-center rounded-md border border-dashed border-asphalt-200 text-sm text-asphalt-500" style={{ height }}>
          Sem dados no período selecionado.
        </div>
      ) : table ? (
        <div className="max-h-72 overflow-auto rounded-md border border-asphalt-100">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-asphalt-25 text-left text-xs text-asphalt-500">
              <tr>
                <th className="px-3 py-2">Período</th>
                {series.map((s) => (
                  <th key={s.key} className="px-3 py-2 text-right">
                    {s.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((d, i) => (
                <tr key={i} className="border-t border-asphalt-100">
                  <td className="px-3 py-1.5">{d[xKey]}</td>
                  {series.map((s) => (
                    <td key={s.key} className="px-3 py-1.5 text-right tabular-nums">
                      {fmt(Number(d[s.key]), format)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ height }} aria-hidden>
          <ResponsiveContainer width="100%" height="100%">
            {kind === "area" ? (
              <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <defs>
                  {series.map((s, i) => (
                    <linearGradient key={s.key} id={`${gid}-${i}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={s.color ?? CHART_COLORS.primary} stopOpacity={0.12} />
                      <stop offset="100%" stopColor={s.color ?? CHART_COLORS.primary} stopOpacity={0.02} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid vertical={false} stroke="#e9edeb" />
                <XAxis dataKey={xKey} {...axisProps} minTickGap={24} />
                <YAxis {...axisProps} width={64} tickFormatter={(v) => fmtAxis(v, format)} />
                <Tooltip content={<ChartTooltip format={format} />} cursor={{ stroke: "#8c9893", strokeWidth: 1 }} />
                {series.length > 1 && <Legend iconType="circle" wrapperStyle={{ fontSize: 12, color: "#4c5753" }} />}
                {series.map((s, i) => (
                  <Area key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={s.color ?? CHART_COLORS.primary} strokeWidth={2} fill={`url(#${gid}-${i})`} activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff" }} stackId={stacked ? "a" : undefined} isAnimationActive={false} />
                ))}
              </AreaChart>
            ) : (
              <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barCategoryGap="25%">
                <CartesianGrid vertical={false} stroke="#e9edeb" />
                <XAxis dataKey={xKey} {...axisProps} minTickGap={12} />
                <YAxis {...axisProps} width={64} tickFormatter={(v) => fmtAxis(v, format)} />
                <Tooltip content={<ChartTooltip format={format} />} cursor={{ fill: "rgba(23,56,42,0.05)" }} />
                {series.length > 1 && <Legend iconType="circle" wrapperStyle={{ fontSize: 12, color: "#4c5753" }} />}
                {series.map((s, i) => (
                  <Bar
                    key={s.key}
                    dataKey={s.key}
                    name={s.label}
                    fill={s.color ?? CHART_COLORS.primary}
                    maxBarSize={24}
                    isAnimationActive={false}
                    stackId={stacked ? "a" : undefined}
                    radius={stacked ? (i === series.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]) : [4, 4, 0, 0]}
                    stroke={stacked ? "#fff" : undefined}
                    strokeWidth={stacked ? 2 : 0}
                  />
                ))}
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      )}
    </figure>
  );
}
