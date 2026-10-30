import React, { useMemo, useState } from 'react';
import { Calendar as Clock, Flame, Plus, ChevronRight, Trash2, Play } from 'lucide-react';
import { ScheduledDay, Workout } from '../types';
import { CreateWorkoutModal } from './CreateWorkoutModal';
import { ScheduleWorkoutModal } from './ScheduleWorkoutModal';
import { WeeklyTracker, getGradientClass, getParisDayKey } from './WeeklyTracker';

interface WorkoutsTabProps {
  workouts: Workout[];
  schedule: ScheduledDay[];
  onSelectWorkout: (workout: Workout) => void;
  onStartWorkout: (workout: Workout) => void;
  onSaveCustomWorkout?: (workout: Workout, launchImmediately?: boolean) => void;
  onDeleteWorkout?: (workoutId: string) => void;
  onScheduleWorkout?: (dayKey: 'LUN' | 'MAR' | 'MER' | 'JEU' | 'VEN' | 'SAM' | 'DIM', workoutId: string, time: string) => void;
  onRemoveScheduledWorkout?: (dayKey: string, sessionId: string) => void;
  theme?: 'dark' | 'warm-light';
}

const DAY_ORDER: ScheduledDay['dayKey'][] = ['LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM', 'DIM'];

const CATEGORY_LABELS: Record<string, string> = {
  force: 'FORCE',
  hypertrophie: 'HYPERTROPHIE',
  cardio: 'CARDIO & HIIT',
  fullbody: 'FULL BODY',
  perte_poids: 'PERTE DE POIDS',
  mobilite: 'MOBILITÉ',
};

export const WorkoutsTab: React.FC<WorkoutsTabProps> = ({
  workouts,
  schedule,
  onSelectWorkout,
  onStartWorkout,
  onSaveCustomWorkout,
  onDeleteWorkout,
  onScheduleWorkout,
  onRemoveScheduledWorkout,
  theme,
}) => {
  const isLight = theme === 'warm-light';
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [schedulingWorkoutId, setSchedulingWorkoutId] = useState<string | null>(null);

  // Next upcoming session per workout (closest day from today, then earliest time) → listed first
  const sortedWorkouts = useMemo(() => {
    const todayIdx = DAY_ORDER.indexOf(getParisDayKey());
    const nextByWorkout = new Map<string, { rank: string; time: string }>();
    schedule.forEach((day) => {
      const delta = (DAY_ORDER.indexOf(day.dayKey) - todayIdx + 7) % 7;
      day.sessions.forEach((s) => {
        if (s.status !== 'upcoming') return;
        const rank = `${delta}-${s.time}`;
        const current = nextByWorkout.get(s.workoutId);
        if (!current || rank < current.rank) nextByWorkout.set(s.workoutId, { rank, time: s.time });
      });
    });
    const scheduled = workouts
      .filter((w) => nextByWorkout.has(w.id))
      .sort((a, b) => nextByWorkout.get(a.id)!.rank.localeCompare(nextByWorkout.get(b.id)!.rank));
    const others = workouts.filter((w) => !nextByWorkout.has(w.id));
    return [...scheduled, ...others].map((w) => ({ workout: w, time: nextByWorkout.get(w.id)?.time }));
  }, [workouts, schedule]);

  const handleSaveCreatedWorkout = (workout: Workout, launchImmediately = false) => {
    setShowCreateModal(false);
    if (onSaveCustomWorkout) {
      onSaveCustomWorkout(workout, launchImmediately);
    } else {
      if (launchImmediately) {
        onStartWorkout(workout);
      }
    }
  };

  return (
    <div className="pb-36 pt-2 px-4 space-y-5 max-w-lg mx-auto">
      {/* Weekly follow-up (shared with the Planning tab), title row on top */}
      <WeeklyTracker
        schedule={schedule}
        workouts={workouts}
        onStartScheduledWorkout={(id) => {
          const target = workouts.find((w) => w.id === id);
          if (target) onSelectWorkout(target);
        }}
        onScheduleWorkout={onScheduleWorkout}
        onRemoveScheduledWorkout={onRemoveScheduledWorkout}
        theme={theme}
        renderHeader={() => (
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h2 className={`text-2xl font-black tracking-tight uppercase ${isLight ? 'text-[#3d2317]' : 'text-white'}`}>
                Mes séances
              </h2>
            </div>

            <button
              id="btn-create-workout-top"
              onClick={() => setShowCreateModal(true)}
              className={`px-3.5 py-2 rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer ${
                isLight
                  ? 'bg-gradient-to-r from-[#c05a3e] to-[#d97706] hover:brightness-105 text-white shadow-[#c05a3e]/20'
                  : 'bg-gradient-to-r from-[#7C3AED] to-[#EC4899] hover:brightness-110 text-white shadow-[#EC4899]/20'
              }`}
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>Créer séance</span>
            </button>
          </div>
        )}
      />

      {/* 🛠 DEDICATED SECTION: CRÉER MA PROPRE SÉANCE DE A À Z */}
      <div className={`p-4 sm:p-5 rounded-3xl transition-all space-y-3 relative overflow-hidden shadow-2xl border ${
        isLight
          ? 'bg-gradient-to-br from-[#fff7f0] via-[#faebe0] to-[#f4dfce] border-[#c05a3e]/30 shadow-[#c05a3e]/10'
          : 'bg-gradient-to-br from-[#7C3AED]/20 via-[#181818] to-[#121212] border-[#EC4899]/40'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${isLight ? 'bg-[#c05a3e]' : 'bg-[#EC4899]'}`} />
            <span className={`text-[11px] font-black uppercase tracking-wider ${isLight ? 'text-[#b85d38]' : 'text-[#EC4899]'}`}>
              ENTRAÎNEMENT SUR-MESURE
            </span>
          </div>
          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
            isLight
              ? 'bg-[#c05a3e]/10 border-[#c05a3e]/30 text-[#b85d38]'
              : 'bg-[#EC4899]/20 border-[#EC4899]/40 text-[#EC4899]'
          }`}>
            CRÉATION LIBRE
          </span>
        </div>

        <div>
          <h3 className={`text-lg font-black uppercase tracking-tight ${isLight ? 'text-[#3d2317]' : 'text-white'}`}>
            Créer ma séance de A à Z
          </h3>
          <p className={`text-xs mt-0.5 ${isLight ? 'text-[#7d5a47]' : 'text-[#A7A7A7]'}`}>
            Ajoute les exercices de ton choix, configure tes séries, règle le temps de repos et démarre ton entraînement personnalisé.
          </p>
        </div>

        <button
          id="btn-open-create-workout-modal"
          onClick={() => setShowCreateModal(true)}
          className={`w-full py-3.5 px-4 rounded-2xl font-black text-sm uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${
            isLight
              ? 'bg-gradient-to-r from-[#c05a3e] to-[#d97706] hover:brightness-105 active:scale-[0.98] text-white shadow-[#c05a3e]/30'
              : 'bg-gradient-to-r from-[#7C3AED] to-[#EC4899] hover:brightness-110 active:scale-[0.98] text-white shadow-[#EC4899]/25'
          }`}
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>CRÉER MA PROPRE SÉANCE (DE A À Z) →</span>
        </button>
      </div>

      {/* Workouts list: every workout of the app (created + already scheduled) */}
      {sortedWorkouts.length > 0 ? (
        <div className="space-y-3.5">
          {sortedWorkouts.map(({ workout, time }) => (
            <div
              key={workout.id}
              id={`workout-card-${workout.id}`}
              className="p-5 rounded-2xl border bg-[#181818] border-white/[0.12] hover:border-white/30 transition-all duration-200 relative overflow-hidden group shadow-xl"
            >
              <div
                className={`absolute top-0 bottom-0 left-0 w-1.5 bg-gradient-to-b ${getGradientClass(workout.gradientType)}`}
              />

              <div className="flex items-start justify-between gap-3">
                <div onClick={() => onSelectWorkout(workout)} className="space-y-1.5 flex-1 min-w-0 cursor-pointer">
                  <div className="flex items-center gap-2">
                    {time && (
                      <span className="px-2 py-0.5 rounded-md bg-[#202020] text-[10px] font-black uppercase tracking-wider text-white">
                        {time}
                      </span>
                    )}
                    <span className="text-xs font-extrabold uppercase text-[#EC4899]">
                      {CATEGORY_LABELS[workout.category] ?? workout.category.toUpperCase()}
                    </span>
                  </div>

                  <h3 className="text-lg font-black text-white uppercase tracking-tight truncate group-hover:text-gradient-main transition-colors">
                    {workout.title}
                  </h3>

                  <div className="flex items-center gap-4 text-xs font-bold text-[#A7A7A7] uppercase tracking-wider pt-1">
                    <span className="flex items-center gap-1 text-white">
                      <Clock className="w-3.5 h-3.5 text-[#EC4899]" />
                      {workout.durationMin} MIN
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-[#FF512F]">
                      <Flame className="w-3.5 h-3.5 fill-[#FF512F]" />
                      {workout.estimatedCalories} KCAL
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {onDeleteWorkout && (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(workout.id)}
                      className="w-8 h-8 rounded-full bg-[#202020] hover:bg-rose-500/20 text-[#A7A7A7] hover:text-rose-400 flex items-center justify-center transition-all cursor-pointer"
                      title="Supprimer cette séance"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onSelectWorkout(workout)}
                    className="w-8 h-8 rounded-full bg-[#202020] hover:bg-[#0088FF] text-[#A7A7A7] hover:text-white flex items-center justify-center transition-all cursor-pointer"
                    title="Voir le détail"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {confirmDeleteId === workout.id ? (
                <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-rose-300">Supprimer cette séance et ses créneaux ?</span>
                  <div className="flex gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(null)}
                      className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] font-black uppercase text-white cursor-pointer"
                    >
                      Non
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onDeleteWorkout?.(workout.id);
                        setConfirmDeleteId(null);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-600 text-[11px] font-black uppercase text-white cursor-pointer"
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-3 pt-3 border-t border-white/10 grid grid-cols-2 gap-2">
                  {onScheduleWorkout && (
                    <button
                      type="button"
                      onClick={() => setSchedulingWorkoutId(workout.id)}
                      className="py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-dashed border-white/15 text-[11px] font-black uppercase text-[#A7A7A7] hover:text-white flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Programmer</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onStartWorkout(workout)}
                    className={`py-2 rounded-xl bg-[#0088FF] hover:bg-[#0070DD] text-white text-[11px] font-black uppercase flex items-center justify-center gap-1.5 transition-all shadow-md shadow-[#0088FF]/20 cursor-pointer ${
                      onScheduleWorkout ? '' : 'col-span-2'
                    }`}
                  >
                    <Play className="w-3.5 h-3.5 fill-white" />
                    <span>Lancer</span>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className={`p-8 text-center rounded-2xl border space-y-1 ${isLight ? 'bg-[#fff7f0] border-[#7d5a47]/20' : 'bg-[#181818] border-white/10'}`}>
          <p className={`text-sm font-bold ${isLight ? 'text-[#3d2317]' : 'text-white'}`}>Aucune séance créée</p>
          <p className="text-xs text-[#A7A7A7]">Crée ta première séance avec le bouton ci-dessus.</p>
        </div>
      )}

      {/* Modal: Create Workout From Scratch */}
      {showCreateModal && (
        <CreateWorkoutModal
          onSaveWorkout={handleSaveCreatedWorkout}
          onClose={() => setShowCreateModal(false)}
          theme={theme}
        />
      )}

      {/* Modal: schedule a given workout from its card */}
      {schedulingWorkoutId && onScheduleWorkout && (
        <ScheduleWorkoutModal
          workouts={workouts}
          initialWorkoutId={schedulingWorkoutId}
          onSchedule={onScheduleWorkout}
          onClose={() => setSchedulingWorkoutId(null)}
          theme={theme}
        />
      )}
    </div>
  );
};
