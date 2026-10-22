/** `priceCents` holds whole won despite its name: 65000 → ₩65,000. */
export function formatPrice(won: number) {
  return `₩${won.toLocaleString("ko-KR")}`;
}
