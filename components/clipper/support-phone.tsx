import { cn } from "@/lib/utils";

export const SUPPORT_PHONE = { tel: "+8225550142", display: "02-555-0142" } as const;

/** A muted one-line notice ending in a call link, for when the self-serve path is empty. */
export function CallUsNotice({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn("text-sm text-[#53627a]", className)}>
      {children} <a href={`tel:${SUPPORT_PHONE.tel}`} className="font-bold text-[#635bff]">Call {SUPPORT_PHONE.display}</a>
    </p>
  );
}
