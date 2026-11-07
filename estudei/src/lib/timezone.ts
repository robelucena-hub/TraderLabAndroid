/**
 * Converts between instants and "wall clock" values of <input type="datetime-local">
 * in a given IANA time zone. Using the user's saved time zone on both server
 * and browser keeps the rendered value identical (no hydration mismatch).
 */

interface WallTime {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

const formatters = new Map<string, Intl.DateTimeFormat>();

function wallTime(date: Date, timeZone: string): WallTime {
  let formatter = formatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    formatters.set(timeZone, formatter);
  }
  const parts = Object.fromEntries(formatter.formatToParts(date).map((p) => [p.type, p.value]));
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

/** Offset of `timeZone` from UTC at `date`, in ms (São Paulo → -3h). */
function offsetMs(date: Date, timeZone: string): number {
  const w = wallTime(date, timeZone);
  const asUtc = Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute, w.second);
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/** Instant → "YYYY-MM-DDTHH:mm" as seen on a clock in `timeZone`. */
export function toZonedInputValue(date: Date, timeZone: string): string {
  const w = wallTime(date, timeZone);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${w.year}-${pad(w.month)}-${pad(w.day)}T${pad(w.hour)}:${pad(w.minute)}`;
}

/** "YYYY-MM-DDTHH:mm" on a clock in `timeZone` → instant. Null if malformed. */
export function fromZonedInputValue(value: string, timeZone: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value);
  if (!match) return null;
  const [, y, mo, d, h, mi] = match.map(Number);
  const naive = Date.UTC(y, mo - 1, d, h, mi);
  // First guess with the offset at the naive instant, then correct once in
  // case a DST change happens between the two.
  let instant = naive - offsetMs(new Date(naive), timeZone);
  const corrected = naive - offsetMs(new Date(instant), timeZone);
  if (corrected !== instant) instant = corrected;
  return new Date(instant);
}
