/** `priceCents` holds whole won despite its name: 65000 → ₩65,000. */
export function formatPrice(won: number) {
  return `₩${won.toLocaleString("ko-KR")}`;
}

type DateInput = Date | number | string | null | undefined;

// Slot times are stored as UTC-encoded wall-clock time (see `getAvailableSlots`),
// so always format in UTC. This also keeps server and client renders identical.
const longDateFormat = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});
const mediumDateFormat = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
  timeZone: "UTC",
});
const timeFormat = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
  timeZone: "UTC",
});
const shortDateTimeFormat = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "UTC",
});

function toDate(value: DateInput) {
  if (value === null || value === undefined || value === "") return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatWith(format: Intl.DateTimeFormat, value: DateInput, fallback: string) {
  const date = toDate(value);
  return date ? format.format(date) : fallback;
}

/** "Friday, October 30, 2026" */
export function formatSlotDate(value: DateInput, fallback = "Date to be confirmed") {
  return formatWith(longDateFormat, value, fallback);
}

/** "Friday, October 30" */
export function formatSlotDay(value: DateInput, fallback = "your chosen day") {
  return formatWith(mediumDateFormat, value, fallback);
}

/** "10:00 AM" */
export function formatSlotTime(value: DateInput, fallback = "Time to be confirmed") {
  return formatWith(timeFormat, value, fallback);
}

/** "Fri, Oct 30, 10:00 AM" */
export function formatSlotDateTime(value: DateInput, fallback = "Time to be confirmed") {
  return formatWith(shortDateTimeFormat, value, fallback);
}
