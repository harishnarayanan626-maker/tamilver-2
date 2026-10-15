/**
 * Offline-friendly recent-search cache: last 20 searched words in localStorage.
 * Search results render instantly from cache while the live fetch revalidates.
 */

import type { SearchResultItem } from "./api";

const RECENT_KEY = "sorkalam_recent";
const MAX_RECENT = 20;

export interface RecentEntry {
  query: string;
  targetTamil: string;
  at: number;
  total: number;
  results: SearchResultItem[];
}

export function loadRecent(): RecentEntry[] {
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    const list = raw ? (JSON.parse(raw) as RecentEntry[]) : [];
    return Array.isArray(list) ? list.slice(0, MAX_RECENT) : [];
  } catch {
    return [];
  }
}

export function saveRecent(entry: RecentEntry): RecentEntry[] {
  const list = [entry, ...loadRecent().filter((e) => e.query !== entry.query)].slice(0, MAX_RECENT);
  try {
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(list));
  } catch {
    /* storage unavailable */
  }
  return list;
}

export function findRecent(query: string): RecentEntry | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  return loadRecent().find((e) => e.query.trim().toLowerCase() === q) || null;
}
