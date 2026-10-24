// TODO(api): elder order is kept in this browser only; the backend has no ordering field.
const KEY = 'nk_elder_order';

export function readElderOrder(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    const ids = raw ? JSON.parse(raw) : [];
    return Array.isArray(ids) ? ids.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export function saveElderOrder(ids: string[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(ids));
  } catch {
    // Storage unavailable: the order just won't persist.
  }
}

/** Sort by the saved order; elders not in it keep their original order, after the saved ones. */
export function applyElderOrder<T extends { id: string }>(items: T[], order: string[] = readElderOrder()): T[] {
  const rank = new Map(order.map((id, i) => [id, i]));
  return items
    .map((item, i) => ({ item, i }))
    .sort((a, b) => (rank.get(a.item.id) ?? order.length + a.i) - (rank.get(b.item.id) ?? order.length + b.i))
    .map((x) => x.item);
}
