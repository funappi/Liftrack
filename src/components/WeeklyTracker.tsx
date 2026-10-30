import React, { useState } from 'react';
import { Calendar as Clock, Flame, CheckCircle, Plus, ChevronRight, Zap, Check, Trash2 } from 'lucide-react';
import { ScheduledDay, Workout } from '../types';
import { ScheduleWorkoutModal } from './ScheduleWorkoutModal';

interface WeeklyTrackerProps {
  schedule: ScheduledDay[];
  workouts: Workout[];
  onStartScheduledWorkout: (workoutId: string) => void;
  onOpenWorkouts?: () => void;
  onScheduleWorkout?: (dayKey: 'LUN' | 'MAR' | 'MER' | 'JEU' | 'VEN' | 'SAM' | 'DIM', workoutId: string, time: string) => void;
  onRemoveScheduledWorkout?: (dayKey: string, sessionId: string) => void;
  // Screen title row; receives the opener of the schedule modal for its "Programmer" button
  renderHeader: (openSchedule: () => void) => React.ReactNode;
  theme?: 'dark' | 'warm-light';
}

const DAY_FULL_NAMES: Record<string, string> = {
  LUN: 'LUNDI',
  MAR: 'MARDI',
  MER: 'MERCREDI',
  JEU: 'JEUDI',
  VEN: 'VENDREDI',
  SAM: 'SAMEDI',
  DIM: 'DIMANCHE',
};

// Returns current day of week in France timezone (Europe/Paris)
export const getParisDayKey = (): 'LUN' | 'MAR' | 'MER' | 'JEU' | 'VEN' | 'SAM' | 'DIM' => {
  try {
    const formatter = new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Europe/Paris',
      weekday: 'short',
    });
    const formatted = formatter.format(new Date()).toLowerCase();
    if (formatted.startsWith('lun')) return 'LUN';
    if (formatted.startsWith('mar')) return 'MAR';
    if (formatted.startsWith('mer')) return 'MER';
    if (formatted.startsWith('jeu')) return 'JEU';
    if (formatted.startsWith('ven')) return 'VEN';
    if (formatted.startsWith('sam')) return 'SAM';
    if (formatted.startsWith('dim')) return 'DIM';
  } catch {
    // Fallback if Intl is unavailable
  }
  const day = new Date().getDay();
  const map: ('LUN' | 'MAR' | 'MER' | 'JEU' | 'VEN' | 'SAM' | 'DIM')[] = [
    'DIM', 'LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM'
  ];
  return map[day];
};

export const getGradientClass = (type: string) => {
  switch (type) {
    case 'energy':
      return 'from-[#FF512F] to-[#DD2476]';
    case 'performance':
      return 'from-[#00C6FF] to-[#0072FF]';
    case 'premium':
      return 'from-[#8E2DE2] to-[#4A00E0]';
    case 'main':
    default:
      return 'from-[#7C3AED] to-[#EC4899]';
  }
};


export const WeeklyTracker: React.FC<WeeklyTrackerProps> = ({
  schedule,
  workouts,
  onStartScheduledWorkout,
  onOpenWorkouts,
  onScheduleWorkout,
  onRemoveScheduledWorkout,
  renderHeader,
  theme,
}) => {
  const isLight = theme === 'warm-light';
  const currentParisDayKey = getParisDayKey();

  // Dynamically default to current day in French timezone (Europe/Paris)
  const [selectedDayIndex, setSelectedDayIndex] = useState(() => {
    const todayKey = getParisDayKey();
    const idx = schedule.findIndex((d) => d.dayKey === todayKey);
    return idx !== -1 ? idx : 0;
  });

  const [showScheduleModal, setShowScheduleModal] = useState(false);

  // Checkable days state: dayKey -> boolean (persisted in localStorage)
  const [checkedDays, setCheckedDays] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('volt_planning_checked_days');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    const initialMap: Record<string, boolean> = {};
    schedule.forEach((d) => {
      initialMap[d.dayKey] = d.sessions.some((s) => s.status === 'completed');
    });
    return initialMap;
  });

  const toggleDayChecked = (dayKey: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation(); // don't interfere with parent if called from inner button
    }
    setCheckedDays((prev) => {
      const updated = {
        ...prev,
        [dayKey]: !prev[dayKey],
      };
      try {
        localStorage.setItem('volt_planning_checked_days', JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  };

  const selectedDay = schedule[selectedDayIndex] || schedule[0];

  const totalCheckedCount = Object.values(checkedDays).filter(Boolean).length;

  const handleOpenScheduleForSelected = () => {
    setShowScheduleModal(true);
  };

  return (
    <>
      {renderHeader(handleOpenScheduleForSelected)}

      {/* Checkable Days of the Week: No dates, perfectly aligned horizontal checkboxes */}
      <div className="p-3 rounded-2xl bg-[#181818] border border-white/[0.08] space-y-2.5">
        <div className="flex items-center justify-between px-1 text-[11px] font-bold text-[#A7A7A7]">
          <span>JOURS DE LA SEMAINE</span>
          <span className="text-[#00C6FF] font-mono">{totalCheckedCount}/7 cochés</span>
        </div>

        {/* 7 Columns: All with identical height, day on top, checkbox directly below */}
        <div className="grid grid-cols-7 gap-1.5">
          {schedule.map((day, idx) => {
            const isSelected = selectedDayIndex === idx;
            const isChecked = Boolean(checkedDays[day.dayKey]);

            return (
              <div
                key={day.dayKey}
                id={`calendar-day-${day.dayKey}`}
                onClick={() => {
                  setSelectedDayIndex(idx);
                  toggleDayChecked(day.dayKey);
                }}
                className={`flex flex-col items-center justify-between py-2.5 px-1 h-20 rounded-xl transition-all duration-200 cursor-pointer select-none border ${
                  isSelected
                    ? 'bg-gradient-to-b from-[#7C3AED]/35 to-[#EC4899]/35 border-[#EC4899] shadow-lg'
                    : isLight
                    ? 'bg-[#fff7f0] border-[#7d5a47]/20 hover:border-[#b85d38]/40 shadow-sm'
                    : 'bg-[#121212] border-white/5 hover:border-white/20'
                }`}
              >
                {/* 1. Day name on top (LUN, MAR, MER...) */}
                <span
                  className={`text-[11px] font-black uppercase tracking-wider ${
                    isSelected ? (isLight ? 'text-[#3d2317]' : 'text-white') : (isLight ? 'text-[#7d5a47]' : 'text-[#A7A7A7]')
                  }`}
                >
                  {day.dayKey}
                </span>

                {/* Subtle indicator if today according to French timezone */}
                <div className="h-1.5 flex items-center justify-center">
                  {day.dayKey === currentParisDayKey && (
                    <span
                      className="w-1.5 h-1.5 rounded-full bg-[#00C6FF] shadow-sm shadow-[#00C6FF]/60"
                      title="Aujourd'hui (Fuseau horaire français)"
                    />
                  )}
                </div>

                {/* 2. Interactive Checkbox UNDERNEATH: Perfectly aligned horizontally */}
                <button
                  type="button"
                  id={`checkbox-day-${day.dayKey}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedDayIndex(idx);
                    toggleDayChecked(day.dayKey);
                  }}
                  title={isChecked ? `Décocher ${day.dayKey}` : `Cocher ${day.dayKey}`}
                  className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-all cursor-pointer ${
                    isChecked
                      ? 'bg-emerald-500 border-emerald-400 text-black shadow-md shadow-emerald-500/20'
                      : isLight
                      ? 'bg-[#faebe0] border-[#7d5a47]/30 hover:border-[#7d5a47] text-transparent'
                      : 'bg-[#1C1C1C] border-white/20 hover:border-white/40 text-transparent'
                  }`}
                >
                  <Check className={`w-4 h-4 stroke-[3] ${isChecked ? 'text-black' : 'opacity-0'}`} />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Day Header (Without date numbers, clean day name) */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-black uppercase text-white tracking-wide">
            {DAY_FULL_NAMES[selectedDay.dayKey] || selectedDay.dayKey}
          </span>
          {selectedDay.dayKey === currentParisDayKey && (
            <span className="px-2 py-0.5 rounded-full bg-[#00C6FF]/20 text-[#00C6FF] text-[10px] font-black tracking-wider uppercase border border-[#00C6FF]/40">
              Aujourd'hui
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-[#A7A7A7]">
            {selectedDay.sessions.length > 0
              ? `${selectedDay.sessions.length} séance(s)`
              : 'Repos'}
          </span>

          <button
            type="button"
            onClick={handleOpenScheduleForSelected}
            className="text-[11px] font-bold text-[#0088FF] hover:underline flex items-center gap-1"
          >
            <Plus className="w-3 h-3" />
            <span>Ajouter</span>
          </button>
        </div>
      </div>

      {/* Scheduled Sessions for the Day */}
      <div className="space-y-3.5">
        {selectedDay.sessions.length === 0 ? (
          <div className="p-8 rounded-2xl bg-[#181818] border border-white/[0.08] text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-[#00C6FF]">
              <Zap className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="text-base font-black text-white uppercase">REPOS & RÉGÉNÉRATION</h4>
              <p className="text-xs text-[#A7A7A7]">
                Aucune séance programmée pour {DAY_FULL_NAMES[selectedDay.dayKey]?.toLowerCase()}.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 justify-center pt-1">
              <button
                onClick={handleOpenScheduleForSelected}
                className="px-4 py-2.5 rounded-xl bg-[#0088FF] hover:bg-[#0070DD] text-xs font-black uppercase text-white transition-all shadow-md shadow-[#0088FF]/20 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                <span>Programmer une séance pour ce jour</span>
              </button>
              {onOpenWorkouts && (
                <button
                  onClick={onOpenWorkouts}
                  className="px-4 py-2.5 rounded-xl bg-[#202020] text-xs font-black uppercase text-white hover:bg-white/10 transition-all cursor-pointer"
                >
                  Bibliothèque
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {selectedDay.sessions.map((session) => {
              const isCompleted = session.status === 'completed';
              const sessionWorkout = workouts.find((w) => w.id === session.workoutId);
              return (
                <div
                  key={session.id}
                  id={`session-card-${session.id}`}
                  className={`p-5 rounded-2xl border transition-all duration-200 relative overflow-hidden group shadow-xl ${
                    isCompleted
                      ? 'bg-[#181818] border-white/[0.08]'
                      : 'bg-[#181818] border-white/[0.12] hover:border-white/30'
                  }`}
                >
                  {/* Colored dynamic gradient accent ribbon on left */}
                  <div
                    className={`absolute top-0 bottom-0 left-0 w-1.5 bg-gradient-to-b ${getGradientClass(
                      session.gradientType
                    )}`}
                  />

                  <div className="flex items-start justify-between gap-3">
                    <div 
                      onClick={() => onStartScheduledWorkout(session.workoutId)}
                      className="space-y-1.5 flex-1 min-w-0 cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-[#202020] text-[10px] font-black uppercase tracking-wider text-white">
                          {session.time}
                        </span>
                        <span className="text-xs font-extrabold uppercase text-[#EC4899]">
                          {session.type}
                        </span>
                        {isCompleted && (
                          <span className="flex items-center gap-1 text-[10px] font-black text-emerald-400 uppercase">
                            <CheckCircle className="w-3 h-3 fill-emerald-500/20" />
                            Validé
                          </span>
                        )}
                      </div>

                      <h3 className="text-lg font-black text-white uppercase tracking-tight truncate group-hover:text-gradient-main transition-colors">
                        {sessionWorkout?.title ?? session.workoutTitle}
                      </h3>

                      <div className="flex items-center gap-4 text-xs font-bold text-[#A7A7A7] uppercase tracking-wider pt-1">
                        <span className="flex items-center gap-1 text-white">
                          <Clock className="w-3.5 h-3.5 text-[#EC4899]" />
                          {sessionWorkout?.durationMin ?? session.durationMin} MIN
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-[#FF512F]">
                          <Flame className="w-3.5 h-3.5 fill-[#FF512F]" />
                          {sessionWorkout?.estimatedCalories ?? session.calories} KCAL
                        </span>
                      </div>
                    </div>

                    {/* Right action buttons: Start & Delete */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {onRemoveScheduledWorkout && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveScheduledWorkout(selectedDay.dayKey, session.id);
                          }}
                          className="w-8 h-8 rounded-full bg-[#202020] hover:bg-rose-500/20 text-[#A7A7A7] hover:text-rose-400 flex items-center justify-center transition-all cursor-pointer"
                          title="Supprimer du planning"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => onStartScheduledWorkout(session.workoutId)}
                        className="w-8 h-8 rounded-full bg-[#202020] hover:bg-[#0088FF] text-[#A7A7A7] hover:text-white flex items-center justify-center transition-all cursor-pointer"
                        title="Démarrer la séance"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Quick "+ Ajouter une autre séance à ce jour" */}
            <button
              type="button"
              onClick={handleOpenScheduleForSelected}
              className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-dashed border-white/15 text-xs font-bold text-[#A7A7A7] hover:text-white flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Programmer une autre séance pour {DAY_FULL_NAMES[selectedDay.dayKey]?.toLowerCase()}</span>
            </button>
          </div>
        )}
      </div>

      {/* Weekly Stats Summary Bar */}
      <div className="p-4 rounded-2xl bg-[#121212] border border-white/[0.06] flex items-center justify-between">
        <div>
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#A7A7A7]">
            VOLUME HEBDOMADAIRE
          </span>
          <p className="text-sm font-black text-white uppercase">{totalCheckedCount} JOURS VALIDÉS / 7</p>
        </div>
        <div className="text-right">
          <span className="text-base font-black text-gradient-main">
            {Math.round((totalCheckedCount / 7) * 100)}%
          </span>
          <p className="text-[10px] text-[#A7A7A7]">Semaine en cours</p>
        </div>
      </div>

      {/* Schedule Workout Modal */}
      {showScheduleModal && (
        <ScheduleWorkoutModal
          workouts={workouts}
          initialDayKey={selectedDay.dayKey}
          onSchedule={(dayKey, workoutId, time) => {
            if (onScheduleWorkout) {
               onScheduleWorkout(dayKey, workoutId, time);
            }
          }}
          onClose={() => setShowScheduleModal(false)}
          theme={theme}
        />
      )}
    </>
  );
};
