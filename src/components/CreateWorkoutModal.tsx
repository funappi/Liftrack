import React, { useState } from 'react';
import { CUSTOM_WORKOUT_PREFIX } from '../utils/workouts';
import { 
  X, Plus, Trash2, Dumbbell, Clock, Check, 
  ChevronUp, ChevronDown, Target, Info
} from 'lucide-react';
import { Workout, Exercise, WorkoutCategory } from '../types';

interface CreateWorkoutModalProps {
  onSaveWorkout: (workout: Workout, launchImmediately?: boolean) => void;
  onClose: () => void;
  theme?: 'dark' | 'warm-light';
}

const PRESET_EXERCISES = [
  { name: 'Développé couché (Barre)', muscles: ['Pectoraux', 'Triceps'], defaultRest: 90 },
  { name: 'Développé incliné (Haltères)', muscles: ['Haut de poitrine', 'Épaules'], defaultRest: 75 },
  { name: 'Écarté à la poulie vis-à-vis', muscles: ['Pectoraux', 'Finition'], defaultRest: 60 },
  { name: 'Dips aux barres parallèles', muscles: ['Pectoraux', 'Triceps'], defaultRest: 90 },
  { name: 'Curl Biceps (Haltère)', muscles: ['Biceps', 'Avant-bras'], defaultRest: 60 },
  { name: 'Curl incliné aux haltères', muscles: ['Biceps longue portion'], defaultRest: 60 },
  { name: 'Extensions triceps poulie haute', muscles: ['Triceps'], defaultRest: 60 },
  { name: 'Barre au front (Skull Crushers)', muscles: ['Triceps'], defaultRest: 60 },
  { name: 'Back Squat (Barre)', muscles: ['Quadriceps', 'Fessiers'], defaultRest: 120 },
  { name: 'Presse à cuisses 45°', muscles: ['Quadriceps'], defaultRest: 90 },
  { name: 'Soulevé de terre (Deadlift)', muscles: ['Ischios', 'Lombaires', 'Dorsaux'], defaultRest: 120 },
  { name: 'Romanian Deadlift aux haltères', muscles: ['Ischios', 'Fessiers'], defaultRest: 90 },
  { name: 'Leg Curl couché', muscles: ['Ischio-jambiers'], defaultRest: 60 },
  { name: 'Leg Extension', muscles: ['Quadriceps'], defaultRest: 60 },
  { name: 'Tractions pronation', muscles: ['Grand dorsal', 'Biceps'], defaultRest: 90 },
  { name: 'Rowing barre T-Bar', muscles: ['Épaisseur dos', 'Trapèzes'], defaultRest: 90 },
  { name: 'Tirage vertical à la poulie', muscles: ['Grand dorsal'], defaultRest: 75 },
  { name: 'Overhead Press (Militaire)', muscles: ['Épaules', 'Triceps'], defaultRest: 90 },
  { name: 'Élévations latérales aux haltères', muscles: ['Deltoïdes latéraux'], defaultRest: 60 },
];

export const CreateWorkoutModal: React.FC<CreateWorkoutModalProps> = ({
  onSaveWorkout,
  onClose,
  theme,
}) => {
  const isLight = theme === 'warm-light';
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [category, setCategory] = useState<WorkoutCategory>('hypertrophie');
  const [durationMin, setDurationMin] = useState(45);
  const [difficulty] = useState<'DÉBUTANT' | 'INTERMÉDIAIRE' | 'AVANCÉ' | 'ÉLITE'>('INTERMÉDIAIRE');
  
  // Exercises list: All default reps & weight start at 0 as requested!
  const [exercises, setExercises] = useState<Exercise[]>([
    {
      id: `custom-ex-${Date.now()}-1`,
      name: 'Curl Biceps (Haltère)',
      sets: 4,
      reps: 0,
      targetWeightKg: 0,
      restSeconds: 60,
      targetMuscles: ['Biceps', 'Avant-bras'],
      notes: '',
    },
  ]);

  // Exercise picker modal
  const [showAddExModal, setShowAddExModal] = useState(false);
  const [searchEx, setSearchEx] = useState('');
  const [customExName, setCustomExName] = useState('');

  // Add exercise from catalog
  const handleAddPresetExercise = (preset: typeof PRESET_EXERCISES[0]) => {
    const newEx: Exercise = {
      id: `custom-ex-${Date.now()}-${exercises.length + 1}`,
      name: preset.name,
      sets: 4,
      reps: 0, // default 0
      targetWeightKg: 0, // default 0
      restSeconds: preset.defaultRest,
      targetMuscles: preset.muscles,
      notes: '',
    };
    setExercises((prev) => [...prev, newEx]);
    setShowAddExModal(false);
    setSearchEx('');
  };

  // Add custom typed exercise
  const handleAddCustomNamedExercise = () => {
    const name = customExName.trim() || searchEx.trim();
    if (!name) return;
    const newEx: Exercise = {
      id: `custom-ex-${Date.now()}-${exercises.length + 1}`,
      name,
      sets: 4,
      reps: 0, // default 0
      targetWeightKg: 0, // default 0
      restSeconds: 60,
      targetMuscles: ['Muscles ciblés'],
      notes: '',
    };
    setExercises((prev) => [...prev, newEx]);
    setCustomExName('');
    setSearchEx('');
    setShowAddExModal(false);
  };

  const handleRemoveExercise = (index: number) => {
    setExercises((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleMoveExercise = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === exercises.length - 1) return;
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    const copy = [...exercises];
    const temp = copy[index];
    copy[index] = copy[targetIdx];
    copy[targetIdx] = temp;
    setExercises(copy);
  };

  const handleUpdateExercise = (index: number, field: keyof Exercise, value: any) => {
    setExercises((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        [field]: value,
      };
      return copy;
    });
  };

  const handleSave = (launchImmediately = false) => {
    const cleanTitle = title.trim() || 'Séance Personnalisée';
    const allMuscles: string[] = Array.from(new Set(exercises.flatMap((e) => e.targetMuscles || [])));

    const newWorkout: Workout = {
      id: `${CUSTOM_WORKOUT_PREFIX}${Date.now()}`,
      title: cleanTitle.toUpperCase(),
      subtitle: subtitle.trim() || 'SÉANCE SUR-MESURE',
      category,
      durationMin: Number(durationMin) || 45,
      exerciseCount: exercises.length,
      difficulty,
      estimatedCalories: Math.round((Number(durationMin) || 45) * 8.5),
      intensity: difficulty === 'ÉLITE' || difficulty === 'AVANCÉ' ? 'ÉLEVÉE' : 'MODÉRÉE',
      gradientType: 'main',
      imageUrl: "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?auto=format&fit=crop&w=1200&q=80",
      description: subtitle.trim() || `Programme personnalisé créé sur-mesure contenant ${exercises.length} exercice(s).`,
      exercises: exercises.map((e) => ({
        ...e,
        reps: 0, // ensure 0
        targetWeightKg: 0, // ensure 0
      })),
      targetAreas: allMuscles.length > 0 ? allMuscles.slice(0, 3) : ['Full Body'],
    };

    onSaveWorkout(newWorkout, launchImmediately);
  };

  return (
    <div className={`fixed inset-0 z-50 flex flex-col justify-end max-w-lg mx-auto overflow-hidden animate-in fade-in duration-200 ${
      isLight ? 'bg-[#3d2317]/65 backdrop-blur-xl' : 'bg-black/85 backdrop-blur-md'
    }`}>
      <div className={`relative w-full h-[94vh] rounded-t-3xl border-t flex flex-col overflow-hidden shadow-2xl transition-colors duration-200 ${
        isLight ? 'bg-[#faebe0] border-[#7d5a47]/20 text-[#3d2317]' : 'bg-[#0E0E0E] border-white/10 text-white'
      }`}>
        {/* Top Header */}
        <div className={`px-5 py-4 border-b flex items-center justify-between shrink-0 transition-colors ${
          isLight ? 'bg-[#f5e3d4] border-[#7d5a47]/15' : 'bg-[#121212] border-white/10'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#7C3AED] to-[#EC4899] flex items-center justify-center text-white">
              <Dumbbell className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-[#EC4899] block">
                VOLT WORKOUT CREATOR
              </span>
              <h2 className="text-base font-black text-white uppercase tracking-tight">
                Créer ma séance de A à Z
              </h2>
            </div>
          </div>

          <button
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

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 no-scrollbar pb-32">
          {/* General Information Card */}
          <div className="p-4 rounded-2xl bg-[#161616] border border-white/10 space-y-4">
            <h3 className="text-xs font-black uppercase text-white tracking-wider flex items-center gap-2">
              <Info className="w-3.5 h-3.5 text-[#00C6FF]" />
              <span>1. Informations de la séance</span>
            </h3>

            {/* Title */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-[#A7A7A7] uppercase">
                Nom de la séance *
              </label>
              <input
                type="text"
                placeholder="Ex: Push Day Explosif, Dos & Biceps..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-[#0A0A0A] border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-[#555] focus:outline-none focus:border-[#EC4899]"
              />
            </div>

            {/* Subtitle / Focus */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-[#A7A7A7] uppercase">
                Description / Objectif (optionnel)
              </label>
              <input
                type="text"
                placeholder="Ex: Pectoraux supérieurs et triceps lourd"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                className="w-full bg-[#0A0A0A] border border-white/15 rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-[#555] focus:outline-none focus:border-[#EC4899]"
              />
            </div>

            {/* Category and Duration */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#A7A7A7] uppercase">
                  Catégorie
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as WorkoutCategory)}
                  className="w-full bg-[#0A0A0A] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#EC4899]"
                >
                  <option value="hypertrophie">Hypertrophie</option>
                  <option value="force">Force Pure</option>
                  <option value="fullbody">Full Body</option>
                  <option value="cardio">Cardio & HIIT</option>
                  <option value="perte_poids">Perte de poids</option>
                  <option value="mobilite">Mobilité</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#A7A7A7] uppercase">
                  Durée estimée (min)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="10"
                    max="180"
                    value={durationMin}
                    onChange={(e) => setDurationMin(parseInt(e.target.value, 10) || 45)}
                    className="w-full bg-[#0A0A0A] border border-white/15 rounded-xl pl-3 pr-8 py-2 text-xs text-white focus:outline-none focus:border-[#EC4899] font-mono"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-[#A7A7A7]">
                    min
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Exercises Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-black uppercase text-white tracking-wider flex items-center gap-2">
                  <Target className="w-3.5 h-3.5 text-[#EC4899]" />
                  <span>2. Exercices de la séance ({exercises.length})</span>
                </h3>
                <p className="text-[10px] text-[#A7A7A7] mt-0.5">
                  Toutes les charges et répétitions sont initialisées à 0 (à renseigner pendant ta séance).
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowAddExModal(true)}
                className="px-3 py-1.5 rounded-xl bg-[#0088FF] hover:bg-[#0070DD] text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-[#0088FF]/20"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                <span>Ajouter</span>
              </button>
            </div>

            {/* Exercises List */}
            {exercises.length === 0 ? (
              <div className="p-8 rounded-2xl bg-[#141414] border border-dashed border-white/15 text-center space-y-3">
                <Dumbbell className="w-8 h-8 text-[#A7A7A7] mx-auto opacity-50" />
                <p className="text-xs text-[#A7A7A7]">
                  Aucun exercice ajouté pour le moment.
                </p>
                <button
                  type="button"
                  onClick={() => setShowAddExModal(true)}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-all"
                >
                  Choisir un exercice dans la bibliothèque
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {exercises.map((ex, idx) => (
                  <div
                    key={ex.id}
                    className="p-3.5 rounded-2xl bg-[#161616] border border-white/10 space-y-3 relative group"
                  >
                    {/* Top Row: Index, Name, Controls */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-6 h-6 rounded-lg bg-black/60 border border-white/10 flex items-center justify-center text-xs font-black text-[#EC4899] shrink-0 font-mono">
                          {idx + 1}
                        </span>
                        <input
                          type="text"
                          value={ex.name}
                          onChange={(e) => handleUpdateExercise(idx, 'name', e.target.value)}
                          className="bg-transparent text-sm font-black text-white border-b border-transparent focus:border-white/20 focus:outline-none truncate w-full"
                        />
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleMoveExercise(idx, 'up')}
                          disabled={idx === 0}
                          className="p-1 text-[#777] hover:text-white disabled:opacity-20 cursor-pointer"
                          title="Monter"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveExercise(idx, 'down')}
                          disabled={idx === exercises.length - 1}
                          className="p-1 text-[#777] hover:text-white disabled:opacity-20 cursor-pointer"
                          title="Descendre"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveExercise(idx)}
                          className="p-1 text-[#777] hover:text-rose-400 hover:bg-rose-500/10 rounded-lg cursor-pointer transition-colors"
                          title="Supprimer l'exercice"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Muscles Tag */}
                    <div className="text-[10px] text-[#A7A7A7] flex items-center gap-1.5 flex-wrap">
                      <span className="text-[#EC4899] font-bold">Cibles:</span>
                      {ex.targetMuscles.map((m, mIdx) => (
                        <span
                          key={mIdx}
                          className="px-2 py-0.5 rounded-md bg-white/5 border border-white/5"
                        >
                          {m}
                        </span>
                      ))}
                    </div>

                    {/* Exercise Parameters: Sets, Keyboard Rest Time Inputs */}
                    <div className="grid grid-cols-2 gap-3 pt-1 border-t border-white/5">
                      {/* Sets count */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-[#A7A7A7] uppercase block">
                          Nombre de Séries
                        </label>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleUpdateExercise(idx, 'sets', Math.max(1, ex.sets - 1))}
                            className="w-7 h-7 rounded-lg bg-[#202020] text-white font-bold flex items-center justify-center hover:bg-white/10"
                          >
                            -
                          </button>
                          <span className="font-mono font-bold text-white text-sm w-6 text-center">
                            {ex.sets}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleUpdateExercise(idx, 'sets', Math.min(10, ex.sets + 1))}
                            className="w-7 h-7 rounded-lg bg-[#202020] text-white font-bold flex items-center justify-center hover:bg-white/10"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* Rest Time (Minutes & Seconds keyboard direct input) */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-[#A7A7A7] uppercase flex items-center gap-1">
                          <Clock className="w-3 h-3 text-[#0088FF]" />
                          <span>Repos (Min / Sec)</span>
                        </label>
                        <div className="flex items-center gap-1.5">
                          {/* Minutes Input */}
                          <div className="relative flex-1">
                            <input
                              type="number"
                              min="0"
                              max="15"
                              value={Math.floor(ex.restSeconds / 60)}
                              onChange={(e) => {
                                const m = Math.max(0, parseInt(e.target.value, 10) || 0);
                                const s = ex.restSeconds % 60;
                                handleUpdateExercise(idx, 'restSeconds', m * 60 + s);
                              }}
                              className="w-full bg-[#0A0A0A] border border-white/15 rounded-lg px-2 py-1 text-xs text-center text-white font-mono focus:outline-none focus:border-[#0088FF]"
                            />
                            <span className="text-[9px] text-[#A7A7A7] block text-center mt-0.5">
                              min
                            </span>
                          </div>
                          <span className="text-white/40 font-bold">:</span>
                          {/* Seconds Input */}
                          <div className="relative flex-1">
                            <input
                              type="number"
                              min="0"
                              max="59"
                              step="5"
                              value={ex.restSeconds % 60}
                              onChange={(e) => {
                                const s = Math.max(0, Math.min(59, parseInt(e.target.value, 10) || 0));
                                const m = Math.floor(ex.restSeconds / 60);
                                handleUpdateExercise(idx, 'restSeconds', m * 60 + s);
                              }}
                              className="w-full bg-[#0A0A0A] border border-white/15 rounded-lg px-2 py-1 text-xs text-center text-white font-mono focus:outline-none focus:border-[#0088FF]"
                            />
                            <span className="text-[9px] text-[#A7A7A7] block text-center mt-0.5">
                              sec
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Note input */}
                    <input
                      type="text"
                      placeholder="Notes ou conseils d'exécution (ex: tempo 3-0-1)..."
                      value={ex.notes || ''}
                      onChange={(e) => handleUpdateExercise(idx, 'notes', e.target.value)}
                      className="w-full bg-[#0E0E0E] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-[#555] focus:outline-none focus:border-white/20"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Fixed Bottom Save Action Buttons */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#0E0E0E] via-[#0E0E0E]/95 to-transparent border-t border-white/10 space-y-2">
          <div className="grid grid-cols-2 gap-2.5">
            {/* Save only */}
            <button
              type="button"
              id="btn-save-custom-workout"
              onClick={() => handleSave(false)}
              disabled={exercises.length === 0}
              className="py-3.5 px-3 rounded-2xl bg-[#1E1E1E] hover:bg-[#282828] border border-white/15 text-white font-black text-xs uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Enregistrer</span>
            </button>

            {/* Save & Launch */}
            <button
              type="button"
              id="btn-save-and-launch-custom-workout"
              onClick={() => handleSave(true)}
              disabled={exercises.length === 0}
              className="py-3.5 px-3 rounded-2xl bg-gradient-to-r from-[#0088FF] to-[#0055CC] hover:brightness-110 active:scale-[0.98] text-white font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-[#0088FF]/30 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Dumbbell className="w-4 h-4 stroke-[2.5]" />
              <span>Lancer en Direct →</span>
            </button>
          </div>
        </div>
      </div>

      {/* SUB-MODAL: Add Exercise from catalog or custom name */}
      {showAddExModal && (
        <div 
          className={`fixed inset-0 z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200 ${
            isLight ? 'bg-[#3d2317]/65 backdrop-blur-sm' : 'bg-black/80 backdrop-blur-sm'
          }`}
          onClick={() => setShowAddExModal(false)}
        >
          <div 
            className={`w-full max-w-sm rounded-3xl p-5 space-y-4 shadow-2xl max-h-[85vh] flex flex-col border transition-colors ${
              isLight ? 'bg-[#faebe0] border-[#7d5a47]/20 text-[#3d2317]' : 'bg-[#161616] border-white/15 text-white'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`flex items-center justify-between border-b pb-3 ${
              isLight ? 'border-[#7d5a47]/15' : 'border-white/10'
            }`}>
              <h3 className={`text-sm font-black uppercase ${isLight ? 'text-[#3d2317]' : 'text-white'}`}>
                Ajouter un exercice
              </h3>
              <button
                type="button"
                onClick={() => setShowAddExModal(false)}
                className={`p-1 rounded-full ${isLight ? 'text-[#7d5a47] hover:text-[#3d2317]' : 'text-[#A7A7A7] hover:text-white'}`}
              >
                ✕
              </button>
            </div>

            {/* Search Input */}
            <input
              type="text"
              placeholder="Rechercher (ex: squat, développé, tractions)..."
              value={searchEx}
              onChange={(e) => setSearchEx(e.target.value)}
              className="w-full bg-[#0D0D0D] border border-white/15 rounded-xl px-3 py-2.5 text-xs text-white placeholder:text-[#666] focus:outline-none focus:border-[#EC4899]"
            />

            {/* List */}
            <div className="flex-1 overflow-y-auto space-y-2 no-scrollbar pr-1">
              {PRESET_EXERCISES.filter((ex) =>
                ex.name.toLowerCase().includes(searchEx.toLowerCase())
              ).map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleAddPresetExercise(item)}
                  className="w-full p-2.5 rounded-xl bg-[#202020] hover:bg-[#282828] text-left transition-all flex items-center justify-between group"
                >
                  <div>
                    <span className="text-xs font-bold text-white block group-hover:text-[#EC4899]">
                      {item.name}
                    </span>
                    <span className="text-[10px] text-[#A7A7A7]">
                      {item.muscles.join(', ')} • {item.defaultRest}s repos
                    </span>
                  </div>
                  <Plus className="w-4 h-4 text-[#A7A7A7] group-hover:text-[#EC4899]" />
                </button>
              ))}
            </div>

            {/* Custom Exercise Button */}
            {searchEx.trim().length > 0 && (
              <button
                type="button"
                onClick={handleAddCustomNamedExercise}
                className="w-full py-2.5 rounded-xl bg-[#EC4899]/20 border border-[#EC4899]/40 text-xs font-bold text-[#EC4899] hover:bg-[#EC4899]/30 transition-all flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Créer "{searchEx.trim()}"</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
