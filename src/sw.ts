// VOLT service worker (vite-plugin-pwa, strategies: 'injectManifest').
// Same precache/offline behaviour as the former generated SW + daily notifications.
import { clientsClaim } from 'workbox-core';
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import {
  FALLBACK_MESSAGE,
  LAST_PATH,
  NOTIF_TAG,
  NotificationState,
  STATE_PATH,
  getParisDateKey,
  isTimeReached,
  readCachedJSON,
  writeCachedJSON,
} from './utils/notificationShared';

// Minimal service worker typings (the project tsconfig uses the DOM lib, not WebWorker)
interface SWExtendableEvent extends Event {
  waitUntil(promise: Promise<unknown>): void;
}
interface SWPeriodicSyncEvent extends SWExtendableEvent {
  tag: string;
}
interface SWNotificationEvent extends SWExtendableEvent {
  notification: Notification;
}
interface SWWindowClient {
  url: string;
  focus(): Promise<SWWindowClient>;
  navigate?(url: string): Promise<SWWindowClient | null>;
}
interface SWGlobal {
  __WB_MANIFEST: Array<{ url: string; revision: string | null } | string>;
  registration: ServiceWorkerRegistration;
  clients: {
    matchAll(options: { type: 'window'; includeUncontrolled: boolean }): Promise<SWWindowClient[]>;
    openWindow(url: string): Promise<SWWindowClient | null>;
  };
  skipWaiting(): Promise<void>;
  addEventListener(type: 'periodicsync', listener: (event: SWPeriodicSyncEvent) => void): void;
  addEventListener(type: 'notificationclick', listener: (event: SWNotificationEvent) => void): void;
}
declare const self: SWGlobal;

// registerType: 'autoUpdate' -> activate new versions immediately
self.skipWaiting();
clientsClaim();

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);
// SPA offline fallback (generateSW's default navigateFallback: 'index.html')
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')));

const scope = () => self.registration.scope; // 'https://…/Liftrack/'

const notifyIfDue = async () => {
  const state = await readCachedJSON<NotificationState>(scope(), STATE_PATH);
  if (!state?.enabled) return;
  if (Notification.permission !== 'granted') return;
  if (!isTimeReached(state.time)) return;
  const today = getParisDateKey();
  const last = await readCachedJSON<{ date: string }>(scope(), LAST_PATH);
  if (last?.date === today) return;
  const message = state.messages?.[today] ?? FALLBACK_MESSAGE;
  await writeCachedJSON(scope(), LAST_PATH, { date: today });
  await self.registration.showNotification(message.title, {
    body: message.body,
    icon: new URL('pwa-192x192.png', scope()).toString(),
    badge: new URL('pwa-64x64.png', scope()).toString(),
    tag: NOTIF_TAG,
    lang: 'fr',
    data: { url: scope() },
  });
};

self.addEventListener('periodicsync', (event) => {
  if (event.tag === NOTIF_TAG) event.waitUntil(notifyIfDue());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = (event.notification.data as { url?: string } | null)?.url || scope();
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const existing = windows.find((c) => c.url.startsWith(scope()));
      if (existing) {
        await existing.focus();
        return;
      }
      await self.clients.openWindow(target);
    })(),
  );
});
