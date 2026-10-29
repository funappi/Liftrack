import React, { useState } from 'react';
import { X, Clock, Flame, Dumbbell, Play, Check, Edit3 } from 'lucide-react';
import { Workout, Exercise } from '../types';
import { audioSynth } from '../utils/audioSynth';

interface WorkoutDetailModalProps {
  workout: Workout;
  onClose: () => void;
  onStart: (workout: Workout) => void;
  theme?: 'dark' | 'warm-light';
}

export const WorkoutDetailModal: React.FC<WorkoutDetailModalProps> = ({
  workout,
  onClose,
  onStart,
  theme = 'dark',
}) => {
  const isLight = theme === 'warm-light';

  // Local exercises state so user can customize starting weights and reps before starting!
  const [exercises, setExercises] = useState<Exercise[]>(workout.exercises || []);
  const [checkedExercises, setCheckedExercises] = useState<Record<string, boolean>>({});
  
  // Exercise being edited inline (starting weight, reps, sets)
  const [editingExId, setEditingExId] = useState<string | null>(null);
  const [editWeight, setEditWeight] = useState<number>(0);
  const [editReps, setEditReps] = useState<number>(0);
  const [editSets, setEditSets] = useState<number>(4);

  const toggleCheck = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    audioSynth.playSetDoneSound();
    setCheckedExercises((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleOpenEdit = (ex: Exercise, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingExId(ex.id);
    setEditWeight(ex.targetWeightKg || 0);
    setEditReps(typeof ex.reps === 'number' ? ex.reps : 0);
    setEditSets(ex.sets || 4);
  };

  const handleSaveEdit = (exId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExercises((prev) =>
      prev.map((ex) =>
        ex.id === exId
          ? {
              ...ex,
              targetWeightKg: Math.max(0, editWeight),
              reps: Math.max(0, editReps),
              sets: Math.max(1, editSets),
            }
          : ex
      )
    );
    setEditingExId(null);
  };

  const totalChecked = Object.values(checkedExercises).filter(Boolean).length;
  const progressPercent = exercises.length > 0 ? Math.round((totalChecked / exercises.length) * 100) : 0;

  const handleStartWorkout = () => {
    onClose();
    // Pass workout with updated customized starting weights & reps
    onStart({
      ...workout,
      exercises,
    });
  };

  return (
    <div className={`fixed inset-0 z-50 flex flex-col justify-end max-w-lg mx-auto overflow-hidden animate-in fade-in duration-200 ${
      isLight ? 'bg-[#3d2317]/65 backdrop-blur-xl' : 'bg-[#120e0b]/90 backdrop-blur-xl'
    }`}>
      <div className={`relative w-full h-[94vh] rounded-t-3xl border-t flex flex-col overflow-hidden shadow-2xl transition-colors duration-200 ${
        isLight 
          ? 'bg-[#f3dfcb] border-[#7d5a47]/20 text-[#3d2317]' 
          : 'bg-[#161311] border-[#3e342b]/60 text-[#f7eee4]'
      }`}>
        {/* Floating Close Button */}
        <button
          id="btn-close-detail"
          onClick={onClose}
          className={`absolute top-4 right-4 z-30 w-9 h-9 rounded-full backdrop-blur-md flex items-center justify-center transition-all cursor-pointer shadow-lg ${
            isLight
              ? 'bg-[#faebe0]/85 border border-[#7d5a47]/25 text-[#3d2317] hover:bg-[#faebe0]'
              : 'bg-[#211b17]/80 border border-white/20 text-white hover:bg-[#29221d]'
          }`}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Outer Scroll Container */}
        <div className="flex-1 overflow-y-auto no-scrollbar relative flex flex-col">
          {/* 1. HERO HEADER: Layered underneath (relative z-10) with photo and titles */}
          <div className="relative h-64 w-full shrink-0 overflow-hidden z-10">
            <img
              src={workout.imageUrl}
              alt={workout.title}
              className={`w-full h-full object-cover ${isLight ? 'brightness-[0.75]' : 'brightness-[0.55]'}`}
            />
            {/* Smooth Hero Gradient Overlay */}
            <div className={`absolute inset-0 bg-gradient-to-t ${
              isLight
                ? 'from-[#f3dfcb] via-[#f3dfcb]/60 to-transparent'
                : 'from-[#161311] via-[#161311]/50 to-transparent'
            }`} />

            {/* Tag and Title */}
            <div className="absolute bottom-10 left-5 right-5 space-y-2">
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-0.5 rounded-full font-black text-[10px] uppercase tracking-wider shadow-sm ${
                  isLight
                    ? 'bg-[#b85d38] text-white'
                    : 'bg-[#c05a3e] text-white'
                }`}>
                  {workout.category}
                </span>
                <span className={`px-2.5 py-0.5 rounded-full backdrop-blur-md font-bold text-[10px] uppercase tracking-wider border ${
                  isLight
                    ? 'bg-[#faebe0]/80 text-[#3d2317] border-[#7d5a47]/20'
                    : 'bg-white/15 text-white border-white/10'
                }`}>
                  {workout.difficulty}
                </span>
              </div>

              <h2 className={`text-3xl font-black tracking-tight uppercase leading-none drop-shadow-md ${
                isLight ? 'text-[#3d2317]' : 'text-[#f7eee4]'
              }`}>
                {workout.title}
              </h2>

              <div className={`flex items-center gap-4 text-xs font-bold uppercase tracking-wider ${
                isLight ? 'text-[#7d5a47]' : 'text-[#ab9a8a]'
              }`}>
                <span className={`flex items-center gap-1.5 ${isLight ? 'text-[#3d2317]' : 'text-[#f7eee4]'}`}>
                  <Clock className={`w-4 h-4 ${isLight ? 'text-[#b85d38]' : 'text-[#c05a3e]'}`} />
                  {workout.durationMin} MIN
                </span>
                <span>•</span>
                <span className="flex items-center gap-1.5 text-[#d97706]">
                  <Flame className="w-4 h-4 fill-[#d97706]" />
                  {workout.estimatedCalories} KCAL
                </span>
                <span>•</span>
                <span className={`flex items-center gap-1.5 ${isLight ? 'text-[#b85d38]' : 'text-[#d4a373]'}`}>
                  <Dumbbell className="w-4 h-4" />
                  {exercises.length} EXERCICES
                </span>
              </div>
            </div>
          </div>

          {/* 2. PLAN DE LA SÉANCE: Overlapping Sheet (z-20 with negative margin, rounded-t-3xl) */}
          <div className={`relative z-20 -mt-6 pt-5 pb-36 px-5 rounded-t-3xl border-t shadow-2xl space-y-4 flex-1 ${
            isLight
              ? 'bg-[#f3dfcb] border-[#7d5a47]/20 shadow-[0_-16px_36px_rgba(61,35,23,0.15)]'
              : 'bg-[#161311] border-[#3e342b]/60 shadow-[0_-16px_36px_rgba(0,0,0,0.85)]'
          }`}>
            {/* Grab handle bar */}
            <div className={`w-12 h-1.5 rounded-full mx-auto -mt-2 mb-2 ${
              isLight ? 'bg-[#7d5a47]/30' : 'bg-white/20'
            }`} />

            {/* Progress bar if user starts checking items */}
            {totalChecked > 0 && (
              <div className={`p-3 rounded-2xl border space-y-1.5 ${
                isLight
                  ? 'bg-[#faebe0] border-[#7d5a47]/15'
                  : 'bg-[#211b17] border-[#3e342b]/60'
              }`}>
                <div className="flex items-center justify-between text-xs font-black uppercase">
                  <span className={isLight ? 'text-[#7d5a47]' : 'text-[#ab9a8a]'}>Pré-validation</span>
                  <span className="text-emerald-500 font-bold">{progressPercent}% validé</span>
                </div>
                <div className={`w-full h-2 rounded-full overflow-hidden ${isLight ? 'bg-[#f0ded0]' : 'bg-[#14110f]'}`}>
                  <div
                    className={`h-full transition-all duration-300 ${
                      isLight
                        ? 'bg-gradient-to-r from-[#b85d38] to-[#d97706]'
                        : 'bg-gradient-to-r from-[#c05a3e] to-[#d97706]'
                    }`}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            )}

            {/* Plan Header */}
            <div className="flex items-center justify-between pt-1">
              <div>
                <h3 className={`text-sm font-black uppercase tracking-wider ${
                  isLight ? 'text-[#3d2317]' : 'text-[#f7eee4]'
                }`}>
                  PLAN DE LA SÉANCE
                </h3>
                <p className={`text-[10px] mt-0.5 ${
                  isLight ? 'text-[#7d5a47]' : 'text-[#ab9a8a]'
                }`}>
                  Clique sur un exercice pour ajuster ton poids de départ.
                </p>
              </div>
              <span className={`text-[11px] font-bold ${
                isLight ? 'text-[#7d5a47]' : 'text-[#ab9a8a]'
              }`}>
                Coche pour valider
              </span>
            </div>

            {/* Exercises List (Image 2 Replica with full interactive functionality) */}
            <div className="space-y-3">
              {exercises.map((exercise, index) => {
                const isChecked = Boolean(checkedExercises[exercise.id]);
                const isEditing = editingExId === exercise.id;

                return (
                  <div
                    key={exercise.id}
                    id={`exercise-item-${exercise.id}`}
                    className={`p-4 rounded-2xl border transition-all duration-200 ${
                      isChecked
                        ? isLight
                          ? 'bg-[#eef8f2] border-emerald-500/40 text-[#556b2f]'
                          : 'bg-[#1b231c] border-emerald-500/40 text-neutral-300'
                        : isLight
                          ? 'bg-[#faebe0] border-[#7d5a47]/15 hover:border-[#b85d38]/40 text-[#3d2317] shadow-sm'
                          : 'bg-[#211b17] border-[#3e342b]/60 hover:border-[#ab9a8a]/40 text-[#f7eee4]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      {/* Left: Index number & Exercise Info */}
                      <div className="flex items-center gap-3.5 flex-1 min-w-0">
                        <span
                          className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${
                            isChecked
                              ? 'bg-emerald-500/20 text-emerald-500'
                              : isLight
                                ? 'bg-[#f0ded0] text-[#7d5a47]'
                                : 'bg-[#2d251f] text-[#ab9a8a]'
                          }`}
                        >
                          {index + 1}
                        </span>

                        <div className="min-w-0 flex-1">
                          <h4
                            className={`text-sm font-bold tracking-tight truncate ${
                              isChecked
                                ? 'line-through opacity-60'
                                : isLight
                                  ? 'text-[#3d2317]'
                                  : 'text-[#f7eee4]'
                            }`}
                          >
                            {exercise.name}
                          </h4>

                          {/* Quick Stats: Sets, Reps, Starting Weight, Rest Time */}
                          <div className={`flex items-center gap-2 text-xs font-bold mt-0.5 flex-wrap ${
                            isLight ? 'text-[#7d5a47]' : 'text-[#ab9a8a]'
                          }`}>
                            <span className={isLight ? 'text-[#3d2317]' : 'text-[#f7eee4]'}>
                              {exercise.sets} séries
                            </span>
                            <span>•</span>
                            <span className={isLight ? 'text-[#3d2317]' : 'text-[#f7eee4]'}>
                              {Number(exercise.reps) > 0 ? `${exercise.reps} réps` : '0 rép'}
                            </span>
                            <span>•</span>
                            <button
                              type="button"
                              onClick={(e) => handleOpenEdit(exercise, e)}
                              className={`px-1.5 py-0.5 rounded-md border text-[11px] font-mono font-bold flex items-center gap-1 transition-colors ${
                                exercise.targetWeightKg > 0
                                  ? isLight
                                    ? 'bg-[#b85d38]/15 border-[#b85d38]/30 text-[#b85d38]'
                                    : 'bg-[#d97706]/20 border-[#d97706]/40 text-[#f59e0b]'
                                  : isLight
                                    ? 'bg-[#f0ded0] border-[#7d5a47]/20 text-[#3d2317] hover:border-[#b85d38]'
                                    : 'bg-[#2d251f] border-white/10 text-white hover:border-[#d97706]'
                              }`}
                              title="Cliquer pour changer le poids de départ"
                            >
                              <span>{exercise.targetWeightKg} kg</span>
                              <Edit3 className="w-2.5 h-2.5 opacity-60" />
                            </button>
                            <span>•</span>
                            <span>{exercise.restSeconds || 60}s repos</span>
                          </div>

                          {exercise.notes && (
                            <p className={`text-[11px] truncate mt-1 ${
                              isLight ? 'text-[#7d5a47]' : 'text-[#ab9a8a]'
                            }`}>
                              <span className="font-semibold">Note :</span> {exercise.notes}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Right Checkbox Circle */}
                      <button
                        type="button"
                        onClick={(e) => toggleCheck(exercise.id, e)}
                        className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all shrink-0 cursor-pointer ${
                          isChecked
                            ? 'bg-emerald-500 border-emerald-400 text-white shadow-lg shadow-emerald-500/20'
                            : isLight
                              ? 'border-[#7d5a47]/30 bg-white/50 hover:border-[#b85d38]'
                              : 'border-white/20 bg-transparent hover:border-white/40'
                        }`}
                        title={isChecked ? "Validé" : "Marquer comme validé"}
                      >
                        <Check className={`w-3.5 h-3.5 stroke-[3] ${isChecked ? 'text-white' : 'opacity-0'}`} />
                      </button>
                    </div>

                    {/* Inline Editing Drawer for starting weights & reps */}
                    {isEditing && (
                      <div className={`mt-3 pt-3 border-t space-y-3 animate-in fade-in duration-150 ${
                        isLight ? 'border-[#7d5a47]/15 bg-[#f5dfd0]/60 p-3 rounded-xl' : 'border-[#3e342b]/60 bg-[#1a1511] p-3 rounded-xl'
                      }`}>
                        <div className="flex items-center justify-between">
                          <span className={`text-[11px] font-black uppercase tracking-wider ${
                            isLight ? 'text-[#b85d38]' : 'text-[#d97706]'
                          }`}>
                            Modifier paramètres de départ
                          </span>
                          <span className={`text-[10px] ${isLight ? 'text-[#7d5a47]' : 'text-[#ab9a8a]'}`}>
                            Enregistré pour cette séance
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          {/* Weight */}
                          <div>
                            <label className={`text-[10px] font-bold block mb-1 uppercase ${
                              isLight ? 'text-[#7d5a47]' : 'text-[#ab9a8a]'
                            }`}>
                              Poids (kg)
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="0.5"
                              value={editWeight}
                              onChange={(e) => setEditWeight(parseFloat(e.target.value) || 0)}
                              className={`w-full rounded-lg px-2 py-1.5 text-center text-xs font-bold font-mono focus:outline-none border ${
                                isLight
                                  ? 'bg-[#fff7f0] border-[#7d5a47]/25 text-[#3d2317] focus:border-[#b85d38]'
                                  : 'bg-[#26201a] border-[#3e342b] text-[#f7eee4] focus:border-[#d97706]'
                              }`}
                            />
                          </div>

                          {/* Reps */}
                          <div>
                            <label className={`text-[10px] font-bold block mb-1 uppercase ${
                              isLight ? 'text-[#7d5a47]' : 'text-[#ab9a8a]'
                            }`}>
                              Répétitions
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={editReps}
                              onChange={(e) => setEditReps(parseInt(e.target.value, 10) || 0)}
                              className={`w-full rounded-lg px-2 py-1.5 text-center text-xs font-bold font-mono focus:outline-none border ${
                                isLight
                                  ? 'bg-[#fff7f0] border-[#7d5a47]/25 text-[#3d2317] focus:border-[#b85d38]'
                                  : 'bg-[#26201a] border-[#3e342b] text-[#f7eee4] focus:border-[#d97706]'
                              }`}
                            />
                          </div>

                          {/* Sets */}
                          <div>
                            <label className={`text-[10px] font-bold block mb-1 uppercase ${
                              isLight ? 'text-[#7d5a47]' : 'text-[#ab9a8a]'
                            }`}>
                              Séries
                            </label>
                            <input
                              type="number"
                              min="1"
                              max="10"
                              value={editSets}
                              onChange={(e) => setEditSets(parseInt(e.target.value, 10) || 1)}
                              className={`w-full rounded-lg px-2 py-1.5 text-center text-xs font-bold font-mono focus:outline-none border ${
                                isLight
                                  ? 'bg-[#fff7f0] border-[#7d5a47]/25 text-[#3d2317] focus:border-[#b85d38]'
                                  : 'bg-[#26201a] border-[#3e342b] text-[#f7eee4] focus:border-[#d97706]'
                              }`}
                            />
                          </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setEditingExId(null)}
                            className={`px-3 py-1 rounded-lg text-[11px] font-bold ${
                              isLight ? 'bg-[#f0ded0] text-[#7d5a47] hover:text-[#3d2317]' : 'bg-white/5 text-[#ab9a8a] hover:text-white'
                            }`}
                          >
                            Annuler
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleSaveEdit(exercise.id, e)}
                            className={`px-3 py-1 rounded-lg text-[11px] font-black uppercase text-white shadow-md ${
                              isLight ? 'bg-[#b85d38] hover:bg-[#a04e2e]' : 'bg-[#d97706] hover:bg-[#b45309]'
                            }`}
                          >
                            Enregistrer
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Fixed Bottom Action CTA: "COMMENCER L'ENTRAÎNEMENT" (Image 2 style) */}
        <div className={`absolute bottom-0 left-0 right-0 p-5 border-t flex items-center z-30 bg-gradient-to-t ${
          isLight
            ? 'from-[#f3dfcb] via-[#f3dfcb]/98 to-transparent border-[#7d5a47]/15'
            : 'from-[#161311] via-[#161311]/98 to-transparent border-[#3e342b]/60'
        }`}>
          <button
            id="btn-modal-start-workout"
            onClick={handleStartWorkout}
            className={`w-full py-4 px-6 rounded-2xl text-white font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl hover:brightness-110 active:scale-98 transition-all cursor-pointer ${
              isLight
                ? 'bg-gradient-to-r from-[#b85d38] via-[#d97706] to-[#c05a3e] shadow-[#b85d38]/30'
                : 'bg-gradient-to-r from-[#c05a3e] via-[#d97706] to-[#b45309] shadow-[#c05a3e]/30'
            }`}
          >
            <Play className="w-5 h-5 fill-white" />
            <span>COMMENCER L'ENTRAÎNEMENT</span>
          </button>
        </div>
      </div>
    </div>
  );
};
