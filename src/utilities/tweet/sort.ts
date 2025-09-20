export type WithIdAndCreatedAt = {
  id: string;
  createdAt: Date;
};

// Dedupe by id and sort by createdAt descending (newest first)
export function dedupeAndSortByCreatedAtDesc<T extends WithIdAndCreatedAt>(items: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    if (!item || !item.id) continue;
    if (!seen.has(item.id)) {
      seen.add(item.id);
      out.push(item);
    }
  }
  out.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return out;
}
