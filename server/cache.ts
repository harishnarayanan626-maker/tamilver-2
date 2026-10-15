/**
 * In-Memory LRU Response Cache for Search and Expensive Linguistic Computations
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

class ResponseCache {
  private store = new Map<string, CacheEntry<any>>();
  private maxEntries = 200;

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    // Refresh LRU order
    this.store.delete(key);
    this.store.set(key, entry);
    return entry.value;
  }

  set<T>(key: string, value: T, ttlMs: number = 60000): void {
    if (this.store.size >= this.maxEntries) {
      const firstKey = this.store.keys().next().value;
      if (firstKey) this.store.delete(firstKey);
    }
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
  }

  clear(): void {
    this.store.clear();
  }
}

export const apiCache = new ResponseCache();
