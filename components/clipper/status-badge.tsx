import { badgeVariants } from "@/components/ui/badge";
import { getStatusStyle } from "@/lib/clipper/status";
import { cn } from "@/lib/utils";

/** Colored pill for an appointment status. Renders a `<span>` so it can sit inside links and paragraphs. */
export function StatusBadge({ status, className, children }: { status: string | null | undefined; className?: string; children?: React.ReactNode }) {
  const style = getStatusStyle(status);
  return (
    <span className={cn(badgeVariants({ variant: "outline" }), "font-bold", style.className, className)}>
      {children}
      {style.label}
    </span>
  );
}
