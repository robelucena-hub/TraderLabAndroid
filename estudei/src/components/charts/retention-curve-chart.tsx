"use client";

import { Area, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  addDays,
  elapsedDays,
  memoryStrength,
  projectRetention,
  retentionAfter,
  toPercent,
} from "@/lib/forgetting-curve";
import { formatDayMonth, formatPercent, relativeDay } from "@/lib/format";
import { ChartTooltipBox, LineKey, axisTick, bandZones, gridStroke, percentTicks } from "./chart-parts";

interface RetentionCurveChartProps {
  lastReviewedAt: Date;
  strength: number;
  nextReviewAt: Date;
  reviewCount: number;
  now: Date;
  timeZone: string;
}

const PRIMARY = "var(--primary)";
const IF_REVIEWED = "var(--muted-foreground)";
const DAYS = 30;
const TABLE_DAYS = [0, 1, 2, 3, 5, 7, 10, 15, 20, 30];

/**
 * The topic's forgetting curve for the next 30 days, compared with the curve it
 * would follow if reviewed right now (one step up the ladder = slower decay).
 */
export function RetentionCurveChart({
  lastReviewedAt,
  strength,
  nextReviewAt,
  reviewCount,
  now,
  timeZone,
}: RetentionCurveChartProps) {
  const strengthIfReviewed = memoryStrength(reviewCount + 1);
  const data = projectRetention({ lastReviewedAt, strength }, now, DAYS, 4).map((point) => ({
    day: point.day,
    current: Math.round(point.retention * 1000) / 10,
    ifReviewed: Math.round(retentionAfter(point.day, strengthIfReviewed) * 1000) / 10,
  }));
  const reviewDay = elapsedDays(now, nextReviewAt);
  const showReviewMarker = reviewDay > 0 && reviewDay <= DAYS;

  const dayLabel = (day: number) => (day === 0 ? "Hoje" : formatDayMonth(addDays(now, day), timeZone));

  return (
    <div>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 20, right: 12, bottom: 0, left: 0 }}>
            {bandZones()}
            <CartesianGrid vertical={false} stroke={gridStroke} />
            <XAxis
              dataKey="day"
              type="number"
              domain={[0, DAYS]}
              ticks={[0, 5, 10, 15, 20, 25, 30]}
              tickFormatter={dayLabel}
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
            {showReviewMarker && (
              <ReferenceLine
                x={reviewDay}
                stroke="var(--foreground)"
                strokeOpacity={0.45}
                label={{ value: "Revisão sugerida", position: "top", fill: "var(--muted-foreground)", fontSize: 11 }}
              />
            )}
            <Tooltip
              cursor={{ stroke: "var(--muted-foreground)", strokeWidth: 1 }}
              content={({ active, payload }) => {
                const d = active ? payload?.[0]?.payload : undefined;
                if (!d) return null;
                const whole = Math.round(d.day);
                return (
                  <ChartTooltipBox
                    title={`${dayLabel(d.day)}${whole > 0 ? ` (${relativeDay(whole)})` : ""}`}
                    rows={[
                      { key: "c", label: "sem revisar", value: formatPercent(d.current), color: PRIMARY },
                      {
                        key: "r",
                        label: "se revisar hoje",
                        value: formatPercent(d.ifReviewed),
                        color: IF_REVIEWED,
                        dashed: true,
                      },
                    ]}
                  />
                );
              }}
            />
            <Line
              type="monotone"
              dataKey="ifReviewed"
              stroke={IF_REVIEWED}
              strokeWidth={2}
              strokeDasharray="5 4"
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)" }}
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="current"
              stroke={PRIMARY}
              strokeWidth={2}
              fill={PRIMARY}
              fillOpacity={0.1}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)" }}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <LineKey color={PRIMARY} /> Sem revisar
        </span>
        <span className="inline-flex items-center gap-1.5">
          <LineKey color={IF_REVIEWED} dashed /> Se você revisar hoje
        </span>
        {reviewDay <= 0 && <span>A data sugerida já chegou: revise para reiniciar a curva.</span>}
      </div>

      <details className="mt-3 text-sm">
        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Ver dados em tabela</summary>
        <div className="mt-2 overflow-x-auto rounded-md border">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Dia</th>
                <th className="px-3 py-2 font-medium">Sem revisar</th>
                <th className="px-3 py-2 font-medium">Se revisar hoje</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {TABLE_DAYS.map((day) => (
                <tr key={day} className="border-t">
                  <td className="px-3 py-1.5">{dayLabel(day)}</td>
                  <td className="px-3 py-1.5">
                    {toPercent(retentionAfter(elapsedDays(lastReviewedAt, addDays(now, day)), strength))}%
                  </td>
                  <td className="px-3 py-1.5">{toPercent(retentionAfter(day, strengthIfReviewed))}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
