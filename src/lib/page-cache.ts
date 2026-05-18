// Tiny in-memory snapshot cache used to make navigation feel instant.
// Pages seed their initial state from here, then refetch in the background
// (stale-while-revalidate). Cleared on full page reload.
const cache = new Map<string, unknown>();

export const pageCache = {
  get<T>(key: string): T | undefined {
    return cache.get(key) as T | undefined;
  },
  set<T>(key: string, val: T): void {
    cache.set(key, val);
  },
  invalidate(prefix: string): void {
    for (const k of cache.keys()) if (k.startsWith(prefix)) cache.delete(k);
  },
};