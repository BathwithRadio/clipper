/** Whether the customer can still reschedule or cancel: not cancelled and not yet started. */
export function canChangeAppointment(appointment: { status: string; startsAt: string }, now = Date.now()) {
  return appointment.status !== "cancelled" && new Date(appointment.startsAt).getTime() > now;
}
