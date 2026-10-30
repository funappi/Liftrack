import React, { useState } from 'react';
import { X, Calendar, Clock, Check } from 'lucide-react';
import { Workout } from '../types';

interface ScheduleWorkoutModalProps {
  workouts: Workout[];
  initialDayKey?: 'LUN' | 'MAR' | 'MER' | 'JEU' | 'VEN' | 'SAM' | 'DIM';
  onSchedule: (dayKey: 'LUN' | 'MAR' | 'MER' | 'JEU' | 'VEN' | 'SAM' | 'DIM', workoutId: string, time: string) => void;
  onClose: () => void;
  theme?: 'dark' | 'warm-light';
}

const DAYS_OF_WEEK: { key: 'LUN' | 'MAR' | 'MER' | 'JEU' | 'VEN' | 'SAM' | 'DIM'; label: string }[] = [
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
  initialDayKey = 'LUN',
  onSchedule,
  onClose,
  theme,
}) => {
  const isLight = theme === 'warm-light';
  const [selectedDay, setSelectedDay] = useState<'LUN' | 'MAR' | 'MER' | 'JEU' | 'VEN' | 'SAM' | 'DIM'>(initialDayKey);
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string>(workouts[0]?.id || '');
  const [time, setTime] = useState('18:00');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorkoutId) return;
    onSchedule(selectedDay, selectedWorkoutId, time);
    onClose();
  };

  const selectedWorkout = workouts.find((w) => w.id === selectedWorkoutId);

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200 ${
        isLight ? 'bg-[#3d2317]/65 backdrop-blur-sm' : 'bg-black/80 backdrop-blur-sm'
      }`}
      onClick={onClose}
    >
      <div 
        className={`w-full max-w-sm rounded-3xl p-5 space-y-4 shadow-2xl border transition-colors ${
          isLight ? 'bg-[#faebe0] border-[#7d5a47]/20 text-[#3d2317]' : 'bg-[#161616] border-white/15 text-white'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`flex items-center justify-between border-b pb-3 ${
          isLight ? 'border-[#7d5a47]/15' : 'border-white/10'
        }`}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#0088FF]/20 border border-[#0088FF]/40 text-[#0088FF] flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase text-[#0088FF] tracking-wider block">
                PLANIFICATEUR
              </span>
              <h3 className={`text-sm font-black uppercase ${isLight ? 'text-[#3d2317]' : 'text-white'}`}>
                Programmer une séance
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors border ${
              isLight
                ? 'bg-[#f3dfcb] hover:bg-[#fff3ea] text-[#7d5a47] hover:text-[#3d2317] border-[#7d5a47]/20'
                : 'bg-white/10 hover:bg-white/20 text-[#A7A7A7] hover:text-white border-transparent'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* 1. Select Day of the Week */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-[#A7A7A7] uppercase block">
              Jour de la semaine :
            </label>
            <div className="grid grid-cols-7 gap-1">
              {DAYS_OF_WEEK.map((d) => (
                <button
                  key={d.key}
                  type="button"
                  onClick={() => setSelectedDay(d.key)}
                  className={`py-2 rounded-xl text-xs font-black uppercase transition-all ${
                    selectedDay === d.key
                      ? 'bg-gradient-to-b from-[#7C3AED] to-[#EC4899] text-white shadow-md'
                      : 'bg-[#222222] text-[#A7A7A7] hover:text-white'
                  }`}
                >
                  {d.key}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Select Workout */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-[#A7A7A7] uppercase block">
              Séance à programmer :
            </label>
            <select
              value={selectedWorkoutId}
              onChange={(e) => setSelectedWorkoutId(e.target.value)}
              className="w-full bg-[#0D0D0D] border border-white/15 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#0088FF]"
            >
              {workouts.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.title} ({w.durationMin} min - {w.exercises.length} exos)
                </option>
              ))}
            </select>

            {selectedWorkout && (
              <div className="p-2.5 rounded-xl bg-[#202020] border border-white/5 space-y-1">
                <span className="text-[10px] text-[#0088FF] uppercase font-bold block">
                  {selectedWorkout.category} • {selectedWorkout.difficulty}
                </span>
                <p className="text-[11px] text-[#A7A7A7] line-clamp-1">
                  {selectedWorkout.description}
                </p>
              </div>
            )}
          </div>

          {/* 3. Time input */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-[#A7A7A7] uppercase flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#EC4899]" />
              <span>Heure prévue :</span>
            </label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full bg-[#0D0D0D] border border-white/15 rounded-xl px-3 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-[#0088FF]"
            />
          </div>

          {/* Action buttons */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#0088FF] to-[#0070DD] hover:brightness-110 active:scale-[0.98] text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-[#0088FF]/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Confirmer la programmation</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
