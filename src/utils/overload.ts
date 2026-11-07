import { CompletedSession, LoggedSet } from '../data/model';

// Progressive overload: "double progression". Stay at the same load and add reps until the top of the
// rep range is reached on every set, then raise the load and go back to the bottom of the range.

export interface RepRange {
  min: number;
  max: number;
}

export const DEFAULT_REP_RANGE: RepRange = { min: 8, max: 12 };

/** "8-12" -> 8..12, "10" / 10 -> 10..10, anything else (0, "max", "") -> null */
export const parseRepRange = (reps: number | string | undefined | null): RepRange | null => {
  if (typeof reps === 'number') return reps > 0 ? { min: reps, max: reps } : null;
  if (typeof reps !== 'string') return null;
  const m = reps.match(/^\s*(\d+)\s*(?:[-–à]\s*(\d+))?\s*$/);
  if (!m) return null;
  const a = parseInt(m[1], 10);
  const b = m[2] ? parseInt(m[2], 10) : a;
  if (a <= 0 || b <= 0) return null;
  return { min: Math.min(a, b), max: Math.max(a, b) };
};

const norm = (name: string) => name.trim().toLowerCase();

export interface LastPerformance {
  date: string;
  /** Working sets only (warm-ups removed), in the order they were done */
  sets: LoggedSet[];
  notes?: string;
  sessionNotes?: string;
}

/** Most recent session that logged `exerciseName` with at least one working set */
export const lastPerformance = (sessions: CompletedSession[], exerciseName: string): LastPerformance | null => {
  const wanted = norm(exerciseName);
  const sorted = [...sessions].sort((a, b) => b.date.localeCompare(a.date));
  for (const s of sorted) {
    const ex = s.exercises?.find((e) => norm(e.name) === wanted);
    const sets = ex?.sets.filter((st) => !st.warmup && st.weightKg > 0 && st.reps > 0) ?? [];
    if (ex && sets.length) return { date: s.date, sets, notes: ex.notes, sessionNotes: s.notes };
  }
  return null;
};

/** "60kg x 10" */
export const formatSet = (set: LoggedSet | undefined): string => (set ? `${set.weightKg}kg x ${set.reps}` : '-');

export interface OverloadSuggestion {
  weightKg: number;
  reps: number;
  kind: 'increase-load' | 'add-rep';
  reason: string;
}

const roundToStep = (v: number, step = 0.25) => Math.round(v / step) * step;
const loadIncrement = (weightKg: number) => (weightKg < 20 ? 1 : 2.5);

export const suggestNext = (last: LastPerformance, range: RepRange | null = null): OverloadSuggestion | null => {
  if (!last.sets.length) return null;
  const { min, max } = range ?? DEFAULT_REP_RANGE;
  const topWeight = Math.max(...last.sets.map((s) => s.weightKg));
  const atTop = last.sets.filter((s) => s.weightKg === topWeight);
  const weakestReps = Math.min(...atTop.map((s) => s.reps));

  if (weakestReps >= max) {
    const next = roundToStep(topWeight + loadIncrement(topWeight));
    return {
      weightKg: next,
      reps: min,
      kind: 'increase-load',
      reason: `Toutes les séries à ${topWeight} kg ont atteint ${max} reps : on monte la charge.`,
    };
  }
  return {
    weightKg: topWeight,
    reps: Math.max(weakestReps + 1, min),
    kind: 'add-rep',
    reason: `Garde ${topWeight} kg et vise 1 rep de plus (objectif ${max}) avant d'augmenter.`,
  };
};
