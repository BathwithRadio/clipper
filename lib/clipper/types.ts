import type { appointments, groomers, groomingPackages } from "@/db/schema";

export type GroomingPackage = typeof groomingPackages.$inferSelect;

/** Max lengths for booking text fields, shared by the form and `POST /api/bookings`. */
export const BOOKING_MAX_LENGTHS = { petName: 40, address: 120, unit: 60 } as const;

export type BookingSlot = {
  startsAt: string;
};

export type BookingOption = {
  packages: GroomingPackage[];
  neighborhoods: string[];
  slots: BookingSlot[];
};

export type AppointmentDetails = Omit<
  typeof appointments.$inferSelect,
  "startsAt" | "endsAt" | "createdAt" | "updatedAt"
> & {
  reference: string;
  pet: { name: string; breed: string };
  groomer: typeof groomers.$inferSelect | null;
  package: GroomingPackage;
  startsAt: string;
  endsAt: string;
  createdAt: string;
  updatedAt: string;
};
