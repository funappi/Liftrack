import React, { useState } from 'react';
import { Calendar, Check, Clock, Dumbbell, Flame, ListChecks } from 'lucide-react';
import { Workout } from '../types';
import { DayKey } from '../utils/dates';
import { isCustomWorkout } from '../utils/workouts';
import { ExerciseSummary, SheetButton, SheetCard, SheetLabel, SheetShell, sheetInputClass } from './workout/WorkoutSheet';

interface ScheduleWorkoutModalProps {
  workouts: Workout[];
  initialWorkoutId?: string;
  initialDayKey?: DayKey;
  onSchedule: (dayKey: DayKey, workoutId: string) => void;
  onClose: () => void;
  theme?: 'dark' | 'warm-light';
}

const DAYS_OF_WEEK: { key: DayKey; label: string }[] = [
  { key: 'LUN', label: 'Lundi' },
  { key: 'MAR', label: 'Mardi' },
  { key: 'MER', label: 'Mercredi' },
  { key: 'JEU', label: 'Jeudi' },
  { key: 'VEN', label: 'Vendredi' },
  { key: 'SAM', label: 'Samedi' },
  { key: 'DIM', label: 'Dimanche' },
];

export const ScheduleWorkoutModal: React.FC<ScheduleWorkoutModalProps> = ({
  workouts,
  initialWorkoutId,
  initialDayKey = 'LUN',
  onSchedule,
  onClose,
  theme,
}) => {
  const isLight = theme === 'warm-light';
  // Only the workouts created by the user can be scheduled
  const myWorkouts = workouts.filter(isCustomWorkout);
  const [selectedDay, setSelectedDay] = useState<DayKey>(initialDayKey);
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string>(
    myWorkouts.some((w) => w.id === initialWorkoutId) ? initialWorkoutId! : myWorkouts[0]?.id || ''
  );

  const selectedWorkout = myWorkouts.find((w) => w.id === selectedWorkoutId);

  const handleConfirm = () => {
    if (!selectedWorkoutId) return;
    onSchedule(selectedDay, selectedWorkoutId);
    onClose();
  };

  return (
    <SheetShell
      isLight={isLight}
      icon={<Calendar className="w-4 h-4 stroke-[2.5]" />}
      eyebrow="PLANIFICATEUR"
      title="Programmer une séance"
      onClose={onClose}
      footer={
        <div className="grid grid-cols-2 gap-2.5">
          <SheetButton onClick={onClose}>Annuler</SheetButton>
          <SheetButton variant="primary" onClick={handleConfirm} disabled={!selectedWorkout}>
            <Check className="w-4 h-4" />
            <span>Programmer</span>
          </SheetButton>
        </div>
      }
    >
      <SheetCard icon={<Calendar className="w-3.5 h-3.5 text-[#00C6FF]" />} title="1. Jour de la semaine">
        <div className="grid grid-cols-7 gap-1">
          {DAYS_OF_WEEK.map((d) => (
            <button
              key={d.key}
              type="button"
              onClick={() => setSelectedDay(d.key)}
              title={d.label}
              className={`py-2 rounded-xl text-caption font-black uppercase transition-all cursor-pointer ${
                selectedDay === d.key
                  ? 'bg-gradient-to-b from-[#7C3AED] to-[#EC4899] text-white shadow-md'
                  : 'bg-[#222222] text-[#A7A7A7] hover:text-white'
              }`}
            >
              {d.key}
            </button>
          ))}
        </div>
      </SheetCard>

      <SheetCard icon={<Dumbbell className="w-3.5 h-3.5 text-[#EC4899]" />} title="2. Séance à programmer">
        {myWorkouts.length === 0 ? (
          <p className="text-xs text-[#A7A7A7]">
            Tu n&apos;as pas encore créé de séance. Crée-la depuis « Créer ma séance de A à Z », elle apparaîtra ici avec le nom que tu lui donnes.
          </p>
        ) : (
          <div className="space-y-1">
            <SheetLabel>Mes séances</SheetLabel>
            <select
              value={selectedWorkoutId}
              onChange={(e) => setSelectedWorkoutId(e.target.value)}
              className={`${sheetInputClass} text-xs px-3`}
            >
              {myWorkouts.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.title}
                </option>
              ))}
            </select>
          </div>
        )}

        {selectedWorkout && (
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-[#0A0A0A] border border-white/10 py-2">
              <Clock className="w-3.5 h-3.5 text-[#EC4899] mx-auto" />
              <span className="text-xs font-mono num font-bold text-white block mt-1">{selectedWorkout.durationMin} min</span>
            </div>
            <div className="rounded-xl bg-[#0A0A0A] border border-white/10 py-2">
              <Flame className="w-3.5 h-3.5 text-[#FF512F] mx-auto" />
              <span className="text-xs font-mono num font-bold text-white block mt-1">{selectedWorkout.estimatedCalories} kcal</span>
            </div>
            <div className="rounded-xl bg-[#0A0A0A] border border-white/10 py-2">
              <ListChecks className="w-3.5 h-3.5 text-[#00C6FF] mx-auto" />
              <span className="text-xs font-mono num font-bold text-white block mt-1">{selectedWorkout.exercises.length} exos</span>
            </div>
          </div>
        )}
      </SheetCard>

      {selectedWorkout && selectedWorkout.exercises.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-black uppercase text-white tracking-wider flex items-center gap-2">
            <ListChecks className="w-3.5 h-3.5 text-[#EC4899]" />
            <span>Détail de « {selectedWorkout.title} »</span>
          </h3>
          {selectedWorkout.exercises.map((ex, i) => (
            <ExerciseSummary key={ex.id} exercise={ex} index={i} />
          ))}
        </div>
      )}
    </SheetShell>
  );
};
