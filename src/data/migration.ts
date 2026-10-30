import { MeasurementEntry, PersonalRecord, UserStats } from '../types';
import { BodyMetricEntry, DATA_VERSION, ISODate, TrackedExercise, VoltData, emptyData, newId, toISODate, todayISO } from './model';
import { weekDates } from './selectors';
import { DAY_KEYS } from '../utils/dates';

// Versioned migration: builds the v2 dated histories from the v1 keys at first launch.
// The v1 keys are only read, never deleted, so nothing can be lost.

interface LegacyMaxCharge {
  id: string;
  label: string;
  val: number;
  target: number;
  color: string;
}

export interface LegacySources {
  prs?: PersonalRecord[];
  maxCharges?: LegacyMaxCharge[];
  measurements?: MeasurementEntry[];
  userStats?: Partial<UserStats>;
  checkedDays?: Record<string, boolean>;
}

const MONTHS: Record<string, number> = {
  jan: 0, janv: 0, fev: 1, fevr: 1, mar: 2, mars: 2, avr: 3, avri: 3, mai: 4, juin: 5, jun: 5, juil: 6, jul: 6,
  aou: 7, aout: 7, sep: 8, sept: 8, oct: 9, nov: 10, dec: 11,
};

const stripAccents = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');

/**
 * Converts the v1 free-text dates ("15 Jan", "Aujourd'hui", "Il y a 3 jours", ISO…) to ISO.
 * Dates without a year are assumed to be in the reference year (or the previous one if that would be in the future).
 */
export const parseLegacyDate = (raw: string | undefined, ref: Date = new Date()): ISODate => {
  if (!raw) return toISODate(ref);
  const text = stripAccents(raw.trim().toLowerCase());
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);
  if (text.startsWith('aujourd')) return toISODate(ref);
  if (text.startsWith('hier')) return toISODate(new Date(ref.getFullYear(), ref.getMonth(), ref.getDate() - 1));
  const ago = text.match(/il y a (\d+) (jour|semaine|mois)/);
  if (ago) {
    const n = Number(ago[1]);
    const days = ago[2] === 'jour' ? n : ago[2] === 'semaine' ? n * 7 : n * 30;
    return toISODate(new Date(ref.getFullYear(), ref.getMonth(), ref.getDate() - days));
  }
  const dm = text.match(/^(\d{1,2})[\s/-]+([a-z]+)\.?(?:[\s/-]+(\d{4}))?/);
  if (dm) {
    const month = MONTHS[dm[2]] ?? MONTHS[dm[2].slice(0, 3)];
    if (month !== undefined) {
      let year = dm[3] ? Number(dm[3]) : ref.getFullYear();
      const candidate = new Date(year, month, Number(dm[1]));
      if (!dm[3] && candidate > ref) year -= 1;
      return toISODate(new Date(year, month, Number(dm[1])));
    }
  }
  const numeric = text.match(/^(\d{1,2})-(\d{1,2})-(\d{4})/);
  if (numeric) return toISODate(new Date(Number(numeric[3]), Number(numeric[2]) - 1, Number(numeric[1])));
  return toISODate(ref);
};

/** Maps the v1 1RM labels ("DC (Bench)", "Deadlift"…) and measurement types to the same exercise */
const exerciseKind = (name: string): string | null => {
  const n = stripAccents(name.toLowerCase());
  if (/bench|couche|\bdc\b/.test(n)) return 'bench';
  if (/squat/.test(n)) return 'squat';
  if (/deadlift|terre/.test(n)) return 'deadlift';
  if (/overhead|militaire|\bohp\b/.test(n)) return 'overhead';
  return null;
};

const DEFAULT_MAX_CHARGES: LegacyMaxCharge[] = [
  { id: '1rm-bench', label: 'DC (Bench)', val: 105, target: 110, color: '#EC4899' },
  { id: '1rm-squat', label: 'Squat', val: 140, target: 150, color: '#7C3AED' },
  { id: '1rm-deadlift', label: 'Deadlift', val: 170, target: 180, color: '#00C6FF' },
  { id: '1rm-overhead', label: 'Overhead', val: 65, target: 70, color: '#FF512F' },
];

const upsertEntry = (ex: TrackedExercise, date: ISODate, weightKg: number, extra: { reps?: number; notes?: string } = {}) => {
  if (!Number.isFinite(weightKg) || weightKg <= 0) return;
  const same = ex.history.find((h) => h.date === date && h.weightKg === weightKg);
  if (!same) ex.history.push({ id: newId('pr'), date, weightKg, ...extra });
};

export const migrateV1 = (src: LegacySources, ref: Date = new Date()): VoltData => {
  const data = emptyData();
  const today = toISODate(ref);

  // Records: every PR with its history; previousWeightKg was displayed as the starting load
  for (const pr of src.prs ?? []) {
    const ex: TrackedExercise = {
      id: pr.id,
      name: pr.exercise,
      category: pr.category,
      startKg: Number.isFinite(pr.previousWeightKg) ? pr.previousWeightKg : undefined,
      showInMaxCharges: false,
      history: [],
    };
    for (const h of pr.history ?? []) {
      upsertEntry(ex, parseLegacyDate(h.date, ref), h.weightKg, { reps: h.reps, notes: h.notes });
    }
    const best = ex.history.length ? Math.max(...ex.history.map((h) => h.weightKg)) : 0;
    if (pr.weightKg > best) upsertEntry(ex, parseLegacyDate(pr.date, ref), pr.weightKg);
    data.exercises.push(ex);
  }

  const findByKind = (kind: string | null) =>
    kind ? data.exercises.find((e) => exerciseKind(e.name) === kind) : undefined;

  // "Charges max" bars: attach target/colour to the matching record, keep a higher value as an entry
  for (const mc of src.maxCharges ?? DEFAULT_MAX_CHARGES) {
    let ex = findByKind(exerciseKind(mc.label)) ?? data.exercises.find((e) => e.name.toLowerCase() === mc.label.toLowerCase());
    if (!ex) {
      ex = { id: mc.id, name: mc.label, showInMaxCharges: true, history: [] };
      data.exercises.push(ex);
    }
    ex.showInMaxCharges = true;
    ex.targetKg = mc.target;
    ex.color = mc.color;
    const best = ex.history.length ? Math.max(...ex.history.map((h) => h.weightKg)) : 0;
    if (mc.val > best) upsertEntry(ex, today, mc.val);
  }

  // Measurements: body weight → body metrics, lifts → record entries
  for (const m of src.measurements ?? []) {
    const date = Number.isFinite(m.timestamp) ? toISODate(new Date(m.timestamp)) : parseLegacyDate(m.dateStr, ref);
    if (m.metricType === 'poids') {
      data.bodyMetrics.push({ id: m.id || newId('bm'), date, weightKg: m.value });
      continue;
    }
    if (m.metricType === 'volume') continue; // weekly volume is now computed from sessions
    const name = m.exerciseName || m.metricType;
    let ex = findByKind(exerciseKind(name)) ?? data.exercises.find((e) => e.name.toLowerCase() === name.toLowerCase());
    if (!ex) {
      ex = { id: newId('ex'), name, showInMaxCharges: false, history: [] };
      data.exercises.push(ex);
    }
    upsertEntry(ex, date, m.value, { notes: m.notes });
  }

  const us = src.userStats ?? {};

  // Body composition snapshot → dated entry (merged with a weigh-in of the same day)
  const bc = us.bodyComposition;
  if (bc) {
    const date = parseLegacyDate(bc.date, ref);
    const entry: BodyMetricEntry = {
      id: newId('bm'),
      date,
      fatPercent: bc.fatPercent,
      fatKg: bc.fatKg,
      leanMassKg: bc.leanMassKg,
      muscleMassKg: bc.muscleMassKg,
      boneMassKg: bc.boneMassKg,
      organMassKg: bc.organMassKg,
      waterLiters: bc.waterLiters,
      formula: bc.formula,
    };
    const sameDay = data.bodyMetrics.find((b) => b.date === date);
    if (sameDay) Object.assign(sameDay, { ...entry, id: sameDay.id, weightKg: sameDay.weightKg });
    else data.bodyMetrics.push(entry);
  }

  // Current weight typed elsewhere: keep it as today's weigh-in if it differs from the latest one
  const weights = data.bodyMetrics.filter((b) => typeof b.weightKg === 'number').sort((a, b) => a.date.localeCompare(b.date));
  const latest = weights[weights.length - 1];
  if (typeof us.currentWeightKg === 'number' && us.currentWeightKg > 0 && (!latest || latest.weightKg !== us.currentWeightKg)) {
    const todayEntry = data.bodyMetrics.find((b) => b.date === today);
    if (todayEntry) todayEntry.weightKg = us.currentWeightKg;
    else data.bodyMetrics.push({ id: newId('bm'), date: today, weightKg: us.currentWeightKg });
  }

  // Checked days of the current week → manual sessions on the matching dates
  const dates = weekDates(ref);
  DAY_KEYS.forEach((key, i) => {
    if (src.checkedDays?.[key] && dates[i] <= today) {
      data.sessions.push({ id: newId('ses'), date: dates[i], source: 'manual', title: 'Séance', durationSec: 0, kcal: 0, volumeKg: 0 });
    }
  });

  // Totals typed before session tracking become the editable starting point
  data.baseline = {
    sessions: Math.max(0, (us.totalWorkouts ?? 0) - data.sessions.length),
    kcal: Math.max(0, us.totalCaloriesBurned ?? 0),
  };

  data.version = DATA_VERSION;
  return data;
};

/** Brings stored data of any version to the current one */
export const upgradeData = (stored: VoltData): VoltData => {
  const base = emptyData();
  return {
    ...base,
    ...stored,
    baseline: { ...base.baseline, ...(stored.baseline ?? {}) },
    exercises: Array.isArray(stored.exercises) ? stored.exercises : [],
    bodyMetrics: Array.isArray(stored.bodyMetrics) ? stored.bodyMetrics : [],
    sessions: Array.isArray(stored.sessions) ? stored.sessions : [],
    version: DATA_VERSION,
  };
};

export { todayISO };
