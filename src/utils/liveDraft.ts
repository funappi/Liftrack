import { Workout, WorkoutExerciseSession } from '../types';
import { loadJSON, saveJSON } from './storage';

// A live session survives a closed tab, a phone lock or an app kill: the draft is rewritten on every change
// and removed when the session is finished or abandoned.

export const LIVE_DRAFT_KEY = 'volt_live_draft';

export interface LiveDraft {
  workout: Workout;
  title: string;
  elapsedSeconds: number;
  exercises: WorkoutExerciseSession[];
  sessionNotes: string;
  savedAt: string;
}

export const loadLiveDraft = (): LiveDraft | null => {
  const d = loadJSON<LiveDraft | null>(LIVE_DRAFT_KEY, null);
  if (!d || typeof d !== 'object' || !d.workout || !Array.isArray(d.exercises) || d.exercises.length === 0) return null;
  return { ...d, sessionNotes: d.sessionNotes ?? '', elapsedSeconds: Number(d.elapsedSeconds) || 0, title: d.title || d.workout.title };
};

export const saveLiveDraft = (draft: LiveDraft): void => saveJSON(LIVE_DRAFT_KEY, draft);

export const clearLiveDraft = (): void => {
  try {
    localStorage.removeItem(LIVE_DRAFT_KEY);
  } catch {
    // ignore
  }
};

// A draft is worth proposing only if something was actually done
export const draftHasProgress = (d: LiveDraft): boolean =>
  d.elapsedSeconds > 0 || d.exercises.some((e) => e.sets.some((s) => s.completed));
