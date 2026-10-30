import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { MeasurementEntry, PersonalRecord, UserStats } from '../types';
import { initialUserStats, sampleMeasurements, samplePersonalRecords } from './mockData';
import { loadJSON, saveJSON } from '../utils/storage';
import {
  BodyMetricEntry,
  CompletedSession,
  DATA_KEY,
  ISODate,
  LIMITS,
  PREntry,
  TrackedExercise,
  VoltData,
  newId,
  sanitizeNumber,
  todayISO,
} from './model';
import { migrateV1, upgradeData } from './migration';

// Loads (or migrates once) the dated histories, persists every change, and exposes validated mutations.

const loadData = (): VoltData => {
  const stored = loadJSON<VoltData | null>(DATA_KEY, null);
  if (stored && typeof stored === 'object') return upgradeData(stored);
  const migrated = migrateV1({
    prs: loadJSON<PersonalRecord[]>('volt_prs', samplePersonalRecords),
    maxCharges: loadJSON('volt_1rm_exercises', undefined),
    measurements: loadJSON<MeasurementEntry[]>('volt_measurements', sampleMeasurements),
    userStats: loadJSON<Partial<UserStats>>('volt_user_stats', initialUserStats),
    checkedDays: loadJSON<Record<string, boolean>>('volt_planning_checked_days', {}),
  });
  saveJSON(DATA_KEY, migrated);
  return migrated;
};

const clampLoad = (v: unknown) => sanitizeNumber(v, LIMITS.loadKg[0], LIMITS.loadKg[1]);

export interface VoltDataApi {
  data: VoltData;
  // Records
  addExercise: (name: string, opts?: Partial<Pick<TrackedExercise, 'category' | 'color' | 'startKg' | 'targetKg' | 'showInMaxCharges'>>) => string | null;
  updateExercise: (id: string, patch: Partial<Pick<TrackedExercise, 'name' | 'category' | 'color' | 'startKg' | 'targetKg' | 'showInMaxCharges'>>) => void;
  deleteExercise: (id: string) => void;
  /** Creates the entry of `date` (today by default) or updates the one already logged that day */
  logRecord: (exerciseId: string, entry: { weightKg: number; reps?: number; notes?: string; date?: ISODate }) => boolean;
  updateRecordEntry: (exerciseId: string, entryId: string, patch: Partial<Omit<PREntry, 'id'>>) => boolean;
  deleteRecordEntry: (exerciseId: string, entryId: string) => void;
  // Body
  /** Adds or merges the body metrics of `date` (today by default) */
  logBodyMetrics: (patch: Partial<Omit<BodyMetricEntry, 'id' | 'date'>>, date?: ISODate) => boolean;
  deleteBodyMetric: (id: string) => void;
  /** Removes only the weigh-in of an entry (the entry disappears if nothing else is left) */
  clearBodyWeight: (id: string) => void;
  // Sessions
  addSession: (s: Omit<CompletedSession, 'id'>) => void;
  deleteSession: (id: string) => void;
  /** Checks a day (adds a manual session) or unchecks it (removes every session of that day) */
  setDayChecked: (date: ISODate, checked: boolean) => void;
  setBaseline: (patch: Partial<VoltData['baseline']>) => void;
}

const VoltDataContext = createContext<VoltDataApi | null>(null);

export const VoltDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [data, setData] = useState<VoltData>(loadData);

  useEffect(() => {
    saveJSON(DATA_KEY, data);
  }, [data]);

  const updateExercises = useCallback((fn: (list: TrackedExercise[]) => TrackedExercise[]) => {
    setData((d) => ({ ...d, exercises: fn(d.exercises) }));
  }, []);

  const addExercise: VoltDataApi['addExercise'] = useCallback(
    (name: string, opts: Parameters<VoltDataApi['addExercise']>[1] = {}) => {
      const clean = name.trim();
      if (!clean) return null;
      const id = newId('ex');
      updateExercises((list) => [
        ...list,
        {
          id,
          name: clean,
          category: opts.category,
          color: opts.color,
          startKg: opts.startKg === undefined ? undefined : clampLoad(opts.startKg) ?? undefined,
          targetKg: opts.targetKg === undefined ? undefined : clampLoad(opts.targetKg) ?? undefined,
          showInMaxCharges: Boolean(opts.showInMaxCharges),
          history: [],
        },
      ]);
      return id;
    },
    [updateExercises]
  );

  const updateExercise: VoltDataApi['updateExercise'] = useCallback(
    (id, patch) => {
      updateExercises((list) =>
        list.map((ex) => {
          if (ex.id !== id) return ex;
          const next = { ...ex, ...patch };
          if (patch.name !== undefined) next.name = patch.name.trim() || ex.name;
          if ('startKg' in patch) next.startKg = patch.startKg === undefined ? undefined : clampLoad(patch.startKg) ?? ex.startKg;
          if ('targetKg' in patch) next.targetKg = patch.targetKg === undefined ? undefined : clampLoad(patch.targetKg) ?? ex.targetKg;
          return next;
        })
      );
    },
    [updateExercises]
  );

  const deleteExercise = useCallback((id: string) => updateExercises((list) => list.filter((ex) => ex.id !== id)), [updateExercises]);

  const logRecord: VoltDataApi['logRecord'] = useCallback(
    (exerciseId, entry) => {
      const weightKg = clampLoad(entry.weightKg);
      if (weightKg === null || weightKg <= 0) return false;
      const reps = entry.reps === undefined ? undefined : sanitizeNumber(entry.reps, LIMITS.reps[0], LIMITS.reps[1]) ?? undefined;
      const date = entry.date || todayISO();
      updateExercises((list) =>
        list.map((ex) => {
          if (ex.id !== exerciseId) return ex;
          const sameDay = ex.history.find((h) => h.date === date);
          const history = sameDay
            ? ex.history.map((h) => (h.id === sameDay.id ? { ...h, weightKg, reps: reps ?? h.reps, notes: entry.notes ?? h.notes } : h))
            : [...ex.history, { id: newId('pr'), date, weightKg, reps, notes: entry.notes }];
          return { ...ex, history };
        })
      );
      return true;
    },
    [updateExercises]
  );

  const updateRecordEntry: VoltDataApi['updateRecordEntry'] = useCallback(
    (exerciseId, entryId, patch) => {
      if (patch.weightKg !== undefined && (clampLoad(patch.weightKg) ?? 0) <= 0) return false;
      updateExercises((list) =>
        list.map((ex) =>
          ex.id !== exerciseId
            ? ex
            : {
                ...ex,
                history: ex.history.map((h) =>
                  h.id !== entryId
                    ? h
                    : {
                        ...h,
                        ...patch,
                        weightKg: patch.weightKg === undefined ? h.weightKg : clampLoad(patch.weightKg)!,
                        reps: patch.reps === undefined ? h.reps : sanitizeNumber(patch.reps, LIMITS.reps[0], LIMITS.reps[1]) ?? h.reps,
                      }
                ),
              }
        )
      );
      return true;
    },
    [updateExercises]
  );

  const deleteRecordEntry = useCallback(
    (exerciseId: string, entryId: string) =>
      updateExercises((list) => list.map((ex) => (ex.id !== exerciseId ? ex : { ...ex, history: ex.history.filter((h) => h.id !== entryId) }))),
    [updateExercises]
  );

  const logBodyMetrics: VoltDataApi['logBodyMetrics'] = useCallback((patch, date = todayISO()) => {
    const bounds: Record<string, readonly [number, number]> = {
      weightKg: LIMITS.bodyWeightKg,
      fatPercent: LIMITS.percent,
      fatKg: LIMITS.massKg,
      leanMassKg: LIMITS.massKg,
      muscleMassKg: LIMITS.massKg,
      boneMassKg: LIMITS.massKg,
      organMassKg: LIMITS.massKg,
      waterLiters: LIMITS.waterL,
    };
    const clean: Partial<BodyMetricEntry> = {};
    for (const [key, value] of Object.entries(patch)) {
      if (key === 'formula') {
        if (typeof value === 'string') clean.formula = value;
        continue;
      }
      if (value === undefined || !(key in bounds)) continue;
      const n = sanitizeNumber(value, bounds[key][0], bounds[key][1]);
      if (n === null) return false;
      (clean as Record<string, number>)[key] = n;
    }
    if (Object.keys(clean).length === 0) return false;
    setData((d) => {
      const existing = d.bodyMetrics.find((m) => m.date === date);
      const bodyMetrics = existing
        ? d.bodyMetrics.map((m) => (m.id === existing.id ? { ...m, ...clean } : m))
        : [...d.bodyMetrics, { id: newId('bm'), date, ...clean }];
      return { ...d, bodyMetrics };
    });
    return true;
  }, []);

  const deleteBodyMetric = useCallback((id: string) => setData((d) => ({ ...d, bodyMetrics: d.bodyMetrics.filter((m) => m.id !== id) })), []);

  const clearBodyWeight = useCallback((id: string) => {
    setData((d) => ({
      ...d,
      bodyMetrics: d.bodyMetrics.flatMap((m) => {
        if (m.id !== id) return [m];
        const { weightKg: _w, ...rest } = m;
        const hasOther = Object.entries(rest).some(([k, v]) => !['id', 'date', 'formula'].includes(k) && typeof v === 'number');
        return hasOther ? [rest] : [];
      }),
    }));
  }, []);

  const addSession = useCallback((s: Omit<CompletedSession, 'id'>) => {
    const session: CompletedSession = {
      ...s,
      durationSec: sanitizeNumber(s.durationSec, LIMITS.durationSec[0], LIMITS.durationSec[1]) ?? 0,
      kcal: Math.round(sanitizeNumber(s.kcal, LIMITS.kcal[0], LIMITS.kcal[1]) ?? 0),
      volumeKg: sanitizeNumber(s.volumeKg, LIMITS.volumeKg[0], LIMITS.volumeKg[1]) ?? 0,
      id: newId('ses'),
    };
    setData((d) => ({ ...d, sessions: [...d.sessions, session] }));
  }, []);

  const deleteSession = useCallback((id: string) => setData((d) => ({ ...d, sessions: d.sessions.filter((s) => s.id !== id) })), []);

  const setDayChecked = useCallback((date: ISODate, checked: boolean) => {
    setData((d) => {
      const hasSession = d.sessions.some((s) => s.date === date);
      if (checked && !hasSession) {
        return {
          ...d,
          sessions: [...d.sessions, { id: newId('ses'), date, source: 'manual', title: 'Séance hors appli', durationSec: 0, kcal: 0, volumeKg: 0 }],
        };
      }
      if (!checked && hasSession) return { ...d, sessions: d.sessions.filter((s) => s.date !== date) };
      return d;
    });
  }, []);

  const setBaseline = useCallback((patch: Partial<VoltData['baseline']>) => {
    setData((d) => ({
      ...d,
      baseline: {
        sessions:
          patch.sessions === undefined
            ? d.baseline.sessions
            : Math.round(sanitizeNumber(patch.sessions, LIMITS.baselineSessions[0], LIMITS.baselineSessions[1]) ?? d.baseline.sessions),
        kcal:
          patch.kcal === undefined
            ? d.baseline.kcal
            : Math.round(sanitizeNumber(patch.kcal, LIMITS.baselineKcal[0], LIMITS.baselineKcal[1]) ?? d.baseline.kcal),
      },
    }));
  }, []);

  const api = useMemo<VoltDataApi>(
    () => ({
      data,
      addExercise,
      updateExercise,
      deleteExercise,
      logRecord,
      updateRecordEntry,
      deleteRecordEntry,
      logBodyMetrics,
      deleteBodyMetric,
      clearBodyWeight,
      addSession,
      deleteSession,
      setDayChecked,
      setBaseline,
    }),
    [data, addExercise, updateExercise, deleteExercise, logRecord, updateRecordEntry, deleteRecordEntry, logBodyMetrics, deleteBodyMetric, clearBodyWeight, addSession, deleteSession, setDayChecked, setBaseline]
  );

  return <VoltDataContext.Provider value={api}>{children}</VoltDataContext.Provider>;
};

export const useVoltData = (): VoltDataApi => {
  const ctx = useContext(VoltDataContext);
  if (!ctx) throw new Error('useVoltData must be used inside <VoltDataProvider>');
  return ctx;
};
