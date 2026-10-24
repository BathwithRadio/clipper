import { eq } from "drizzle-orm";
import { after } from "next/server";

import {
  appointments,
  groomingPackages,
} from "@/db/schema";
import { findAvailableGroomer } from "@/lib/clipper/data";
import { getDatabase } from "@/lib/clipper/db";

type BookingRequest = {
  petName?: unknown;
  petBreed?: unknown;
  packageId?: unknown;
  neighborhood?: unknown;
  address?: unknown;
  unit?: unknown;
  startsAt?: unknown;
};

const REFERENCE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function createBookingReference() {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  const code = Array.from(
    bytes,
    (byte) => REFERENCE_ALPHABET[byte % REFERENCE_ALPHABET.length],
  ).join("");

  return `CLP-${code}`;
}

export async function POST(request: Request) {
  let input: BookingRequest;

  try {
    input = (await request.json()) as BookingRequest;
  } catch {
    return Response.json(
      { ok: false, error: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  const requiredFields = [
    "petName",
    "petBreed",
    "packageId",
    "neighborhood",
    "address",
    "startsAt",
  ] as const;
  const missingFields = requiredFields.filter((field) => {
    const value = input[field];
    return typeof value !== "string" || value.trim().length === 0;
  });

  if (missingFields.length > 0) {
    return Response.json(
      {
        ok: false,
        error: `Missing required fields: ${missingFields.join(", ")}.`,
      },
      { status: 400 },
    );
  }

  const maxLengths = { petName: 40, address: 120 } as const;
  const tooLong = (Object.keys(maxLengths) as (keyof typeof maxLengths)[]).find(
    (field) => (input[field] as string).trim().length > maxLengths[field],
  );

  if (tooLong) {
    return Response.json(
      {
        ok: false,
        error: `${tooLong} must be at most ${maxLengths[tooLong]} characters.`,
      },
      { status: 400 },
    );
  }

  const petName = input.petName as string;
  const petBreed = input.petBreed as string;
  const packageId = input.packageId as string;
  const neighborhood = input.neighborhood as string;
  const unit = typeof input.unit === "string" ? input.unit.trim() : "";
  // No separate column yet: keep the unit on the address line the groomer reads.
  const address = [(input.address as string).trim(), unit].filter(Boolean).join(", ");
  const startsAt = new Date(input.startsAt as string);

  if (Number.isNaN(startsAt.getTime())) {
    return Response.json(
      { ok: false, error: "startsAt must be a valid date." },
      { status: 400 },
    );
  }

  const db = getDatabase();
  const [groomingPackage] = await db
    .select()
    .from(groomingPackages)
    .where(eq(groomingPackages.id, packageId))
    .limit(1);

  if (!groomingPackage) {
    return Response.json(
      { ok: false, error: "Grooming package was not found." },
      { status: 404 },
    );
  }

  const endsAt = new Date(
    startsAt.getTime() + groomingPackage.durationMinutes * 60 * 1000,
  );
  const groomerId = await findAvailableGroomer(
    neighborhood,
    startsAt,
    endsAt,
  );

  if (!groomerId) {
    return Response.json(
      {
        ok: false,
        error: "No groomer is available for that neighborhood and time.",
      },
      { status: 409 },
    );
  }

  const now = new Date();
  const bookingReference = createBookingReference();
  const appointmentId = `apt_${crypto.randomUUID()}`;

  await db.insert(appointments).values({
    id: appointmentId,
    bookingReference,
    petName: petName.trim(),
    petBreed: petBreed.trim(),
    groomerId,
    packageId,
    address: address.trim(),
    neighborhood: neighborhood.trim(),
    startsAt,
    endsAt,
    status: "confirmed",
    priceCents: groomingPackage.priceCents,
    notes: null,
    createdAt: now,
    updatedAt: now,
  });

  // log it, don't make the customer wait for it
  after(() => {
    console.info(
      JSON.stringify({ event: "booking_created", bookingReference }),
    );
  });

  return Response.json({ ok: true, reference: bookingReference });
}
