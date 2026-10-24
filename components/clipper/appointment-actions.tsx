"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { CallUsNotice } from "@/components/clipper/support-phone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatPrice, formatSlotDateTime } from "@/lib/clipper/format";
import type { BookingSlot, GroomingPackage } from "@/lib/clipper/types";

type Mode = "idle" | "cancel" | "reschedule";

const selectClassName =
  "h-9 rounded-md border border-[#dbe3ef] bg-white px-3 font-normal outline-none focus-visible:ring-2 focus-visible:ring-[#635bff]";

export function AppointmentActions({
  reference,
  packageId,
  packages,
  slots,
}: {
  reference: string;
  packageId: string;
  packages: GroomingPackage[];
  slots: BookingSlot[];
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("idle");
  const [typedReference, setTypedReference] = useState("");
  const [startsAt, setStartsAt] = useState(slots[0]?.startsAt ?? "");
  const [selectedPackageId, setSelectedPackageId] = useState(packageId);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const rescheduleRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  // Which trigger opened the panel. The triggers remount on close, so focus is restored after render.
  const returnFocusTo = useRef<"reschedule" | "cancel" | null>(null);

  useEffect(() => {
    if (mode !== "idle" || !returnFocusTo.current) return;
    (returnFocusTo.current === "reschedule" ? rescheduleRef : cancelRef).current?.focus();
    returnFocusTo.current = null;
  }, [mode]);

  const open = (next: "reschedule" | "cancel") => {
    returnFocusTo.current = next;
    setSuccess("");
    setMode(next);
  };

  const close = () => {
    setMode("idle");
    setTypedReference("");
    setError("");
  };

  const submit = async () => {
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch(`/api/bookings/${encodeURIComponent(reference)}`, {
        method: mode === "cancel" ? "DELETE" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          mode === "cancel"
            ? { confirmReference: typedReference }
            : { confirmReference: typedReference, startsAt, packageId: selectedPackageId },
        ),
      });
      const result = (await response.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!response.ok || !result.ok) {
        setError(result.error ?? "Something went wrong. Please try again.");
        return;
      }
      setSuccess(mode === "cancel" ? "Appointment cancelled." : `Moved to ${formatSlotDateTime(startsAt)}.`);
      close();
      router.refresh();
    } catch {
      setError("Could not reach Clipper. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (mode === "idle") {
    return (
      <div className="grid gap-2">
        <div className="flex gap-2">
          <Button ref={rescheduleRef} type="button" variant="outline" onClick={() => open("reschedule")} className="rounded-full border-[#dbe3ef] font-bold text-[#635bff] hover:bg-[#eef1ff] hover:text-[#635bff]">Reschedule</Button>
          <Button ref={cancelRef} type="button" variant="outline" onClick={() => open("cancel")} className="rounded-full border-[#f3c4c0] font-bold text-[#9f3f38] hover:bg-[#fff0ef] hover:text-[#9f3f38]">Cancel</Button>
        </div>
        <p role="status" className="text-sm font-semibold text-[#08775d]">{success}</p>
      </div>
    );
  }

  const canSubmit =
    !submitting &&
    typedReference.trim().toUpperCase() === reference.toUpperCase() &&
    (mode === "cancel" || Boolean(startsAt));

  return (
    <div className="grid gap-3 rounded-xl border border-[#dbe3ef] bg-[#f7f9fc] p-4 text-sm">
      {mode === "reschedule" ? (
        <>
          <label className="grid gap-1 font-semibold">
            New time
            <select value={startsAt} onChange={(event) => setStartsAt(event.target.value)} className={selectClassName}>
              {slots.length ? null : <option value="">No open times this week</option>}
              {slots.map((slot) => <option key={slot.startsAt} value={slot.startsAt}>{formatSlotDateTime(slot.startsAt)}</option>)}
            </select>
          </label>
          {slots.length === 0 && <CallUsNotice className="text-xs">Need a different week?</CallUsNotice>}
          <label className="grid gap-1 font-semibold">
            Package
            <select value={selectedPackageId} onChange={(event) => setSelectedPackageId(event.target.value)} className={selectClassName}>
              {packages.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.durationMinutes} min · {formatPrice(item.priceCents)}</option>)}
            </select>
          </label>
          <p className="text-xs text-[#53627a]">You&apos;ll be charged the package&apos;s current price. Your groomer may change.</p>
        </>
      ) : (
        <p className="font-semibold text-[#9f3f38]">Cancelling can&apos;t be undone.</p>
      )}
      <label className="grid gap-1 font-semibold">
        Type <span className="font-mono">{reference}</span> to confirm
        <Input autoFocus value={typedReference} onChange={(event) => setTypedReference(event.target.value)} autoComplete="off" className="border-[#dbe3ef] bg-white font-mono font-normal uppercase focus-visible:ring-[#635bff]" />
      </label>
      {error ? <p role="alert" className="text-[#9f3f38]">{error}</p> : null}
      <div className="flex gap-2">
        <Button type="button" disabled={!canSubmit} onClick={submit} className="rounded-full bg-[#0a2540] font-bold text-white disabled:opacity-40">
          {submitting ? "Saving…" : mode === "cancel" ? "Cancel appointment" : "Move appointment"}
        </Button>
        <Button type="button" variant="ghost" onClick={close} className="rounded-full font-bold text-[#53627a]">Back</Button>
      </div>
    </div>
  );
}
