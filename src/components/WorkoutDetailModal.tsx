import React, { useState } from 'react';
import { Clock, Flame, Dumbbell, Play, Check, Info, Target } from 'lucide-react';
import { Workout, Exercise } from '../types';
import { audioSynth } from '../utils/audioSynth';
import { ExerciseCard, SheetButton, SheetCard, SheetShell, Stepper } from './workout/WorkoutSheet';

interface WorkoutDetailModalProps {
  workout: Workout;
  onClose: () => void;
  onStart: (workout: Workout) => void;
  theme?: 'dark' | 'warm-light';
}

export const WorkoutDetailModal: React.FC<WorkoutDetailModalProps> = ({ workout, onClose, onStart, theme = 'dark' }) => {
  const isLight = theme === 'warm-light';

  // Local copy so starting load, reps and sets can be adjusted before starting
  const [exercises, setExercises] = useState<Exercise[]>(workout.exercises || []);
  const [checkedExercises, setCheckedExercises] = useState<Record<string, boolean>>({});

  const toggleCheck = (id: string) => {
    audioSynth.playSetDoneSound();
    setCheckedExercises((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const updateExercise = <K extends keyof Exercise>(id: string, field: K, value: Exercise[K]) => {
    setExercises((prev) => prev.map((ex) => (ex.id === id ? { ...ex, [field]: value } : ex)));
  };

  const totalChecked = Object.values(checkedExercises).filter(Boolean).length;
  const progressPercent = exercises.length > 0 ? Math.round((totalChecked / exercises.length) * 100) : 0;

  const handleStartWorkout = () => {
    onClose();
    onStart({ ...workout, exercises });
  };

  return (
    <SheetShell
      isLight={isLight}
      icon={<Dumbbell className="w-4 h-4 stroke-[2.5]" />}
      eyebrow={`${workout.category} · ${exercises.length} exercice${exercises.length > 1 ? 's' : ''}`}
      title={workout.title}
      onClose={onClose}
      footer={
        <div className="grid grid-cols-2 gap-2.5">
          <SheetButton onClick={onClose}>Fermer</SheetButton>
          <SheetButton id="btn-modal-start-workout" variant="primary" onClick={handleStartWorkout}>
            <Play className="w-4 h-4 fill-white" />
            <span>Commencer</span>
          </SheetButton>
        </div>
      }
    >
      <SheetCard icon={<Info className="w-3.5 h-3.5 text-[#00C6FF]" />} title="Informations de la séance">
        {workout.description && <p className="text-xs text-[#A7A7A7]">{workout.description}</p>}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-[#0A0A0A] border border-white/10 py-2">
            <Clock className="w-3.5 h-3.5 text-[#EC4899] mx-auto" />
            <span className="text-xs font-mono font-bold text-white block mt-1">{workout.durationMin} min</span>
          </div>
          <div className="rounded-xl bg-[#0A0A0A] border border-white/10 py-2">
            <Flame className="w-3.5 h-3.5 text-[#FF512F] mx-auto" />
            <span className="text-xs font-mono font-bold text-white block mt-1">{workout.estimatedCalories} kcal</span>
          </div>
          <div className="rounded-xl bg-[#0A0A0A] border border-white/10 py-2">
            <Dumbbell className="w-3.5 h-3.5 text-[#00C6FF] mx-auto" />
            <span className="text-xs font-mono font-bold text-white block mt-1">{exercises.length} exos</span>
          </div>
        </div>

        {totalChecked > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-black uppercase">
              <span className="text-[#A7A7A7]">Pré-validation</span>
              <span className="text-emerald-500">{progressPercent}% validé</span>
            </div>
            <div className="w-full h-2 rounded-full overflow-hidden bg-[#0A0A0A]">
              <div
                className="h-full bg-gradient-to-r from-[#7C3AED] to-[#EC4899] transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}
      </SheetCard>

      <div className="space-y-3">
        <div>
          <h3 className="text-xs font-black uppercase text-white tracking-wider flex items-center gap-2">
            <Target className="w-3.5 h-3.5 text-[#EC4899]" />
            <span>Plan de la séance</span>
          </h3>
          <p className="text-[10px] text-[#A7A7A7] mt-0.5">Ajuste tes charges de départ, coche pour valider.</p>
        </div>

        {exercises.length === 0 ? (
          <div className="p-8 rounded-2xl bg-[#141414] border border-dashed border-white/15 text-center">
            <p className="text-xs text-[#A7A7A7]">Cette séance ne contient aucun exercice.</p>
          </div>
        ) : (
          exercises.map((exercise, index) => {
            const isChecked = Boolean(checkedExercises[exercise.id]);
            return (
              <ExerciseCard
                key={exercise.id}
                index={index}
                highlighted={isChecked}
                targetMuscles={exercise.targetMuscles || []}
                name={
                  <span className={`text-sm font-black text-white truncate block ${isChecked ? 'line-through opacity-60' : ''}`}>
                    {exercise.name}
                  </span>
                }
                controls={
                  <button
                    type="button"
                    onClick={() => toggleCheck(exercise.id)}
                    className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all cursor-pointer ${
                      isChecked
                        ? 'bg-emerald-500 border-emerald-400 text-white shadow-lg shadow-emerald-500/20'
                        : 'border-white/20 bg-transparent hover:border-white/40'
                    }`}
                    title={isChecked ? 'Validé' : 'Marquer comme validé'}
                  >
                    <Check className={`w-3.5 h-3.5 stroke-[3] ${isChecked ? 'text-white' : 'opacity-0'}`} />
                  </button>
                }
              >
                <div className="grid grid-cols-2 gap-3">
                  <Stepper label="Séries" value={exercise.sets} min={1} max={10} onChange={(v) => updateExercise(exercise.id, 'sets', v)} />
                  <Stepper
                    label="Reps"
                    value={Number(exercise.reps) || 0}
                    max={100}
                    onChange={(v) => updateExercise(exercise.id, 'reps', v)}
                  />
                  <div className="col-span-2">
                    <Stepper
                      label="Charge de départ"
                      value={exercise.targetWeightKg || 0}
                      step={2.5}
                      max={500}
                      suffix="kg"
                      onChange={(v) => updateExercise(exercise.id, 'targetWeightKg', v)}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-[#A7A7A7] mt-2">
                  <Clock className="w-3 h-3 text-[#0088FF]" />
                  <span>{exercise.restSeconds || 60}s de repos</span>
                  {exercise.notes && <span className="truncate">· {exercise.notes}</span>}
                </div>
              </ExerciseCard>
            );
          })
        )}
      </div>
    </SheetShell>
  );
};
