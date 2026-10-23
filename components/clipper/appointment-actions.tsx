"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { formatPrice } from "@/lib/clipper/format";
import type { BookingSlot, GroomingPackage } from "@/lib/clipper/types";

type Mode = "idle" | "cancel" | "reschedule";

function slotLabel(value: string) {
  return new Date(value).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  });
}

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
  const [submitting, setSubmitting] = useState(false);

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
      const result = (await response.json()) as { ok: boolean; error?: string };
      if (!result.ok) {
        setError(result.error ?? "Something went wrong.");
        return;
      }
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
      <div className="flex gap-2">
        <button type="button" onClick={() => setMode("reschedule")} className="rounded-full border border-[#dbe3ef] px-4 py-2 text-sm font-bold text-[#635bff] hover:bg-[#eef1ff]">Reschedule</button>
        <button type="button" onClick={() => setMode("cancel")} className="rounded-full border border-[#f3c4c0] px-4 py-2 text-sm font-bold text-[#9f3f38] hover:bg-[#fff0ef]">Cancel</button>
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
            <select value={startsAt} onChange={(event) => setStartsAt(event.target.value)} className="rounded-md border border-[#dbe3ef] bg-white px-3 py-2 font-normal">
              {slots.length ? null : <option value="">No open times this week</option>}
              {slots.map((slot) => <option key={slot.startsAt} value={slot.startsAt}>{slotLabel(slot.startsAt)}</option>)}
            </select>
          </label>
          <label className="grid gap-1 font-semibold">
            Package
            <select value={selectedPackageId} onChange={(event) => setSelectedPackageId(event.target.value)} className="rounded-md border border-[#dbe3ef] bg-white px-3 py-2 font-normal">
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
        <input value={typedReference} onChange={(event) => setTypedReference(event.target.value)} autoComplete="off" className="rounded-md border border-[#dbe3ef] bg-white px-3 py-2 font-mono font-normal uppercase" />
      </label>
      {error ? <p role="alert" className="text-[#9f3f38]">{error}</p> : null}
      <div className="flex gap-2">
        <button type="button" disabled={!canSubmit} onClick={submit} className="rounded-full bg-[#0a2540] px-4 py-2 font-bold text-white disabled:opacity-40">
          {submitting ? "Saving…" : mode === "cancel" ? "Cancel appointment" : "Move appointment"}
        </button>
        <button type="button" onClick={close} className="rounded-full px-4 py-2 font-bold text-[#53627a]">Back</button>
      </div>
    </div>
  );
}
