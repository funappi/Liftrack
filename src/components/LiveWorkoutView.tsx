import React, { useState, useEffect, useMemo } from 'react';
import { 
  Clock, Check, Plus, MoreVertical, Settings, 
  Trash2, ChevronDown, Play, Pause, X, Dumbbell, ShieldAlert, 
  Edit2, SkipForward, Keyboard, Timer, TrendingUp, Flame,
} from 'lucide-react';
import { Workout, WorkoutExerciseSession, WorkoutSetSession } from '../types';
import { audioSynth } from '../utils/audioSynth';
import { loadSoundEnabled, loadSetCountdownSeconds, saveSetCountdownSeconds } from '../utils/preferences';
import { CompletedSession, LoggedExercise } from '../data/model';
import { clearLiveDraft, LiveDraft, saveLiveDraft } from '../utils/liveDraft';
import { formatSet, lastPerformance, parseRepRange, suggestNext } from '../utils/overload';
import { averageSetSeconds, estimateExerciseSeconds, formatMinSec } from '../utils/workoutTime';

interface LiveWorkoutViewProps {
  workout: Workout;
  /** Past sessions: "previous" column and the progression suggestion come from them */
  history?: CompletedSession[];
  /** Session restored after the app was closed in the middle of a workout */
  draft?: LiveDraft | null;
  onFinish: (summary: {
    workout: Workout;
    durationSeconds: number;
    completedSetsCount: number;
    totalVolumeKg: number;
    exercises: LoggedExercise[];
    notes?: string;
  }) => void;
  onExit: () => void;
}

// Preset exercise library for adding new exercises
const EXERCISE_LIBRARY = [
  { name: 'Curl Biceps (Haltère)', targetMuscles: ['Biceps', 'Avant-bras'] },
  { name: 'Développé Couché (Barre)', targetMuscles: ['Pectoraux', 'Triceps'] },
  { name: 'Développé Incliné (Haltères)', targetMuscles: ['Haut des pectoraux', 'Deltoïdes'] },
  { name: 'Squat Arrière (Barre)', targetMuscles: ['Quadriceps', 'Fessiers'] },
  { name: 'Soulevé de Terre (Deadlift)', targetMuscles: ['Ischios', 'Lombaires', 'Dorsaux'] },
  { name: 'Tractions Prise Pronation', targetMuscles: ['Grand dorsal', 'Biceps'] },
  { name: 'Élévations Latérales (Haltères)', targetMuscles: ['Deltoïdes latéraux'] },
  { name: 'Dips aux Barres Parallèles', targetMuscles: ['Triceps', 'Bas des pectoraux'] },
  { name: 'Tirage Horizontal (Poulie)', targetMuscles: ['Milieu du dos', 'Trapèzes'] },
  { name: 'Leg Extension (Machine)', targetMuscles: ['Quadriceps'] },
];

export const LiveWorkoutView: React.FC<LiveWorkoutViewProps> = ({
  workout,
  history = [],
  draft = null,
  onFinish,
  onExit,
}) => {
  // Workout title state
  const [workoutTitle, setWorkoutTitle] = useState(draft?.title || workout.title || 'Entraînement');
  const [isRenaming, setIsRenaming] = useState(false);

  // Chronometer elapsed workout time
  const [elapsedSeconds, setElapsedSeconds] = useState(draft?.elapsedSeconds ?? 0);
  const [sessionNotes, setSessionNotes] = useState(draft?.sessionNotes ?? '');
  const [isPaused, setIsPaused] = useState(false);

  // Active exercises in this workout session: ALL weights & reps initialized to 0 as requested!
  const [sessionExercises, setSessionExercises] = useState<WorkoutExerciseSession[]>(() => {
    if (draft?.exercises.length) return draft.exercises;
    if (workout.exercises && workout.exercises.length > 0) {
      return workout.exercises.map((ex, exIdx) => ({
        id: ex.id || `ex-${exIdx}`,
        name: ex.name,
        targetMuscles: ex.targetMuscles || ['Muscles cibles'],
        notes: ex.notes || '',
        restSeconds: ex.restSeconds ?? 60,
        sets: Array.from({ length: ex.sets || 4 }, (_, sIdx) => ({
          id: `s-${exIdx}-${sIdx}`,
          setNumber: sIdx + 1,
          previous: '-',
          weightKg: 0, // default 0
          reps: 0, // default 0
          completed: false,
        })),
      }));
    }

    // Default: Curl Biceps with 4 sets initialized to 0
    return [
      {
        id: 'ex-curl-1',
        name: 'Curl Biceps (Haltère)',
        targetMuscles: ['Biceps', 'Avant-bras'],
        notes: '',
        restSeconds: 60,
        sets: [
          { id: 's-1', setNumber: 1, previous: '-', weightKg: 0, reps: 0, completed: false },
          { id: 's-2', setNumber: 2, previous: '-', weightKg: 0, reps: 0, completed: false },
          { id: 's-3', setNumber: 3, previous: '-', weightKg: 0, reps: 0, completed: false },
          { id: 's-4', setNumber: 4, previous: '-', weightKg: 0, reps: 0, completed: false },
        ],
      },
    ];
  });

  // REST TIMER STATE
  const [activeRestTimer, setActiveRestTimer] = useState<{
    exerciseId?: string;
    exerciseName?: string;
    nextSetNumber?: number;
    totalSeconds: number;
    remainingSeconds: number;
    isRunning: boolean;
  } | null>(null);

  // Keyboard Custom Rest Modal / Popover State (Minutes and Seconds)
  const [showKeyboardRestModal, setShowKeyboardRestModal] = useState(false);
  const [customRestTargetExerciseId, setCustomRestTargetExerciseId] = useState<string | null>(null);
  const [keyboardRestMinutes, setKeyboardRestMinutes] = useState(1);
  const [keyboardRestSeconds, setKeyboardRestSeconds] = useState(30);

  // Modals
  const [showAddExerciseModal, setShowAddExerciseModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showAbandonConfirmModal, setShowAbandonConfirmModal] = useState(false);
  const [activeMenuExerciseId, setActiveMenuExerciseId] = useState<string | null>(null);

  // Search filter for exercise library
  const [exerciseSearch, setExerciseSearch] = useState('');

  // Settings
  const [soundEnabled, setSoundEnabled] = useState(loadSoundEnabled);
  const [defaultRestPreset, setDefaultRestPreset] = useState<number>(60);
  const [setCountdown, setSetCountdown] = useState<number>(loadSetCountdownSeconds);

  // SET CHRONO: optional countdown, then the chrono measures the set until it is validated
  const [activeSet, setActiveSet] = useState<{
    exerciseId: string;
    setIndex: number;
    countdown: number;
    elapsed: number;
  } | null>(null);

  useEffect(() => {
    if (!activeSet || isPaused) return;
    const timer = setInterval(() => {
      setActiveSet((prev) => {
        if (!prev) return prev;
        if (prev.countdown > 0) {
          if (soundEnabled) audioSynth.playTimerBeep(prev.countdown === 1);
          return { ...prev, countdown: prev.countdown - 1 };
        }
        return { ...prev, elapsed: prev.elapsed + 1 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [activeSet?.exerciseId, activeSet?.setIndex, isPaused, soundEnabled]);

  // Chronometer Interval (workout elapsed time)
  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [isPaused]);

  // REST TIMER INTERVAL
  useEffect(() => {
    if (!activeRestTimer || !activeRestTimer.isRunning) return;
    if (activeRestTimer.remainingSeconds <= 0) {
      if (soundEnabled) audioSynth.playTimerBeep(true);
      setActiveRestTimer(null);
      return;
    }

    const timer = setInterval(() => {
      setActiveRestTimer((prev) => {
        if (!prev || !prev.isRunning) return prev;
        if (prev.remainingSeconds === 4 || prev.remainingSeconds === 3 || prev.remainingSeconds === 2) {
          if (soundEnabled) audioSynth.playTimerBeep(false);
        }
        if (prev.remainingSeconds <= 1) {
          if (soundEnabled) audioSynth.playTimerBeep(true);
          return null;
        }
        return { ...prev, remainingSeconds: prev.remainingSeconds - 1 };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [activeRestTimer, soundEnabled]);

  // Format MM:SS for digital timer
  const formatTimerDigital = (totalSecs: number) => {
    const mins = Math.floor(Math.max(0, totalSecs) / 60);
    const secs = Math.max(0, totalSecs) % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Format Elapsed Workout Time (e.g. 54s or 12m 34s)
  const formatDuration = (secs: number) => {
    if (secs < 60) return `${secs}s`;
    const mins = Math.floor(secs / 60);
    const remSecs = secs % 60;
    return `${mins}m ${remSecs.toString().padStart(2, '0')}s`;
  };

  // Calculate live volume and completed sets
  let totalCompletedSets = 0;
  let totalVolumeKg = 0;

  sessionExercises.forEach((ex) => {
    ex.sets.forEach((st) => {
      if (st.completed) {
        totalCompletedSets += 1;
        if (!st.warmup) totalVolumeKg += st.weightKg * st.reps;
      }
    });
  });

  // Last performance per exercise (from the history) and the progression it suggests
  const lastByName = useMemo(() => {
    const map = new Map<string, ReturnType<typeof lastPerformance>>();
    for (const ex of sessionExercises) map.set(ex.name.trim().toLowerCase(), lastPerformance(history, ex.name));
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history, sessionExercises.map((e) => e.name).join('|')]);

  const rangeFor = (exercise: WorkoutExerciseSession) => {
    const planned = workout.exercises?.find((e) => e.id === exercise.id || e.name === exercise.name);
    return parseRepRange(planned?.reps);
  };

  // Label of a set: warm-ups are "É", working sets are numbered among themselves
  const setLabel = (sets: WorkoutSetSession[], idx: number) =>
    sets[idx].warmup ? 'É' : String(sets.slice(0, idx + 1).filter((s) => !s.warmup).length);

  // Draft: survives a closed app / locked phone. Written on every change, elapsed time every 10 s.
  const persistDraft = (elapsed: number) =>
    saveLiveDraft({
      workout,
      title: workoutTitle,
      elapsedSeconds: elapsed,
      exercises: sessionExercises,
      sessionNotes,
      savedAt: new Date().toISOString(),
    });
  useEffect(() => {
    persistDraft(elapsedSeconds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionExercises, workoutTitle, sessionNotes]);
  useEffect(() => {
    if (elapsedSeconds > 0 && elapsedSeconds % 10 === 0) persistDraft(elapsedSeconds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsedSeconds]);

  // Apply the suggested load/reps to every pending working set of an exercise
  const handleApplySuggestion = (exerciseId: string, weightKg: number, reps: number) => {
    setSessionExercises((prev) =>
      prev.map((ex) =>
        ex.id !== exerciseId
          ? ex
          : { ...ex, sets: ex.sets.map((st) => (st.completed || st.warmup ? st : { ...st, weightKg, reps })) }
      )
    );
  };

  // Toggle a set between warm-up and working set
  const handleToggleWarmup = (exerciseId: string, setIndex: number) => {
    setSessionExercises((prev) =>
      prev.map((ex) => {
        if (ex.id !== exerciseId) return ex;
        const sets = [...ex.sets];
        sets[setIndex] = { ...sets[setIndex], warmup: !sets[setIndex].warmup };
        return { ...ex, sets };
      })
    );
  };

  // Insert a warm-up set at the very beginning of an exercise
  const handleAddWarmup = (exerciseId: string) => {
    setSessionExercises((prev) =>
      prev.map((ex) => {
        if (ex.id !== exerciseId) return ex;
        const warm: WorkoutSetSession = {
          id: `w-${ex.id}-${Date.now()}`,
          setNumber: 1,
          previous: '-',
          weightKg: 0,
          reps: 0,
          completed: false,
          warmup: true,
        };
        return { ...ex, sets: [warm, ...ex.sets].map((st, i) => ({ ...st, setNumber: i + 1 })) };
      })
    );
  };

  // Start rest timer helper
  const handleStartRestTimer = (
    seconds: number,
    options?: { exerciseId?: string; exerciseName?: string; nextSetNumber?: number }
  ) => {
    if (seconds <= 0) return;
    setActiveRestTimer({
      exerciseId: options?.exerciseId,
      exerciseName: options?.exerciseName,
      nextSetNumber: options?.nextSetNumber,
      totalSeconds: seconds,
      remainingSeconds: seconds,
      isRunning: true,
    });
  };

  // Start the chrono of the next unvalidated set of an exercise
  const handleStartSet = (exerciseId: string) => {
    const ex = sessionExercises.find((e) => e.id === exerciseId);
    if (!ex) return;
    if (activeSet?.exerciseId === exerciseId) return;
    const setIndex = ex.sets.findIndex((s) => !s.completed);
    if (setIndex < 0) return;
    setActiveRestTimer(null);
    setActiveSet({ exerciseId, setIndex, countdown: setCountdown, elapsed: 0 });
  };

  // Toggle set completion (Image 1 checkmark button)
  const handleToggleSetComplete = (exerciseId: string, setIndex: number) => {
    if (soundEnabled) audioSynth.playSetDoneSound();

    if (activeSet && activeSet.exerciseId === exerciseId && activeSet.setIndex === setIndex) setActiveSet(null);

    setSessionExercises((prev) =>
      prev.map((ex) => {
        if (ex.id !== exerciseId) return ex;
        const newSets = [...ex.sets];
        const currentSet = newSets[setIndex];
        const nextCompleted = !currentSet.completed;
        const measured =
          nextCompleted && activeSet && activeSet.exerciseId === exerciseId && activeSet.setIndex === setIndex && activeSet.countdown === 0
            ? activeSet.elapsed
            : undefined;
        newSets[setIndex] = {
          ...currentSet,
          completed: nextCompleted,
          durationSeconds: nextCompleted ? (measured ?? currentSet.durationSeconds) : undefined,
        };

        // If newly completed: launch rest timer automatically
        if (nextCompleted) {
          const restDuration = ex.restSeconds ?? defaultRestPreset;
          if (restDuration && restDuration > 0) {
            handleStartRestTimer(restDuration, {
              exerciseId: ex.id,
              exerciseName: ex.name,
              nextSetNumber: setIndex + 2 <= ex.sets.length ? setIndex + 2 : undefined,
            });
          }
        }

        return { ...ex, sets: newSets };
      })
    );
  };

  // Pause / Resume rest timer
  const handleTogglePauseRestTimer = () => {
    setActiveRestTimer((prev) => {
      if (!prev) return null;
      return { ...prev, isRunning: !prev.isRunning };
    });
  };

  // Skip rest timer (Passer à la série suivante)
  const handleSkipRestTimer = () => {
    if (soundEnabled) audioSynth.playSetDoneSound();
    setActiveRestTimer(null);
  };

  // Adjust rest timer seconds (+30s or -15s)
  const handleAdjustRestTimer = (delta: number) => {
    setActiveRestTimer((prev) => {
      if (!prev) return null;
      const nextRemaining = Math.max(1, prev.remainingSeconds + delta);
      const nextTotal = Math.max(nextRemaining, prev.totalSeconds + (delta > 0 ? delta : 0));
      return {
        ...prev,
        totalSeconds: nextTotal,
        remainingSeconds: nextRemaining,
      };
    });
  };

  // Open Keyboard Rest Configuration Modal
  const handleOpenKeyboardRestModal = (exerciseId?: string) => {
    setCustomRestTargetExerciseId(exerciseId || activeRestTimer?.exerciseId || null);
    
    // Preload current seconds
    let currentSec = 90;
    if (exerciseId) {
      const targetEx = sessionExercises.find((e) => e.id === exerciseId);
      if (targetEx && targetEx.restSeconds) currentSec = targetEx.restSeconds;
    } else if (activeRestTimer) {
      currentSec = activeRestTimer.remainingSeconds;
    } else {
      currentSec = defaultRestPreset;
    }

    setKeyboardRestMinutes(Math.floor(currentSec / 60));
    setKeyboardRestSeconds(currentSec % 60);
    setShowKeyboardRestModal(true);
  };

  // Apply custom typed rest from keyboard
  const handleApplyKeyboardRest = (startNow = true) => {
    const totalSec = Math.max(5, (keyboardRestMinutes * 60) + keyboardRestSeconds);

    if (customRestTargetExerciseId) {
      // Update that exercise's default rest
      setSessionExercises((prev) =>
        prev.map((ex) =>
          ex.id === customRestTargetExerciseId ? { ...ex, restSeconds: totalSec } : ex
        )
      );
    } else {
      setDefaultRestPreset(totalSec);
    }

    if (startNow) {
      const targetEx = sessionExercises.find((e) => e.id === customRestTargetExerciseId);
      handleStartRestTimer(totalSec, {
        exerciseId: targetEx?.id,
        exerciseName: targetEx?.name,
      });
    }

    setShowKeyboardRestModal(false);
  };

  // Update Set Weight or Reps
  const handleUpdateSetValue = (
    exerciseId: string,
    setIndex: number,
    field: 'weightKg' | 'reps',
    val: number
  ) => {
    setSessionExercises((prev) =>
      prev.map((ex) => {
        if (ex.id !== exerciseId) return ex;
        const newSets = [...ex.sets];
        newSets[setIndex] = { ...newSets[setIndex], [field]: Math.max(0, val) };
        return { ...ex, sets: newSets };
      })
    );
  };

  // Add a new set to an exercise
  const handleAddSet = (exerciseId: string) => {
    setSessionExercises((prev) =>
      prev.map((ex) => {
        if (ex.id !== exerciseId) return ex;
        const lastSet = ex.sets[ex.sets.length - 1];
        const newSet: WorkoutSetSession = {
          id: `s-${ex.id}-${Date.now()}`,
          setNumber: ex.sets.length + 1,
          previous: lastSet && lastSet.weightKg > 0 ? `${lastSet.weightKg}kg x ${lastSet.reps}` : '-',
          weightKg: 0, // default 0
          reps: 0, // default 0
          completed: false,
        };
        return { ...ex, sets: [...ex.sets, newSet] };
      })
    );
  };

  // Delete a set from an exercise
  const handleDeleteSet = (exerciseId: string, setIndex: number) => {
    setSessionExercises((prev) =>
      prev.map((ex) => {
        if (ex.id !== exerciseId) return ex;
        const filteredSets = ex.sets
          .filter((_, idx) => idx !== setIndex)
          .map((s, idx) => ({ ...s, setNumber: idx + 1 }));
        return { ...ex, sets: filteredSets };
      })
    );
  };

  // Update exercise notes
  const handleUpdateNotes = (exerciseId: string, notes: string) => {
    setSessionExercises((prev) =>
      prev.map((ex) => (ex.id === exerciseId ? { ...ex, notes } : ex))
    );
  };

  // Add exercise from library
  const handleAddExerciseFromLibrary = (item: { name: string; targetMuscles: string[] }) => {
    const newEx: WorkoutExerciseSession = {
      id: `ex-${Date.now()}`,
      name: item.name,
      targetMuscles: item.targetMuscles,
      notes: '',
      restSeconds: defaultRestPreset,
      sets: [
        { id: `s-1-${Date.now()}`, setNumber: 1, previous: '-', weightKg: 0, reps: 0, completed: false },
        { id: `s-2-${Date.now()}`, setNumber: 2, previous: '-', weightKg: 0, reps: 0, completed: false },
        { id: `s-3-${Date.now()}`, setNumber: 3, previous: '-', weightKg: 0, reps: 0, completed: false },
        { id: `s-4-${Date.now()}`, setNumber: 4, previous: '-', weightKg: 0, reps: 0, completed: false },
      ],
    };
    setSessionExercises((prev) => [...prev, newEx]);
    setShowAddExerciseModal(false);
    setExerciseSearch('');
  };

  // Remove an exercise from the session
  const handleDeleteExercise = (exerciseId: string) => {
    setSessionExercises((prev) => prev.filter((ex) => ex.id !== exerciseId));
    setActiveMenuExerciseId(null);
  };

  // Finish workout handler
  const handleTriggerFinish = () => {
    const exercises: LoggedExercise[] = sessionExercises
      .map((ex) => ({
        name: ex.name,
        notes: ex.notes.trim() || undefined,
        sets: ex.sets
          .filter((st) => st.completed && (st.weightKg > 0 || st.reps > 0))
          .map((st) => ({ weightKg: st.weightKg, reps: st.reps, ...(st.warmup ? { warmup: true } : {}) })),
      }))
      .filter((ex) => ex.sets.length > 0);
    clearLiveDraft();
    onFinish({
      exercises,
      notes: sessionNotes.trim() || undefined,
      workout: {
        ...workout,
        title: workoutTitle,
      },
      durationSeconds: elapsedSeconds,
      completedSetsCount: totalCompletedSets,
      totalVolumeKg,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#090909] text-white flex flex-col justify-between max-w-lg mx-auto overflow-hidden font-sans select-none">
      {/* 1. TOP HEADER */}
      <div className="px-3.5 py-3 bg-[#000000] border-b border-white/10 flex items-center justify-between gap-3 shrink-0">
        {/* Left: Back / Minimize to home button + workout title */}
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            id="btn-live-exit-home"
            onClick={() => setShowAbandonConfirmModal(true)}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/15 text-white hover:text-[#0088FF] transition-all flex items-center gap-1 shrink-0 cursor-pointer"
            title="Quitter la séance et retourner à l'accueil"
          >
            <ChevronDown className="w-5 h-5 text-white" />
            <span className="text-caption font-bold text-[#A7A7A7] hidden sm:inline">Quitter</span>
          </button>

          <button
            type="button"
            onClick={() => setIsRenaming(!isRenaming)}
            className="flex items-center gap-1.5 text-white hover:text-[#0088FF] transition-colors truncate text-left"
            title="Cliquer pour renommer la séance"
          >
            <span className="text-base sm:text-lg font-bold truncate">
              {workoutTitle}
            </span>
            <Edit2 className="w-3 h-3 text-[#737373] hover:text-white shrink-0" />
          </button>
        </div>

        {/* Right side: Rest Chrono Quick Launcher, Pause & Terminer */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Quick Rest Timer Trigger */}
          <button
            type="button"
            id="btn-quick-rest-chrono"
            onClick={() => handleOpenKeyboardRestModal()}
            className="px-2.5 py-1.5 rounded-xl bg-[#1A1A1A] hover:bg-[#252525] border border-white/10 text-xs font-bold text-[#0088FF] flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
            title="Ouvrir le chronomètre de repos personnalisé"
          >
            <Timer className="w-5 h-5" />
          </button>

          {/* Pause Workout Elapsed Timer */}
          <button
            type="button"
            onClick={() => setIsPaused(!isPaused)}
            className="p-1.5 text-white hover:text-[#0088FF] transition-colors"
            title={isPaused ? "Reprendre la séance" : "Mettre en pause"}
          >
            {isPaused ? (
              <Play className="w-5 h-5 fill-current text-amber-400" />
            ) : (
              <Pause className="w-5 h-5 fill-current text-white" />
            )}
          </button>

          {/* Terminer Button */}
          <button
            type="button"
            onClick={handleTriggerFinish}
            className="px-4 py-1.5 rounded-xl bg-[#0088FF] hover:bg-[#0070DD] active:scale-95 text-white font-bold text-xs sm:text-sm shadow-md transition-all cursor-pointer"
          >
            Terminer
          </button>
        </div>
      </div>

      {/* Rename dropdown popup if active */}
      {isRenaming && (
        <div className="bg-[#181818] p-3 border-b border-white/10 flex items-center gap-2 shrink-0">
          <input
            type="text"
            value={workoutTitle}
            onChange={(e) => setWorkoutTitle(e.target.value)}
            className="flex-1 bg-[#101010] border border-white/20 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#0088FF]"
            placeholder="Nom de la séance..."
            autoFocus
          />
          <button
            onClick={() => setIsRenaming(false)}
            className="px-3 py-1.5 rounded-xl bg-[#0088FF] text-white text-xs font-bold"
          >
            OK
          </button>
        </div>
      )}

      {/* 2. STATS BAR (Durée, Volume, Séries, Repos) */}
      <div className="px-5 py-3 bg-[#0D0D0D] border-b border-white/5 flex items-center justify-between shrink-0">
        {/* Durée */}
        <div className="space-y-0.5">
          <span className="text-caption text-[#A7A7A7] block font-medium">Durée</span>
          <span className="text-base font-black text-[#0088FF] font-mono num">
            {formatDuration(elapsedSeconds)}
          </span>
        </div>

        {/* Volume */}
        <div className="space-y-0.5">
          <span className="text-caption text-[#A7A7A7] block font-medium">Volume</span>
          <span className="text-base font-bold text-white font-mono num">
            {totalVolumeKg} kg
          </span>
        </div>

        {/* Séries */}
        <div className="space-y-0.5">
          <span className="text-caption text-[#A7A7A7] block font-medium">Séries</span>
          <span className="text-base font-bold text-white font-mono num">
            {totalCompletedSets}
          </span>
        </div>

        {/* Repos choisi */}
        <div className="space-y-0.5">
          <span className="text-caption text-[#A7A7A7] block font-medium">Repos</span>
          <span className="text-base font-bold text-white font-mono num">
            {formatMinSec(defaultRestPreset)}
          </span>
        </div>
      </div>

      {/* 3. EXERCISE LIST (Scrollable Area) */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6 no-scrollbar pb-36">
        {sessionExercises.map((exercise) => (
          <div key={exercise.id} className="space-y-3">
            {/* Exercise Header */}
            <div className="flex items-center justify-between gap-2">
              <div
                className="flex items-center gap-2.5 min-w-0 cursor-pointer"
                onClick={() => handleStartSet(exercise.id)}
                title="Lancer la série"
              >
                <div className="w-10 h-10 rounded-full bg-[#181818] border border-white/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  <Dumbbell className="w-5 h-5 text-white" />
                </div>

                <h3 className="text-base sm:text-lg font-bold text-[#0088FF] truncate">
                  {exercise.name}
                </h3>
                <span
                  className="flex items-center gap-1 text-xs font-mono num font-bold text-[#A7A7A7] shrink-0"
                  title="Durée estimée de l'exercice"
                >
                  <Clock className="w-3.5 h-3.5" />
                  {formatMinSec(estimateExerciseSeconds(
                    exercise.sets.length,
                    exercise.restSeconds ?? defaultRestPreset,
                    averageSetSeconds(exercise.sets.map((s) => s.durationSeconds)) ?? undefined
                  ))}
                </span>
              </div>

              {/* 3 Dots Menu Button */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() =>
                    setActiveMenuExerciseId(
                      activeMenuExerciseId === exercise.id ? null : exercise.id
                    )
                  }
                  className="p-1.5 text-[#A7A7A7] hover:text-white transition-colors"
                >
                  <MoreVertical className="w-5 h-5" />
                </button>

                {/* Dropdown Options */}
                {activeMenuExerciseId === exercise.id && (
                  <div className="absolute right-0 top-8 z-30 w-48 bg-[#1C1C1C] border border-white/15 rounded-2xl shadow-2xl py-1">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveMenuExerciseId(null);
                        handleOpenKeyboardRestModal(exercise.id);
                      }}
                      className="w-full px-3.5 py-2 text-left text-xs text-white hover:bg-white/10 flex items-center gap-2"
                    >
                      <Keyboard className="w-3.5 h-3.5 text-[#0088FF]" />
                      <span>Régler repos (clavier)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteExercise(exercise.id)}
                      className="w-full px-3.5 py-2 text-left text-xs text-rose-400 hover:bg-rose-500/10 flex items-center gap-2"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Supprimer l'exercice</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Set chrono: start button, countdown, running time */}
            {activeSet?.exerciseId === exercise.id ? (
              <div className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl bg-[#0088FF]/10 border border-[#0088FF]/40">
                <div className="flex items-center gap-2 min-w-0">
                  <Timer className="w-4 h-4 text-[#0088FF] shrink-0" />
                  <span className="text-xs font-bold text-white truncate">
                    {activeSet.countdown > 0 ? `Série ${activeSet.setIndex + 1} · prépare-toi` : `Série ${activeSet.setIndex + 1} en cours`}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xl font-black font-mono num text-white">
                    {activeSet.countdown > 0 ? activeSet.countdown : formatMinSec(activeSet.elapsed)}
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveSet(null)}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[#A7A7A7] hover:text-white cursor-pointer"
                    title="Annuler le chrono de la série"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              exercise.sets.some((s) => !s.completed) && (
                <button
                  type="button"
                  onClick={() => handleStartSet(exercise.id)}
                  className="w-full py-2 rounded-xl bg-[#0088FF]/10 hover:bg-[#0088FF]/20 border border-[#0088FF]/30 text-xs font-bold text-[#0088FF] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Lancer la série {exercise.sets.findIndex((s) => !s.completed) + 1}</span>
                </button>
              )
            )}

            {/* Note field */}
            <div>
              <input
                type="text"
                value={exercise.notes}
                onChange={(e) => handleUpdateNotes(exercise.id, e.target.value)}
                placeholder="Ajouter des notes ici..."
                className="w-full bg-transparent text-xs text-white placeholder:text-[#666666] focus:outline-none border-b border-transparent focus:border-white/20 pb-0.5 transition-colors"
              />
            </div>

            {/* Progressive overload: what to aim for, from the last session */}
            {(() => {
              const last = lastByName.get(exercise.name.trim().toLowerCase());
              if (!last) return null;
              const suggestion = suggestNext(last, rangeFor(exercise));
              const hasPending = exercise.sets.some((st) => !st.completed && !st.warmup);
              return (
                <div className="rounded-xl bg-[#0088FF]/[0.07] border border-[#0088FF]/20 px-3 py-2 space-y-1.5">
                  <span className="text-caption text-[#A7A7A7] block">
                    Dernière fois ({last.date.split('-').reverse().slice(0, 2).join('/')}) :{' '}
                    <span className="font-mono num font-bold text-white">{last.sets.map(formatSet).join(' · ')}</span>
                  </span>
                  {suggestion && (
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 text-xs font-bold text-[#0088FF] min-w-0" title={suggestion.reason}>
                        <TrendingUp className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">
                          Objectif : <span className="font-mono num">{suggestion.weightKg} kg × {suggestion.reps}</span>
                          {suggestion.kind === 'increase-load' ? ' (+ charge)' : ' (+ 1 rep)'}
                        </span>
                      </span>
                      {hasPending && (
                        <button
                          type="button"
                          onClick={() => handleApplySuggestion(exercise.id, suggestion.weightKg, suggestion.reps)}
                          className="shrink-0 px-2.5 py-1 rounded-lg bg-[#0088FF] hover:bg-[#0070DD] text-caption font-black text-white cursor-pointer"
                        >
                          Appliquer
                        </button>
                      )}
                    </div>
                  )}
                  {last.notes && (
                    <p className="text-caption text-[#A7A7A7] italic">Note : {last.notes}</p>
                  )}
                </div>
              );
            })()}

            {/* Repos button: Click to open Keyboard Rest Editor */}
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => handleOpenKeyboardRestModal(exercise.id)}
                className="flex items-center gap-1.5 text-xs font-bold text-[#0088FF] hover:underline cursor-pointer"
                title="Cliquer pour saisir le temps de repos au clavier (min/sec)"
              >
                <Clock className="w-3.5 h-3.5 text-[#0088FF]" />
                <span>
                  Repos: {exercise.restSeconds ? `${Math.floor(exercise.restSeconds / 60)}m ${exercise.restSeconds % 60}s` : 'DÉSACTIVÉ'}
                </span>
                <span className="text-2xs text-[#A7A7A7] bg-white/5 px-2 py-0.5 rounded-md border border-white/5 font-normal flex items-center gap-1">
                  Modifier <Keyboard className="w-3 h-3" />
                </span>
              </button>

              {/* Instant Start Rest Button */}
              <button
                type="button"
                onClick={() => handleStartRestTimer(exercise.restSeconds || defaultRestPreset, {
                  exerciseId: exercise.id,
                  exerciseName: exercise.name,
                })}
                className="text-caption font-bold text-[#A7A7A7] hover:text-white px-2 py-0.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors flex items-center gap-1"
              >
                Démarrer chrono <Play className="w-3 h-3 fill-current" />
              </button>
            </div>

            {/* Sets Table: All defaults 0 */}
            <div className="space-y-1.5">
              {/* Table Header */}
              <div className="grid grid-cols-12 text-2xs sm:text-caption font-bold uppercase tracking-wider text-[#A7A7A7] px-1 pb-1">
                <span className="col-span-2 text-left">SÉRIE</span>
                <span className="col-span-3 text-center">PRÉCÉDENT</span>
                <span className="col-span-3 text-center flex items-center justify-center gap-1">
                  <Dumbbell className="w-3 h-3 inline text-[#A7A7A7]" />
                  <span>KG</span>
                </span>
                <span className="col-span-2 text-center">RÉPS</span>
                <span className="col-span-2 flex justify-end pr-2"><Check className="w-3 h-3" /></span>
              </div>

              {/* Rows */}
              {exercise.sets.map((set, sIdx) => (
                <div
                  key={set.id}
                  className={`grid grid-cols-12 items-center py-1.5 px-1 rounded-xl transition-all ${
                    set.completed
                      ? 'bg-[#0088FF]/10 border border-[#0088FF]/30'
                      : 'hover:bg-white/[0.02]'
                  }`}
                >
                  {/* SÉRIE Badge & Delete Action */}
                  <div className="col-span-2 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleToggleWarmup(exercise.id, sIdx)}
                      className={`w-7 h-7 rounded-xl border flex items-center justify-center text-xs font-bold shrink-0 num cursor-pointer ${
                        set.warmup
                          ? 'bg-amber-400/15 border-amber-400/40 text-amber-300'
                          : 'bg-[#1A1A1A] border-white/10 text-white'
                      }`}
                      title={set.warmup ? "Série d'échauffement (touche pour la passer en série de travail)" : "Touche pour marquer comme série d'échauffement"}
                    >
                      {setLabel(exercise.sets, sIdx)}
                    </button>
                    {exercise.sets.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleDeleteSet(exercise.id, sIdx)}
                        className="p-1 text-[#555555] hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                        title={`Supprimer la série ${set.setNumber}`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {/* PRÉCÉDENT */}
                  <div className="col-span-3 text-center text-xs text-[#737373] font-mono num">
                    {set.durationSeconds ? (
                      <span className="flex items-center justify-center gap-1 text-[#A7A7A7]">
                        <Timer className="w-3 h-3" />
                        {formatMinSec(set.durationSeconds)}
                      </span>
                    ) : (
                      (() => {
                        const last = lastByName.get(exercise.name.trim().toLowerCase());
                        const workIdx = exercise.sets.slice(0, sIdx).filter((x) => !x.warmup).length;
                        return !set.warmup && last?.sets[workIdx] ? formatSet(last.sets[workIdx]) : set.previous;
                      })()
                    )}
                  </div>

                  {/* KG Input: Defaults to 0, user enters value via keyboard */}
                  <div className="col-span-3 px-1">
                    <input
                      type="number"
                      value={set.weightKg}
                      onChange={(e) =>
                        handleUpdateSetValue(
                          exercise.id,
                          sIdx,
                          'weightKg',
                          parseFloat(e.target.value) || 0
                        )
                      }
                      className="w-full bg-[#121212] border border-white/15 rounded-xl py-1.5 text-center text-xs sm:text-sm font-black text-white font-mono num focus:outline-none focus:border-[#0088FF]"
                    />
                  </div>

                  {/* RÉPS Input: Defaults to 0, user enters value via keyboard */}
                  <div className="col-span-2 px-1">
                    <input
                      type="number"
                      value={set.reps}
                      onChange={(e) =>
                        handleUpdateSetValue(
                          exercise.id,
                          sIdx,
                          'reps',
                          parseInt(e.target.value, 10) || 0
                        )
                      }
                      className="w-full bg-[#121212] border border-white/15 rounded-xl py-1.5 text-center text-xs sm:text-sm font-black text-white font-mono num focus:outline-none focus:border-[#0088FF]"
                    />
                  </div>

                  {/* Checkbox ✓ Button */}
                  <div className="col-span-2 flex justify-end pr-1">
                    <button
                      type="button"
                      onClick={() => handleToggleSetComplete(exercise.id, sIdx)}
                      className={`w-control-sm h-control-sm rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                        set.completed
                          ? 'bg-[#0088FF] text-white'
                          : 'bg-[#1A1A1A] border border-white/15 text-[#525252] hover:text-white hover:border-white/30'
                      }`}
                      title={set.completed ? "Série validée !" : "Valider la série"}
                    >
                      <Check className="w-4 h-4 stroke-[3]" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* "+ Ajouter une Série" Button */}
            <div className="pt-1 flex gap-2">
              <button
                type="button"
                onClick={() => handleAddSet(exercise.id)}
                className="flex-1 py-2.5 rounded-xl bg-[#1A1A1A] hover:bg-[#222222] border border-white/10 text-xs font-bold text-white flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-[#0088FF]" />
                <span>Ajouter une Série</span>
              </button>

              <button
                type="button"
                onClick={() => handleAddWarmup(exercise.id)}
                className="px-3 py-2.5 rounded-xl bg-[#1A1A1A] hover:bg-amber-400/10 border border-white/10 hover:border-amber-400/30 text-xs font-bold text-[#A7A7A7] hover:text-amber-300 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                title="Ajouter une série d'échauffement au début"
              >
                <Flame className="w-3.5 h-3.5" />
                <span className="text-caption">Échauffement</span>
              </button>

              {exercise.sets.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleDeleteSet(exercise.id, exercise.sets.length - 1)}
                  className="px-3 py-2.5 rounded-xl bg-[#1A1A1A] hover:bg-rose-950/40 border border-white/10 hover:border-rose-500/30 text-xs font-bold text-[#A7A7A7] hover:text-rose-400 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  title="Supprimer la dernière série de cet exercice"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="text-caption hidden sm:inline">Supprimer série</span>
                </button>
              )}
            </div>
          </div>
        ))}

        {/* Session note */}
        <div className="space-y-1.5 pt-2">
          <label htmlFor="live-session-notes" className="text-caption font-bold uppercase tracking-wider text-[#A7A7A7] block">
            Notes de séance
          </label>
          <textarea
            id="live-session-notes"
            value={sessionNotes}
            onChange={(e) => setSessionNotes(e.target.value)}
            rows={3}
            placeholder="Ressenti, douleurs, énergie, ce qu'il faudra changer la prochaine fois…"
            className="w-full bg-[#121212] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-[#666666] focus:outline-none focus:border-[#0088FF] resize-none"
          />
        </div>
      </div>

      {/* ⏱ 4. RUNNING CHRONO DOCK (User requested: "trouve un endroit ou mettre le chrono qui defile...") */}
      {activeRestTimer && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 w-full max-w-lg px-3 z-40">
          <div className="p-4 rounded-2xl bg-[#121212]/95 backdrop-blur-xl border border-[#0088FF]/50 shadow-2xl shadow-black/80 space-y-2.5">
            {/* Header info */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <Timer className="w-4 h-4 text-[#0088FF] shrink-0" />
                <div className="min-w-0">
                  <span className="text-2xs font-black uppercase tracking-wider text-[#0088FF] block truncate">
                    TEMPS DE REPOS EN COURS
                  </span>
                  {activeRestTimer.exerciseName && (
                    <span className="text-xs font-bold text-white truncate block">
                      {activeRestTimer.exerciseName} {activeRestTimer.nextSetNumber ? `· Série ${activeRestTimer.nextSetNumber}` : ''}
                    </span>
                  )}
                </div>
              </div>

              {/* Big Digital Countdown */}
              <div className="flex items-baseline gap-1 text-right">
                <span className="text-2xl font-black font-mono num text-white tracking-tight">
                  {formatTimerDigital(activeRestTimer.remainingSeconds)}
                </span>
              </div>
            </div>

            {/* Smooth Progress Bar */}
            <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#0088FF] to-[#00C6FF] transition-all duration-300"
                style={{
                  width: `${Math.min(100, Math.max(0, (activeRestTimer.remainingSeconds / activeRestTimer.totalSeconds) * 100))}%`,
                }}
              />
            </div>

            {/* Controls Bar: Pause/Relancer, Passer à la série suivante, Régler au clavier */}
            <div className="flex items-center justify-between gap-1.5 pt-0.5">
              {/* 1. Pause / Relancer */}
              <button
                type="button"
                id="btn-chrono-toggle-pause"
                onClick={handleTogglePauseRestTimer}
                className={`py-2 px-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeRestTimer.isRunning
                    ? 'bg-[#1E1E1E] hover:bg-[#252525] text-amber-400 border border-amber-400/30'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-black'
                }`}
              >
                {activeRestTimer.isRunning ? (
                  <>
                    <Pause className="w-3.5 h-3.5 fill-current" />
                    <span>Pause</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Relancer</span>
                  </>
                )}
              </button>

              {/* 2. Passer à la série suivante (Skip le chrono) */}
              <button
                type="button"
                id="btn-chrono-skip-next-set"
                onClick={handleSkipRestTimer}
                className="py-2 px-3 rounded-xl bg-[#0088FF] hover:bg-[#0070DD] active:scale-95 text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer flex-1"
                title="Passer à la série suivante et couper le chrono de repos"
              >
                <SkipForward className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Série suivante</span>
              </button>

              {/* 3. Modifier au clavier (Minutes & Secondes) */}
              <button
                type="button"
                id="btn-chrono-keyboard-adjust"
                onClick={() => handleOpenKeyboardRestModal(activeRestTimer.exerciseId)}
                className="p-2 rounded-xl bg-[#1E1E1E] hover:bg-[#252525] border border-white/10 text-white hover:text-[#0088FF] transition-all cursor-pointer"
                title="Régler le temps en minute et seconde via le clavier"
              >
                <Keyboard className="w-4 h-4" />
              </button>

              {/* +30s Quick Add */}
              <button
                type="button"
                onClick={() => handleAdjustRestTimer(30)}
                className="px-2 py-2 rounded-xl bg-white/5 hover:bg-white/15 text-caption font-mono num font-bold text-white border border-white/10"
                title="Ajouter 30 secondes"
              >
                +30s
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. BOTTOM ACTION BAR */}
      <div className="p-4 bg-[#000000] border-t border-white/10 space-y-2.5 shrink-0 z-30">
        {/* "+ Ajouter un Exercice" */}
        <button
          type="button"
          onClick={() => setShowAddExerciseModal(true)}
          className="w-full py-3.5 px-4 rounded-2xl bg-[#0088FF] hover:bg-[#0070DD] active:scale-[0.99] text-white text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Ajouter un Exercice</span>
        </button>

        {/* Dual Secondary Buttons: "Paramètres" and "Abandonner l'Entraî..." */}
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => setShowSettingsModal(true)}
            className="py-3 rounded-2xl bg-[#1E1E1E] hover:bg-[#262626] text-xs font-bold text-white transition-all flex items-center justify-center gap-1.5"
          >
            <Settings className="w-3.5 h-3.5 text-[#A7A7A7]" />
            <span>Paramètres</span>
          </button>

          <button
            type="button"
            onClick={() => setShowAbandonConfirmModal(true)}
            className="py-3 rounded-2xl bg-[#1E1E1E] hover:bg-[#262626] text-xs font-bold text-[#FF4D4D] transition-all flex items-center justify-center gap-1.5"
          >
            <span>Abandonner l'Entraî...</span>
          </button>
        </div>
      </div>

      {/* MODAL: Saisie du Chrono au Clavier (Minutes & Secondes) */}
      {showKeyboardRestModal && (
        <div 
          className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setShowKeyboardRestModal(false)}
        >
          <div 
            className="w-full max-w-sm bg-[#161616] border border-white/15 rounded-3xl p-5 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Keyboard className="w-4 h-4 text-[#0088FF]" />
                <h3 className="text-sm font-black text-white uppercase">
                  Régler le temps de repos
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowKeyboardRestModal(false)}
                className="text-[#A7A7A7] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#A7A7A7]">
              Saisis directement le temps en minute et seconde avec ton clavier :
            </p>

            {/* Direct Number Inputs for Minutes & Seconds via Keyboard */}
            <div className="flex items-center justify-center gap-3 py-2">
              {/* Minutes */}
              <div className="flex flex-col items-center">
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={keyboardRestMinutes}
                  onChange={(e) => setKeyboardRestMinutes(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  className="w-20 h-16 bg-[#0D0D0D] border-2 border-white/20 focus:border-[#0088FF] rounded-2xl text-center text-3xl font-black font-mono num text-white focus:outline-none"
                  autoFocus
                />
                <span className="text-xs font-bold text-[#A7A7A7] mt-1 uppercase">Minutes</span>
              </div>

              <span className="text-3xl font-black text-white/40 -mt-5">:</span>

              {/* Seconds */}
              <div className="flex flex-col items-center">
                <input
                  type="number"
                  min="0"
                  max="59"
                  step="5"
                  value={keyboardRestSeconds}
                  onChange={(e) => setKeyboardRestSeconds(Math.max(0, Math.min(59, parseInt(e.target.value, 10) || 0)))}
                  className="w-20 h-16 bg-[#0D0D0D] border-2 border-white/20 focus:border-[#0088FF] rounded-2xl text-center text-3xl font-black font-mono num text-white focus:outline-none"
                />
                <span className="text-xs font-bold text-[#A7A7A7] mt-1 uppercase">Secondes</span>
              </div>
            </div>

            {/* Quick Presets */}
            <div className="space-y-1.5">
              <span className="text-2xs font-bold text-[#A7A7A7] uppercase block">
                Raccourcis rapides :
              </span>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { m: 0, s: 30, label: '30s' },
                  { m: 1, s: 0, label: '1m 00' },
                  { m: 1, s: 30, label: '1m 30' },
                  { m: 2, s: 0, label: '2m 00' },
                  { m: 2, s: 30, label: '2m 30' },
                  { m: 3, s: 0, label: '3m 00' },
                  { m: 4, s: 0, label: '4m 00' },
                  { m: 5, s: 0, label: '5m 00' },
                ].map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setKeyboardRestMinutes(item.m);
                      setKeyboardRestSeconds(item.s);
                    }}
                    className="py-1.5 rounded-lg bg-[#202020] hover:bg-[#282828] text-center text-xs font-mono num font-bold text-white border border-white/5"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => handleApplyKeyboardRest(false)}
                className="py-3 rounded-xl bg-[#222222] hover:bg-[#282828] border border-white/10 text-xs font-bold text-white"
              >
                Appliquer par défaut
              </button>
              <button
                type="button"
                id="btn-start-custom-rest-now"
                onClick={() => handleApplyKeyboardRest(true)}
                className="py-3 rounded-xl bg-[#0088FF] hover:bg-[#0070DD] text-xs font-black uppercase text-white flex items-center justify-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Lancer le chrono</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Ajouter un Exercice */}
      {showAddExerciseModal && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setShowAddExerciseModal(false)}
        >
          <div 
            className="w-full max-w-sm bg-[#161616] border border-white/15 rounded-3xl p-5 space-y-4 shadow-2xl max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-black text-white uppercase">
                Ajouter un Exercice
              </h3>
              <button
                type="button"
                onClick={() => setShowAddExerciseModal(false)}
                className="text-[#A7A7A7] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search Input */}
            <input
              type="text"
              placeholder="Rechercher un mouvement..."
              value={exerciseSearch}
              onChange={(e) => setExerciseSearch(e.target.value)}
              className="w-full bg-[#0D0D0D] border border-white/15 rounded-xl px-3 py-2 text-xs text-white placeholder:text-[#666] focus:outline-none focus:border-[#0088FF]"
            />

            {/* List */}
            <div className="flex-1 overflow-y-auto space-y-2 no-scrollbar pr-1">
              {EXERCISE_LIBRARY.filter((ex) =>
                ex.name.toLowerCase().includes(exerciseSearch.toLowerCase())
              ).map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleAddExerciseFromLibrary(item)}
                  className="w-full p-3 rounded-xl bg-[#202020] hover:bg-[#282828] text-left transition-all flex items-center justify-between group"
                >
                  <div>
                    <span className="text-xs font-bold text-white block group-hover:text-[#0088FF]">
                      {item.name}
                    </span>
                    <span className="text-2xs text-[#A7A7A7]">
                      {item.targetMuscles.join(', ')}
                    </span>
                  </div>
                  <Plus className="w-4 h-4 text-[#A7A7A7] group-hover:text-[#0088FF]" />
                </button>
              ))}
            </div>

            {/* Custom Exercise Button */}
            {exerciseSearch.trim().length > 0 && (
              <button
                type="button"
                onClick={() =>
                  handleAddExerciseFromLibrary({
                    name: exerciseSearch.trim(),
                    targetMuscles: ['Muscles ciblés'],
                  })
                }
                className="w-full py-2 rounded-xl bg-[#0088FF]/20 border border-[#0088FF]/40 text-xs font-bold text-[#0088FF] hover:bg-[#0088FF]/30 transition-all"
              >
                + Créer "{exerciseSearch.trim()}"
              </button>
            )}
          </div>
        </div>
      )}

      {/* MODAL: Paramètres de Séance */}
      {showSettingsModal && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setShowSettingsModal(false)}
        >
          <div 
            className="w-full max-w-sm bg-[#161616] border border-white/15 rounded-3xl p-5 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-black text-white uppercase flex items-center gap-2">
                <Settings className="w-4 h-4 text-[#0088FF]" />
                <span>Paramètres de Séance</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="text-[#A7A7A7] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white">Sons & Bips de repos</span>
                <input
                  type="checkbox"
                  checked={soundEnabled}
                  onChange={(e) => setSoundEnabled(e.target.checked)}
                  className="accent-[#0088FF] w-4 h-4 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className="font-bold text-white block">Chrono de série</span>
                  <span className="text-caption text-[#A7A7A7] block">Au lancement d'un exercice</span>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  {[{ v: 3, label: 'Compte à rebours 3 s' }, { v: 0, label: 'Départ direct' }].map((opt) => (
                    <button
                      key={opt.v}
                      type="button"
                      onClick={() => {
                        setSetCountdown(opt.v);
                        saveSetCountdownSeconds(opt.v);
                      }}
                      className={`px-2.5 py-1.5 rounded-lg border text-caption font-bold cursor-pointer ${
                        setCountdown === opt.v
                          ? 'bg-[#0088FF] text-white border-[#0088FF]'
                          : 'bg-[#222] text-[#A7A7A7] border-white/10'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white block">Temps de repos par défaut :</span>
                  <button
                    type="button"
                    onClick={() => {
                      setShowSettingsModal(false);
                      handleOpenKeyboardRestModal();
                    }}
                    className="text-[#0088FF] text-caption font-bold hover:underline"
                  >
                    <span className="flex items-center gap-1">Saisir au clavier <Keyboard className="w-3 h-3" /></span>
                  </button>
                </div>
                <span className="text-[#A7A7A7] font-mono num">
                  {Math.floor(defaultRestPreset / 60)}m {String(defaultRestPreset % 60).padStart(2, '0')}s
                </span>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="w-full py-2.5 rounded-xl bg-[#0088FF] text-white font-bold text-xs cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Abandonner l'entraînement */}
      {showAbandonConfirmModal && (
        <div 
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setShowAbandonConfirmModal(false)}
        >
          <div 
            className="w-full max-w-sm bg-[#161616] border border-white/10 rounded-3xl p-5 space-y-4 shadow-2xl text-center relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowAbandonConfirmModal(false)}
              className="absolute top-4 right-4 p-1 rounded-full text-[#A7A7A7] hover:text-white hover:bg-white/10"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-12 h-12 rounded-full bg-[#0088FF]/10 border border-[#0088FF]/30 text-[#0088FF] flex items-center justify-center mx-auto">
              <ShieldAlert className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-black text-white uppercase">
                Quitter l'entraînement
              </h3>
              <p className="text-xs text-[#A7A7A7]">
                Que souhaites-tu faire avec ta séance en cours ?
              </p>
            </div>

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setShowAbandonConfirmModal(false);
                  handleTriggerFinish();
                }}
                className="w-full py-3 rounded-xl bg-[#0088FF] hover:bg-[#0070DD] text-xs font-bold text-white uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Enregistrer & Retour à l'accueil</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowAbandonConfirmModal(false);
                  clearLiveDraft();
                  onExit();
                }}
                className="w-full py-2.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/20 text-xs font-bold uppercase transition-colors cursor-pointer"
              >
                Quitter sans enregistrer
              </button>

              <button
                type="button"
                onClick={() => setShowAbandonConfirmModal(false)}
                className="w-full py-2 rounded-xl text-xs font-bold text-[#A7A7A7] hover:text-white transition-colors cursor-pointer"
              >
                Continuer l'entraînement
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
