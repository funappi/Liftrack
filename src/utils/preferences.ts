import { loadJSON, saveJSON } from './storage';

// User preferences edited in Settings > Autres paramètres
const DEFAULT_REST_KEY = 'volt_default_rest';
const SOUND_KEY = 'volt_sound_enabled';

export const loadDefaultRestSeconds = (): number => {
  const value = loadJSON<number>(DEFAULT_REST_KEY, 90);
  return Number.isFinite(value) && value >= 0 && value <= 600 ? value : 90;
};

export const saveDefaultRestSeconds = (seconds: number) => saveJSON(DEFAULT_REST_KEY, seconds);

export const loadSoundEnabled = (): boolean => loadJSON<boolean>(SOUND_KEY, true) !== false;

export const saveSoundEnabled = (enabled: boolean) => saveJSON(SOUND_KEY, enabled);
