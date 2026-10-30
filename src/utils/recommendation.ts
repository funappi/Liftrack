import { ScheduledDay, Workout } from '../types';
import { getParisDayKey } from './dates';
import { loadJSON, saveJSON } from './storage';
import { isCustomWorkout } from './workouts';

const ROTATION_KEY = 'volt_rotation_order';

export const loadRotation = (): string[] => {
  const parsed = loadJSON<unknown>(ROTATION_KEY, []);
  return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
};

export const saveRotation = (order: string[]) => saveJSON(ROTATION_KEY, order);

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
