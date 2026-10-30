/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import { TabType, Workout, UserStats, AchievementBadge, ScheduledDay } from './types';
import { initialUserStats, sampleWorkouts, sampleWeekSchedule, sampleBadges } from './data/mockData';
import { useVoltData } from './data/VoltDataContext';
import { todayISO } from './data/model';
import { currentWeight, latestComposition, totalKcal, totalVisits, checkedDaysCount } from './data/selectors';
import { Header } from './components/Header';
import { Navbar } from './components/Navbar';
import { HomeTab } from './components/HomeTab';
import { WorkoutsTab } from './components/WorkoutsTab';
import { ProgressionTab } from './components/ProgressionTab';
import { WorkoutDetailModal } from './components/WorkoutDetailModal';
import { LiveWorkoutView } from './components/LiveWorkoutView';
import { loadJSON, saveJSON } from './utils/storage';
import { CUSTOM_WORKOUT_PREFIX, isCustomWorkout } from './utils/workouts';
import { DayKey, getParisDayKey } from './utils/dates';
import { applyThemeToDocument, getThemeBase, loadThemeId, saveThemeId } from './themes';
import { startNotificationScheduler } from './utils/notifications';
import { SettingsScreen, SettingsSectionId } from './components/SettingsScreen';

// Heavy modals only opened on demand: loaded in separate chunks
const WorkoutFinishedModal = lazy(() =>
  import('./components/WorkoutFinishedModal').then((m) => ({ default: m.WorkoutFinishedModal }))
);
const BodyCompositionModal = lazy(() =>
  import('./components/BodyCompositionModal').then((m) => ({ default: m.BodyCompositionModal }))
);

const CUSTOM_WORKOUTS_KEY = 'volt_custom_workouts';
const DELETED_WORKOUTS_KEY = 'volt_deleted_workout_ids';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('home');

  // Persisted user stats in localStorage
  const [userStats, setUserStats] = useState<UserStats>(() => loadJSON('volt_user_stats', initialUserStats));

  const [workouts, setWorkouts] = useState<Workout[]>(() => {
    const deletedIds = loadJSON<string[]>(DELETED_WORKOUTS_KEY, []);
    const samples = sampleWorkouts.filter((w) => !deletedIds.includes(w.id));
    const custom = loadJSON<Workout[]>(CUSTOM_WORKOUTS_KEY, []);
    return Array.isArray(custom) ? [...custom, ...samples] : samples;
  });

  const handleSaveCustomWorkout = (workout: Workout, launchImmediately = false) => {
    setWorkouts((prev) => {
      const withoutThis = prev.filter((w) => w.id !== workout.id);
      const updated = [workout, ...withoutThis];
      saveJSON(CUSTOM_WORKOUTS_KEY, updated.filter(isCustomWorkout));
      return updated;
    });

    if (launchImmediately) {
      handleStartWorkout(workout);
    }
  };

  // Single delete path for every workout: library, persistence and its planning slots
  const handleDeleteWorkout = (workoutId: string) => {
    setWorkouts((prev) => prev.filter((w) => w.id !== workoutId));
    if (workoutId.startsWith(CUSTOM_WORKOUT_PREFIX)) {
      saveJSON(CUSTOM_WORKOUTS_KEY, loadJSON<Workout[]>(CUSTOM_WORKOUTS_KEY, []).filter((w) => w.id !== workoutId));
    } else {
      const ids = loadJSON<string[]>(DELETED_WORKOUTS_KEY, []);
      if (!ids.includes(workoutId)) saveJSON(DELETED_WORKOUTS_KEY, [...ids, workoutId]);
    }
    setSchedule((prev) => {
      const updated = prev.map((day) => ({
        ...day,
        sessions: day.sessions.filter((sess) => sess.workoutId !== workoutId),
      }));
      saveJSON('volt_schedule', updated);
      return updated;
    });
  };

  const [themeId, setThemeId] = useState<string>(loadThemeId);
  const theme = getThemeBase(themeId);

  // Keep body classes in sync with the selected theme
  useEffect(() => {
    applyThemeToDocument(themeId);
  }, [themeId]);

  const handleApplyTheme = (id: string) => {
    saveThemeId(id);
    setThemeId(id);
  };

  const [schedule, setSchedule] = useState<ScheduledDay[]>(() => loadJSON('volt_schedule', sampleWeekSchedule));

  const handleScheduleWorkout = (dayKey: DayKey, workoutId: string) => {
    const targetWorkout = workouts.find((w) => w.id === workoutId);
    if (!targetWorkout) return;

    setSchedule((prev) => {
      const updated = prev.map((day) => {
        if (day.dayKey !== dayKey) return day;
        const newSession = {
          id: `s-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          workoutId: targetWorkout.id,
          workoutTitle: targetWorkout.title,
          durationMin: targetWorkout.durationMin,
          type: targetWorkout.category.toUpperCase(),
          status: 'upcoming' as const,
          gradientType: targetWorkout.gradientType || ('main' as const),
          calories: targetWorkout.estimatedCalories,
        };
        return {
          ...day,
          sessions: [...day.sessions, newSession],
        };
      });
      saveJSON('volt_schedule', updated);
      return updated;
    });
  };

  const handleRemoveScheduledWorkout = (dayKey: string, sessionId: string) => {
    setSchedule((prev) => {
      const updated = prev.map((day) => {
        if (day.dayKey !== dayKey) return day;
        return {
          ...day,
          sessions: day.sessions.filter((s) => s.id !== sessionId),
        };
      });
      saveJSON('volt_schedule', updated);
      return updated;
    });
  };
  // Persisted badges with unlocked and grayed-out locked achievements
  const [badges, setBadges] = useState<AchievementBadge[]>(() => {
    const saved = loadJSON<AchievementBadge[]>('volt_badges', []);
    if (!Array.isArray(saved) || saved.length === 0) return sampleBadges;
    const savedMap = new Map(saved.map((b) => [b.id, b]));
    return sampleBadges.map((sampleB) => {
      const existing = savedMap.get(sampleB.id);
      return existing ? { ...sampleB, ...existing, emoji: sampleB.emoji } : sampleB;
    });
  });

  // Latest data for the daily notification scheduler
  const scheduleRef = useRef(schedule);
  const workoutsRef = useRef(workouts);
  scheduleRef.current = schedule;
  workoutsRef.current = workouts;
  useEffect(() => startNotificationScheduler(() => ({ schedule: scheduleRef.current, workouts: workoutsRef.current })), []);

  // Modal & Live workout states
  const [selectedWorkoutForModal, setSelectedWorkoutForModal] = useState<Workout | null>(null);
  const [activeLiveWorkout, setActiveLiveWorkout] = useState<Workout | null>(null);
  const [showBodyCompositionModal, setShowBodyCompositionModal] = useState(false);
  const [settingsSection, setSettingsSection] = useState<SettingsSectionId | null>(null);
  const [finishedSummary, setFinishedSummary] = useState<{
    workout: Workout;
    durationSeconds: number;
    completedSetsCount: number;
    totalVolumeKg: number;
  } | null>(null);

  const voltData = useVoltData();
  const { data, logBodyMetrics, addSession, setBaseline } = voltData;

  // User stats shown everywhere: counters, weight and composition are derived from the histories
  const stats = useMemo<UserStats>(() => {
    const composition = latestComposition(data);
    return {
      ...userStats,
      currentWeightKg: currentWeight(data) ?? userStats.currentWeightKg,
      totalWorkouts: totalVisits(data),
      totalCaloriesBurned: totalKcal(data),
      weeklyCompletedWorkouts: checkedDaysCount(data),
      streakDays: 0,
      bodyComposition:
        composition && userStats.bodyComposition
          ? {
              ...userStats.bodyComposition,
              fatPercent: composition.fatPercent ?? userStats.bodyComposition.fatPercent,
              fatKg: composition.fatKg ?? userStats.bodyComposition.fatKg,
              leanMassKg: composition.leanMassKg ?? userStats.bodyComposition.leanMassKg,
              muscleMassKg: composition.muscleMassKg ?? userStats.bodyComposition.muscleMassKg,
              boneMassKg: composition.boneMassKg ?? userStats.bodyComposition.boneMassKg,
              organMassKg: composition.organMassKg ?? userStats.bodyComposition.organMassKg,
              waterLiters: composition.waterLiters ?? userStats.bodyComposition.waterLiters,
              date: composition.date,
            }
          : userStats.bodyComposition,
    };
  }, [userStats, data]);

  // Writes: derived fields go to the histories, the rest to the stored profile
  const handleUpdateUserStats = (updated: Partial<UserStats>) => {
    const { currentWeightKg, totalWorkouts, totalCaloriesBurned, bodyComposition, streakDays: _streak, ...rest } = updated;
    if (typeof currentWeightKg === 'number') logBodyMetrics({ weightKg: currentWeightKg });
    if (bodyComposition) {
      logBodyMetrics({
        fatPercent: bodyComposition.fatPercent,
        fatKg: bodyComposition.fatKg,
        leanMassKg: bodyComposition.leanMassKg,
        muscleMassKg: bodyComposition.muscleMassKg,
        boneMassKg: bodyComposition.boneMassKg,
        organMassKg: bodyComposition.organMassKg,
        waterLiters: bodyComposition.waterLiters,
        formula: bodyComposition.formula,
      });
    }
    if (typeof totalWorkouts === 'number') setBaseline({ sessions: totalWorkouts - data.sessions.length });
    if (typeof totalCaloriesBurned === 'number') {
      setBaseline({ kcal: totalCaloriesBurned - data.sessions.reduce((sum, ses) => sum + ses.kcal, 0) });
    }
    // Recommendation / chosen goal of the composition stay in the profile
    const profilePatch: Partial<UserStats> = bodyComposition ? { ...rest, bodyComposition } : rest;
    if (Object.keys(profilePatch).length === 0) return;
    setUserStats((prev) => {
      const next = { ...prev, ...profilePatch };
      saveJSON('volt_user_stats', next);
      return next;
    });
  };

  // Badge progress and auto-unlock follow the derived totals
  useEffect(() => {
    setBadges((prevBadges) => {
      let changed = false;
      const nextBadges = prevBadges.map((b) => {
        const progress = b.id === 'b-lock-1' ? stats.totalWorkouts : b.id === 'b-lock-4' ? stats.totalCaloriesBurned : null;
        if (progress === null) return b;
        const target = b.id === 'b-lock-1' ? 50 : 10000;
        if (b.isLocked && progress >= target) {
          changed = true;
          return { ...b, isLocked: false, unlockedAt: "À l'instant", isNew: true, progressCurrent: progress };
        }
        if (b.progressCurrent !== progress) {
          changed = true;
          return { ...b, progressCurrent: progress };
        }
        return b;
      });
      if (!changed) return prevBadges;
      saveJSON('volt_badges', nextBadges);
      return nextBadges;
    });
  }, [stats.totalWorkouts, stats.totalCaloriesBurned]);

  // Unlock badge manually (e.g. from demo modal)
  const handleUnlockBadge = (badgeId: string) => {
    setBadges((prevBadges) => {
      const updated = prevBadges.map((b) =>
        b.id === badgeId
          ? { ...b, isLocked: false, unlockedAt: "À l'instant", isNew: true }
          : b
      );
      saveJSON('volt_badges', updated);

      return updated;
    });
  };

  // Handle starting workout
  const handleStartWorkout = (workout: Workout) => {
    setSelectedWorkoutForModal(null);
    setActiveLiveWorkout(workout);
  };

  // Handle finishing workout from Live View
  const handleFinishLiveWorkout = (summary: {
    workout: Workout;
    durationSeconds: number;
    completedSetsCount: number;
    totalVolumeKg: number;
  }) => {
    setActiveLiveWorkout(null);
    setFinishedSummary(summary);

    const plannedSec = Math.max(1, summary.workout.durationMin * 60);
    const kcal = Math.round(summary.workout.estimatedCalories * Math.min(3, summary.durationSeconds / plannedSec));
    addSession({
      date: todayISO(),
      source: 'app',
      workoutId: summary.workout.id,
      title: summary.workout.title,
      durationSec: summary.durationSeconds,
      kcal,
      volumeKg: summary.totalVolumeKg,
    });

    // Mark today's planned session of this workout as done (persisted)
    const todayKey = getParisDayKey();
    setSchedule((prevSchedule) => {
      const updated = prevSchedule.map((day) =>
        day.dayKey !== todayKey
          ? day
          : {
              ...day,
              sessions: day.sessions.map((sess) =>
                sess.workoutId === summary.workout.id ? { ...sess, status: 'completed' as const } : sess
              ),
            }
      );
      saveJSON('volt_schedule', updated);
      return updated;
    });
  };

  return (
    <div className={`min-h-screen ${theme === 'warm-light' ? 'theme-warm-light bg-[#f3dfcb] text-[#3d2317]' : 'bg-[#090909] text-white'} flex flex-col justify-between selection:bg-[#EC4899] selection:text-white relative font-sans transition-colors duration-300`}>
      {/* Dynamic Background Glow Ambient Elements */}
      <div className={`fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-lg h-96 ${theme === 'warm-light' ? 'bg-gradient-to-b from-[#c05a3e]/10 via-[#e0ab6e]/10 to-transparent' : 'bg-gradient-to-b from-[#7C3AED]/10 via-[#EC4899]/5 to-transparent'} pointer-events-none blur-3xl -z-10`} />

      {/* Main Container constrained to mobile max-w-lg */}
      <div className={`w-full max-w-lg mx-auto min-h-screen flex flex-col relative ${theme === 'warm-light' ? 'bg-[#f3dfcb]' : 'bg-[#090909]'} shadow-2xl transition-colors duration-300`}>
        {/* Sticky Top Header (Only when not in full-screen Live Workout) */}
        {!activeLiveWorkout && (
          <Header
            userStats={stats}
            onOpenSettings={() => setSettingsSection('themes')}
            onOpenProfile={() => setSettingsSection('profile')}
            theme={theme}
          />
        )}

        {/* Dynamic Tab Views */}
        <main className="flex-1">
          {activeTab === 'home' && (
            <HomeTab
              userStats={stats}
              workouts={workouts}
              badges={badges}
              schedule={schedule}
              onSelectWorkout={(w) => setSelectedWorkoutForModal(w)}
              onStartWorkout={handleStartWorkout}
              onNavigateToTab={(tab) => setActiveTab(tab)}
              onUpdateUserStats={handleUpdateUserStats}
              onUnlockBadge={handleUnlockBadge}
              onOpenBodyComposition={() => setShowBodyCompositionModal(true)}
              theme={theme}
            />
          )}

          {activeTab === 'workouts' && (
            <WorkoutsTab
              workouts={workouts}
              schedule={schedule}
              onSelectWorkout={(w) => setSelectedWorkoutForModal(w)}
              onStartWorkout={handleStartWorkout}
              onSaveCustomWorkout={handleSaveCustomWorkout}
              onDeleteWorkout={handleDeleteWorkout}
              onScheduleWorkout={handleScheduleWorkout}
              onRemoveScheduledWorkout={handleRemoveScheduledWorkout}
              weeklyGoal={userStats.weeklyGoalWorkouts}
              weeklyVolumeTargetKg={userStats.weeklyVolumeTargetKg}
              theme={theme}
            />
          )}

          {activeTab === 'progress' && (
            <ProgressionTab
              userStats={stats}
              badges={badges}
              onUpdateUserStats={handleUpdateUserStats}
              onUnlockBadge={handleUnlockBadge}
              onOpenBodyComposition={() => setShowBodyCompositionModal(true)}
              theme={theme}
            />
          )}
        </main>

        {/* Bottom Mobile Navigation (3 tabs) */}
        {!activeLiveWorkout && (
          <Navbar activeTab={activeTab} onTabChange={(tab) => setActiveTab(tab)} theme={theme} />
        )}

        {/* Workout Detail Modal (Checklist of exercises before starting) */}
        {selectedWorkoutForModal && (
          <WorkoutDetailModal
            workout={selectedWorkoutForModal}
            onClose={() => setSelectedWorkoutForModal(null)}
            onStart={handleStartWorkout}
            theme={theme}
          />
        )}

        {/* Settings (gear icon) */}
        {settingsSection && !activeLiveWorkout && (
          <SettingsScreen
            initialSection={settingsSection}
            userStats={stats}
            onUpdateUserStats={handleUpdateUserStats}
            themeId={themeId}
            onApplyTheme={handleApplyTheme}
            getNotificationContext={() => ({ schedule: scheduleRef.current, workouts: workoutsRef.current })}
            onClose={() => setSettingsSection(null)}
            theme={theme}
          />
        )}

        {/* Live Full-Screen Workout Mode */}
        {activeLiveWorkout && (
          <LiveWorkoutView
            workout={activeLiveWorkout}
            onFinish={handleFinishLiveWorkout}
            onExit={() => setActiveLiveWorkout(null)}
          />
        )}

        <Suspense fallback={null}>
          {/* Finished Workout Celebratory Recap Modal */}
          {finishedSummary && (
            <WorkoutFinishedModal
              summary={finishedSummary}
              onClose={() => setFinishedSummary(null)}
              theme={theme}
            />
          )}

          {/* Body Composition Calculator Modal */}
          {showBodyCompositionModal && (
            <BodyCompositionModal
              userStats={stats}
              onSaveComposition={handleUpdateUserStats}
              onClose={() => setShowBodyCompositionModal(false)}
              theme={theme}
            />
          )}
        </Suspense>
      </div>
    </div>
  );
}
