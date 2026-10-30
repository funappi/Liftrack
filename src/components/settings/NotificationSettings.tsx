import { useEffect, useState } from 'react';
import { Bell, BellOff, Clock, Send } from 'lucide-react';
import { ScheduledDay, Workout } from '../../types';
import {
  DENIED_HELP,
  NotificationPermissionStatus,
  UNSUPPORTED_HELP,
  buildDailyMessage,
  getNotificationPermission,
  loadNotificationSettings,
  requestNotificationPermission,
  saveNotificationSettings,
  showVoltNotification,
} from '../../utils/notifications';

interface NotificationSettingsProps {
  theme: 'dark' | 'warm-light';
  getContext: () => { schedule: ScheduledDay[]; workouts: Workout[] };
}

const PERMISSION_LABEL: Record<NotificationPermissionStatus, string> = {
  granted: 'Autorisées',
  denied: 'Bloquées',
  default: 'Non demandées',
  unsupported: 'Non supportées',
};

export default function NotificationSettings({ theme, getContext }: NotificationSettingsProps) {
  const isLight = theme === 'warm-light';
  const [settings, setSettings] = useState(loadNotificationSettings);
  const [permission, setPermission] = useState<NotificationPermissionStatus>(getNotificationPermission);
  const [info, setInfo] = useState<{ text: string; tone: 'ok' | 'warn' } | null>(null);
  const [busy, setBusy] = useState(false);

  // Permission can change outside the app (Android settings): refresh when coming back
  useEffect(() => {
    const refresh = () => setPermission(getNotificationPermission());
    document.addEventListener('visibilitychange', refresh);
    return () => document.removeEventListener('visibilitychange', refresh);
  }, []);

  const update = (next: typeof settings) => {
    setSettings(next);
    saveNotificationSettings(next);
  };

  // Called directly from the click: the permission prompt needs a user gesture
  const handleToggle = async () => {
    if (busy) return;
    if (settings.enabled) {
      update({ ...settings, enabled: false });
      setInfo(null);
      return;
    }
    setBusy(true);
    const result = await requestNotificationPermission();
    setPermission(result.status);
    setBusy(false);
    if (result.status === 'granted') {
      update({ ...settings, enabled: true });
      setInfo({ text: `C'est noté : rappel chaque jour à ${settings.time}.`, tone: 'ok' });
    } else {
      setInfo({ text: result.message ?? DENIED_HELP, tone: 'warn' });
    }
  };

  const handleTest = async () => {
    if (busy) return;
    setBusy(true);
    let status = permission;
    if (status !== 'granted') {
      const result = await requestNotificationPermission();
      status = result.status;
      setPermission(status);
      if (status !== 'granted') {
        setInfo({ text: result.message ?? DENIED_HELP, tone: 'warn' });
        setBusy(false);
        return;
      }
    }
    const { schedule, workouts } = getContext();
    const ok = await showVoltNotification(buildDailyMessage(schedule, workouts));
    setBusy(false);
    setInfo(
      ok
        ? { text: 'Notification envoyée. Vérifie le volet de notifications.', tone: 'ok' }
        : { text: "Impossible d'afficher la notification sur cet appareil.", tone: 'warn' },
    );
  };

  const card = isLight
    ? 'bg-[#fffaf5] border-[#c05a3e]/20 shadow-[#c05a3e]/5'
    : 'bg-[#181818] border-white/[0.08]';
  const titleText = isLight ? 'text-[#3d2317]' : 'text-white';
  const mutedText = isLight ? 'text-[#7d5a47]' : 'text-[#A7A7A7]';
  const accentText = isLight ? 'text-[#b85d38]' : 'text-[#EC4899]';
  const gradient = isLight ? 'from-[#c05a3e] to-[#d97706]' : 'from-[#7C3AED] to-[#EC4899]';

  const permissionChip =
    permission === 'granted'
      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-500'
      : permission === 'denied'
        ? 'bg-rose-500/15 border-rose-500/40 text-rose-500'
        : isLight
          ? 'bg-[#c05a3e]/10 border-[#c05a3e]/30 text-[#b85d38]'
          : 'bg-white/[0.06] border-white/[0.12] text-[#A7A7A7]';

  return (
    <div className={`p-4 rounded-2xl border shadow-xl space-y-4 ${card}`}>
      {/* Header + switch */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className={`w-9 h-9 shrink-0 rounded-xl flex items-center justify-center bg-gradient-to-br ${gradient}`}>
            {settings.enabled ? <Bell className="w-4 h-4 text-white" /> : <BellOff className="w-4 h-4 text-white" />}
          </div>
          <div className="min-w-0">
            <h3 className={`text-sm font-black uppercase tracking-tight ${titleText}`}>Rappel quotidien</h3>
            <p className={`text-xs mt-0.5 ${mutedText}`}>Ta séance du jour, ou une reco si rien n'est prévu.</p>
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={settings.enabled}
          aria-label="Activer les notifications quotidiennes"
          onClick={handleToggle}
          disabled={busy || permission === 'unsupported'}
          className={`relative shrink-0 w-12 h-7 rounded-full transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
            settings.enabled
              ? `bg-gradient-to-r ${gradient}`
              : isLight
                ? 'bg-[#e8d5c4]'
                : 'bg-[#2a2a2a]'
          }`}
        >
          <span
            className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${
              settings.enabled ? 'translate-x-5' : ''
            }`}
          />
        </button>
      </div>

      {/* Time + permission */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2">
          <Clock className={`w-4 h-4 ${accentText}`} />
          <span className={`text-[11px] font-black uppercase tracking-wider ${mutedText}`}>Heure</span>
          <input
            type="time"
            value={settings.time}
            onChange={(e) => {
              if (e.target.value) update({ ...settings, time: e.target.value });
            }}
            className={`px-2.5 py-1.5 rounded-xl text-sm font-bold border outline-none ${
              isLight
                ? 'bg-white border-[#c05a3e]/25 text-[#3d2317] focus:border-[#c05a3e]'
                : 'bg-[#202020] border-white/[0.12] text-white focus:border-[#EC4899] [color-scheme:dark]'
            }`}
          />
        </label>
        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${permissionChip}`}>
          {PERMISSION_LABEL[permission]}
        </span>
      </div>

      {permission === 'denied' && !info && <p className="text-xs text-rose-500">{DENIED_HELP}</p>}
      {permission === 'unsupported' && <p className={`text-xs ${mutedText}`}>{UNSUPPORTED_HELP}</p>}
      {info && (
        <p className={`text-xs ${info.tone === 'ok' ? 'text-emerald-500' : 'text-rose-500'}`}>{info.text}</p>
      )}

      <button
        type="button"
        onClick={handleTest}
        disabled={busy || permission === 'unsupported'}
        className={`w-full py-3 px-4 rounded-2xl font-black text-xs uppercase tracking-wider text-white shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.98] hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r ${gradient}`}
      >
        <Send className="w-3.5 h-3.5" />
        <span>Tester la notification</span>
      </button>

      <p className={`text-[11px] leading-snug ${mutedText}`}>
        Envoyé une fois par jour à l'heure choisie quand VOLT est ouvert ou à sa réouverture. Appli installée sur
        Android : Chrome peut aussi l'envoyer appli fermée, à un moment qu'il choisit.
      </p>
    </div>
  );
}
