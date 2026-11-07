/**
 * pt-BR formatting helpers. Every date function takes the user's time zone
 * explicitly, so the server and the browser produce identical strings
 * (no hydration mismatches) and "hoje" means the user's today.
 */

const LOCALE = "pt-BR";

export function formatPercent(percent: number): string {
  return `${Math.round(percent)}%`;
}

/** 1.4427 → "1,4" */
export function formatDecimal(value: number, maximumFractionDigits = 1): string {
  return value.toLocaleString(LOCALE, { maximumFractionDigits });
}

export function plural(count: number, singular: string, pluralForm: string): string {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

/** 1 → "1 dia", 1.44 → "1,4 dias" (one decimal, pt-BR). */
export function formatDays(days: number): string {
  const rounded = Math.round(days * 10) / 10;
  return `${formatDecimal(rounded)} ${rounded === 1 ? "dia" : "dias"}`;
}

function formatter(timeZone: string, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat(LOCALE, { timeZone, ...options });
}

/** "07/11/2026" */
export function formatDate(date: Date | string, timeZone: string): string {
  return formatter(timeZone, { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(date));
}

/** "07/11/2026 às 14:30" */
export function formatDateTime(date: Date | string, timeZone: string): string {
  const d = new Date(date);
  const time = formatter(timeZone, { hour: "2-digit", minute: "2-digit" }).format(d);
  return `${formatDate(d, timeZone)} às ${time}`;
}

/** "07/11" */
export function formatDayMonth(date: Date | string, timeZone: string): string {
  return formatter(timeZone, { day: "2-digit", month: "2-digit" }).format(new Date(date));
}

/** "sábado, 7 de novembro" */
export function formatLongDate(date: Date | string, timeZone: string): string {
  return formatter(timeZone, { weekday: "long", day: "numeric", month: "long" }).format(new Date(date));
}

/** Relative calendar day: "hoje", "amanhã", "ontem", "em 3 dias", "há 3 dias". */
export function relativeDay(days: number): string {
  if (days === 0) return "hoje";
  if (days === 1) return "amanhã";
  if (days === -1) return "ontem";
  return days > 1 ? `em ${days} dias` : `há ${-days} dias`;
}

/** Label for a review's due date given calendar days until it (negative = overdue). */
export function dueLabel(daysUntilDue: number): string {
  if (daysUntilDue < 0) {
    return `Atrasada há ${plural(-daysUntilDue, "dia", "dias")}`;
  }
  if (daysUntilDue === 0) return "Revisar hoje";
  if (daysUntilDue === 1) return "Revisar amanhã";
  return `Revisar em ${daysUntilDue} dias`;
}

/** "Estudado hoje", "Estudado ontem", "Estudado há 4 dias" */
export function lastStudiedLabel(daysSince: number): string {
  if (daysSince <= 0) return "Estudado hoje";
  if (daysSince === 1) return "Estudado ontem";
  return `Estudado há ${daysSince} dias`;
}

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}
