import { and, eq, gt, lt, ne, notExists } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";

import { appointments, groomingPackages } from "@/db/schema";
import { findAvailableGroomer } from "@/lib/clipper/data";
import { getDatabase } from "@/lib/clipper/db";

type RouteContext = { params: Promise<{ reference: string }> };

type ChangeRequest = {
  confirmReference?: unknown;
  startsAt?: unknown;
  packageId?: unknown;
};

async function readBody(request: Request): Promise<ChangeRequest | null> {
  try {
    return (await request.json()) as ChangeRequest;
  } catch {
    return null;
  }
}

function error(message: string, status: number) {
  return Response.json({ ok: false, error: message }, { status });
}

/**
 * Loads the appointment and checks the customer re-typed its reference and
 * that it can still be changed: not cancelled and not yet started.
 */
async function loadChangeable(reference: string, body: ChangeRequest) {
  const typed =
    typeof body.confirmReference === "string"
      ? body.confirmReference.trim().toUpperCase()
      : "";
  if (typed !== reference.toUpperCase()) {
    return { error: error("The booking reference does not match.", 403) };
  }

  const db = getDatabase();
  const [appointment] = await db
    .select()
    .from(appointments)
    .where(eq(appointments.bookingReference, reference))
    .limit(1);

  if (!appointment) return { error: error("Appointment was not found.", 404) };
  if (appointment.status === "cancelled") {
    return { error: error("This appointment is already cancelled.", 409) };
  }
  if (appointment.startsAt.getTime() <= Date.now()) {
    return { error: error("This appointment has already started.", 409) };
  }

  return { appointment };
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const { reference } = await params;
  const body = await readBody(request);
  if (!body) return error("Request body must be valid JSON.", 400);

  const result = await loadChangeable(reference, body);
  if (result.error) return result.error;

  const now = new Date();
  const updated = await getDatabase()
    .update(appointments)
    .set({ status: "cancelled", updatedAt: now })
    .where(
      and(
        eq(appointments.id, result.appointment.id),
        ne(appointments.status, "cancelled"),
        gt(appointments.startsAt, now),
      ),
    )
    .returning({ id: appointments.id });

  if (updated.length === 0) {
    return error("This appointment can no longer be cancelled.", 409);
  }

  return Response.json({ ok: true, reference });
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const { reference } = await params;
  const body = await readBody(request);
  if (!body) return error("Request body must be valid JSON.", 400);

  const result = await loadChangeable(reference, body);
  if (result.error) return result.error;
  const { appointment } = result;

  if (typeof body.startsAt !== "string") {
    return error("startsAt is required.", 400);
  }
  const startsAt = new Date(body.startsAt);
  if (Number.isNaN(startsAt.getTime())) {
    return error("startsAt must be a valid date.", 400);
  }
  if (startsAt.getTime() <= Date.now()) {
    return error("The new time must be in the future.", 400);
  }

  const packageId =
    typeof body.packageId === "string" && body.packageId.trim()
      ? body.packageId.trim()
      : appointment.packageId;

  const db = getDatabase();
  const [groomingPackage] = await db
    .select()
    .from(groomingPackages)
    .where(eq(groomingPackages.id, packageId))
    .limit(1);
  if (!groomingPackage) return error("Grooming package was not found.", 404);

  const endsAt = new Date(
    startsAt.getTime() + groomingPackage.durationMinutes * 60 * 1000,
  );
  const groomerId = await findAvailableGroomer(
    appointment.neighborhood,
    startsAt,
    endsAt,
    appointment.id,
  );
  if (!groomerId) {
    return error("No groomer is available for that neighborhood and time.", 409);
  }

  // Only write if nobody booked this groomer for an overlapping time since the
  // availability check above.
  const other = alias(appointments, "other");
  const now = new Date();
  const updated = await db
    .update(appointments)
    .set({
      startsAt,
      endsAt,
      groomerId,
      packageId,
      priceCents: groomingPackage.priceCents,
      updatedAt: now,
    })
    .where(
      and(
        eq(appointments.id, appointment.id),
        ne(appointments.status, "cancelled"),
        gt(appointments.startsAt, now),
        notExists(
          db
            .select({ id: other.id })
            .from(other)
            .where(
              and(
                eq(other.groomerId, groomerId),
                ne(other.id, appointment.id),
                ne(other.status, "cancelled"),
                lt(other.startsAt, endsAt),
                gt(other.endsAt, startsAt),
              ),
            ),
        ),
      ),
    )
    .returning({ id: appointments.id });

  if (updated.length === 0) {
    return error("That time was just taken. Please pick another.", 409);
  }

  return Response.json({ ok: true, reference });
}
