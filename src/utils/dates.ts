import { ScheduledDay } from '../types';

export type DayKey = ScheduledDay['dayKey'];

export const DAY_KEYS: DayKey[] = ['LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM', 'DIM'];

// Day key in Europe/Paris, `offsetDays` days from now (-1 = yesterday)
export const getParisDayKey = (offsetDays = 0): DayKey => {
  const date = new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000);
  try {
    const weekday = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', weekday: 'short' })
      .format(date)
      .toLowerCase();
    const found = DAY_KEYS.find((k) => weekday.startsWith(k.toLowerCase()));
    if (found) return found;
  } catch {
    // fall through
  }
  return DAY_KEYS[(date.getDay() + 6) % 7];
};
