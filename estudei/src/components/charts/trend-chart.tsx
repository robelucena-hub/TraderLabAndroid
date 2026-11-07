"use client";

import { Area, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatDayMonth, formatPercent, plural } from "@/lib/format";
import type { TrendPointDTO } from "@/lib/types";
import { ChartTooltipBox, LineKey, axisTick, bandZones, gridStroke, percentTicks } from "./chart-parts";

interface Datum {
  offset: number;
  date: string;
  topics: number;
  history: number | null;
  projection: number | null;
}

const PRIMARY = "var(--primary)";

/**
 * Average retention of all topics: the last 30 days (replayed from the review
 * history) and the next 30 days (projection if no review is done).
 */
export function TrendChart({ points, timeZone }: { points: TrendPointDTO[]; timeZone: string }) {
  const data: Datum[] = points.map((p) => ({
    offset: p.offsetDays,
    date: p.date,
    topics: p.topicCount,
    history: p.offsetDays <= 0 ? p.averagePercent : null,
    projection: p.offsetDays >= 0 ? p.averagePercent : null,
  }));
  const byOffset = new Map(data.map((d) => [d.offset, d]));
  const hasData = points.some((p) => p.averagePercent !== null);

  if (!hasData) {
    return (
      <p className="flex h-60 items-center justify-center text-center text-sm text-muted-foreground">
        O gráfico aparece assim que você cadastrar o primeiro tópico.
      </p>
    );
  }

  return (
    <div>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
            {bandZones()}
            <CartesianGrid vertical={false} stroke={gridStroke} />
            <XAxis
              dataKey="offset"
              type="number"
              domain={[-30, 30]}
              ticks={[-30, -15, 0, 15, 30]}
              tickFormatter={(offset: number) =>
                offset === 0 ? "Hoje" : formatDayMonth(byOffset.get(offset)?.date ?? "", timeZone)
              }
              tick={axisTick}
              tickLine={false}
              axisLine={{ stroke: gridStroke }}
            />
            <YAxis
              domain={[0, 100]}
              ticks={percentTicks}
              tickFormatter={(v: number) => `${v}%`}
              tick={axisTick}
              tickLine={false}
              axisLine={false}
              width={44}
            />
            <ReferenceLine x={0} stroke="var(--muted-foreground)" strokeOpacity={0.5} />
            <Tooltip
              cursor={{ stroke: "var(--muted-foreground)", strokeWidth: 1 }}
              content={({ active, label }) => {
                const d = active ? byOffset.get(Number(label)) : undefined;
                if (!d) return null;
                const value = d.history ?? d.projection;
                const when = d.offset === 0 ? "Hoje" : formatDayMonth(d.date, timeZone);
                return (
                  <ChartTooltipBox
                    title={`${when} · ${plural(d.topics, "tópico", "tópicos")}`}
                    rows={[
                      {
                        key: "v",
                        label: d.offset > 0 ? "projeção" : "média real",
                        value: value === null ? "—" : formatPercent(value),
                        color: PRIMARY,
                        dashed: d.offset > 0,
                      },
                    ]}
                  />
                );
              }}
            />
            <Area
              type="monotone"
              dataKey="history"
              stroke={PRIMARY}
              strokeWidth={2}
              fill={PRIMARY}
              fillOpacity={0.1}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)" }}
              connectNulls={false}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="projection"
              stroke={PRIMARY}
              strokeWidth={2}
              strokeDasharray="5 4"
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)" }}
              connectNulls={false}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <LineKey color={PRIMARY} /> Média real (últimos 30 dias)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <LineKey color={PRIMARY} dashed /> Projeção se você parar de revisar
        </span>
      </div>

      <details className="mt-3 text-sm">
        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Ver dados em tabela</summary>
        <div className="mt-2 max-h-64 overflow-y-auto rounded-md border">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-muted text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Data</th>
                <th className="px-3 py-2 font-medium">Retenção média</th>
                <th className="px-3 py-2 font-medium">Tópicos</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {data.map((d) => {
                const value = d.history ?? d.projection;
                return (
                  <tr key={d.offset} className="border-t">
                    <td className="px-3 py-1.5">
                      {d.offset === 0 ? "Hoje" : formatDayMonth(d.date, timeZone)}
                      {d.offset > 0 && <span className="text-muted-foreground"> (projeção)</span>}
                    </td>
                    <td className="px-3 py-1.5">{value === null ? "—" : formatPercent(value)}</td>
                    <td className="px-3 py-1.5">{d.topics}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
