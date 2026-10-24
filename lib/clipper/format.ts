/** `priceCents` holds whole won despite its name: 65000 → ₩65,000. */
export function formatPrice(won: number) {
  return `₩${won.toLocaleString("ko-KR")}`;
}

type DateInput = Date | number | string | null | undefined;

// Slot times are stored as UTC-encoded wall-clock time (see `getAvailableSlots`),
// so always format in UTC. This also keeps server and client renders identical.
function utcFormat(options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("en-US", { ...options, timeZone: "UTC" });
}

const longDay = { weekday: "long", month: "long", day: "numeric" } as const;
const shortDay = { weekday: "short", month: "short", day: "numeric" } as const;
const time = { hour: "numeric", minute: "2-digit" } as const;

const longDateFormat = utcFormat({ ...longDay, year: "numeric" });
const longDayFormat = utcFormat(longDay);
const shortDayFormat = utcFormat(shortDay);
const timeFormat = utcFormat(time);
const shortDateTimeFormat = utcFormat({ ...shortDay, ...time });

/** Formats `value`, or returns null when it is missing or not a valid date. Callers pick their own fallback copy. */
function formatWith(format: Intl.DateTimeFormat, value: DateInput) {
  if (value === null || value === undefined) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : format.format(date);
}

/** "Friday, October 30, 2026" */
export function formatSlotDate(value: DateInput) {
  return formatWith(longDateFormat, value);
}

/** "Friday, October 30" */
export function formatSlotDay(value: DateInput) {
  return formatWith(longDayFormat, value);
}

/** "Fri, Oct 30" */
export function formatSlotShortDay(value: DateInput) {
  return formatWith(shortDayFormat, value);
}

/** "10:00 AM" */
export function formatSlotTime(value: DateInput) {
  return formatWith(timeFormat, value);
}

/** "Fri, Oct 30, 10:00 AM" */
export function formatSlotDateTime(value: DateInput) {
  return formatWith(shortDateTimeFormat, value);
}
