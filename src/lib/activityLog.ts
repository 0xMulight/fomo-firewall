import type { ActivityEntry } from "@/types/trading";

const KEY = "fomo-firewall-activity";

export function loadActivity(): ActivityEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as ActivityEntry[]) : [];
  } catch {
    return [];
  }
}

export function appendActivity(entry: ActivityEntry): ActivityEntry[] {
  const entries = [entry, ...loadActivity()].slice(0, 100);
  try {
    window.localStorage.setItem(KEY, JSON.stringify(entries));
  } catch {
    // storage full or unavailable - activity log is best-effort
  }
  return entries;
}

export function updateLastActivity(
  patch: Partial<ActivityEntry>,
): ActivityEntry[] {
  const entries = loadActivity();
  if (entries.length > 0) {
    entries[0] = { ...entries[0], ...patch };
    try {
      window.localStorage.setItem(KEY, JSON.stringify(entries));
    } catch {
      // ignore
    }
  }
  return entries;
}
