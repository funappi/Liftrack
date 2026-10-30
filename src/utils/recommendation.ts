import { ScheduledDay, Workout } from '../types';

type DayKey = ScheduledDay['dayKey'];

const ROTATION_KEY = 'volt_rotation_order';
const DAY_KEYS: DayKey[] = ['LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM', 'DIM'];

const isCustomWorkout = (w: Workout) => w.id.startsWith('custom-workout-');

export const loadRotation = (): string[] => {
  try {
    const saved = localStorage.getItem(ROTATION_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed.filter((id) => typeof id === 'string');
    }
  } catch {
    // ignore
  }
  return [];
};

export const saveRotation = (order: string[]) => {
  try {
    localStorage.setItem(ROTATION_KEY, JSON.stringify(order));
  } catch {
    // ignore
  }
};

// Day key in Europe/Paris, `offsetDays` days from now (-1 = yesterday)
const getParisDayKey = (offsetDays = 0): DayKey => {
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

// Created workouts in rotation order: saved order first, then any new ones
export const getRotationOrder = (workouts: Workout[], saved: string[]): Workout[] => {
  const pool = workouts.filter(isCustomWorkout);
  const ordered = saved
    .map((id) => pool.find((w) => w.id === id))
    .filter((w): w is Workout => Boolean(w));
  const rest = pool.filter((w) => !saved.includes(w.id));
  return [...ordered, ...rest];
};

export interface Recommendation {
  workout: Workout;
  reason: string;
}

export const recommendWorkout = (
  workouts: Workout[],
  schedule: ScheduledDay[],
  savedRotation: string[]
): Recommendation | null => {
  const order = getRotationOrder(workouts, savedRotation);
  if (order.length === 0) return null;

  const doneYesterday = schedule
    .find((d) => d.dayKey === getParisDayKey(-1))
    ?.sessions.find((s) => s.status === 'completed');

  if (doneYesterday) {
    const idx = order.findIndex((w) => w.id === doneYesterday.workoutId);
    const next = idx === -1 ? order[0] : order[(idx + 1) % order.length];
    return { workout: next, reason: `Hier : ${doneYesterday.workoutTitle}` };
  }

  const plannedToday = schedule
    .find((d) => d.dayKey === getParisDayKey(0))
    ?.sessions.find((s) => s.status === 'upcoming');
  const planned = plannedToday && order.find((w) => w.id === plannedToday.workoutId);
  if (planned) return { workout: planned, reason: "Prévue aujourd'hui" };

  return { workout: order[0], reason: 'Début de rotation' };
};
