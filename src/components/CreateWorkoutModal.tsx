import React, { useState } from 'react';
import { CUSTOM_WORKOUT_PREFIX } from '../utils/workouts';
import { Plus, Trash2, Dumbbell, Clock, Check, ChevronUp, ChevronDown, Target, Info } from 'lucide-react';
import { Workout, Exercise, WorkoutCategory } from '../types';
import { loadDefaultRestSeconds } from '../utils/preferences';
import { ExerciseCard, SheetButton, SheetCard, SheetLabel, SheetShell, Stepper, sheetInputClass } from './workout/WorkoutSheet';

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

const newExercise = (name: string, muscles: string[], restSeconds: number, position: number): Exercise => ({
  id: `custom-ex-${Date.now()}-${position}`,
  name,
  sets: 4,
  reps: 0,
  targetWeightKg: 0,
  restSeconds,
  targetMuscles: muscles,
  notes: '',
});

export const CreateWorkoutModal: React.FC<CreateWorkoutModalProps> = ({ onSaveWorkout, onClose, theme }) => {
  const isLight = theme === 'warm-light';
  const defaultRest = loadDefaultRestSeconds();
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [category, setCategory] = useState<WorkoutCategory>('hypertrophie');
  const [durationMin, setDurationMin] = useState(45);
  const [difficulty] = useState<'DÉBUTANT' | 'INTERMÉDIAIRE' | 'AVANCÉ' | 'ÉLITE'>('INTERMÉDIAIRE');

  // Exercises list: reps & load start at 0, filled in during the session
  const [exercises, setExercises] = useState<Exercise[]>([]);

  // Exercise picker
  const [showAddExModal, setShowAddExModal] = useState(false);
  const [searchEx, setSearchEx] = useState('');
  const [customExName, setCustomExName] = useState('');

  const closePicker = () => {
    setShowAddExModal(false);
    setSearchEx('');
    setCustomExName('');
  };

  const handleAddPresetExercise = (preset: (typeof PRESET_EXERCISES)[0]) => {
    setExercises((prev) => [...prev, newExercise(preset.name, preset.muscles, preset.defaultRest, prev.length + 1)]);
    closePicker();
  };

  // Free name typed by the user
  const handleAddCustomNamedExercise = () => {
    const name = customExName.trim() || searchEx.trim();
    if (!name) return;
    setExercises((prev) => [...prev, newExercise(name, [], defaultRest, prev.length + 1)]);
    closePicker();
  };

  const handleRemoveExercise = (index: number) => {
    setExercises((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleMoveExercise = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= exercises.length) return;
    const copy = [...exercises];
    [copy[index], copy[targetIdx]] = [copy[targetIdx], copy[index]];
    setExercises(copy);
  };

  const handleUpdateExercise = <K extends keyof Exercise>(index: number, field: K, value: Exercise[K]) => {
    setExercises((prev) => prev.map((ex, i) => (i === index ? { ...ex, [field]: value } : ex)));
  };

  const handleSave = (launchImmediately = false) => {
    // Keep the name exactly as typed by the user
    const cleanTitle = title.trim() || 'Ma séance';
    const allMuscles: string[] = Array.from(new Set(exercises.flatMap((e) => e.targetMuscles || [])));

    const newWorkout: Workout = {
      id: `${CUSTOM_WORKOUT_PREFIX}${Date.now()}`,
      title: cleanTitle,
      subtitle: subtitle.trim() || 'SÉANCE SUR-MESURE',
      category,
      durationMin: Number(durationMin) || 45,
      exerciseCount: exercises.length,
      difficulty,
      estimatedCalories: Math.round((Number(durationMin) || 45) * 8.5),
      intensity: 'MODÉRÉE',
      gradientType: 'main',
      imageUrl: `${import.meta.env.BASE_URL}img/photo-1581009146145-b5ef050c2e1e-1200.jpg`,
      description: subtitle.trim() || `Programme personnalisé contenant ${exercises.length} exercice(s).`,
      exercises: exercises.map((e) => ({ ...e, name: e.name.trim() || 'Exercice', reps: 0, targetWeightKg: 0 })),
      targetAreas: allMuscles.length > 0 ? allMuscles.slice(0, 3) : ['Full Body'],
    };

    onSaveWorkout(newWorkout, launchImmediately);
  };

  const filteredPresets = PRESET_EXERCISES.filter((ex) => ex.name.toLowerCase().includes(searchEx.toLowerCase()));

  return (
    <>
      <SheetShell
        isLight={isLight}
        icon={<Dumbbell className="w-4 h-4 stroke-[2.5]" />}
        eyebrow="VOLT WORKOUT CREATOR"
        title="Créer ma séance de A à Z"
        onClose={onClose}
        footer={
          <div className="grid grid-cols-2 gap-2.5">
            <SheetButton id="btn-save-custom-workout" onClick={() => handleSave(false)} disabled={exercises.length === 0}>
              <Check className="w-4 h-4" />
              <span>Enregistrer</span>
            </SheetButton>
            <SheetButton
              id="btn-save-and-launch-custom-workout"
              variant="primary"
              onClick={() => handleSave(true)}
              disabled={exercises.length === 0}
            >
              <Dumbbell className="w-4 h-4 stroke-[2.5]" />
              <span>Lancer en Direct →</span>
            </SheetButton>
          </div>
        }
      >
        <SheetCard icon={<Info className="w-3.5 h-3.5 text-[#00C6FF]" />} title="1. Informations de la séance">
          <div className="space-y-1">
            <SheetLabel>Nom de la séance *</SheetLabel>
            <input
              type="text"
              placeholder="Ex: Push Day, Dos & Biceps, Jambes du jeudi..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={sheetInputClass}
            />
          </div>

          <div className="space-y-1">
            <SheetLabel>Description / Objectif (optionnel)</SheetLabel>
            <input
              type="text"
              placeholder="Ex: Pectoraux supérieurs et triceps lourd"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              className={`${sheetInputClass} text-xs py-2`}
            />
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="space-y-1">
              <SheetLabel>Catégorie</SheetLabel>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as WorkoutCategory)}
                className={`${sheetInputClass} text-xs px-3 py-2`}
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
              <SheetLabel>Durée estimée (min)</SheetLabel>
              <div className="relative">
                <input
                  type="number"
                  min="10"
                  max="180"
                  value={durationMin}
                  onChange={(e) => setDurationMin(parseInt(e.target.value, 10) || 45)}
                  className={`${sheetInputClass} text-xs pl-3 pr-8 py-2 font-mono`}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-[#A7A7A7]">min</span>
              </div>
            </div>
          </div>
        </SheetCard>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-xs font-black uppercase text-white tracking-wider flex items-center gap-2">
                <Target className="w-3.5 h-3.5 text-[#EC4899]" />
                <span>2. Exercices de la séance ({exercises.length})</span>
              </h3>
              <p className="text-[10px] text-[#A7A7A7] mt-0.5">
                Nomme tes exercices comme tu veux. Charges et répétitions se renseignent pendant la séance.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowAddExModal(true)}
              className="px-3 py-1.5 rounded-xl bg-[#0088FF] hover:bg-[#0070DD] text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-[#0088FF]/20 shrink-0"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>Ajouter</span>
            </button>
          </div>

          {exercises.length === 0 ? (
            <div className="p-8 rounded-2xl bg-[#141414] border border-dashed border-white/15 text-center space-y-3">
              <Dumbbell className="w-8 h-8 text-[#A7A7A7] mx-auto opacity-50" />
              <p className="text-xs text-[#A7A7A7]">Aucun exercice ajouté pour le moment.</p>
              <button
                type="button"
                onClick={() => setShowAddExModal(true)}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-all cursor-pointer"
              >
                Ajouter mon premier exercice
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {exercises.map((ex, idx) => (
                <ExerciseCard
                  key={ex.id}
                  index={idx}
                  targetMuscles={ex.targetMuscles}
                  name={
                    <input
                      type="text"
                      value={ex.name}
                      placeholder="Nom de l'exercice"
                      onChange={(e) => handleUpdateExercise(idx, 'name', e.target.value)}
                      className="bg-transparent text-sm font-black text-white border-b border-transparent focus:border-white/20 focus:outline-none w-full"
                    />
                  }
                  controls={
                    <>
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
                    </>
                  }
                >
                  <div className="grid grid-cols-2 gap-3">
                    <Stepper
                      label="Nombre de Séries"
                      value={ex.sets}
                      min={1}
                      max={10}
                      onChange={(v) => handleUpdateExercise(idx, 'sets', v)}
                    />

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-[#A7A7A7] uppercase flex items-center gap-1">
                        <Clock className="w-3 h-3 text-[#0088FF]" />
                        <span>Repos (Min / Sec)</span>
                      </label>
                      <div className="flex items-center gap-1.5">
                        <div className="relative flex-1">
                          <input
                            type="number"
                            min="0"
                            max="15"
                            value={Math.floor((ex.restSeconds || 0) / 60)}
                            onChange={(e) => {
                              const m = Math.max(0, parseInt(e.target.value, 10) || 0);
                              handleUpdateExercise(idx, 'restSeconds', m * 60 + ((ex.restSeconds || 0) % 60));
                            }}
                            className="w-full bg-[#0A0A0A] border border-white/15 rounded-lg px-2 py-1 text-xs text-center text-white font-mono focus:outline-none focus:border-[#0088FF]"
                          />
                          <span className="text-[9px] text-[#A7A7A7] block text-center mt-0.5">min</span>
                        </div>
                        <span className="text-white/40 font-bold">:</span>
                        <div className="relative flex-1">
                          <input
                            type="number"
                            min="0"
                            max="59"
                            step="5"
                            value={(ex.restSeconds || 0) % 60}
                            onChange={(e) => {
                              const s = Math.max(0, Math.min(59, parseInt(e.target.value, 10) || 0));
                              handleUpdateExercise(idx, 'restSeconds', Math.floor((ex.restSeconds || 0) / 60) * 60 + s);
                            }}
                            className="w-full bg-[#0A0A0A] border border-white/15 rounded-lg px-2 py-1 text-xs text-center text-white font-mono focus:outline-none focus:border-[#0088FF]"
                          />
                          <span className="text-[9px] text-[#A7A7A7] block text-center mt-0.5">sec</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <input
                    type="text"
                    placeholder="Notes ou conseils d'exécution (ex: tempo 3-0-1)..."
                    value={ex.notes || ''}
                    onChange={(e) => handleUpdateExercise(idx, 'notes', e.target.value)}
                    className="mt-3 w-full bg-[#0E0E0E] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-[#555] focus:outline-none focus:border-white/20"
                  />
                </ExerciseCard>
              ))}
            </div>
          )}
        </div>
      </SheetShell>

      {/* Sub-sheet: add an exercise (free name or catalog) */}
      {showAddExModal && (
        <div
          className={`fixed inset-0 z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200 ${
            isLight ? 'bg-[#3d2317]/65 backdrop-blur-sm' : 'bg-black/80 backdrop-blur-sm'
          }`}
          onClick={closePicker}
        >
          <div
            className={`w-full max-w-sm rounded-3xl p-5 space-y-4 shadow-2xl max-h-[85vh] flex flex-col border transition-colors ${
              isLight ? 'bg-[#faebe0] border-[#7d5a47]/20 text-[#3d2317]' : 'bg-[#161616] border-white/15 text-white'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`flex items-center justify-between border-b pb-3 ${isLight ? 'border-[#7d5a47]/15' : 'border-white/10'}`}>
              <h3 className={`text-sm font-black uppercase ${isLight ? 'text-[#3d2317]' : 'text-white'}`}>Ajouter un exercice</h3>
              <button
                type="button"
                onClick={closePicker}
                className={`p-1 rounded-full cursor-pointer ${isLight ? 'text-[#7d5a47] hover:text-[#3d2317]' : 'text-[#A7A7A7] hover:text-white'}`}
              >
                ✕
              </button>
            </div>

            {/* Free name */}
            <div className="space-y-1.5">
              <SheetLabel>Mon exercice (nom libre)</SheetLabel>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ex: Pompes lestées, Gainage..."
                  value={customExName}
                  onChange={(e) => setCustomExName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddCustomNamedExercise()}
                  className="flex-1 min-w-0 bg-[#0D0D0D] border border-white/15 rounded-xl px-3 py-2.5 text-xs text-white placeholder:text-[#666] focus:outline-none focus:border-[#EC4899]"
                />
                <button
                  type="button"
                  onClick={handleAddCustomNamedExercise}
                  disabled={!customExName.trim()}
                  className="px-3 rounded-xl bg-[#EC4899]/20 border border-[#EC4899]/40 text-xs font-bold text-[#EC4899] hover:bg-[#EC4899]/30 transition-all disabled:opacity-40 cursor-pointer flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Créer</span>
                </button>
              </div>
            </div>

            <div className="space-y-1.5 flex-1 min-h-0 flex flex-col">
              <SheetLabel>Ou choisis dans la bibliothèque</SheetLabel>
              <input
                type="text"
                placeholder="Rechercher (ex: squat, développé, tractions)..."
                value={searchEx}
                onChange={(e) => setSearchEx(e.target.value)}
                className="w-full bg-[#0D0D0D] border border-white/15 rounded-xl px-3 py-2.5 text-xs text-white placeholder:text-[#666] focus:outline-none focus:border-[#EC4899]"
              />

              <div className="flex-1 overflow-y-auto space-y-2 no-scrollbar pr-1 pt-1">
                {filteredPresets.map((item) => (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => handleAddPresetExercise(item)}
                    className="w-full p-2.5 rounded-xl bg-[#202020] hover:bg-[#282828] text-left transition-all flex items-center justify-between group cursor-pointer"
                  >
                    <div>
                      <span className="text-xs font-bold text-white block group-hover:text-[#EC4899]">{item.name}</span>
                      <span className="text-[10px] text-[#A7A7A7]">
                        {item.muscles.join(', ')} • {item.defaultRest}s repos
                      </span>
                    </div>
                    <Plus className="w-4 h-4 text-[#A7A7A7] group-hover:text-[#EC4899]" />
                  </button>
                ))}
                {filteredPresets.length === 0 && searchEx.trim() && (
                  <button
                    type="button"
                    onClick={handleAddCustomNamedExercise}
                    className="w-full py-2.5 rounded-xl bg-[#EC4899]/20 border border-[#EC4899]/40 text-xs font-bold text-[#EC4899] hover:bg-[#EC4899]/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Créer "{searchEx.trim()}"</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
