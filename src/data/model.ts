// Single source of truth for every stat of the app: dated histories only.
// Everything shown (records, gains, curves, current weight, checked days, totals, kcal)
// is derived from these lists by the selectors in ./selectors.ts.

export const DATA_KEY = 'volt_data_v2';
export const DATA_VERSION = 2;

/** ISO calendar date (yyyy-mm-dd), local time */
export type ISODate = string;

export interface PREntry {
  id: string;
  date: ISODate;
  weightKg: number;
  reps?: number;
  notes?: string;
}

export interface TrackedExercise {
  id: string;
  name: string;
  category?: string;
  color?: string;
  /** Starting load ("poids de départ"), edited by the user; falls back to the first entry */
  startKg?: number;
  /** Goal shown on the "Charges max" bar */
  targetKg?: number;
  /** Displayed in the "Charges maximales (1RM)" card */
  showInMaxCharges: boolean;
  history: PREntry[];
}

export interface BodyMetricEntry {
  id: string;
  date: ISODate;
  weightKg?: number;
  fatPercent?: number;
  fatKg?: number;
  leanMassKg?: number;
  muscleMassKg?: number;
  boneMassKg?: number;
  organMassKg?: number;
  waterLiters?: number;
  formula?: string;
}

export interface CompletedSession {
  id: string;
  date: ISODate;
  /** 'app' = finished in the live workout screen, 'manual' = day checked by hand */
  source: 'app' | 'manual';
  workoutId?: string;
  title: string;
  durationSec: number;
  kcal: number;
  volumeKg: number;
}

export interface VoltData {
  version: number;
  exercises: TrackedExercise[];
  bodyMetrics: BodyMetricEntry[];
  sessions: CompletedSession[];
  /** Sessions and kcal done before the app tracked each session (editable starting point) */
  baseline: { sessions: number; kcal: number };
}

export const emptyData = (): VoltData => ({
  version: DATA_VERSION,
  exercises: [],
  bodyMetrics: [],
  sessions: [],
  baseline: { sessions: 0, kcal: 0 },
});

export const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

const pad = (n: number) => String(n).padStart(2, '0');

export const toISODate = (d: Date): ISODate => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const todayISO = (): ISODate => toISODate(new Date());

export const parseISODate = (iso: ISODate): Date => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};

/** Short French label for charts and lists, e.g. "15 janv." */
export const formatShortDate = (iso: ISODate): string =>
  parseISODate(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });

// --- Validation (used by every mutation) ---

/** Finite number within realistic bounds, rounded to 0.1; otherwise null */
export const sanitizeNumber = (value: unknown, min: number, max: number): number | null => {
  const n = typeof value === 'string' ? parseFloat(value.replace(',', '.')) : Number(value);
  if (!Number.isFinite(n) || n < min || n > max) return null;
  return Math.round(n * 10) / 10;
};

export const LIMITS = {
  loadKg: [0, 600],
  reps: [0, 100],
  bodyWeightKg: [25, 350],
  percent: [0, 80],
  massKg: [0, 300],
  waterL: [0, 120],
  durationSec: [0, 6 * 3600],
  kcal: [0, 10000],
  volumeKg: [0, 200000],
  baselineSessions: [0, 100000],
  baselineKcal: [0, 10000000],
} as const;
