import { ReferenceArea } from "recharts";
import { BAND_STYLES } from "@/components/retention/band-styles";
import { RETENTION_BANDS } from "@/lib/forgetting-curve";

/** Shared axis / grid styling: hairline, solid, recessive. */
export const axisTick = { fill: "var(--muted-foreground)", fontSize: 12 };
export const gridStroke = "var(--chart-grid)";
export const percentTicks = [0, 20, 40, 60, 80, 100];

/**
 * Faint horizontal zones in each band's colour, so the chart speaks the same
 * colour language as the cards. Returned as an array (not a component) so
 * Recharts sees the ReferenceArea elements directly.
 */
export function bandZones() {
  return RETENTION_BANDS.map((band) => (
    <ReferenceArea
      key={band.id}
      y1={band.min === 0 ? 0 : band.min - 0.5}
      y2={band.max === 100 ? 100 : band.max + 0.5}
      fill={BAND_STYLES[band.id].color}
      fillOpacity={0.08}
      strokeOpacity={0}
      ifOverflow="hidden"
    />
  ));
}

interface TooltipRow {
  key: string;
  label: string;
  value: string;
  color: string;
  dashed?: boolean;
}

/** Tooltip body: values lead (strong), labels follow; series keyed by a short line. */
export function ChartTooltipBox({ title, rows }: { title: string; rows: TooltipRow[] }) {
  return (
    <div className="min-w-44 rounded-lg border bg-popover px-3 py-2 text-popover-foreground shadow-md">
      <div className="mb-1.5 text-xs text-muted-foreground">{title}</div>
      <ul className="grid gap-1">
        {rows.map((row) => (
          <li key={row.key} className="flex items-center gap-2 text-sm">
            <LineKey color={row.color} dashed={row.dashed} />
            <span className="font-semibold tabular-nums">{row.value}</span>
            <span className="text-muted-foreground">{row.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function LineKey({ color, dashed = false }: { color: string; dashed?: boolean }) {
  return (
    <svg width="18" height="6" aria-hidden className="shrink-0">
      <line
        x1="1"
        y1="3"
        x2="17"
        y2="3"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray={dashed ? "4 3" : undefined}
      />
    </svg>
  );
}
