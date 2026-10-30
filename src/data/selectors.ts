import { BodyMetricEntry, CompletedSession, ISODate, PREntry, TrackedExercise, VoltData, toISODate } from './model';
import { DAY_KEYS, DayKey } from '../utils/dates';

// Derived values only: nothing here is ever stored.

const byDate = <T extends { date: ISODate }>(a: T, b: T) => a.date.localeCompare(b.date);

// --- Records ---

export const sortedHistory = (ex: TrackedExercise): PREntry[] => [...ex.history].sort(byDate);

/** Current record = heaviest load ever logged (a weaker day never lowers the record) */
export const currentPR = (ex: TrackedExercise): number | null =>
  ex.history.length ? Math.max(...ex.history.map((h) => h.weightKg)) : null;

/** Starting load = value set by the user, otherwise the first logged entry */
export const startPR = (ex: TrackedExercise): number | null => {
  if (typeof ex.startKg === 'number') return ex.startKg;
  const first = sortedHistory(ex)[0];
  return first ? first.weightKg : null;
};

export const prGain = (ex: TrackedExercise): number | null => {
  const cur = currentPR(ex);
  const start = startPR(ex);
  return cur === null || start === null ? null : Math.round((cur - start) * 10) / 10;
};

/** Progress since the starting load, in % (null when it cannot be computed) */
export const prProgressPct = (ex: TrackedExercise): number | null => {
  const cur = currentPR(ex);
  const start = startPR(ex);
  if (cur === null || start === null || start <= 0) return null;
  return Math.round(((cur - start) / start) * 1000) / 10;
};

export const maxChargesExercises = (data: VoltData) => data.exercises.filter((e) => e.showInMaxCharges);

/** Average progress of the "Charges max" exercises (replaces the hard-coded "+12.5%") */
export const averageMaxChargesProgress = (data: VoltData): number | null => {
  const values = maxChargesExercises(data)
    .map(prProgressPct)
    .filter((v): v is number => v !== null);
  return values.length ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10 : null;
};

export const findExerciseByName = (data: VoltData, name: string) =>
  data.exercises.find((e) => e.name.trim().toLowerCase() === name.trim().toLowerCase());

// --- Body ---

export const weightSeries = (data: VoltData): { date: ISODate; weightKg: number }[] =>
  data.bodyMetrics
    .filter((m): m is BodyMetricEntry & { weightKg: number } => typeof m.weightKg === 'number')
    .sort(byDate)
    .map((m) => ({ date: m.date, weightKg: m.weightKg }));

/** Current body weight = most recent dated weigh-in (not the last one typed) */
export const currentWeight = (data: VoltData): number | null => {
  const s = weightSeries(data);
  return s.length ? s[s.length - 1].weightKg : null;
};

const compositionSeries = (data: VoltData) =>
  data.bodyMetrics.filter((m) => typeof m.fatPercent === 'number').sort(byDate);

export const latestComposition = (data: VoltData): BodyMetricEntry | null => {
  const s = compositionSeries(data);
  return s.length ? s[s.length - 1] : null;
};

// --- Sessions ---

/** Monday of the week containing `date` */
const weekStart = (date: Date): Date => {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
};

/** ISO dates of the 7 days (Mon→Sun) of the week containing `date` */
export const weekDates = (date: Date = new Date()): ISODate[] => {
  const start = weekStart(date);
  return DAY_KEYS.map((_, i) => toISODate(new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)));
};

export const dateOfDayKey = (dayKey: DayKey, ref: Date = new Date()): ISODate => weekDates(ref)[DAY_KEYS.indexOf(dayKey)];

export const sessionsOn = (data: VoltData, date: ISODate): CompletedSession[] => data.sessions.filter((s) => s.date === date);

/** Days of the current week with at least one completed session (app or manual) */
export const checkedDaysThisWeek = (data: VoltData, ref: Date = new Date()): Record<DayKey, boolean> => {
  const dates = weekDates(ref);
  const done = new Set(data.sessions.map((s) => s.date));
  return Object.fromEntries(DAY_KEYS.map((k, i) => [k, done.has(dates[i])])) as Record<DayKey, boolean>;
};

export const checkedDaysCount = (data: VoltData, ref: Date = new Date()) =>
  Object.values(checkedDaysThisWeek(data, ref)).filter(Boolean).length;

/** Total gym visits = earlier visits (baseline) + every logged session day */
export const totalVisits = (data: VoltData) => data.baseline.sessions + data.sessions.length;

export const totalKcal = (data: VoltData) => data.baseline.kcal + data.sessions.reduce((sum, s) => sum + s.kcal, 0);

const inRange = (s: CompletedSession, from: ISODate, to: ISODate) => s.date >= from && s.date <= to;

export const weeklyVolume = (data: VoltData, ref: Date = new Date()) => {
  const dates = weekDates(ref);
  return data.sessions.filter((s) => inRange(s, dates[0], dates[6])).reduce((sum, s) => sum + s.volumeKg, 0);
};

export const kcalThisMonth = (data: VoltData, ref: Date = new Date()) => {
  const prefix = toISODate(ref).slice(0, 7);
  return data.sessions.filter((s) => s.date.startsWith(prefix)).reduce((sum, s) => sum + s.kcal, 0);
};

/** Sessions per week for the last `weeks` weeks (oldest first), for the "Entraînements" chart */
export const sessionsPerWeek = (data: VoltData, weeks = 4, ref: Date = new Date()) => {
  const start = weekStart(ref);
  return Array.from({ length: weeks }, (_, i) => {
    const offset = weeks - 1 - i;
    const from = new Date(start.getFullYear(), start.getMonth(), start.getDate() - offset * 7);
    const dates = weekDates(from);
    return {
      label: offset === 0 ? 'Cette sem.' : `S-${offset}`,
      from: dates[0],
      count: data.sessions.filter((s) => inRange(s, dates[0], dates[6])).length,
    };
  });
};

/** Kcal per day for the last `days` days (oldest first), for the "Calories" chart */
export const kcalPerDay = (data: VoltData, days = 7, ref: Date = new Date()) =>
  Array.from({ length: days }, (_, i) => {
    const d = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate() - (days - 1 - i));
    const iso = toISODate(d);
    return {
      date: iso,
      label: d.toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', ''),
      kcal: data.sessions.filter((s) => s.date === iso).reduce((sum, s) => sum + s.kcal, 0),
    };
  });

