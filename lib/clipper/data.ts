import {
  and,
  desc,
  eq,
  gt,
  inArray,
  lt,
  ne,
} from "drizzle-orm";

import {
  appointments,
  groomerSchedules,
  groomerServiceAreas,
  groomers,
  groomingPackages,
} from "@/db/schema";

import { getDatabase } from "./db";
import type {
  AppointmentDetails,
  BookingOption,
  BookingSlot,
} from "./types";

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const SLOT_DAYS = 7;

export async function getBookingOptions(): Promise<BookingOption> {
  const db = getDatabase();

  const [packageRows, neighborhoodRows, slots] = await Promise.all([
    db.select().from(groomingPackages),
    db
      .selectDistinct({ neighborhood: groomerServiceAreas.neighborhood })
      .from(groomerServiceAreas)
      .orderBy(groomerServiceAreas.neighborhood),
    getAvailableSlots(),
  ]);

  return {
    packages: packageRows,
    neighborhoods: neighborhoodRows.map((row) => row.neighborhood),
    slots,
  };
}

/**
 * Hourly start times over the next `SLOT_DAYS` days (starting tomorrow) where
 * at least one active groomer is scheduled and free for an hour. Uses the same
 * UTC convention as `findAvailableGroomer`, which still does the final check
 * for neighborhood and package length at booking time.
 */
async function getAvailableSlots(): Promise<BookingSlot[]> {
  const days = SLOT_DAYS;
  const db = getDatabase();
  const today = new Date();
  const windowStart = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()) +
      DAY_MS,
  );
  const windowEnd = new Date(windowStart.getTime() + days * DAY_MS);

  const [schedules, booked] = await Promise.all([
    db
      .select({
        groomerId: groomerSchedules.groomerId,
        weekday: groomerSchedules.weekday,
        startTime: groomerSchedules.startTime,
        endTime: groomerSchedules.endTime,
      })
      .from(groomerSchedules)
      .innerJoin(groomers, eq(groomers.id, groomerSchedules.groomerId))
      .where(
        and(eq(groomerSchedules.available, true), eq(groomers.active, true)),
      ),
    db
      .select({
        groomerId: appointments.groomerId,
        startsAt: appointments.startsAt,
        endsAt: appointments.endsAt,
      })
      .from(appointments)
      .where(
        and(
          lt(appointments.startsAt, windowEnd),
          gt(appointments.endsAt, windowStart),
          ne(appointments.status, "cancelled"),
        ),
      ),
  ]);

  const bookedByGroomer = new Map<string, { start: number; end: number }[]>();
  for (const appointment of booked) {
    if (!appointment.groomerId) continue;
    const list = bookedByGroomer.get(appointment.groomerId) ?? [];
    list.push({
      start: appointment.startsAt.getTime(),
      end: appointment.endsAt.getTime(),
    });
    bookedByGroomer.set(appointment.groomerId, list);
  }

  const isBusy = (groomerId: string, start: number, end: number) =>
    (bookedByGroomer.get(groomerId) ?? []).some(
      (booking) => booking.start < end && booking.end > start,
    );

  const starts = new Set<number>();
  for (let day = 0; day < days; day++) {
    const dayStart = windowStart.getTime() + day * DAY_MS;
    const weekday = new Date(dayStart).getUTCDay();

    for (const schedule of schedules) {
      if (schedule.weekday !== weekday) continue;
      const open = dayStart + minutesOf(schedule.startTime) * MINUTE_MS;
      const close = dayStart + minutesOf(schedule.endTime) * MINUTE_MS;

      for (let start = open; start + HOUR_MS <= close; start += HOUR_MS) {
        if (!starts.has(start) && !isBusy(schedule.groomerId, start, start + HOUR_MS)) {
          starts.add(start);
        }
      }
    }
  }

  return [...starts]
    .sort((a, b) => a - b)
    .map((start) => ({ startsAt: new Date(start).toISOString() }));
}

function minutesOf(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

export async function getAppointmentByReference(
  reference: string,
): Promise<AppointmentDetails | null> {
  const db = getDatabase();
  const rows = await db
    .select({
      appointment: appointments,
      groomer: groomers,
      groomingPackage: groomingPackages,
    })
    .from(appointments)
    .leftJoin(groomers, eq(appointments.groomerId, groomers.id))
    .innerJoin(
      groomingPackages,
      eq(appointments.packageId, groomingPackages.id),
    )
    .where(eq(appointments.bookingReference, reference))
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  return {
    ...row.appointment,
    reference: row.appointment.bookingReference,
    pet: { name: row.appointment.petName, breed: row.appointment.petBreed },
    groomer: row.groomer,
    package: row.groomingPackage,
    startsAt: row.appointment.startsAt.toISOString(),
    endsAt: row.appointment.endsAt.toISOString(),
    createdAt: row.appointment.createdAt.toISOString(),
    updatedAt: row.appointment.updatedAt.toISOString(),
  };
}

export async function getAppointments(): Promise<AppointmentDetails[]> {
  const db = getDatabase();
  const rows = await db
    .select({
      appointment: appointments,
      groomer: groomers,
      groomingPackage: groomingPackages,
    })
    .from(appointments)
    .leftJoin(groomers, eq(appointments.groomerId, groomers.id))
    .innerJoin(groomingPackages, eq(appointments.packageId, groomingPackages.id))
    .orderBy(desc(appointments.startsAt));

  return rows.map((row) => ({
    ...row.appointment,
    reference: row.appointment.bookingReference,
    pet: { name: row.appointment.petName, breed: row.appointment.petBreed },
    groomer: row.groomer,
    package: row.groomingPackage,
    startsAt: row.appointment.startsAt.toISOString(),
    endsAt: row.appointment.endsAt.toISOString(),
    createdAt: row.appointment.createdAt.toISOString(),
    updatedAt: row.appointment.updatedAt.toISOString(),
  }));
}

export async function findAvailableGroomer(
  neighborhood: string,
  startsAt: Date,
  endsAt: Date,
  excludeAppointmentId?: string,
): Promise<string | null> {
  const db = getDatabase();
  const weekday = startsAt.getUTCDay();
  const requestedStart = timeOfDay(startsAt);
  const requestedEnd = timeOfDay(endsAt);

  const scheduledGroomers = await db
    .select({
      groomerId: groomers.id,
      startTime: groomerSchedules.startTime,
      endTime: groomerSchedules.endTime,
    })
    .from(groomers)
    .innerJoin(
      groomerServiceAreas,
      eq(groomerServiceAreas.groomerId, groomers.id),
    )
    .innerJoin(
      groomerSchedules,
      and(
        eq(groomerSchedules.groomerId, groomers.id),
        eq(groomerSchedules.weekday, weekday),
      ),
    )
    .where(
      and(
        eq(groomers.active, true),
        eq(groomerServiceAreas.neighborhood, neighborhood),
        eq(groomerSchedules.available, true),
      ),
    );

  const candidates = scheduledGroomers.filter(
    (groomer) =>
      groomer.startTime <= requestedStart && groomer.endTime >= requestedEnd,
  );
  if (candidates.length === 0) return null;

  const candidateIds = candidates.map((groomer) => groomer.groomerId);
  const conflictingAppointments = await db
    .select({ groomerId: appointments.groomerId })
    .from(appointments)
    .where(
      and(
        inArray(appointments.groomerId, candidateIds),
        lt(appointments.startsAt, endsAt),
        gt(appointments.endsAt, startsAt),
        ne(appointments.status, "cancelled"),
        excludeAppointmentId
          ? ne(appointments.id, excludeAppointmentId)
          : undefined,
      ),
    );

  const busyGroomerIds = new Set(
    conflictingAppointments
      .map((appointment) => appointment.groomerId)
      .filter((groomerId): groomerId is string => Boolean(groomerId)),
  );

  return (
    candidates.find((groomer) => !busyGroomerIds.has(groomer.groomerId))
      ?.groomerId ?? null
  );
}

function timeOfDay(date: Date): string {
  return `${String(date.getUTCHours()).padStart(2, "0")}:${String(
    date.getUTCMinutes(),
  ).padStart(2, "0")}`;
}
