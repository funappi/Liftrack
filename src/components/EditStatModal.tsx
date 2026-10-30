import React, { useState } from 'react';
import { X, Check, Dumbbell, Target, Flame, Zap, Award, Sparkles, ChevronRight } from 'lucide-react';
import { UserStats } from '../types';
import { LIMITS } from '../data/model';
import { audioSynth } from '../utils/audioSynth';
import confetti from 'canvas-confetti';

// The streak was removed from the app: it is no longer editable nor shown here
export type EditableStatType = 'currentWeight' | 'targetWeight' | 'workouts' | 'calories' | 'nextGoal';

interface EditStatModalProps {
  initialType: EditableStatType;
  userStats: UserStats;
  onClose: () => void;
  onSave: (updatedStats: Partial<UserStats>) => void;
  onOpenBodyComposition?: () => void;
  theme?: 'dark' | 'warm-light';
}

// Weight bounds of the data model, shared by steppers, sliders and validation
const [W_MIN, W_MAX] = LIMITS.bodyWeightKg;
// Evenly spaced slider labels (justify-between): 25 / 133 / 242 / 350
const WEIGHT_TICKS = [0, 1, 2, 3].map((i) => Math.round(W_MIN + ((W_MAX - W_MIN) * i) / 3));

export const EditStatModal: React.FC<EditStatModalProps> = ({
  initialType,
  userStats,
  onClose,
  onSave,
  onOpenBodyComposition,
  theme,
}) => {
  const isLight = theme === 'warm-light';
  const [activeType, setActiveType] = useState<EditableStatType>(initialType);

  // Form values
  const [currentWeight, setCurrentWeight] = useState(userStats.currentWeightKg);
  const [targetWeight, setTargetWeight] = useState(userStats.targetWeightKg);
  const [totalWorkouts, setTotalWorkouts] = useState(userStats.totalWorkouts);
  const [totalCalories, setTotalCalories] = useState(userStats.totalCaloriesBurned);
  const [goalCurrent, setGoalCurrent] = useState(userStats.nextGoal.current);
  const [goalTarget, setGoalTarget] = useState(userStats.nextGoal.target);
  const [goalStart, setGoalStart] = useState(userStats.nextGoal.startValue ?? userStats.nextGoal.current);
  const [goalTitle, setGoalTitle] = useState(userStats.nextGoal.title);
  const [formError, setFormError] = useState<string | null>(null);

  const isIn = (v: number, [min, max]: readonly [number, number]) => Number.isFinite(v) && v >= min && v <= max;
  const round1 = (v: number) => Math.round(v * 10) / 10;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate every edited value (finite, positive, realistic bounds)
    const weight = Number(currentWeight);
    const target = Number(targetWeight);
    const workouts = Number(totalWorkouts);
    const kcal = Number(totalCalories);
    const gStart = Number(goalStart);
    const gCurrent = Number(goalCurrent);
    const gTarget = Number(goalTarget);
    const [wMin, wMax] = LIMITS.bodyWeightKg;

    if (!isIn(weight, LIMITS.bodyWeightKg)) return setFormError(`Poids actuel invalide : entre ${wMin} et ${wMax} kg.`);
    if (!isIn(target, LIMITS.bodyWeightKg)) return setFormError(`Poids cible invalide : entre ${wMin} et ${wMax} kg.`);
    if (!isIn(workouts, LIMITS.baselineSessions) || !Number.isInteger(workouts))
      return setFormError(`Nombre de séances invalide : entier entre 0 et ${LIMITS.baselineSessions[1].toLocaleString('fr-FR')}.`);
    if (!isIn(kcal, LIMITS.baselineKcal) || !Number.isInteger(kcal))
      return setFormError(`Kcal invalides : entier entre 0 et ${LIMITS.baselineKcal[1].toLocaleString('fr-FR')}.`);
    if (![gStart, gCurrent, gTarget].every((v) => isIn(v, [0, 100000])))
      return setFormError('Valeurs du challenge invalides : nombres positifs uniquement.');
    if (!goalTitle.trim()) return setFormError('Donne un intitulé au challenge.');
    setFormError(null);

    // Only send what changed: App turns the weight into a dated weigh-in and the totals into a baseline,
    // so an untouched field must not create an entry
    const patch: Partial<UserStats> = {};
    if (round1(weight) !== round1(userStats.currentWeightKg)) patch.currentWeightKg = round1(weight);
    if (round1(target) !== round1(userStats.targetWeightKg)) patch.targetWeightKg = round1(target);
    if (workouts !== userStats.totalWorkouts) patch.totalWorkouts = workouts;
    if (kcal !== userStats.totalCaloriesBurned) patch.totalCaloriesBurned = kcal;
    const g = userStats.nextGoal;
    if (goalTitle.trim() !== g.title || gStart !== (g.startValue ?? g.current) || gCurrent !== g.current || gTarget !== g.target) {
      patch.nextGoal = { ...g, title: goalTitle.trim(), current: gCurrent, target: gTarget, startValue: gStart };
    }

    if (Object.keys(patch).length > 0) {
      audioSynth.playCelebrationSound();
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#00C6FF', '#EC4899', '#7C3AED'],
        });
      } catch {
        // ignore
      }
      onSave(patch);
    }

    onClose();
  };

  const tabs: { id: EditableStatType; label: string; icon: React.ReactNode }[] = [
    { id: 'currentWeight', label: 'Poids Actuel', icon: <Dumbbell className="w-3.5 h-3.5" /> },
    { id: 'targetWeight', label: 'Objectif Poids', icon: <Target className="w-3.5 h-3.5" /> },
    { id: 'workouts', label: 'Workouts', icon: <Zap className="w-3.5 h-3.5" /> },
    { id: 'calories', label: 'Calories', icon: <Flame className="w-3.5 h-3.5" /> },
    { id: 'nextGoal', label: 'Challenge', icon: <Award className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className={`num fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200 ${
      isLight ? 'bg-[#3d2317]/65 backdrop-blur-xl' : 'bg-black/85 backdrop-blur-md'
    }`}>
      <div 
        id="modal-edit-stats"
        className={`w-full max-w-md border-t sm:border rounded-t-3xl sm:rounded-3xl p-6 space-y-5 shadow-2xl relative max-h-[90vh] overflow-y-auto no-scrollbar transition-colors ${
          isLight ? 'bg-[#faebe0] border-[#7d5a47]/20 text-[#3d2317]' : 'bg-[#181818] border-white/10 text-white'
        }`}
      >
        {/* Header with close button */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-2xs font-black uppercase tracking-widest text-[#EC4899] flex items-center gap-1.5">
              <Sparkles className="w-3 h-3" />
              <span>MODIFIER MES STATS</span>
            </span>
            <h3 className={`text-xl font-black uppercase tracking-tight ${isLight ? 'text-[#3d2317]' : 'text-white'}`}>
              Mise à jour rapide
            </h3>
          </div>

          <button
            onClick={onClose}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors border ${
              isLight
                ? 'bg-[#f3dfcb] hover:bg-[#fff3ea] text-[#7d5a47] hover:text-[#3d2317] border-[#7d5a47]/20'
                : 'bg-[#202020] text-[#A7A7A7] hover:text-white border-white/10'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick selector tabs */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 -mx-2 px-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveType(tab.id)}
              className={`px-3 py-2 rounded-xl text-xs font-black tracking-wide uppercase whitespace-nowrap flex items-center gap-1.5 transition-all ${
                activeType === tab.id
                  ? (isLight ? 'bg-gradient-to-r from-[#b85d38] to-[#df9b58] text-white shadow-md' : 'bg-gradient-to-r from-[#7C3AED] to-[#EC4899] text-white shadow-lg glow-main')
                  : (isLight ? 'bg-[#f0ded0] text-[#7d5a47] hover:text-[#3d2317] border border-[#7d5a47]/15' : 'bg-[#121212] text-[#A7A7A7] hover:text-white border border-white/[0.06]')
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* 1. POIDS ACTUEL */}
          {activeType === 'currentWeight' && (
            <div className="p-4 rounded-2xl bg-[#121212] border border-white/[0.08] space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-black text-white uppercase">Poids Actuel sur la balance</h4>
                  <p className="text-xs text-[#A7A7A7]">Enregistre ta dernière pesée à jeun</p>
                </div>
                <span className="text-xs font-bold text-emerald-400">Suivi actif</span>
              </div>

              {/* Big Stepper (sans colonne de flèches natives) */}
              <div className="flex items-center justify-center gap-4 py-2">
                <button
                  type="button"
                  onClick={() => setCurrentWeight((prev) => Math.max(W_MIN, Math.round((prev - 0.5) * 10) / 10))}
                  className="w-12 h-12 rounded-2xl bg-[#202020] border border-white/10 text-xl font-black text-white hover:bg-white/10 active:scale-95 transition-all flex items-center justify-center"
                >
                  -
                </button>

                <div className="flex items-baseline gap-1">
                  <input
                    type="number"
                    step="0.1"
                    value={currentWeight}
                    onChange={(e) => setCurrentWeight(parseFloat(e.target.value) || 0)}
                    className="w-28 bg-transparent text-center font-black text-4xl text-white font-mono num focus:outline-none appearance-none"
                  />
                  <span className="text-lg font-bold text-[#A7A7A7]">KG</span>
                </div>

                <button
                  type="button"
                  onClick={() => setCurrentWeight((prev) => Math.min(W_MAX, Math.round((prev + 0.5) * 10) / 10))}
                  className="w-12 h-12 rounded-2xl bg-[#202020] border border-white/10 text-xl font-black text-white hover:bg-white/10 active:scale-95 transition-all flex items-center justify-center"
                >
                  +
                </button>
              </div>

              {/* Pavé de défilement horizontal fluide */}
              <div className="px-1 space-y-1">
                <input
                  type="range"
                  min={W_MIN}
                  max={W_MAX}
                  step="0.5"
                  value={currentWeight}
                  onChange={(e) => setCurrentWeight(parseFloat(e.target.value))}
                  className="w-full accent-[#EC4899] bg-[#222222] h-2.5 rounded-lg cursor-pointer appearance-none"
                />
                <div className="flex justify-between text-2xs font-semibold text-[#A7A7A7]">
                  {WEIGHT_TICKS.map((t) => (
                    <span key={t} className="num">{t} kg</span>
                  ))}
                </div>
              </div>

              {/* Presets */}
              <div className="flex gap-2 justify-center pt-1">
                {[-1, -0.5, +0.5, +1].map((delta) => (
                  <button
                    key={delta}
                    type="button"
                    onClick={() => setCurrentWeight((prev) => Math.min(W_MAX, Math.max(W_MIN, Math.round((prev + delta) * 10) / 10)))}
                    className="px-2.5 py-1 rounded-lg bg-[#181818] border border-white/5 text-caption font-bold text-[#A7A7A7] hover:text-white hover:border-white/20"
                  >
                    {delta > 0 ? `+${delta}` : delta} kg
                  </button>
                ))}
              </div>

              {/* Raccourci vers le calculateur de composition corporelle */}
              {onOpenBodyComposition && (
                <div className="pt-2 border-t border-white/[0.06]">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenBodyComposition();
                    }}
                    className="w-full p-3 rounded-xl bg-gradient-to-r from-[#7C3AED]/20 via-[#EC4899]/15 to-[#DD2476]/20 border border-[#EC4899]/30 hover:border-[#EC4899] text-left transition-all flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-[#EC4899]/20 text-[#EC4899] flex items-center justify-center font-bold">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-black text-white block uppercase group-hover:text-[#EC4899] transition-colors">
                          Calculateur de composition corporelle
                        </span>
                        <span className="text-2xs text-[#A7A7A7] block">
                          Masse grasse, sèche & osseuse via formules US Navy / Boer
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#EC4899] group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 2. OBJECTIF POIDS */}
          {activeType === 'targetWeight' && (
            <div className="p-4 rounded-2xl bg-[#121212] border border-white/[0.08] space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-black text-white uppercase">Poids Cible / Objectif</h4>
                  <p className="text-xs text-[#A7A7A7]">Ton objectif de masse musculaire ou de sèche</p>
                </div>
                <span className="text-xs font-bold text-[#00C6FF]">Cible</span>
              </div>

              <div className="flex items-center justify-center gap-4 py-2">
                <button
                  type="button"
                  onClick={() => setTargetWeight((prev) => Math.max(W_MIN, Math.round((prev - 0.5) * 10) / 10))}
                  className="w-12 h-12 rounded-2xl bg-[#202020] border border-white/10 text-xl font-black text-white hover:bg-white/10 active:scale-95 transition-all flex items-center justify-center"
                >
                  -
                </button>

                <div className="flex items-baseline gap-1">
                  <input
                    type="number"
                    step="0.5"
                    value={targetWeight}
                    onChange={(e) => setTargetWeight(parseFloat(e.target.value) || 0)}
                    className="w-28 bg-transparent text-center font-black text-4xl text-[#00C6FF] font-mono num focus:outline-none appearance-none"
                  />
                  <span className="text-lg font-bold text-[#A7A7A7]">KG</span>
                </div>

                <button
                  type="button"
                  onClick={() => setTargetWeight((prev) => Math.min(W_MAX, Math.round((prev + 0.5) * 10) / 10))}
                  className="w-12 h-12 rounded-2xl bg-[#202020] border border-white/10 text-xl font-black text-white hover:bg-white/10 active:scale-95 transition-all flex items-center justify-center"
                >
                  +
                </button>
              </div>

              {/* Pavé de défilement horizontal fluide cible */}
              <div className="px-1 space-y-1">
                <input
                  type="range"
                  min={W_MIN}
                  max={W_MAX}
                  step="0.5"
                  value={targetWeight}
                  onChange={(e) => setTargetWeight(parseFloat(e.target.value))}
                  className="w-full accent-[#00C6FF] bg-[#222222] h-2.5 rounded-lg cursor-pointer appearance-none"
                />
                <div className="flex justify-between text-2xs font-semibold text-[#A7A7A7]">
                  {WEIGHT_TICKS.map((t) => (
                    <span key={t} className="num">{t} kg</span>
                  ))}
                </div>
              </div>

              <p className="text-center text-xs text-[#A7A7A7]">
                Écart avec ton poids actuel :{' '}
                <span className="font-bold text-white">
                  {Math.abs(Math.round((targetWeight - currentWeight) * 10) / 10)} kg
                </span>{' '}
                à {targetWeight >= currentWeight ? 'prendre' : 'perdre'}
              </p>
            </div>
          )}

          {/* 4. WORKOUTS VALIDÉS */}
          {activeType === 'workouts' && (
            <div className="p-4 rounded-2xl bg-[#121212] border border-white/[0.08] space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-black text-white uppercase">Total Workouts Validés</h4>
                  <p className="text-xs text-[#A7A7A7]">Cumul de toutes tes séances (y compris avant l'appli)</p>
                </div>
                <Zap className="w-5 h-5 text-[#EC4899]" />
              </div>

              <div className="flex items-center justify-center gap-4 py-2">
                <button
                  type="button"
                  onClick={() => setTotalWorkouts((prev) => Math.max(0, prev - 1))}
                  className="w-12 h-12 rounded-2xl bg-[#202020] border border-white/10 text-xl font-black text-white hover:bg-white/10 active:scale-95 transition-all flex items-center justify-center"
                >
                  -
                </button>

                <div className="flex items-baseline gap-1">
                  <input
                    type="number"
                    value={totalWorkouts}
                    onChange={(e) => setTotalWorkouts(parseInt(e.target.value) || 0)}
                    className="w-32 bg-transparent text-center font-black text-4xl text-white font-mono num focus:outline-none"
                  />
                  <span className="text-lg font-bold text-[#A7A7A7]">SÉANCES</span>
                </div>

                <button
                  type="button"
                  onClick={() => setTotalWorkouts((prev) => prev + 1)}
                  className="w-12 h-12 rounded-2xl bg-[#202020] border border-white/10 text-xl font-black text-white hover:bg-white/10 active:scale-95 transition-all flex items-center justify-center"
                >
                  +
                </button>
              </div>
            </div>
          )}

          {/* 5. CALORIES */}
          {activeType === 'calories' && (
            <div className="p-4 rounded-2xl bg-[#121212] border border-white/[0.08] space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-black text-white uppercase">Énergie Dépensée</h4>
                  <p className="text-xs text-[#A7A7A7]">Total cumulé des kilocalories brûlées</p>
                </div>
                <Flame className="w-5 h-5 text-[#FF512F]" />
              </div>

              <div className="flex items-center justify-center gap-4 py-2">
                <button
                  type="button"
                  onClick={() => setTotalCalories((prev) => Math.max(0, prev - 100))}
                  className="w-12 h-12 rounded-2xl bg-[#202020] border border-white/10 text-xl font-black text-white hover:bg-white/10 active:scale-95 transition-all flex items-center justify-center"
                >
                  -
                </button>

                <div className="flex items-baseline gap-1">
                  <input
                    type="number"
                    step="50"
                    value={totalCalories}
                    onChange={(e) => setTotalCalories(parseInt(e.target.value) || 0)}
                    className="w-36 bg-transparent text-center font-black text-4xl text-[#FF512F] font-mono num focus:outline-none"
                  />
                  <span className="text-lg font-bold text-[#A7A7A7]">KCAL</span>
                </div>

                <button
                  type="button"
                  onClick={() => setTotalCalories((prev) => prev + 100)}
                  className="w-12 h-12 rounded-2xl bg-[#202020] border border-white/10 text-xl font-black text-white hover:bg-white/10 active:scale-95 transition-all flex items-center justify-center"
                >
                  +
                </button>
              </div>
            </div>
          )}

          {/* 6. CHALLENGE EN COURS (NEXT GOAL) */}
          {activeType === 'nextGoal' && (
            <div className="p-4 rounded-2xl bg-[#121212] border border-white/[0.08] space-y-4">
              <div className="space-y-1">
                <h4 className="text-sm font-black text-white uppercase">Intitulé du Challenge</h4>
                <input
                  type="text"
                  value={goalTitle}
                  onChange={(e) => setGoalTitle(e.target.value)}
                  className="w-full bg-[#181818] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#EC4899]"
                />
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div className="space-y-1">
                  <label className="text-2xs font-bold text-[#A7A7A7] uppercase block">
                    Départ
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={goalStart}
                    onChange={(e) => setGoalStart(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#181818] border border-white/10 rounded-xl px-2.5 py-2 text-base font-black text-[#A7A7A7] font-mono num focus:outline-none focus:border-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-2xs font-bold text-[#A7A7A7] uppercase block">
                    Actuel
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={goalCurrent}
                    onChange={(e) => setGoalCurrent(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#181818] border border-white/10 rounded-xl px-2.5 py-2 text-base font-black text-white font-mono num focus:outline-none focus:border-[#EC4899]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-2xs font-bold text-[#A7A7A7] uppercase block">
                    Cible
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={goalTarget}
                    onChange={(e) => setGoalTarget(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#181818] border border-white/10 rounded-xl px-2.5 py-2 text-base font-black text-[#00C6FF] font-mono num focus:outline-none focus:border-[#00C6FF]"
                  />
                </div>
              </div>
            </div>
          )}

          {formError && (
            <p role="alert" className="text-xs font-bold text-rose-400">{formError}</p>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3.5 rounded-xl bg-[#202020] text-xs font-bold text-[#A7A7A7] hover:text-white uppercase transition-all"
            >
              Annuler
            </button>
            <button
              type="submit"
              id="btn-save-stats"
              className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#EC4899] text-xs font-black text-white uppercase flex items-center justify-center gap-2 shadow-lg shadow-[#EC4899]/30 hover:brightness-110 active:scale-95 transition-all"
            >
              <Check className="w-4 h-4" />
              <span>Enregistrer</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
