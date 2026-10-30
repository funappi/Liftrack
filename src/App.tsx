/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense, lazy, useState } from 'react';
import { TabType, Workout, UserStats, PersonalRecord, AchievementBadge, ScheduledDay, MeasurementEntry } from './types';
import { initialUserStats, sampleWorkouts, sampleWeekSchedule, samplePersonalRecords, sampleBadges, sampleMeasurements } from './data/mockData';
import { Header } from './components/Header';
import { Navbar } from './components/Navbar';
import { HomeTab } from './components/HomeTab';
import { WorkoutsTab } from './components/WorkoutsTab';
import { PlanningTab } from './components/PlanningTab';
import { ProgressionTab } from './components/ProgressionTab';
import { WorkoutDetailModal } from './components/WorkoutDetailModal';
import { LiveWorkoutView } from './components/LiveWorkoutView';
import { QuickLaunchModal } from './components/QuickLaunchModal';
import { loadJSON, saveJSON } from './utils/storage';
import { CUSTOM_WORKOUT_PREFIX, isCustomWorkout } from './utils/workouts';

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

  const [theme, setTheme] = useState<'dark' | 'warm-light'>(() => {
    try {
      const saved = localStorage.getItem('volt_theme');
      if (saved === 'warm-light' || saved === 'dark') return saved;
    } catch {
      // ignore
    }
    return 'dark';
  });

  // Keep body class in sync with theme
  React.useEffect(() => {
    if (theme === 'warm-light') {
      document.body.classList.add('theme-warm-light');
      document.body.classList.remove('theme-velours-dark');
    } else {
      document.body.classList.remove('theme-warm-light');
      document.body.classList.add('theme-velours-dark');
    }
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'warm-light' : 'dark';
      try {
        localStorage.setItem('volt_theme', next);
      } catch {
        // ignore
      }
      return next;
    });
  };

  const [schedule, setSchedule] = useState<ScheduledDay[]>(() => loadJSON('volt_schedule', sampleWeekSchedule));

  const handleScheduleWorkout = (
    dayKey: 'LUN' | 'MAR' | 'MER' | 'JEU' | 'VEN' | 'SAM' | 'DIM',
    workoutId: string,
    time: string
  ) => {
    const targetWorkout = workouts.find((w) => w.id === workoutId);
    if (!targetWorkout) return;

    setSchedule((prev) => {
      const updated = prev.map((day) => {
        if (day.dayKey !== dayKey) return day;
        const newSession = {
          id: `s-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          time: time || '18:00',
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
  const [personalRecords, setPersonalRecords] = useState<PersonalRecord[]>(() => loadJSON('volt_prs', samplePersonalRecords));

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

  // Persisted performance measurements history (Image 2 style)
  const [measurements, setMeasurements] = useState<MeasurementEntry[]>(() => loadJSON('volt_measurements', sampleMeasurements));

  const handleAddMeasurement = (entry: Omit<MeasurementEntry, 'id'>) => {
    const newEntry: MeasurementEntry = {
      ...entry,
      id: `m-${Date.now()}`,
    };
    setMeasurements((prev) => {
      const updated = [newEntry, ...prev];
      saveJSON('volt_measurements', updated);
      return updated;
    });

    // If metric is weight, also update currentWeightKg in userStats
    if (entry.metricType === 'poids') {
      handleUpdateUserStats({ currentWeightKg: entry.value });
    }
  };

  const handleDeleteMeasurement = (id: string) => {
    setMeasurements((prev) => {
      const updated = prev.filter((m) => m.id !== id);
      saveJSON('volt_measurements', updated);
      return updated;
    });
  };

  // Modal & Live workout states
  const [selectedWorkoutForModal, setSelectedWorkoutForModal] = useState<Workout | null>(null);
  const [activeLiveWorkout, setActiveLiveWorkout] = useState<Workout | null>(null);
  const [showBodyCompositionModal, setShowBodyCompositionModal] = useState(false);
  const [showQuickLaunch, setShowQuickLaunch] = useState(false);
  const [finishedSummary, setFinishedSummary] = useState<{
    workout: Workout;
    durationSeconds: number;
    completedSetsCount: number;
    totalVolumeKg: number;
  } | null>(null);

  // Sync state changes to localStorage
  const handleUpdateUserStats = (updated: Partial<UserStats>) => {
    setUserStats((prev) => {
      const next = { ...prev, ...updated };
      saveJSON('volt_user_stats', next);

      // Check auto-unlock conditions for gamification badges
      setBadges((prevBadges) => {
        let changed = false;
        const nextBadges = prevBadges.map((b) => {
          if (!b.isLocked) return b;
          // Centurion 50 séances
          if (b.id === 'b-lock-1' && next.totalWorkouts >= 50) {
            changed = true;
            return { ...b, isLocked: false, unlockedAt: "À l'instant", isNew: true };
          }
          // Guerrier d'acier 30 jours
          if (b.id === 'b-lock-2' && next.streakDays >= 30) {
            changed = true;
            return { ...b, isLocked: false, unlockedAt: "À l'instant", isNew: true };
          }
          // Fournaise 10 000 kcal
          if (b.id === 'b-lock-4' && next.totalCaloriesBurned >= 10000) {
            changed = true;
            return { ...b, isLocked: false, unlockedAt: "À l'instant", isNew: true };
          }
          // Update progress if still locked
          if (b.id === 'b-lock-1') {
            return { ...b, progressCurrent: next.totalWorkouts };
          }
          if (b.id === 'b-lock-2') {
            return { ...b, progressCurrent: next.streakDays };
          }
          if (b.id === 'b-lock-4') {
            return { ...b, progressCurrent: next.totalCaloriesBurned };
          }
          return b;
        });

        if (changed) {
          saveJSON('volt_badges', nextBadges);
        }
        return nextBadges;
      });

      return next;
    });
  };

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

    handleUpdateUserStats({
      totalWorkouts: userStats.totalWorkouts + 1,
      totalCaloriesBurned: userStats.totalCaloriesBurned + summary.workout.estimatedCalories,
      weeklyCompletedWorkouts: (userStats.weeklyCompletedWorkouts || 4) + 1,
    });

    // Mark session in schedule as completed if present
    setSchedule((prevSchedule) =>
      prevSchedule.map((day) => ({
        ...day,
        sessions: day.sessions.map((sess) =>
          sess.workoutId === summary.workout.id ? { ...sess, status: 'completed' as const } : sess
        ),
      }))
    );
  };

  // Handle adding new PR
  const handleLogNewRecord = (newPr: { exercise: string; weightKg: number }) => {
    const existingPrIndex = personalRecords.findIndex(
      (pr) => pr.exercise.toLowerCase() === newPr.exercise.toLowerCase()
    );

    let updatedPrs: PersonalRecord[];
    if (existingPrIndex !== -1) {
      updatedPrs = [...personalRecords];
      const prevWeight = updatedPrs[existingPrIndex].weightKg;
      updatedPrs[existingPrIndex] = {
        ...updatedPrs[existingPrIndex],
        previousWeightKg: prevWeight,
        weightKg: newPr.weightKg,
        date: "Aujourd'hui",
      };
    } else {
      updatedPrs = [
        {
          id: `pr-${Date.now()}`,
          exercise: newPr.exercise,
          weightKg: newPr.weightKg,
          previousWeightKg: newPr.weightKg - 5,
          date: "Aujourd'hui",
          category: 'Force',
        },
        ...personalRecords,
      ];
    }
    setPersonalRecords(updatedPrs);
    saveJSON('volt_prs', updatedPrs);
  };

  // Handle updating an existing PR (and its history graph)
  const handleUpdatePR = (updatedPr: PersonalRecord) => {
    setPersonalRecords((prev) => {
      const exists = prev.some((p) => p.id === updatedPr.id);
      const next = exists
        ? prev.map((p) => (p.id === updatedPr.id ? updatedPr : p))
        : [updatedPr, ...prev];
      saveJSON('volt_prs', next);
      return next;
    });
  };

  // Handle deleting a PR
  const handleDeletePR = (prId: string) => {
    setPersonalRecords((prev) => {
      const next = prev.filter((p) => p.id !== prId);
      saveJSON('volt_prs', next);
      return next;
    });
  };

  // Launch scheduled workout from planning
  const handleStartScheduledWorkout = (workoutId: string) => {
    const target = workouts.find((w) => w.id === workoutId);
    if (target) {
      setSelectedWorkoutForModal(target);
    }
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
            userStats={userStats}
            onStartQuickWorkout={() => setShowQuickLaunch(true)}
            theme={theme}
            onToggleTheme={handleToggleTheme}
          />
        )}

        {/* Dynamic Tab Views */}
        <main className="flex-1">
          {activeTab === 'home' && (
            <HomeTab
              userStats={userStats}
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
              theme={theme}
            />
          )}

          {activeTab === 'planning' && (
            <PlanningTab
              schedule={schedule}
              workouts={workouts}
              onStartScheduledWorkout={handleStartScheduledWorkout}
              onOpenWorkouts={() => setActiveTab('workouts')}
              onScheduleWorkout={handleScheduleWorkout}
              onRemoveScheduledWorkout={handleRemoveScheduledWorkout}
              theme={theme}
            />
          )}

          {activeTab === 'progress' && (
            <ProgressionTab
              userStats={userStats}
              personalRecords={personalRecords}
              badges={badges}
              measurements={measurements}
              onLogNewRecord={handleLogNewRecord}
              onUpdatePR={handleUpdatePR}
              onDeletePR={handleDeletePR}
              onUpdateUserStats={handleUpdateUserStats}
              onUnlockBadge={handleUnlockBadge}
              onOpenBodyComposition={() => setShowBodyCompositionModal(true)}
              onAddMeasurement={handleAddMeasurement}
              onDeleteMeasurement={handleDeleteMeasurement}
              theme={theme}
            />
          )}
        </main>

        {/* Bottom Mobile Navigation (4 tabs) */}
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

        {/* Lancement rapide : mes séances créées + décompte */}
        {showQuickLaunch && (
          <QuickLaunchModal
            workouts={workouts.filter(isCustomWorkout)}
            onStart={(w) => {
              setShowQuickLaunch(false);
              handleStartWorkout(w);
            }}
            onClose={() => setShowQuickLaunch(false)}
            onCreate={() => {
              setShowQuickLaunch(false);
              setActiveTab('workouts');
            }}
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
              userStats={userStats}
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
