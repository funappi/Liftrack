import React, { useState } from 'react';
import { X, Plus, Trash2, Dumbbell, Check, RotateCcw, Sparkles, Target, ArrowUpRight } from 'lucide-react';
import { audioSynth } from '../utils/audioSynth';
import confetti from 'canvas-confetti';

export interface MaxChargeExercise {
  id: string;
  label: string;
  val: number;
  target: number;
  color: string;
}

export const DEFAULT_1RM_EXERCISES: MaxChargeExercise[] = [
  { id: '1rm-bench', label: 'DC (Bench)', val: 105, target: 110, color: '#EC4899' },
  { id: '1rm-squat', label: 'Squat', val: 140, target: 150, color: '#7C3AED' },
  { id: '1rm-deadlift', label: 'Deadlift', val: 170, target: 180, color: '#00C6FF' },
  { id: '1rm-overhead', label: 'Overhead', val: 65, target: 70, color: '#FF512F' },
];

const COLOR_PRESETS = [
  { name: 'Rose', hex: '#EC4899' },
  { name: 'Violet', hex: '#7C3AED' },
  { name: 'Cyan', hex: '#00C6FF' },
  { name: 'Orange', hex: '#FF512F' },
  { name: 'Émeraude', hex: '#10B981' },
  { name: 'Or', hex: '#F59E0B' },
];

const POPULAR_PRESETS = [
  { label: 'Tractions Lestées', defaultVal: 20, defaultTarget: 30, color: '#00C6FF' },
  { label: 'Dips Lestés', defaultVal: 35, defaultTarget: 50, color: '#FF512F' },
  { label: 'Hip Thrust', defaultVal: 160, defaultTarget: 200, color: '#EC4899' },
  { label: 'Curl Biceps Haltères', defaultVal: 24, defaultTarget: 30, color: '#F59E0B' },
  { label: 'Rowing Barre', defaultVal: 90, defaultTarget: 105, color: '#10B981' },
  { label: 'Presse à Cuisses', defaultVal: 240, defaultTarget: 280, color: '#7C3AED' },
  { label: 'Développé Incliné', defaultVal: 85, defaultTarget: 95, color: '#EC4899' },
];

interface Manage1RmModalProps {
  initialExercises: MaxChargeExercise[];
  onSave: (updated: MaxChargeExercise[]) => void;
  onClose: () => void;
  theme?: 'dark' | 'warm-light';
}

export const Manage1RmModal: React.FC<Manage1RmModalProps> = ({
  initialExercises,
  onSave,
  onClose,
  theme,
}) => {
  const isLight = theme === 'warm-light';
  const [exercises, setExercises] = useState<MaxChargeExercise[]>(() => {
    return initialExercises.length > 0 ? initialExercises : DEFAULT_1RM_EXERCISES;
  });

  // State for adding a new exercise
  const [newLabel, setNewLabel] = useState('');
  const [newVal, setNewVal] = useState(80);
  const [newTarget, setNewTarget] = useState(90);
  const [newColor, setNewColor] = useState('#EC4899');
  const [showAddForm, setShowAddForm] = useState(false);

  const handleUpdateItem = (id: string, updates: Partial<MaxChargeExercise>) => {
    setExercises((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  };

  const handleDeleteItem = (id: string) => {
    if (exercises.length <= 1) {
      alert("Tu dois garder au moins un exercice dans tes charges maximales.");
      return;
    }
    setExercises((prev) => prev.filter((item) => item.id !== id));
  };

  const handleAddExercise = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabel.trim()) return;

    const newItem: MaxChargeExercise = {
      id: `1rm-custom-${Date.now()}`,
      label: newLabel.trim().toUpperCase(),
      val: Math.max(1, newVal),
      target: Math.max(newVal, newTarget),
      color: newColor,
    };

    setExercises((prev) => [...prev, newItem]);
    setNewLabel('');
    setNewVal(80);
    setNewTarget(90);
    setShowAddForm(false);
  };

  const handleAddPreset = (preset: typeof POPULAR_PRESETS[0]) => {
    const exists = exercises.some((e) => e.label.toLowerCase() === preset.label.toLowerCase());
    if (exists) {
      alert(`L'exercice "${preset.label}" est déjà dans ta liste.`);
      return;
    }

    const newItem: MaxChargeExercise = {
      id: `1rm-preset-${Date.now()}`,
      label: preset.label.toUpperCase(),
      val: preset.defaultVal,
      target: preset.defaultTarget,
      color: preset.color,
    };

    setExercises((prev) => [...prev, newItem]);
  };

  const handleResetDefaults = () => {
    if (window.confirm("Rétablir les 4 exercices de base (DC Bench, Squat, Deadlift, Overhead) ?")) {
      setExercises(DEFAULT_1RM_EXERCISES);
    }
  };

  const handleSaveAll = () => {
    audioSynth.playCelebrationSound();
    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#EC4899', '#7C3AED', '#00C6FF', '#F59E0B'],
      });
    } catch {
      // ignore
    }
    onSave(exercises);
    onClose();
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200 ${
        isLight ? 'bg-[#3d2317]/65 backdrop-blur-xl' : 'bg-black/80 backdrop-blur-md'
      }`}
      onClick={onClose}
    >
      <div
        className={`w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl p-5 sm:p-6 space-y-5 shadow-2xl border transition-colors ${
          isLight
            ? 'bg-[#faebe0] border-[#7d5a47]/25 text-[#3d2317]'
            : 'bg-[#181818] border-white/15 text-white'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-3 border-current/10">
          <div className="space-y-0.5">
            <span className={`text-[10px] font-black uppercase tracking-wider block ${
              isLight ? 'text-[#b85d38]' : 'text-[#EC4899]'
            }`}>
              PERSONNALISATION 1RM
            </span>
            <h3 className="text-lg sm:text-xl font-black uppercase tracking-tight flex items-center gap-2">
              <Dumbbell className="w-5 h-5 text-[#EC4899]" />
              <span>Gérer mes exercices 1RM</span>
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-black/10 text-current transition-colors cursor-pointer"
            title="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className={`text-xs ${isLight ? 'text-[#7d5a47]' : 'text-[#A7A7A7]'}`}>
          Choisis les exercices que tu souhaites afficher sur ton tableau de bord des charges maximales, avec ta charge actuelle et ton objectif cible.
        </p>

        {/* List of Current 1RM Exercises */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider opacity-80">
            <span>Exercices suivis ({exercises.length})</span>
            <button
              type="button"
              onClick={handleResetDefaults}
              className="text-[10px] font-bold text-amber-500 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Réinitialiser par défaut</span>
            </button>
          </div>

          <div className="space-y-2.5">
            {exercises.map((item, idx) => (
              <div
                key={item.id}
                className={`p-3.5 rounded-2xl border space-y-2.5 transition-all ${
                  isLight
                    ? 'bg-[#fff7f0] border-[#7d5a47]/20 shadow-sm'
                    : 'bg-[#141414] border-white/10'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <input
                      type="text"
                      value={item.label}
                      onChange={(e) => handleUpdateItem(item.id, { label: e.target.value.toUpperCase() })}
                      className={`text-xs font-black uppercase tracking-wide bg-transparent border-b border-transparent focus:border-[#EC4899] focus:outline-none w-full truncate ${
                        isLight ? 'text-[#3d2317]' : 'text-white'
                      }`}
                    />
                  </div>

                  {/* Delete button */}
                  <button
                    type="button"
                    onClick={() => handleDeleteItem(item.id)}
                    className="p-1 text-[#737373] hover:text-rose-500 rounded-lg transition-colors cursor-pointer"
                    title="Supprimer cet exercice de la modale"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Values row: Current (val) and Target */}
                <div className="grid grid-cols-2 gap-3 pt-1 text-xs">
                  {/* Valeur actuelle */}
                  <div className="space-y-1">
                    <span className={`text-[10px] font-bold uppercase block ${
                      isLight ? 'text-[#7d5a47]' : 'text-[#A7A7A7]'
                    }`}>
                      Charge Actuelle (KG)
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleUpdateItem(item.id, { val: Math.max(1, item.val - 2.5) })}
                        className={`w-7 h-7 rounded-lg font-bold flex items-center justify-center cursor-pointer ${
                          isLight ? 'bg-black/5 hover:bg-black/10' : 'bg-white/10 hover:bg-white/20'
                        }`}
                      >
                        -
                      </button>
                      <input
                        type="number"
                        step="0.5"
                        value={item.val}
                        onChange={(e) => handleUpdateItem(item.id, { val: parseFloat(e.target.value) || 0 })}
                        className={`w-16 text-center py-1 font-mono font-black rounded-lg border focus:outline-none focus:border-[#EC4899] ${
                          isLight ? 'bg-[#faebe0] border-[#7d5a47]/20 text-[#3d2317]' : 'bg-[#1C1C1C] border-white/10 text-white'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => handleUpdateItem(item.id, { val: item.val + 2.5 })}
                        className={`w-7 h-7 rounded-lg font-bold flex items-center justify-center cursor-pointer ${
                          isLight ? 'bg-black/5 hover:bg-black/10' : 'bg-white/10 hover:bg-white/20'
                        }`}
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Objectif Cible */}
                  <div className="space-y-1">
                    <span className={`text-[10px] font-bold uppercase block ${
                      isLight ? 'text-[#7d5a47]' : 'text-[#A7A7A7]'
                    }`}>
                      Objectif Cible (KG)
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleUpdateItem(item.id, { target: Math.max(item.val, item.target - 2.5) })}
                        className={`w-7 h-7 rounded-lg font-bold flex items-center justify-center cursor-pointer ${
                          isLight ? 'bg-black/5 hover:bg-black/10' : 'bg-white/10 hover:bg-white/20'
                        }`}
                      >
                        -
                      </button>
                      <input
                        type="number"
                        step="0.5"
                        value={item.target}
                        onChange={(e) => handleUpdateItem(item.id, { target: parseFloat(e.target.value) || 0 })}
                        className={`w-16 text-center py-1 font-mono font-black rounded-lg border focus:outline-none focus:border-[#EC4899] ${
                          isLight ? 'bg-[#faebe0] border-[#7d5a47]/20 text-[#3d2317]' : 'bg-[#1C1C1C] border-white/10 text-white'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => handleUpdateItem(item.id, { target: item.target + 2.5 })}
                        className={`w-7 h-7 rounded-lg font-bold flex items-center justify-center cursor-pointer ${
                          isLight ? 'bg-black/5 hover:bg-black/10' : 'bg-white/10 hover:bg-white/20'
                        }`}
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                {/* Color picker pills */}
                <div className="flex items-center gap-1.5 pt-1">
                  <span className={`text-[9px] uppercase font-bold mr-1 ${isLight ? 'text-[#7d5a47]' : 'text-[#A7A7A7]'}`}>
                    Couleur :
                  </span>
                  {COLOR_PRESETS.map((c) => (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => handleUpdateItem(item.id, { color: c.hex })}
                      className={`w-5 h-5 rounded-full transition-transform cursor-pointer ${
                        item.color === c.hex ? 'scale-125 ring-2 ring-white/80' : 'opacity-70 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: c.hex }}
                      title={c.name}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Presets Section */}
        <div className="space-y-2 pt-1">
          <span className={`text-xs font-black uppercase tracking-wider block ${
            isLight ? 'text-[#7d5a47]' : 'text-[#A7A7A7]'
          }`}>
            Ajouts Rapides Populaires
          </span>
          <div className="flex flex-wrap gap-1.5">
            {POPULAR_PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => handleAddPreset(preset)}
                className={`text-[11px] font-bold px-2.5 py-1 rounded-xl border flex items-center gap-1 transition-all cursor-pointer ${
                  isLight
                    ? 'bg-[#fff7f0] border-[#7d5a47]/20 hover:border-[#b85d38] text-[#3d2317]'
                    : 'bg-[#141414] border-white/10 hover:border-white/30 text-white'
                }`}
              >
                <Plus className="w-3 h-3 text-[#EC4899]" />
                <span>{preset.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Form to add Custom Exercise */}
        {!showAddForm ? (
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className={`w-full py-2.5 rounded-2xl border border-dashed flex items-center justify-center gap-2 text-xs font-black uppercase tracking-wide transition-all cursor-pointer ${
              isLight
                ? 'border-[#7d5a47]/30 hover:border-[#b85d38] text-[#b85d38] hover:bg-[#fff7f0]'
                : 'border-white/20 hover:border-white/40 text-white hover:bg-white/5'
            }`}
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Ajouter un exercice personnalisé</span>
          </button>
        ) : (
          <form
            onSubmit={handleAddExercise}
            className={`p-4 rounded-2xl border space-y-3 ${
              isLight ? 'bg-[#fff7f0] border-[#7d5a47]/25' : 'bg-[#141414] border-white/15'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase">Nouvel Exercice 1RM</span>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="text-xs text-[#737373] hover:text-white"
              >
                ✕
              </button>
            </div>

            <div>
              <label className={`text-[10px] font-bold uppercase block mb-1 ${
                isLight ? 'text-[#7d5a47]' : 'text-[#A7A7A7]'
              }`}>
                Nom de l'exercice
              </label>
              <input
                type="text"
                required
                placeholder="Ex: FENTES MARCHÉES, HACK SQUAT, CURL PUPITRE..."
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                className={`w-full rounded-xl px-3 py-2 text-xs border focus:outline-none focus:border-[#EC4899] ${
                  isLight
                    ? 'bg-[#faebe0] border-[#7d5a47]/20 text-[#3d2317]'
                    : 'bg-[#1A1A1A] border-white/10 text-white'
                }`}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={`text-[10px] font-bold uppercase block mb-1 ${
                  isLight ? 'text-[#7d5a47]' : 'text-[#A7A7A7]'
                }`}>
                  Charge Actuelle (KG)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={newVal}
                  onChange={(e) => setNewVal(parseFloat(e.target.value) || 0)}
                  className={`w-full rounded-xl px-3 py-1.5 text-xs font-mono font-bold border focus:outline-none focus:border-[#EC4899] ${
                    isLight
                      ? 'bg-[#faebe0] border-[#7d5a47]/20 text-[#3d2317]'
                      : 'bg-[#1A1A1A] border-white/10 text-white'
                  }`}
                />
              </div>

              <div>
                <label className={`text-[10px] font-bold uppercase block mb-1 ${
                  isLight ? 'text-[#7d5a47]' : 'text-[#A7A7A7]'
                }`}>
                  Objectif Cible (KG)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={newTarget}
                  onChange={(e) => setNewTarget(parseFloat(e.target.value) || 0)}
                  className={`w-full rounded-xl px-3 py-1.5 text-xs font-mono font-bold border focus:outline-none focus:border-[#EC4899] ${
                    isLight
                      ? 'bg-[#faebe0] border-[#7d5a47]/20 text-[#3d2317]'
                      : 'bg-[#1A1A1A] border-white/10 text-white'
                  }`}
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-1.5">
                {COLOR_PRESETS.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => setNewColor(c.hex)}
                    className={`w-5 h-5 rounded-full cursor-pointer ${
                      newColor === c.hex ? 'scale-125 ring-2 ring-white/80' : 'opacity-70'
                    }`}
                    style={{ backgroundColor: c.hex }}
                  />
                ))}
              </div>

              <button
                type="submit"
                className="px-3.5 py-1.5 rounded-xl bg-[#EC4899] hover:bg-[#d63384] text-black font-black text-xs uppercase cursor-pointer"
              >
                Ajouter
              </button>
            </div>
          </form>
        )}

        {/* Footer Actions */}
        <div className="flex gap-2 pt-3 border-t border-current/10">
          <button
            type="button"
            onClick={onClose}
            className={`flex-1 py-3 rounded-2xl text-xs font-bold uppercase transition-colors cursor-pointer ${
              isLight ? 'bg-[#f0ded0] text-[#7d5a47]' : 'bg-white/5 text-[#A7A7A7] hover:text-white'
            }`}
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleSaveAll}
            className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-[#7C3AED] to-[#EC4899] hover:brightness-110 active:scale-[0.98] text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-[#EC4899]/25 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>Enregistrer mes 1RM</span>
          </button>
        </div>
      </div>
    </div>
  );
};
