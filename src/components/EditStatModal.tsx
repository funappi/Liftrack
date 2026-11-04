import React, { useState } from 'react';
import { X, Check, Flame, Zap, Award, Sparkles, ChevronRight } from 'lucide-react';
import { UserStats } from '../types';
import { LIMITS } from '../data/model';
import { audioSynth } from '../utils/audioSynth';
import confetti from 'canvas-confetti';

// The streak was removed from the app: it is no longer editable nor shown here
export type EditableStatType = 'workouts' | 'calories' | 'nextGoal';

interface EditStatModalProps {
  initialType: EditableStatType;
  userStats: UserStats;
  onClose: () => void;
  onSave: (updatedStats: Partial<UserStats>) => void;
  onOpenBodyComposition?: () => void;
  theme?: 'dark' | 'warm-light';
}

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
    const workouts = Number(totalWorkouts);
    const kcal = Number(totalCalories);
    const gStart = Number(goalStart);
    const gCurrent = Number(goalCurrent);
    const gTarget = Number(goalTarget);
    const [wMin, wMax] = LIMITS.bodyWeightKg;

    if (!isIn(workouts, LIMITS.baselineSessions) || !Number.isInteger(workouts))
      return setFormError(`Nombre de séances invalide : entier entre 0 et ${LIMITS.baselineSessions[1].toLocaleString('fr-FR')}.`);
    if (!isIn(kcal, LIMITS.baselineKcal) || !Number.isInteger(kcal))
      return setFormError(`Kcal invalides : entier entre 0 et ${LIMITS.baselineKcal[1].toLocaleString('fr-FR')}.`);
    if (![gStart, gCurrent, gTarget].every((v) => isIn(v, LIMITS.bodyWeightKg)))
      return setFormError(`Poids du challenge invalides : entre ${wMin} et ${wMax} kg.`);
    if (!goalTitle.trim()) return setFormError('Donne un intitulé au challenge.');
    setFormError(null);

    // Only send what changed: App turns the weight into a dated weigh-in and the totals into a baseline,
    // so an untouched field must not create an entry
    const patch: Partial<UserStats> = {};
    if (workouts !== userStats.totalWorkouts) patch.totalWorkouts = workouts;
    if (kcal !== userStats.totalCaloriesBurned) patch.totalCaloriesBurned = kcal;
    const g = userStats.nextGoal;
    if (goalTitle.trim() !== g.title || gStart !== (g.startValue ?? g.current) || gCurrent !== g.current || gTarget !== g.target) {
      patch.nextGoal = { ...g, title: goalTitle.trim(), current: round1(gCurrent), target: round1(gTarget), startValue: round1(gStart) };
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

              {/* Live preview: same computation as the Home card, whichever direction (loss / gain) */}
              {(() => {
                const sN = Number(goalStart), cN = Number(goalCurrent), tN = Number(goalTarget);
                const loss = tN < sN;
                const total = Math.abs(tN - sN);
                const done = loss ? sN - cN : cN - sN;
                const pct = total < 0.1 ? 0 : Math.min(100, Math.max(0, Math.round((done / total) * 100)));
                const left = Math.round(Math.abs(loss ? cN - tN : tN - cN) * 10) / 10;
                return (
                  <div className="space-y-1.5">
                    <div className="w-full h-2.5 rounded-full bg-[#181818] overflow-hidden p-0.5 border border-white/[0.06]">
                      <div className="h-full rounded-full bg-gradient-to-r from-[#7C3AED] via-[#EC4899] to-[#00C6FF] transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-xs text-[#A7A7A7] text-center">
                      <span className="font-black text-white num">{pct}%</span>
                      {' · '}
                      {(loss ? cN <= tN : cN >= tN) ? 'objectif atteint' : `encore ${left} kg à ${loss ? 'perdre' : 'gagner'}`}
                    </p>
                  </div>
                );
              })()}

              <p className="text-2xs text-[#A7A7A7]">
                Ces trois valeurs alimentent ton poids actuel, ton objectif et la progression partout dans l'appli.
              </p>

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
                    <span className="text-xs font-black text-white uppercase group-hover:text-[#EC4899] transition-colors">
                      Calculateur de composition corporelle
                    </span>
                    <ChevronRight className="w-4 h-4 text-[#EC4899] group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>
              )}
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
