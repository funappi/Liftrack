// Code shared by the app (src/utils/notifications.ts) and the service worker (src/sw.ts).
// Keep it free of DOM/React imports: it is bundled into the service worker.

export const NOTIF_TAG = 'volt-daily';
const NOTIF_CACHE = 'volt-notifications';

// Shared state lives in the Cache API: readable/writable from the page AND from the
// service worker (localStorage is not available in a service worker).
export const STATE_PATH = '__volt-notif/state';
export const LAST_PATH = '__volt-notif/last';

export interface DailyMessage {
  title: string;
  body: string;
}

export interface NotificationState {
  enabled: boolean;
  time: string; // 'HH:MM', Europe/Paris
  // Precomputed messages keyed by Paris date 'YYYY-MM-DD' (today + next days)
  messages: Record<string, DailyMessage>;
  updatedAt: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

// Paris calendar date 'YYYY-MM-DD', `offsetDays` days from now
export const getParisDateKey = (offsetDays = 0): string => {
  const date = new Date(Date.now() + offsetDays * DAY_MS);
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Paris',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  } catch {
    const p = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
  }
};

// Current Paris time 'HH:MM'
const getParisTime = (): string => {
  const date = new Date();
  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Paris',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(date);
    const h = parts.find((x) => x.type === 'hour')?.value ?? '00';
    const m = parts.find((x) => x.type === 'minute')?.value ?? '00';
    return `${h}:${m}`;
  } catch {
    const p = (n: number) => String(n).padStart(2, '0');
    return `${p(date.getHours())}:${p(date.getMinutes())}`;
  }
};

export const isValidTime = (t: unknown): t is string => typeof t === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(t);

// 'HH:MM' strings compare correctly as text
export const isTimeReached = (time: string): boolean => getParisTime() >= time;

// Fallback when the service worker has no precomputed message for today
export const FALLBACK_MESSAGE: DailyMessage = {
  title: 'VOLT · Ton programme du jour',
  body: 'Ouvre VOLT pour voir ta séance ou ta recommandation du jour.',
};

const cacheRequest = (base: string, path: string) => new Request(new URL(path, base).toString());

export const readCachedJSON = async <T>(base: string, path: string): Promise<T | null> => {
  try {
    if (typeof caches === 'undefined') return null;
    const cache = await caches.open(NOTIF_CACHE);
    const res = await cache.match(cacheRequest(base, path));
    return res ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
};

export const writeCachedJSON = async (base: string, path: string, value: unknown): Promise<void> => {
  try {
    if (typeof caches === 'undefined') return;
    const cache = await caches.open(NOTIF_CACHE);
    await cache.put(
      cacheRequest(base, path),
      new Response(JSON.stringify(value), { headers: { 'Content-Type': 'application/json' } }),
    );
  } catch {
    // ignore
  }
};
