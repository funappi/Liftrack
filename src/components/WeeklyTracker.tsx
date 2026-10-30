import React, { useState } from 'react';
import { Calendar as Clock, Flame, CheckCircle, Plus, ChevronRight, Zap, Check, Trash2 } from 'lucide-react';
import { ScheduledDay, Workout } from '../types';
import { ScheduleWorkoutModal } from './ScheduleWorkoutModal';
import { DayKey, getParisDayKey } from '../utils/dates';
import { useVoltData } from '../data/VoltDataContext';
import { checkedDaysCount, checkedDaysThisWeek, dateOfDayKey, sessionsOn, weeklyVolume } from '../data/selectors';
import { todayISO } from '../data/model';

interface WeeklyTrackerProps {
  schedule: ScheduledDay[];
  workouts: Workout[];
  onStartScheduledWorkout: (workoutId: string) => void;
  onOpenWorkouts?: () => void;
  onScheduleWorkout?: (dayKey: DayKey, workoutId: string) => void;
  // Weekly goal (sessions per week) set in Settings; defaults to 7 days
  weeklyGoal?: number;
  onRemoveScheduledWorkout?: (dayKey: string, sessionId: string) => void;
  // Screen title row; receives the opener of the schedule modal for its "Programmer" button
  renderHeader: (openSchedule: () => void) => React.ReactNode;
  theme?: 'dark' | 'warm-light';
  // Weekly lifted volume goal (kg), shown next to the volume of the week
  weeklyVolumeTargetKg?: number;
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
  weeklyGoal = 7,
  onRemoveScheduledWorkout,
  renderHeader,
  theme,
  weeklyVolumeTargetKg,
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

  // Checked days come from the dated completed sessions (single source of truth):
  // a day is checked when at least one session (app or manual) exists that day.
  const { data, setDayChecked } = useVoltData();
  const checkedDays = checkedDaysThisWeek(data);
  const today = todayISO();

  const isFutureDay = (dayKey: DayKey) => dateOfDayKey(dayKey) > today;

  const toggleDayChecked = (dayKey: DayKey) => {
    if (isFutureDay(dayKey)) return;
    const date = dateOfDayKey(dayKey);
    if (!checkedDays[dayKey]) {
      setDayChecked(date, true);
      return;
    }
    const hasAppSession = sessionsOn(data, date).some((s) => s.source === 'app');
    if (hasAppSession && !window.confirm('Supprimer la séance réalisée ce jour ?')) return;
    setDayChecked(date, false);
  };

  const selectedDay = schedule[selectedDayIndex] || schedule[0];

  const totalCheckedCount = checkedDaysCount(data);
  const volumeKg = Math.round(weeklyVolume(data));
  const formatKg = (kg: number) => kg.toLocaleString('fr-FR');

  const handleOpenScheduleForSelected = () => {
    setShowScheduleModal(true);
  };

  return (
    <>
      {renderHeader(handleOpenScheduleForSelected)}

      {/* Week summary + checkable days (grouped like the Home sections) */}
      <section className="space-y-3.5">
      {/* Weekly Stats Summary Bar */}
      <div className="p-4 rounded-2xl bg-[#121212] border border-white/[0.06] flex items-center justify-between">
        <div>
          <span className="text-2xs font-extrabold uppercase tracking-widest text-[#A7A7A7]">
            VOLUME HEBDOMADAIRE
          </span>
          <p className="text-sm font-black text-white uppercase">{totalCheckedCount} JOURS VALIDÉS / {weeklyGoal}</p>
          <p className="text-caption font-bold text-[#A7A7A7] num">
            {formatKg(volumeKg)} kg soulevés
            {weeklyVolumeTargetKg ? ` / ${formatKg(weeklyVolumeTargetKg)} kg` : ''}
          </p>
        </div>
        <div className="text-right">
          <span className="text-base font-black text-gradient-main num">
            {Math.min(100, Math.round((totalCheckedCount / Math.max(1, weeklyGoal)) * 100))}%
          </span>
          <p className="text-2xs text-[#A7A7A7]">Objectif de la semaine</p>
        </div>
      </div>

      {/* Checkable Days of the Week: No dates, perfectly aligned horizontal checkboxes */}
      <div className="p-3 rounded-2xl bg-[#181818] border border-white/[0.08] space-y-2.5">
        <div className="flex items-center justify-between px-1 text-caption font-bold text-[#A7A7A7]">
          <span>JOURS DE LA SEMAINE</span>
          <span className="text-[#00C6FF] font-mono num">{totalCheckedCount}/7 cochés</span>
        </div>

        {/* 7 Columns: All with identical height, day on top, checkbox directly below */}
        <div className="grid grid-cols-7 gap-1.5">
          {schedule.map((day, idx) => {
            const isSelected = selectedDayIndex === idx;
            const isChecked = Boolean(checkedDays[day.dayKey]);
            const isFuture = isFutureDay(day.dayKey);

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
                  className={`text-caption font-black uppercase tracking-wider ${
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
                  disabled={isFuture}
                  aria-pressed={isChecked}
                  title={isFuture ? `${day.dayKey} : jour à venir` : isChecked ? `Décocher ${day.dayKey}` : `Cocher ${day.dayKey}`}
                  className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-all ${
                    isFuture
                      ? isLight
                        ? 'bg-[#faebe0]/60 border-[#7d5a47]/15 text-transparent opacity-40 cursor-not-allowed'
                        : 'bg-[#1C1C1C]/60 border-white/10 text-transparent opacity-40 cursor-not-allowed'
                      : isChecked
                      ? 'bg-emerald-500 border-emerald-400 text-black shadow-md shadow-emerald-500/20 cursor-pointer'
                      : isLight
                      ? 'bg-[#faebe0] border-[#7d5a47]/30 hover:border-[#7d5a47] text-transparent cursor-pointer'
                      : 'bg-[#1C1C1C] border-white/20 hover:border-white/40 text-transparent cursor-pointer'
                  }`}
                >
                  <Check className={`w-4 h-4 stroke-[3] ${isChecked ? 'text-black' : 'opacity-0'}`} />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      </section>

      {/* Selected day + its scheduled sessions */}
      <section className="space-y-3.5">
      {/* Selected Day Header (Without date numbers, clean day name) */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-black uppercase text-white tracking-wide">
            {DAY_FULL_NAMES[selectedDay.dayKey] || selectedDay.dayKey}
          </span>
          {selectedDay.dayKey === currentParisDayKey && (
            <span className="px-2 py-0.5 rounded-full bg-[#00C6FF]/20 text-[#00C6FF] text-2xs font-black tracking-wider uppercase border border-[#00C6FF]/40">
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
            className="text-caption font-bold text-[#0088FF] hover:underline flex items-center gap-1"
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
                        <span className="text-xs font-extrabold uppercase text-[#EC4899]">
                          {session.type}
                        </span>
                        {isCompleted && (
                          <span className="flex items-center gap-1 text-2xs font-black text-emerald-400 uppercase">
                            <CheckCircle className="w-3 h-3 fill-emerald-500/20" />
                            Validé
                          </span>
                        )}
                      </div>

                      <h3 className="text-lg font-black text-white uppercase tracking-tight truncate group-hover:text-gradient-main transition-colors">
                        {sessionWorkout?.title ?? session.workoutTitle}
                      </h3>

                      <div className="flex items-center gap-4 text-xs font-bold text-[#A7A7A7] uppercase tracking-wider pt-1 num">
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
                          className="w-control-sm h-control-sm rounded-full bg-[#202020] hover:bg-rose-500/20 text-[#A7A7A7] hover:text-rose-400 flex items-center justify-center transition-all cursor-pointer"
                          title="Supprimer du planning"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => onStartScheduledWorkout(session.workoutId)}
                        className="w-control-sm h-control-sm rounded-full bg-[#202020] hover:bg-[#0088FF] text-[#A7A7A7] hover:text-white flex items-center justify-center transition-all cursor-pointer"
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

      </section>

      {/* Schedule Workout Modal */}
      {showScheduleModal && (
        <ScheduleWorkoutModal
          workouts={workouts}
          initialDayKey={selectedDay.dayKey}
          onSchedule={(dayKey, workoutId) => onScheduleWorkout?.(dayKey, workoutId)}
          onClose={() => setShowScheduleModal(false)}
          theme={theme}
        />
      )}
    </>
  );
};
