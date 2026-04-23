export const CURRENCY = "BDT";
export const CURRENCY_SYMBOL = "৳";

export function formatMoney(amount: number | string | null | undefined): string {
  const n = typeof amount === "string" ? parseFloat(amount) : (amount ?? 0);
  if (!isFinite(n)) return `${CURRENCY_SYMBOL}0`;
  return `${CURRENCY_SYMBOL}${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

export function formatDate(d: string | Date | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}
