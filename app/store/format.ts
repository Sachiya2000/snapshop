import type { StoreItem } from "@/lib/store";

// "LKR 150 – 350", or "LKR 200" when min and max are equal.
export function formatPrice({ currency, min, max }: StoreItem["priceRange"]): string {
  const fmt = (n: number) => n.toLocaleString("en-LK");
  return min === max ? `${currency} ${fmt(min)}` : `${currency} ${fmt(min)} – ${fmt(max)}`;
}
