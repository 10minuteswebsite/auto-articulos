/**
 * «Día» del cupo de publicaciones: corta a medianoche de Florida (America/New_York, con horario de
 * verano), no a medianoche UTC (8 p. m. en Florida). Decisión de Milton, 2026-10-12. Sin imports de
 * servidor: lo usan la web, el worker y la pantalla de Redes.
 */
export const SOCIAL_DAY_TIMEZONE = "America/New_York";

/** Diferencia (ms) entre la hora local de la zona y UTC en el instante dado. */
function zoneOffsetMs(ts: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(ts));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return asUtc - Math.floor(ts / 1000) * 1000;
}

/** Instante (UTC) en que empezó el día de Florida que contiene `now`. */
export function startOfSocialDay(now: Date = new Date(), timeZone: string = SOCIAL_DAY_TIMEZONE): Date {
  const local = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  const [y, m, d] = local.split("-").map(Number);
  const guess = Date.UTC(y, m - 1, d, 0, 0, 0);
  let start = guess - zoneOffsetMs(guess, timeZone);
  const corrected = guess - zoneOffsetMs(start, timeZone);
  if (corrected !== start) start = corrected;
  return new Date(start);
}

/** Instante (UTC) en que empezó el mes de Florida que contiene `now`. */
export function startOfSocialMonth(now: Date = new Date(), timeZone: string = SOCIAL_DAY_TIMEZONE): Date {
  const local = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  return startOfSocialDay(new Date(`${local.slice(0, 7)}-01T12:00:00Z`), timeZone);
}
