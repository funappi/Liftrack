import React from 'react';
import { Plus } from 'lucide-react';
import { ScheduledDay, Workout } from '../types';
import { WeeklyTracker } from './WeeklyTracker';

interface PlanningTabProps {
  schedule: ScheduledDay[];
  workouts?: Workout[];
  onStartScheduledWorkout: (workoutId: string) => void;
  onOpenWorkouts: () => void;
  onScheduleWorkout?: (dayKey: 'LUN' | 'MAR' | 'MER' | 'JEU' | 'VEN' | 'SAM' | 'DIM', workoutId: string, time: string) => void;
  onRemoveScheduledWorkout?: (dayKey: string, sessionId: string) => void;
  theme?: 'dark' | 'warm-light';
}

export const PlanningTab: React.FC<PlanningTabProps> = ({
  schedule,
  workouts = [],
  onStartScheduledWorkout,
  onOpenWorkouts,
  onScheduleWorkout,
  onRemoveScheduledWorkout,
  theme,
}) => {
  return (
    <div className="pb-36 pt-2 px-4 space-y-6 max-w-lg mx-auto">
      <WeeklyTracker
        schedule={schedule}
        workouts={workouts}
        onStartScheduledWorkout={onStartScheduledWorkout}
        onOpenWorkouts={onOpenWorkouts}
        onScheduleWorkout={onScheduleWorkout}
        onRemoveScheduledWorkout={onRemoveScheduledWorkout}
        theme={theme}
        renderHeader={(openSchedule) => (
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-black uppercase tracking-widest text-[#A7A7A7]">
              PLANNING HEBDOMADAIRE
            </span>
            <h2 className="text-2xl font-black text-white tracking-tight uppercase">
              Ton Calendrier
            </h2>
          </div>
  
          <button
            id="btn-open-schedule-modal"
            onClick={openSchedule}
            className="px-3 py-1.5 rounded-full bg-[#181818] border border-white/10 text-xs font-black text-white hover:border-[#EC4899]/50 flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-[#EC4899]" />
            <span>Programmer</span>
          </button>
        </div>
        )}
      />
    </div>
  );
};
