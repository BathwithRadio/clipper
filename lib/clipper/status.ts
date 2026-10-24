export type StatusStyle = { label: string; className: string };

/** Display label and badge colors for each appointment status. */
export const statusStyles: Record<string, StatusStyle> = {
  confirmed: {
    label: "Confirmed",
    className: "border-[#bfe8db] bg-[#e7f8f1] text-[#08775d]",
  },
  completed: {
    label: "Completed",
    className: "border-[#cbd8ff] bg-[#eef1ff] text-[#4353a3]",
  },
  cancelled: {
    label: "Cancelled",
    className: "border-[#f3c4c0] bg-[#fff0ef] text-[#9f3f38]",
  },
  pending: {
    label: "Pending",
    className: "border-[#e4d5a3] bg-[#fff8dc] text-[#775d13]",
  },
};

export function getStatusStyle(status: string | null | undefined): StatusStyle {
  return (
    statusStyles[status ?? ""] ?? {
      label: status ? status.charAt(0).toUpperCase() + status.slice(1) : "Booked",
      className: "border-[#cbd8ff] bg-[#eef1ff] text-[#4353a3]",
    }
  );
}
