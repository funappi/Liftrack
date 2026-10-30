import { ScheduledDay, Workout } from '../types';
import { getParisDayKey } from './dates';
import { loadJSON, saveJSON } from './storage';
import {
  DailyMessage,
  LAST_PATH,
  NOTIF_TAG,
  NotificationState,
  STATE_PATH,
  getParisDateKey,
  isTimeReached,
  isValidTime,
  readCachedJSON,
  writeCachedJSON,
} from './notificationShared';

export type { DailyMessage } from './notificationShared';

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export interface NotificationSettings {
  enabled: boolean;
  time: string; // 'HH:MM'
}

export interface NotificationContext {
  schedule: ScheduledDay[];
  workouts: Workout[];
}

const SETTINGS_KEY = 'volt_notifications';
const LAST_KEY = 'volt_notifications_last';
const CHANGE_EVENT = 'volt-notifications-change';
const DEFAULT_SETTINGS: NotificationSettings = { enabled: false, time: '08:00' };

export const loadNotificationSettings = (): NotificationSettings => {
  const raw = loadJSON<Partial<NotificationSettings> | null>(SETTINGS_KEY, null);
  return {
    enabled: raw?.enabled === true,
    time: isValidTime(raw?.time) ? raw!.time! : DEFAULT_SETTINGS.time,
  };
};

export const saveNotificationSettings = (settings: NotificationSettings): void => {
  saveJSON(SETTINGS_KEY, {
    enabled: settings.enabled,
    time: isValidTime(settings.time) ? settings.time : DEFAULT_SETTINGS.time,
  });
  // Lets a running scheduler pick up the change immediately
  try {
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {
    // ignore
  }
};

// ---------------------------------------------------------------------------
// Permission
// ---------------------------------------------------------------------------

export type NotificationPermissionStatus = 'granted' | 'denied' | 'default' | 'unsupported';

const isNotificationSupported = (): boolean =>
  typeof window !== 'undefined' && 'Notification' in window && window.isSecureContext !== false;

export const getNotificationPermission = (): NotificationPermissionStatus =>
  isNotificationSupported() ? Notification.permission : 'unsupported';

export const DENIED_HELP =
  "Les notifications sont bloquées. Sur Android : Paramètres > Applications > VOLT (ou Chrome) > Notifications > Autoriser. " +
  "Dans Chrome : icône à gauche de l'adresse > Autorisations > Notifications > Autoriser. Puis réactive l'option ici.";

export const UNSUPPORTED_HELP =
  "Ce navigateur ne gère pas les notifications. Sur Android, installe VOLT depuis Chrome (menu > Installer l'application).";

/**
 * Asks for the notification permission. Call it ONLY from a user gesture handler
 * (e.g. the switch onClick): browsers ignore or penalise prompts without a gesture.
 */
export const requestNotificationPermission = async (): Promise<{
  status: NotificationPermissionStatus;
  message?: string;
}> => {
  if (!isNotificationSupported()) return { status: 'unsupported', message: UNSUPPORTED_HELP };
  if (Notification.permission === 'granted') return { status: 'granted' };
  if (Notification.permission === 'denied') return { status: 'denied', message: DENIED_HELP };
  try {
    const status = await Notification.requestPermission();
    if (status === 'granted') return { status };
    if (status === 'denied') return { status, message: DENIED_HELP };
    return { status: 'default', message: "Autorisation non accordée. Réessaie et choisis « Autoriser »." };
  } catch {
    return { status: 'unsupported', message: UNSUPPORTED_HELP };
  }
};

// ---------------------------------------------------------------------------
// Message
// ---------------------------------------------------------------------------

const daySessions = (schedule: ScheduledDay[], offsetDays: number) =>
  schedule.find((d) => d.dayKey === getParisDayKey(offsetDays))?.sessions ?? [];

/**
 * Today's notification (or the one for `offsetDays` days from now).
 * Planned session(s) first, otherwise a recommendation based on recent history.
 */
export const buildDailyMessage = (
  schedule: ScheduledDay[],
  workouts: Workout[],
  offsetDays = 0,
): DailyMessage => {
  const sessions = daySessions(schedule, offsetDays);
  const training = sessions.filter((s) => s.status !== 'rest');
  const titleOf = (s: (typeof sessions)[number]) =>
    workouts.find((w) => w.id === s.workoutId)?.title || s.workoutTitle || 'Séance';

  if (training.length > 0) {
    const todo = training.filter((s) => s.status !== 'completed');
    if (todo.length === 0) {
      return { title: 'Séance validée ✅', body: 'Programme du jour bouclé. Récupère bien, tu l’as mérité !' };
    }
    const names = todo.map(titleOf);
    const minutes = todo.reduce((sum, s) => sum + (s.durationMin || 0), 0);
    const duration = minutes > 0 ? ` (${minutes} min)` : '';
    if (names.length === 1) {
      return { title: `Aujourd’hui : ${names[0]} 💪`, body: `Ta séance t’attend${duration}. On y va !` };
    }
    return {
      title: `Aujourd’hui : ${names.length} séances 💪`,
      body: `${names.join(' + ')}${duration}. Allez, on envoie !`,
    };
  }

  if (sessions.some((s) => s.status === 'rest')) {
    return { title: 'Jour de repos 😌', body: 'Repos prévu aujourd’hui : hydrate-toi, dors bien, reviens plus fort.' };
  }

  // Days since the last completed session (within the weekly planning)
  let daysSince = Infinity;
  for (let k = 1; k <= 6; k++) {
    if (daySessions(schedule, offsetDays - k).some((s) => s.status === 'completed')) {
      daysSince = k;
      break;
    }
  }

  if (daysSince === 1) {
    return { title: 'Repos ou mobilité 🧘', body: 'Belle séance hier ! Aujourd’hui : récupération active ou mobilité.' };
  }
  if (daysSince >= 3) {
    return { title: 'Reprise en douceur 🔄', body: 'Ça fait quelques jours : une séance légère pour relancer la machine ?' };
  }
  return { title: 'Jour libre 🚶', body: 'Pas de séance prévue : mobilité ou cardio léger pour rester en mouvement.' };
};

// ---------------------------------------------------------------------------
// Display
// ---------------------------------------------------------------------------

const BASE = import.meta.env.BASE_URL; // '/Liftrack/'
const absoluteBase = () => new URL(BASE, window.location.origin).toString();

const withTimeout = <T>(p: Promise<T>, ms: number): Promise<T | null> =>
  Promise.race([p, new Promise<null>((resolve) => setTimeout(() => resolve(null), ms))]);

/**
 * Shows a notification. Uses registration.showNotification (mandatory on Android:
 * `new Notification()` throws there); falls back to the constructor when no service
 * worker is active (dev server, desktop).
 */
export const showVoltNotification = async (message: DailyMessage): Promise<boolean> => {
  if (getNotificationPermission() !== 'granted') return false;
  const options: NotificationOptions = {
    body: message.body,
    icon: `${BASE}pwa-192x192.png`,
    badge: `${BASE}pwa-64x64.png`,
    tag: NOTIF_TAG,
    lang: 'fr',
    data: { url: absoluteBase() },
  };
  try {
    if ('serviceWorker' in navigator) {
      const registration = await withTimeout(navigator.serviceWorker.ready, 4000);
      if (registration) {
        await registration.showNotification(message.title, options);
        return true;
      }
    }
    new Notification(message.title, options);
    return true;
  } catch {
    return false;
  }
};

// ---------------------------------------------------------------------------
// Scheduler
// ---------------------------------------------------------------------------

const MESSAGE_DAYS = 7;
let sending = false;

const wasSentToday = async (today: string): Promise<boolean> => {
  if (loadJSON<string | null>(LAST_KEY, null) === today) return true;
  // The service worker may have sent it while the app was closed
  const swLast = await readCachedJSON<{ date: string }>(absoluteBase(), LAST_PATH);
  if (swLast?.date === today) {
    saveJSON(LAST_KEY, today);
    return true;
  }
  return false;
};

const markSent = async (today: string) => {
  saveJSON(LAST_KEY, today);
  await writeCachedJSON(absoluteBase(), LAST_PATH, { date: today });
};

type PeriodicSyncManager = {
  register: (tag: string, options?: { minInterval: number }) => Promise<void>;
  unregister: (tag: string) => Promise<void>;
};

// Periodic Background Sync (Chrome Android, installed app only): lets the service
// worker notify while the app is closed. Best effort: Chrome decides the frequency.
const updatePeriodicSync = async (enabled: boolean) => {
  try {
    if (!('serviceWorker' in navigator)) return;
    const registration = await withTimeout(navigator.serviceWorker.ready, 4000);
    const periodicSync = (registration as (ServiceWorkerRegistration & { periodicSync?: PeriodicSyncManager }) | null)
      ?.periodicSync;
    if (!periodicSync) return;
    if (!enabled) {
      await periodicSync.unregister(NOTIF_TAG);
      return;
    }
    const perm = await navigator.permissions.query({ name: 'periodic-background-sync' as PermissionName });
    if (perm.state !== 'granted') return;
    // Chrome clamps this to its own minimum (about 12 h, engagement-based)
    await periodicSync.register(NOTIF_TAG, { minInterval: 60 * 60 * 1000 });
  } catch {
    // unsupported or refused: notifications stay "app open" only
  }
};

/**
 * Starts the daily notification scheduler. Returns a stop function.
 * - at most one notification per day (date stored in localStorage 'volt_notifications_last'
 *   and mirrored in the Cache API for the service worker);
 * - checks at start, every 30 s while the app is open, and when it comes back to the foreground;
 * - publishes the next days' messages to the service worker for Periodic Background Sync.
 */
export const startNotificationScheduler = (getContext: () => NotificationContext): (() => void) => {
  if (typeof window === 'undefined') return () => {};
  let stopped = false;
  let lastPublished = '';
  let lastSyncEnabled: boolean | null = null;

  const publishState = async (settings: NotificationSettings) => {
    let messages: Record<string, DailyMessage> = {};
    try {
      const { schedule, workouts } = getContext();
      for (let d = 0; d < MESSAGE_DAYS; d++) {
        messages[getParisDateKey(d)] = buildDailyMessage(schedule, workouts, d);
      }
    } catch {
      messages = {};
    }
    const key = JSON.stringify({ settings, messages });
    if (key !== lastPublished) {
      lastPublished = key;
      const state: NotificationState = { ...settings, messages, updatedAt: Date.now() };
      await writeCachedJSON(absoluteBase(), STATE_PATH, state);
    }
    const syncEnabled = settings.enabled && getNotificationPermission() === 'granted';
    if (syncEnabled !== lastSyncEnabled) {
      lastSyncEnabled = syncEnabled;
      await updatePeriodicSync(syncEnabled);
    }
  };

  const check = async () => {
    if (stopped || sending) return;
    const settings = loadNotificationSettings();
    await publishState(settings);
    if (!settings.enabled || getNotificationPermission() !== 'granted') return;
    if (!isTimeReached(settings.time)) return;
    const today = getParisDateKey();
    sending = true;
    try {
      if (await wasSentToday(today)) return;
      const { schedule, workouts } = getContext();
      const message = buildDailyMessage(schedule, workouts);
      await markSent(today); // before showing, so two tabs never both send
      const ok = await showVoltNotification(message);
      if (!ok) {
        // Not shown: allow a retry on the next check
        saveJSON(LAST_KEY, null);
        await writeCachedJSON(absoluteBase(), LAST_PATH, { date: '' });
      }
    } catch {
      // ignore
    } finally {
      sending = false;
    }
  };

  const run = () => {
    void check();
  };
  const onVisibility = () => {
    // Coming back: maybe the time passed while in background. Leaving: publish fresh data to the SW.
    run();
  };

  run();
  const interval = window.setInterval(run, 30 * 1000);
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener(CHANGE_EVENT, run);
  window.addEventListener('storage', run);

  return () => {
    stopped = true;
    window.clearInterval(interval);
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener(CHANGE_EVENT, run);
    window.removeEventListener('storage', run);
  };
};
