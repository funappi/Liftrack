import { useEffect, useState } from 'react';
import { loadJSON, saveJSON } from './storage';

// User preferences edited in Settings > Autres paramètres
const DEFAULT_REST_KEY = 'volt_default_rest';
const SOUND_KEY = 'volt_sound_enabled';

export const loadDefaultRestSeconds = (): number => {
  const value = loadJSON<number>(DEFAULT_REST_KEY, 90);
  return Number.isFinite(value) && value >= 0 && value <= 600 ? value : 90;
};

export const saveDefaultRestSeconds = (seconds: number) => saveJSON(DEFAULT_REST_KEY, seconds);

// Countdown (seconds) shown before the set chrono starts; 0 = start immediately
const SET_COUNTDOWN_KEY = 'volt_set_countdown';

export const loadSetCountdownSeconds = (): number => (loadJSON<number>(SET_COUNTDOWN_KEY, 3) === 0 ? 0 : 3);

export const saveSetCountdownSeconds = (seconds: number) => saveJSON(SET_COUNTDOWN_KEY, seconds);

export const loadSoundEnabled = (): boolean => loadJSON<boolean>(SOUND_KEY, true) !== false;

export const saveSoundEnabled = (enabled: boolean) => saveJSON(SOUND_KEY, enabled);

// Home mascot coach: shown above the statistics unless switched off in Settings
const MASCOT_ENABLED_KEY = 'volt_mascot_enabled';
const MASCOT_EVENT = 'volt-mascot-enabled-change';

export const loadMascotEnabled = (): boolean => loadJSON<boolean>(MASCOT_ENABLED_KEY, true) !== false;

export const saveMascotEnabled = (enabled: boolean) => {
  saveJSON(MASCOT_ENABLED_KEY, enabled);
  window.dispatchEvent(new Event(MASCOT_EVENT));
};

/** Current on/off state of the mascot, refreshed as soon as it is changed in Settings */
export const useMascotEnabled = (): boolean => {
  const [enabled, setEnabled] = useState(loadMascotEnabled);
  useEffect(() => {
    const refresh = () => setEnabled(loadMascotEnabled());
    window.addEventListener(MASCOT_EVENT, refresh);
    return () => window.removeEventListener(MASCOT_EVENT, refresh);
  }, []);
  return enabled;
};
