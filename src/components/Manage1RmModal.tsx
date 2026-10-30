import React, { useState } from 'react';
import { X, Plus, Trash2, Dumbbell, Check, Eye, EyeOff } from 'lucide-react';
import { audioSynth } from '../utils/audioSynth';
import confetti from 'canvas-confetti';
import { useVoltData } from '../data/VoltDataContext';
import { LIMITS, sanitizeNumber } from '../data/model';
import { currentPR, findExerciseByName } from '../data/selectors';

const COLOR_PRESETS = [
  { name: 'Rose', hex: '#EC4899' },
  { name: 'Violet', hex: '#7C3AED' },
  { name: 'Cyan', hex: '#00C6FF' },
  { name: 'Orange', hex: '#FF512F' },
  { name: 'Émeraude', hex: '#10B981' },
  { name: 'Or', hex: '#F59E0B' },
];

// Names and colours only: no invented loads (the current load comes from the dated history)
const POPULAR_PRESETS = [
  { label: 'Tractions Lestées', color: '#00C6FF' },
  { label: 'Dips Lestés', color: '#FF512F' },
  { label: 'Hip Thrust', color: '#EC4899' },
  { label: 'Curl Biceps Haltères', color: '#F59E0B' },
  { label: 'Rowing Barre', color: '#10B981' },
  { label: 'Presse à Cuisses', color: '#7C3AED' },
  { label: 'Développé Incliné', color: '#EC4899' },
];

interface Manage1RmModalProps {
  onClose: () => void;
  theme?: 'dark' | 'warm-light';
}

/** Draft row edited locally, applied on "Enregistrer" */
interface DraftRow {
  id: string;
  name: string;
  target: string;
  color: string;
  show: boolean;
}

/** '' = no goal (undefined), null = invalid */
const parseTarget = (s: string): number | undefined | null => {
  if (!s.trim()) return undefined;
  const n = sanitizeNumber(s, LIMITS.loadKg[0], LIMITS.loadKg[1]);
  return n !== null && n > 0 ? n : null;
};
const parseLoad = (s: string): number | null => {
  const n = sanitizeNumber(s, LIMITS.loadKg[0], LIMITS.loadKg[1]);
  return n !== null && n > 0 ? n : null;
};

export const Manage1RmModal: React.FC<Manage1RmModalProps> = ({ onClose, theme }) => {
  const isLight = theme === 'warm-light';
  const { data, addExercise, updateExercise, deleteExercise, logRecord } = useVoltData();

  const [rows, setRows] = useState<DraftRow[]>(() =>
    data.exercises.map((ex) => ({
      id: ex.id,
      name: ex.name,
      target: typeof ex.targetKg === 'number' ? String(ex.targetKg) : '',
      color: ex.color ?? '#EC4899',
      show: ex.showInMaxCharges,
    }))
  );
  const [error, setError] = useState<string | null>(null);

  // New exercise form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newVal, setNewVal] = useState('');
  const [newTarget, setNewTarget] = useState('');
  const [newColor, setNewColor] = useState('#EC4899');
  const [addError, setAddError] = useState<string | null>(null);

  const handleUpdateRow = (id: string, patch: Partial<DraftRow>) => setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  // Deleting removes the exercise AND its dated history: immediate, after confirmation
  const handleDeleteExercise = (row: DraftRow) => {
    const ex = data.exercises.find((e) => e.id === row.id);
    const count = ex?.history.length ?? 0;
    const msg = count
      ? `Supprimer "${row.name}" et ses ${count} entrée(s) d'historique ? Action irréversible.\n(Pour seulement le retirer du graphique, utilise l'œil.)`
      : `Supprimer l'exercice "${row.name}" ?`;
    if (!window.confirm(msg)) return;
    deleteExercise(row.id);
    setRows((prev) => prev.filter((r) => r.id !== row.id));
  };

  const createExercise = (name: string, color: string, targetStr: string, currentStr: string): string | null => {
    const clean = name.trim().slice(0, 60);
    if (!clean) {
      setAddError("Donne un nom à l'exercice.");
      return null;
    }
    if (findExerciseByName(data, clean) || rows.some((r) => r.name.trim().toLowerCase() === clean.toLowerCase())) {
      setAddError(`"${clean}" existe déjà : active-le avec l'œil dans la liste.`);
      return null;
    }
    const target = parseTarget(targetStr);
    if (target === null) {
      setAddError(`Objectif invalide (entre 0 et ${LIMITS.loadKg[1]} kg).`);
      return null;
    }
    let current: number | null = null;
    if (currentStr.trim()) {
      current = parseLoad(currentStr);
      if (current === null) {
        setAddError(`Charge actuelle invalide (entre 0 et ${LIMITS.loadKg[1]} kg).`);
        return null;
      }
    }
    const id = addExercise(clean, { color, targetKg: target, showInMaxCharges: true });
    if (!id) {
      setAddError("Impossible d'ajouter cet exercice.");
      return null;
    }
    // A current load typed here becomes today's dated entry
    if (current !== null && !logRecord(id, { weightKg: current })) {
      setAddError('Exercice ajouté, mais la charge a été refusée.');
    } else {
      setAddError(null);
    }
    setRows((prev) => [...prev, { id, name: clean, target: target === undefined ? '' : String(target), color, show: true }]);
    return id;
  };

  const handleAddExercise = (e: React.FormEvent) => {
    e.preventDefault();
    if (createExercise(newLabel, newColor, newTarget, newVal)) {
      setNewLabel('');
      setNewVal('');
      setNewTarget('');
      setShowAddForm(false);
    }
  };

  const handleAddPreset = (preset: (typeof POPULAR_PRESETS)[number]) => {
    const existing = rows.find((r) => r.name.trim().toLowerCase() === preset.label.toLowerCase());
    if (existing) {
      handleUpdateRow(existing.id, { show: true });
      return;
    }
    createExercise(preset.label, preset.color, '', '');
  };

  const handleSaveAll = () => {
    // Validate every row first: nothing is written if one value is invalid
    const parsed: { row: DraftRow; target: number | undefined }[] = [];
    for (const row of rows) {
      if (!row.name.trim()) {
        setError('Un exercice n’a pas de nom.');
        return;
      }
      const target = parseTarget(row.target);
      if (target === null) {
        setError(`Objectif invalide pour "${row.name}" (entre 0 et ${LIMITS.loadKg[1]} kg, ou vide).`);
        return;
      }
      parsed.push({ row, target });
    }
    const names = rows.map((r) => r.name.trim().toLowerCase());
    if (new Set(names).size !== names.length) {
      setError('Deux exercices portent le même nom.');
      return;
    }

    for (const { row, target } of parsed) {
      const ex = data.exercises.find((e) => e.id === row.id);
      if (!ex) continue;
      const patch: Parameters<typeof updateExercise>[1] = {};
      if (row.name.trim() !== ex.name) patch.name = row.name.trim().slice(0, 60);
      if (row.color !== (ex.color ?? '#EC4899')) patch.color = row.color;
      if (row.show !== ex.showInMaxCharges) patch.showInMaxCharges = row.show;
      if (target !== ex.targetKg) patch.targetKg = target;
      if (Object.keys(patch).length) updateExercise(row.id, patch);
    }

    audioSynth.playCelebrationSound();
    try {
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 }, colors: ['#EC4899', '#7C3AED', '#00C6FF', '#F59E0B'] });
    } catch {
      // ignore
    }
    onClose();
  };

  const shownCount = rows.filter((r) => r.show).length;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200 ${
        isLight ? 'bg-[#3d2317]/65 backdrop-blur-xl' : 'bg-black/80 backdrop-blur-md'
      }`}
      onClick={onClose}
    >
      <div
        className={`w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl p-5 sm:p-6 space-y-5 shadow-2xl border transition-colors ${
          isLight ? 'bg-[#faebe0] border-[#7d5a47]/25 text-[#3d2317]' : 'bg-[#181818] border-white/15 text-white'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-3 border-current/10">
          <div className="space-y-0.5">
            <span className={`text-[10px] font-black uppercase tracking-wider block ${isLight ? 'text-[#b85d38]' : 'text-[#EC4899]'}`}>
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
          Choisis les exercices affichés dans tes charges maximales (œil), leur objectif et leur couleur. La charge actuelle est ton record
          (la plus lourde de l’historique) : modifie-la depuis « Tes records ».
        </p>

        {/* Exercises */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider opacity-80">
            <span>Exercices ({rows.length})</span>
            <span className="text-[10px]">{shownCount} affiché{shownCount > 1 ? 's' : ''}</span>
          </div>

          {rows.length === 0 && (
            <p className={`text-xs text-center py-4 ${isLight ? 'text-[#7d5a47]' : 'text-[#A7A7A7]'}`}>
              Aucun exercice suivi. Ajoute-en un ci-dessous.
            </p>
          )}

          <div className="space-y-2.5">
            {rows.map((item) => {
              const ex = data.exercises.find((e) => e.id === item.id);
              const cur = ex ? currentPR(ex) : null;
              return (
                <div
                  key={item.id}
                  className={`p-3.5 rounded-2xl border space-y-2.5 transition-all ${
                    isLight ? 'bg-[#fff7f0] border-[#7d5a47]/20 shadow-sm' : 'bg-[#141414] border-white/10'
                  } ${item.show ? '' : 'opacity-60'}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <input
                        type="text"
                        value={item.name}
                        maxLength={60}
                        onChange={(e) => handleUpdateRow(item.id, { name: e.target.value })}
                        className={`text-xs font-black uppercase tracking-wide bg-transparent border-b border-transparent focus:border-[#EC4899] focus:outline-none w-full truncate ${
                          isLight ? 'text-[#3d2317]' : 'text-white'
                        }`}
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => handleUpdateRow(item.id, { show: !item.show })}
                      className={`p-1 rounded-lg transition-colors cursor-pointer ${item.show ? 'text-[#00C6FF]' : 'text-[#737373] hover:text-white'}`}
                      title={item.show ? 'Masquer des charges maximales' : 'Afficher dans les charges maximales'}
                    >
                      {item.show ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteExercise(item)}
                      className="p-1 text-[#737373] hover:text-rose-500 rounded-lg transition-colors cursor-pointer"
                      title="Supprimer l'exercice et son historique"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1 text-xs">
                    <div className="space-y-1">
                      <span className={`text-[10px] font-bold uppercase block ${isLight ? 'text-[#7d5a47]' : 'text-[#A7A7A7]'}`}>
                        Record actuel
                      </span>
                      <span className={`block py-1 font-mono font-black ${isLight ? 'text-[#3d2317]' : 'text-white'}`}>
                        {cur === null ? 'Aucune entrée' : `${cur} kg`}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <span className={`text-[10px] font-bold uppercase block ${isLight ? 'text-[#7d5a47]' : 'text-[#A7A7A7]'}`}>
                        Objectif Cible (KG)
                      </span>
                      <input
                        type="number"
                        inputMode="decimal"
                        step="0.5"
                        min="0"
                        value={item.target}
                        placeholder="—"
                        onChange={(e) => handleUpdateRow(item.id, { target: e.target.value })}
                        className={`w-24 text-center py-1 font-mono font-black rounded-lg border focus:outline-none focus:border-[#EC4899] ${
                          isLight ? 'bg-[#faebe0] border-[#7d5a47]/20 text-[#3d2317]' : 'bg-[#1C1C1C] border-white/10 text-white'
                        }`}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 pt-1">
                    <span className={`text-[9px] uppercase font-bold mr-1 ${isLight ? 'text-[#7d5a47]' : 'text-[#A7A7A7]'}`}>Couleur :</span>
                    {COLOR_PRESETS.map((c) => (
                      <button
                        key={c.hex}
                        type="button"
                        onClick={() => handleUpdateRow(item.id, { color: c.hex })}
                        className={`w-5 h-5 rounded-full transition-transform cursor-pointer ${
                          item.color === c.hex ? 'scale-125 ring-2 ring-white/80' : 'opacity-70 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: c.hex }}
                        title={c.name}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick presets */}
        <div className="space-y-2 pt-1">
          <span className={`text-xs font-black uppercase tracking-wider block ${isLight ? 'text-[#7d5a47]' : 'text-[#A7A7A7]'}`}>
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

        {addError && !showAddForm && <p className="text-xs font-bold text-rose-400">{addError}</p>}

        {/* Custom exercise form */}
        {!showAddForm ? (
          <button
            type="button"
            onClick={() => {
              setShowAddForm(true);
              setAddError(null);
            }}
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
            className={`p-4 rounded-2xl border space-y-3 ${isLight ? 'bg-[#fff7f0] border-[#7d5a47]/25' : 'bg-[#141414] border-white/15'}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase">Nouvel Exercice 1RM</span>
              <button type="button" onClick={() => setShowAddForm(false)} className="text-xs text-[#737373] hover:text-white">
                ✕
              </button>
            </div>

            <div>
              <label className={`text-[10px] font-bold uppercase block mb-1 ${isLight ? 'text-[#7d5a47]' : 'text-[#A7A7A7]'}`}>
                Nom de l'exercice
              </label>
              <input
                type="text"
                required
                maxLength={60}
                placeholder="Ex: FENTES MARCHÉES, HACK SQUAT, CURL PUPITRE..."
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                className={`w-full rounded-xl px-3 py-2 text-xs border focus:outline-none focus:border-[#EC4899] ${
                  isLight ? 'bg-[#faebe0] border-[#7d5a47]/20 text-[#3d2317]' : 'bg-[#1A1A1A] border-white/10 text-white'
                }`}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={`text-[10px] font-bold uppercase block mb-1 ${isLight ? 'text-[#7d5a47]' : 'text-[#A7A7A7]'}`}>
                  Charge actuelle (KG, option.)
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.5"
                  min="0"
                  value={newVal}
                  placeholder="—"
                  onChange={(e) => setNewVal(e.target.value)}
                  className={`w-full rounded-xl px-3 py-1.5 text-xs font-mono font-bold border focus:outline-none focus:border-[#EC4899] ${
                    isLight ? 'bg-[#faebe0] border-[#7d5a47]/20 text-[#3d2317]' : 'bg-[#1A1A1A] border-white/10 text-white'
                  }`}
                />
              </div>
              <div>
                <label className={`text-[10px] font-bold uppercase block mb-1 ${isLight ? 'text-[#7d5a47]' : 'text-[#A7A7A7]'}`}>
                  Objectif Cible (KG, option.)
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.5"
                  min="0"
                  value={newTarget}
                  placeholder="—"
                  onChange={(e) => setNewTarget(e.target.value)}
                  className={`w-full rounded-xl px-3 py-1.5 text-xs font-mono font-bold border focus:outline-none focus:border-[#EC4899] ${
                    isLight ? 'bg-[#faebe0] border-[#7d5a47]/20 text-[#3d2317]' : 'bg-[#1A1A1A] border-white/10 text-white'
                  }`}
                />
              </div>
            </div>
            <p className={`text-[10px] ${isLight ? 'text-[#7d5a47]' : 'text-[#A7A7A7]'}`}>
              La charge actuelle saisie est enregistrée comme entrée datée d’aujourd’hui.
            </p>

            {addError && <p className="text-xs font-bold text-rose-400">{addError}</p>}

            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-1.5">
                {COLOR_PRESETS.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => setNewColor(c.hex)}
                    className={`w-5 h-5 rounded-full cursor-pointer ${newColor === c.hex ? 'scale-125 ring-2 ring-white/80' : 'opacity-70'}`}
                    style={{ backgroundColor: c.hex }}
                    title={c.name}
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

        {error && <p className="text-xs font-bold text-rose-400">{error}</p>}

        <p className={`text-[10px] ${isLight ? 'text-[#7d5a47]' : 'text-[#A7A7A7]'}`}>
          Les ajouts et suppressions sont immédiats ; noms, objectifs, couleurs et affichage sont appliqués avec « Enregistrer ».
        </p>

        {/* Footer */}
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
