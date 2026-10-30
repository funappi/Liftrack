import React, { Suspense, lazy, useState } from 'react';
import { Trophy, Plus, Award, Activity, Lock, Edit3, Sparkles, Scale, TrendingUp, Target } from 'lucide-react';
import { UserStats, AchievementBadge } from '../types';
import { audioSynth } from '../utils/audioSynth';
import confetti from 'canvas-confetti';
import { EditStatModal, EditableStatType } from './EditStatModal';
import { PerformanceTrackerView } from './PerformanceTrackerView';
import { BadgeDetailModal } from './BadgeDetailModal';
import { getBadgeUnlockRequirement } from './BadgeIcon';
import { BadgeProgress } from './BadgeProgress';
import { Manage1RmModal } from './Manage1RmModal';
import { useVoltData } from '../data/VoltDataContext';
import { LIMITS, PREntry, TrackedExercise, formatShortDate, sanitizeNumber } from '../data/model';
import {
  averageMaxChargesProgress,
  currentPR,
  currentWeight,
  findExerciseByName,
  kcalPerDay,
  kcalThisMonth,
  latestComposition,
  maxChargesExercises,
  prGain,
  sessionsPerWeek,
  sortedHistory,
  startPR,
  totalKcal,
  totalVisits,
} from '../data/selectors';

// Opened on demand only: separate chunk
const PRProgressionModal = lazy(() => import('./PRProgressionModal').then((m) => ({ default: m.PRProgressionModal })));

interface ProgressionTabProps {
  userStats: UserStats;
  badges: AchievementBadge[];
  onUpdateUserStats?: (updated: Partial<UserStats>) => void;
  onUnlockBadge?: (badgeId: string) => void;
  onOpenBodyComposition?: () => void;
  theme?: 'dark' | 'warm-light';
}

const NEW_EXERCISE = '__new__';

/** Valid load (> 0, within LIMITS) or null */
const parseLoad = (s: string): number | null => {
  const n = sanitizeNumber(s, LIMITS.loadKg[0], LIMITS.loadKg[1]);
  return n !== null && n > 0 ? n : null;
};
const signed = (n: number) => (n > 0 ? `+${n}` : `${n}`);

/** Entry holding the current record (latest one if reached several times) */
const recordEntry = (ex: TrackedExercise): PREntry | null => {
  const cur = currentPR(ex);
  if (cur === null) return null;
  const hits = sortedHistory(ex).filter((h) => h.weightKg === cur);
  return hits[hits.length - 1] ?? null;
};

export const ProgressionTab: React.FC<ProgressionTabProps> = ({
  userStats,
  badges,
  onUpdateUserStats,
  onUnlockBadge,
  onOpenBodyComposition,
  theme,
}) => {
  const isLight = theme === 'warm-light';
  const { data, addExercise, updateExercise, logRecord } = useVoltData();
  const [activeMetric, setActiveMetric] = useState<'force' | 'poids' | 'composition' | 'workouts' | 'calories'>('force');
  const [showAddPrModal, setShowAddPrModal] = useState(false);
  const [selectedBadgeForModal, setSelectedBadgeForModal] = useState<AchievementBadge | null>(null);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
  const [editingStatType, setEditingStatType] = useState<EditableStatType | null>(null);
  const [editingStartExerciseId, setEditingStartExerciseId] = useState<string | null>(null);
  const [inputStartWeight, setInputStartWeight] = useState('');
  const [startError, setStartError] = useState<string | null>(null);

  // Badge filter tab: 'all' | 'unlocked' | 'locked'
  const [badgeFilter, setBadgeFilter] = useState<'all' | 'unlocked' | 'locked'>('all');

  // "Nouveau record" form
  const [newExerciseChoice, setNewExerciseChoice] = useState<string>(NEW_EXERCISE);
  const [newExerciseName, setNewExerciseName] = useState('');
  const [newWeight, setNewWeight] = useState('');
  const [newReps, setNewReps] = useState('');
  const [prError, setPrError] = useState<string | null>(null);

  const [show1RmModal, setShow1RmModal] = useState(false);

  // --- Derived from the dated histories ---
  const maxCharges = maxChargesExercises(data);
  const avgProgress = averageMaxChargesProgress(data);
  const recordExercises = data.exercises.filter((ex) => ex.history.length > 0 || typeof ex.startKg === 'number');
  const editingStartExercise = data.exercises.find((ex) => ex.id === editingStartExerciseId) ?? null;
  const startCur = editingStartExercise ? currentPR(editingStartExercise) : null;
  const startPreview = parseLoad(inputStartWeight);
  const startPreviewGain = startCur !== null && startPreview !== null ? Math.round((startCur - startPreview) * 10) / 10 : null;
  const startFirstEntry = editingStartExercise ? sortedHistory(editingStartExercise)[0] : undefined;

  const weeks = sessionsPerWeek(data, 4);
  const days = kcalPerDay(data, 7);
  const maxWeekCount = Math.max(1, ...weeks.map((w) => w.count));
  const maxDayKcal = Math.max(1, ...days.map((d) => d.kcal));
  const visits = totalVisits(data);
  const kcalTotal = totalKcal(data);
  const kcalMonth = kcalThisMonth(data);
  const monthLabel = new Date().toLocaleDateString('fr-FR', { month: 'long' });

  const composition = latestComposition(data);
  const compWeight = composition?.weightKg ?? currentWeight(data);
  const compParts = composition
    ? [
        { key: 'fat', label: 'Gras', kg: composition.fatKg ?? (compWeight && composition.fatPercent !== undefined ? (compWeight * composition.fatPercent) / 100 : undefined), cls: 'bg-[#EC4899]' },
        { key: 'muscle', label: 'Muscle', kg: composition.muscleMassKg, cls: 'bg-[#00C6FF]' },
        { key: 'bone', label: 'Os', kg: composition.boneMassKg, cls: 'bg-[#F59E0B]' },
        { key: 'organ', label: 'Organes', kg: composition.organMassKg, cls: 'bg-[#3B82F6]/60' },
      ].filter((p): p is { key: string; label: string; kg: number; cls: string } => typeof p.kg === 'number' && p.kg > 0)
    : [];
  const partsSum = compParts.reduce((s, p) => s + p.kg, 0);
  // Ratio to body weight; normalised if the parts exceed it (rounding between formulas)
  const compDenominator = Math.max(compWeight ?? 0, partsSum) || 1;
  const fmt1 = (n: number | undefined) => (typeof n === 'number' ? `${Math.round(n * 10) / 10}` : '—');

  const openNewRecord = () => {
    setNewExerciseChoice(data.exercises[0]?.id ?? NEW_EXERCISE);
    setNewExerciseName('');
    setNewWeight('');
    setNewReps('');
    setPrError(null);
    setShowAddPrModal(true);
  };

  const handleSavePr = (e: React.FormEvent) => {
    e.preventDefault();
    const weightKg = parseLoad(newWeight);
    if (weightKg === null) return setPrError(`Charge invalide : entre 0 et ${LIMITS.loadKg[1]} kg.`);
    let reps: number | undefined;
    if (newReps.trim()) {
      const r = sanitizeNumber(newReps, 1, LIMITS.reps[1]);
      if (r === null) return setPrError(`Répétitions invalides : de 1 à ${LIMITS.reps[1]}.`);
      reps = Math.round(r);
    }

    let exerciseId: string | null = newExerciseChoice;
    if (newExerciseChoice === NEW_EXERCISE) {
      const name = newExerciseName.trim().slice(0, 60);
      if (!name) return setPrError("Donne un nom à l'exercice.");
      exerciseId = findExerciseByName(data, name)?.id ?? addExercise(name);
    }
    if (!exerciseId) return setPrError("Impossible de créer l'exercice.");

    const previous = data.exercises.find((ex) => ex.id === exerciseId);
    const previousBest = previous ? currentPR(previous) : null;
    if (!logRecord(exerciseId, { weightKg, reps })) return setPrError('Valeur refusée : vérifie la saisie.');

    if (previousBest === null || weightKg > previousBest) {
      audioSynth.playCelebrationSound();
      try {
        confetti({ particleCount: 60, spread: 60, origin: { y: 0.5 }, colors: ['#EC4899', '#7C3AED', '#00C6FF'] });
      } catch {
        // Ignore
      }
    }
    setShowAddPrModal(false);
  };

  const openStartEditor = (ex: TrackedExercise) => {
    const start = startPR(ex);
    setEditingStartExerciseId(ex.id);
    setInputStartWeight(start === null ? '' : String(start));
    setStartError(null);
  };

  const handleSaveStart = () => {
    if (!editingStartExercise) return;
    const v = parseLoad(inputStartWeight);
    if (v === null) return setStartError(`Poids de départ invalide : entre 0 et ${LIMITS.loadKg[1]} kg.`);
    updateExercise(editingStartExercise.id, { startKg: v });
    setEditingStartExerciseId(null);
  };

  const unlockedCount = badges.filter((b) => !b.isLocked).length;
  const lockedCount = badges.filter((b) => b.isLocked).length;

  const filteredBadges = badges.filter((badge) => {
    if (badgeFilter === 'unlocked') return !badge.isLocked;
    if (badgeFilter === 'locked') return badge.isLocked;
    return true;
  });

  return (
    <div className="pb-36 pt-2 px-4 space-y-7 max-w-lg mx-auto">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <span className="text-xs font-black uppercase tracking-widest text-[#A7A7A7]">
            ANALYTIQUE & PERFORMANCE
          </span>
          <h2 className="text-2xl font-black text-white tracking-tight uppercase">
            Tableau de Progression
          </h2>
        </div>

        <button
          onClick={() => setEditingStatType('currentWeight')}
          className="px-3 py-1.5 rounded-full bg-[#181818] border border-white/10 hover:border-[#EC4899]/50 text-xs font-black text-white flex items-center gap-1.5 transition-all shadow-md"
        >
          <Edit3 className="w-3.5 h-3.5 text-[#EC4899]" />
          <span>Éditer Stats</span>
        </button>
      </div>

      {/* Metric Selector Tabs (Spotify Pill Style) */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 -mx-4 px-4">
        {[
          { id: 'force', label: 'Force 1RM' },
          { id: 'poids', label: 'Évolution Poids' },
          { id: 'composition', label: 'Composition' },
          { id: 'workouts', label: 'Entraînements' },
          { id: 'calories', label: 'Calories' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveMetric(tab.id as typeof activeMetric)}
            className={`px-4 py-2 rounded-full text-xs font-black tracking-wide uppercase whitespace-nowrap transition-all ${
              activeMetric === tab.id
                ? 'bg-gradient-to-r from-[#7C3AED] to-[#EC4899] text-white shadow-lg glow-main'
                : 'bg-[#181818] text-[#A7A7A7] hover:text-white border border-white/[0.08]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Dynamic Visual Chart Card (Image 1 customized) */}
      <div className={`p-5 rounded-card border space-y-4 shadow-xl transition-colors ${
        isLight ? 'bg-[#fff7f0] border-[#7d5a47]/20 text-[#3d2317]' : 'bg-[#181818] border-white/[0.08] text-white'
      }`}>
        <div className="flex items-center justify-between">
          <div>
            <span className={`text-2xs font-black uppercase tracking-widest ${
              isLight ? 'text-[#7d5a47]' : 'text-[#A7A7A7]'
            }`}>
              {activeMetric === 'force' && 'CHARGES MAXIMALES (1RM)'}
              {activeMetric === 'poids' && 'COURBE DE MASSE CORPORELLE'}
              {activeMetric === 'composition' && 'COMPOSITION CORPORELLE ESTIMÉE'}
              {activeMetric === 'workouts' && 'SÉANCES PAR SEMAINE (4 SEM.)'}
              {activeMetric === 'calories' && 'DÉPENSE PAR JOUR (7 J)'}
            </span>
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className={`text-2xl font-black num ${isLight ? 'text-[#3d2317]' : 'text-white'}`}>
                {activeMetric === 'force' && (avgProgress === null ? '—' : `${signed(avgProgress)}%`)}
                {activeMetric === 'poids' && `${userStats.currentWeightKg} KG`}
                {activeMetric === 'composition' && (compWeight ? `${compWeight} KG TOTAL` : '—')}
                {activeMetric === 'workouts' && `${visits} SÉANCE${visits > 1 ? 'S' : ''}`}
                {activeMetric === 'calories' && `${kcalTotal.toLocaleString('fr-FR')} KCAL`}
              </span>
              <span className={`text-xs font-bold ${activeMetric === 'force' && avgProgress !== null && avgProgress < 0 ? 'text-rose-400' : 'text-emerald-500'}`}>
                {activeMetric === 'force' &&
                  (avgProgress === null ? 'Ajoute un départ et un record pour mesurer ta progression' : 'Progression moyenne depuis le départ')}
                {activeMetric === 'poids' && `Cible: ${userStats.targetWeightKg} kg`}
                {activeMetric === 'composition' && (composition ? composition.formula || `Mesure du ${formatShortDate(composition.date)}` : 'Aucune mesure')}
                {activeMetric === 'workouts' && 'Total validé'}
                {activeMetric === 'calories' && `${kcalMonth.toLocaleString('fr-FR')} kcal en ${monthLabel}`}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activeMetric === 'force' && (
              <button
                type="button"
                id="btn-manage-1rm-exercises"
                onClick={() => setShow1RmModal(true)}
                className={`px-3 py-1.5 rounded-control text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm ${
                  isLight
                    ? 'bg-[#faebe0] hover:bg-[#f0ded0] text-[#b85d38] border border-[#b85d38]/25'
                    : 'bg-white/5 hover:bg-white/10 text-white border border-white/10 hover:border-[#EC4899]/50'
                }`}
                title="Choisir et modifier les exercices affichés"
              >
                <Edit3 className="w-3.5 h-3.5 text-[#EC4899]" />
                <span className="text-caption font-black uppercase num">Gérer ({maxCharges.length})</span>
              </button>
            )}
            <Activity className="w-5 h-5 text-[#EC4899]" />
          </div>
        </div>

        {/* Minimalist Chart Visualizer */}
        <div className="pt-2">
          {activeMetric === 'force' && (
            <div className="space-y-3">
              {maxCharges.length === 0 && (
                <p className={`text-xs py-3 text-center ${isLight ? 'text-[#7d5a47]' : 'text-[#A7A7A7]'}`}>
                  Aucun exercice affiché. Choisis tes exercices avec « Gérer ».
                </p>
              )}
              {maxCharges.map((ex) => {
                const cur = currentPR(ex);
                const target = ex.targetKg;
                const percent = cur === null ? 0 : target ? Math.min(100, Math.round((cur / target) * 100)) : 100;
                const item = { id: ex.id, label: ex.name, color: ex.color ?? '#EC4899' };
                return (
                  <div
                    key={item.id}
                    onClick={() => setShow1RmModal(true)}
                    className="space-y-1 group cursor-pointer"
                    title="Cliquer pour modifier cet exercice"
                  >
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className={`uppercase flex items-center gap-1.5 ${isLight ? 'text-[#3d2317]' : 'text-white'}`}>
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                        <span className="group-hover:text-[#EC4899] transition-colors">{item.label}</span>
                      </span>
                      <span className={`font-mono num ${isLight ? 'text-[#3d2317]' : 'text-white'}`}>
                        {cur === null ? '—' : `${cur} kg`}{' '}
                        <span className={`${isLight ? 'text-[#7d5a47]' : 'text-[#A7A7A7]'} font-normal`}>/ {target ? `${target} kg` : 'sans objectif'}</span>
                      </span>
                    </div>
                    <div className={`w-full h-2.5 rounded-full overflow-hidden p-0.5 ${
                      isLight ? 'bg-black/10' : 'bg-[#121212]'
                    }`}>
                      <div
                        className="h-full rounded-full transition-all duration-700 glow-main"
                        style={{
                          width: `${percent}%`,
                          background: `linear-gradient(90deg, #7C3AED, ${item.color})`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShow1RmModal(true)}
                  className={`text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    isLight ? 'text-[#b85d38] hover:underline' : 'text-[#EC4899] hover:underline'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Ajouter / modifier mes exercices 1RM →</span>
                </button>
              </div>
            </div>
          )}

          {activeMetric === 'poids' && (
            <div className="space-y-4">
              <PerformanceTrackerView theme={theme} />

              {onOpenBodyComposition && (
                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={onOpenBodyComposition}
                    className="text-xs font-bold text-[#00C6FF] hover:underline flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Scale className="w-3.5 h-3.5" />
                    <span>Calculer ma composition (Masse grasse, sèche, osseuse) →</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {activeMetric === 'composition' && (
            <div className="space-y-3.5">
              {!composition && (
                <div className="py-4 text-center space-y-1">
                  <p className="text-sm font-black text-white uppercase">Aucune composition mesurée</p>
                  <p className="text-xs text-[#A7A7A7]">Calcule ta masse grasse, musculaire et osseuse pour voir le détail ici.</p>
                </div>
              )}

              {/* Mini cards (Grasse, Musculaire, Osseuse, Organes, Eau) from the latest dated measurement */}
              {composition && (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
                <div className="p-3 rounded-card bg-[#121212] border border-[#EC4899]/30 flex flex-col items-center">
                  <span className="text-2xs font-bold text-[#EC4899] uppercase block line-clamp-1">Masse Grasse</span>
                  <span className="text-base font-black text-white font-mono num">
                    {typeof composition.fatPercent === 'number' ? `${fmt1(composition.fatPercent)}%` : '—'}
                  </span>
                  <span className="text-3xs text-[#A7A7A7] block mt-0.5 line-clamp-1">
                    {compParts.find((p) => p.key === 'fat') ? `${fmt1(compParts.find((p) => p.key === 'fat')!.kg)} kg` : '—'}
                  </span>
                </div>

                <div className="p-3 rounded-card bg-[#121212] border border-[#00C6FF]/30 flex flex-col items-center">
                  <span className="text-2xs font-bold text-[#00C6FF] uppercase block line-clamp-1">Masse Musculaire</span>
                  <span className="text-base font-black text-white font-mono num">{fmt1(composition.muscleMassKg)}</span>
                  <span className="text-3xs text-[#A7A7A7] block mt-0.5 line-clamp-1">KG contractile</span>
                </div>

                <div className="p-3 rounded-card bg-[#121212] border border-[#F59E0B]/30 flex flex-col items-center">
                  <span className="text-2xs font-bold text-[#F59E0B] uppercase block line-clamp-1">Masse Osseuse</span>
                  <span className="text-base font-black text-white font-mono num">{fmt1(composition.boneMassKg)}</span>
                  <span className="text-3xs text-[#A7A7A7] block mt-0.5 line-clamp-1">KG squelette</span>
                </div>

                <div className="p-3 rounded-card bg-[#121212] border border-[#3B82F6]/30 flex flex-col items-center">
                  <span className="text-2xs font-bold text-[#3B82F6] uppercase block line-clamp-1">Organes & Fluides</span>
                  <span className="text-base font-black text-white font-mono num">{fmt1(composition.organMassKg)}</span>
                  <span className="text-3xs text-[#A7A7A7] block mt-0.5 line-clamp-1">KG vitaux</span>
                </div>

                <div className="p-3 rounded-card bg-[#121212] border border-[#0088FF]/30 col-span-2 sm:col-span-1 flex flex-col items-center">
                  <span className="text-2xs font-bold text-[#0088FF] uppercase block line-clamp-1">Eau corporelle</span>
                  <span className="text-base font-black text-white font-mono num">{fmt1(composition.waterLiters)}</span>
                  <span className="text-3xs text-[#A7A7A7] block mt-0.5 line-clamp-1">Litres</span>
                </div>
              </div>
              )}

              {/* Cap Stratégique & Objectif Actif si défini */}
              {userStats.bodyComposition?.chosenGoal && (
                <div className="p-3 rounded-card bg-gradient-to-r from-[#181520] to-[#121212] border border-[#10B981]/30 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-3xs font-black uppercase px-2 py-0.5 rounded-full bg-[#10B981]/20 text-[#10B981]">
                        Cap : {userStats.bodyComposition.chosenGoal.type === 'seche' ? 'Sèche Ciblée' : userStats.bodyComposition.chosenGoal.type === 'prise_de_masse' ? 'Prise de Masse' : 'Recomposition'}
                      </span>
                      <span className="text-2xs text-[#A7A7A7] flex items-center gap-1">
                        {userStats.bodyComposition.chosenGoal.source === 'app_recommendation' ? (
                          <>
                            <Sparkles className="w-3 h-3 text-[#EC4899]" />
                            <span>Recommandation App</span>
                          </>
                        ) : (
                          <>
                            <Target className="w-3 h-3 text-[#00C6FF]" />
                            <span>Objectif Personnalisé</span>
                          </>
                        )}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-white">
                      Cible : {userStats.bodyComposition.chosenGoal.targetWeightKg} kg • Visée {userStats.bodyComposition.chosenGoal.targetFatPercent}% MG
                    </p>
                  </div>
                  <span className="text-xs font-black text-[#10B981] font-mono num">
                    {userStats.bodyComposition.chosenGoal.targetWeightKg - userStats.currentWeightKg > 0 ? `+${(userStats.bodyComposition.chosenGoal.targetWeightKg - userStats.currentWeightKg).toFixed(1)}` : (userStats.bodyComposition.chosenGoal.targetWeightKg - userStats.currentWeightKg).toFixed(1)} kg
                  </span>
                </div>
              )}

              {/* Composition Bar: real masses relative to body weight */}
              {composition && compParts.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <div className="h-3 rounded-full overflow-hidden flex bg-[#121212]">
                    {compParts.map((p) => {
                      const pct = (p.kg / compDenominator) * 100;
                      return <div key={p.key} style={{ width: `${pct}%` }} className={p.cls} title={`${p.label} ${fmt1(p.kg)} kg (${Math.round(pct)}%)`} />;
                    })}
                  </div>
                  <div className="flex justify-between flex-wrap gap-x-2 text-2xs text-[#A7A7A7]">
                    {compParts.map((p) => (
                      <span key={p.key} className="flex items-center gap-1">
                        <span className={`w-2 h-2 rounded-full ${p.cls}`} /> {p.label} {Math.round((p.kg / compDenominator) * 100)}%
                      </span>
                    ))}
                    {compWeight && partsSum < compWeight && (
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-white/10" /> Reste {Math.round(((compWeight - partsSum) / compWeight) * 100)}%
                      </span>
                    )}
                  </div>
                  {!compWeight && <p className="text-2xs text-[#737373]">Sans poids enregistré, les parts sont calculées sur la somme des masses.</p>}
                </div>
              )}

              {onOpenBodyComposition && (
                <button
                  type="button"
                  onClick={onOpenBodyComposition}
                  className="w-full py-2.5 rounded-control bg-gradient-to-r from-[#7C3AED] to-[#EC4899] text-xs font-black text-white uppercase tracking-wider hover:brightness-110 active:scale-[0.99] transition-all flex items-center justify-center gap-1.5 shadow-md"
                >
                  <Scale className="w-3.5 h-3.5" />
                  <span>Ouvrir le Calculateur Multi-Formules</span>
                </button>
              )}
            </div>
          )}

          {activeMetric === 'workouts' &&
            (weeks.every((w) => w.count === 0) ? (
              <div className="h-28 flex flex-col items-center justify-center text-center gap-1">
                <p className="text-sm font-black text-white uppercase">Aucune séance sur 4 semaines</p>
                <p className="text-xs text-[#A7A7A7]">Termine une séance ou coche un jour du planning pour la voir ici.</p>
              </div>
            ) : (
              <div className="h-28 flex items-end justify-between gap-3 pt-2">
                {weeks.map((pt) => (
                  <div key={pt.from} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                    <span className="text-xs font-black text-white num">{pt.count}</span>
                    <div
                      className="w-full rounded-t-lg bg-gradient-to-t from-[#7C3AED] to-[#EC4899] transition-all duration-500 glow-main"
                      style={{ height: `${pt.count === 0 ? 2 : Math.max(6, (pt.count / maxWeekCount) * 100)}%` }}
                    />
                    <span className="text-caption font-bold text-[#A7A7A7] whitespace-nowrap">{pt.label}</span>
                  </div>
                ))}
              </div>
            ))}

          {activeMetric === 'calories' &&
            (days.every((d) => d.kcal === 0) ? (
              <div className="h-28 flex flex-col items-center justify-center text-center gap-1">
                <p className="text-sm font-black text-white uppercase">Aucune calorie sur 7 jours</p>
                <p className="text-xs text-[#A7A7A7]">Les calories des séances terminées dans l’appli apparaîtront ici.</p>
              </div>
            ) : (
              <div className="h-28 flex items-end justify-between gap-2 pt-2">
                {days.map((pt) => (
                  <div key={pt.date} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                    <span className="text-2xs font-bold text-[#FF512F] num">{pt.kcal || ''}</span>
                    <div
                      className="w-full rounded-t-lg bg-gradient-to-t from-[#FF512F] to-[#DD2476] transition-all duration-500 glow-energy"
                      style={{ height: `${pt.kcal === 0 ? 2 : Math.max(6, (pt.kcal / maxDayKcal) * 100)}%` }}
                    />
                    <span className="text-caption font-bold text-[#A7A7A7] capitalize">{pt.label}</span>
                  </div>
                ))}
              </div>
            ))}

        </div>
      </div>

      {/* Biometrics & Body Composition Card Banner */}
      {onOpenBodyComposition && (
        <div className="p-4 sm:p-5 rounded-card bg-[#181818] border border-white/[0.08] flex items-center justify-between shadow-xl">
          <span className="text-sm font-black text-white uppercase tracking-tight">
            Composition Corporelle & Objectifs
          </span>

          <button
            type="button"
            onClick={onOpenBodyComposition}
            className="px-4 py-2 rounded-control bg-gradient-to-r from-[#7C3AED] to-[#EC4899] text-xs font-black text-white uppercase tracking-wide hover:brightness-110 active:scale-95 transition-all shadow-md shrink-0 ml-2 cursor-pointer"
          >
            Calculer
          </button>
        </div>
      )}

      {/* SECTION: TES RECORDS */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <h3 className="text-lg font-black text-white uppercase tracking-tight">
              TES RECORDS
            </h3>
          </div>
          <button
            id="btn-add-record"
            onClick={openNewRecord}
            className="text-xs font-black text-[#EC4899] uppercase hover:underline flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nouveau Record</span>
          </button>
        </div>

        {recordExercises.length === 0 && (
          <div className={`p-5 rounded-card border text-center space-y-1 ${isLight ? 'bg-[#fff7f0] border-[#7d5a47]/20' : 'bg-[#181818] border-white/[0.08]'}`}>
            <p className={`text-sm font-black uppercase ${isLight ? 'text-[#3d2317]' : 'text-white'}`}>Aucun record pour l’instant</p>
            <p className={`text-xs ${isLight ? 'text-[#7d5a47]' : 'text-[#A7A7A7]'}`}>Enregistre ta première charge avec « Nouveau record ».</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {recordExercises.map((ex) => {
            const cur = currentPR(ex);
            const start = startPR(ex);
            const gain = prGain(ex);
            const lastRecord = recordEntry(ex);

            return (
              <div
                key={ex.id}
                className={`p-4 rounded-card border transition-all space-y-3 relative overflow-hidden group shadow-lg flex flex-col h-full ${
                  isLight
                    ? 'bg-[#fff7f0] border-[#7d5a47]/20 hover:border-[#EC4899]/50 hover:bg-[#faebe0] shadow-sm'
                    : 'bg-[#181818] border-white/[0.08] hover:border-[#EC4899]/40 hover:bg-[#202020]'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-2xs font-black uppercase tracking-wider truncate ${
                    isLight ? 'text-[#7d5a47]' : 'text-[#A7A7A7]'
                  }`}>
                    {ex.category || (lastRecord ? `Record du ${formatShortDate(lastRecord.date)}` : 'Sans entrée')}
                  </span>
                  <span className={`text-caption font-bold font-mono num shrink-0 ${gain !== null && gain < 0 ? 'text-rose-400' : 'text-emerald-500'}`}>
                    {gain === null ? '—' : `${signed(gain)} kg de progression`}
                  </span>
                </div>

                <div
                  onClick={() => setSelectedExerciseId(ex.id)}
                  className="cursor-pointer space-y-1"
                >
                  <h4 className={`text-base font-black uppercase tracking-tight leading-tight group-hover:text-[#EC4899] transition-colors ${
                    isLight ? 'text-[#3d2317]' : 'text-white'
                  }`}>
                    {ex.name}
                  </h4>

                  <div className="flex items-baseline gap-2 pt-0.5 flex-wrap">
                    <span className={`text-3xl font-black tracking-tight font-mono num ${
                      isLight ? 'text-[#3d2317]' : 'text-white'
                    }`}>
                      {cur === null ? '—' : cur}
                    </span>
                    <span className="text-xs font-bold text-[#EC4899]">KG (RECORD ACTUEL)</span>
                  </div>
                  <span className={`text-2xs font-bold block ${isLight ? 'text-[#7d5a47]' : 'text-[#A7A7A7]'}`}>
                    {lastRecord
                      ? `Le ${formatShortDate(lastRecord.date)}${lastRecord.reps ? ` • ${lastRecord.reps} reps` : ''}`
                      : 'Aucune entrée datée'}
                  </span>
                </div>

                {/* Starting weight section with direct modifier button */}
                <div className={`mt-auto flex items-center justify-between pt-2 border-t text-xs ${
                  isLight ? 'border-[#7d5a47]/10' : 'border-white/5'
                }`}>
                  <div className="space-y-0.5">
                    <span className={`text-2xs uppercase font-bold block ${
                      isLight ? 'text-[#7d5a47]' : 'text-[#A7A7A7]'
                    }`}>
                      Poids de départ :
                    </span>
                    <span className={`text-sm font-black font-mono num ${
                      isLight ? 'text-[#3d2317]' : 'text-white'
                    }`}>
                      {start === null ? '—' : `${start} kg`}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openStartEditor(ex);
                      }}
                      className={`px-2.5 py-1 rounded-chip text-caption font-bold border flex items-center gap-1 transition-colors cursor-pointer ${
                        isLight
                          ? 'bg-[#faebe0] hover:bg-[#f0ded0] text-[#0088FF] border-[#7d5a47]/20'
                          : 'bg-white/5 hover:bg-white/15 text-[#00C6FF] border-white/10'
                      }`}
                      title="Changer le poids de départ pour cet exercice"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Modifier départ</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedExerciseId(ex.id)}
                      className={`p-1.5 rounded-chip transition-colors cursor-pointer ${
                        isLight
                          ? 'bg-[#faebe0] hover:bg-[#f0ded0] text-[#7d5a47] hover:text-[#3d2317]'
                          : 'bg-white/5 hover:bg-white/15 text-[#A7A7A7] hover:text-white'
                      }`}
                      title="Voir graphique et historique"
                    >
                      <TrendingUp className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

      </div>

      {/* SECTION: BADGES & GAMIFICATION (AVEC BADGES GRISÉS À DÉBLOQUER) */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-[#EC4899]" />
            <h3 className="text-lg font-black text-white uppercase tracking-tight">
              Badges & Succès
            </h3>
          </div>
          <span className="text-xs font-bold text-[#A7A7A7] num">
            {unlockedCount} / {badges.length} Débloqués
          </span>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setBadgeFilter('all')}
            className={`px-3 py-1.5 rounded-control text-xs font-black uppercase transition-all ${
              badgeFilter === 'all'
                ? 'bg-white text-black'
                : 'bg-[#181818] text-[#A7A7A7] hover:text-white'
            }`}
          >
            Tous ({badges.length})
          </button>
          <button
            onClick={() => setBadgeFilter('unlocked')}
            className={`px-3 py-1.5 rounded-control text-xs font-black uppercase transition-all ${
              badgeFilter === 'unlocked'
                ? 'bg-gradient-to-r from-[#7C3AED] to-[#EC4899] text-white shadow-md glow-main'
                : 'bg-[#181818] text-[#A7A7A7] hover:text-white'
            }`}
          >
            Débloqués ({unlockedCount})
          </button>
          <button
            onClick={() => setBadgeFilter('locked')}
            className={`px-3 py-1.5 rounded-control text-xs font-black uppercase transition-all flex items-center gap-1.5 ${
              badgeFilter === 'locked'
                ? 'bg-amber-500 text-black shadow-md'
                : 'bg-[#181818] text-[#A7A7A7] hover:text-white'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>À Débloquer ({lockedCount})</span>
          </button>
        </div>

        {/* Badges Grid */}
        <div className="grid grid-cols-2 gap-3">
          {filteredBadges.map((badge) => {
            const isLocked = badge.isLocked ?? false;
            const progressPercent = badge.progressTarget && badge.progressCurrent
              ? Math.min(100, Math.round((badge.progressCurrent / badge.progressTarget) * 100))
              : 0;

            return (
              <div
                key={badge.id}
                onClick={() => setSelectedBadgeForModal(badge)}
                className={`p-4 rounded-card border transition-all duration-200 cursor-pointer flex flex-col justify-between h-full min-h-[14rem] relative overflow-hidden group select-none active:scale-95 ${
                  isLocked
                    ? isLight
                      ? 'bg-[#f0dfd0] border-[#7d5a47]/20 hover:border-[#7d5a47]/40 shadow-sm'
                      : 'bg-[#141414] border-white/[0.06] hover:border-white/20'
                    : badge.isNew
                    ? isLight
                      ? 'bg-[#fff7f0] border-[#EC4899]/60 shadow-lg shadow-[#EC4899]/15'
                      : 'bg-[#181818] border-[#EC4899]/60 shadow-lg shadow-[#EC4899]/15'
                    : isLight
                    ? 'bg-[#fff7f0] border-[#7d5a47]/20 hover:border-[#EC4899]/40 shadow-sm'
                    : 'bg-[#181818] border-white/[0.08] hover:border-[#EC4899]/40'
                }`}
              >
                {/* 1. Header with tags, XP and Lock Icon (aligned together without overlap) */}
                <div className="flex items-center justify-between z-20 relative">
                  <div>
                    {badge.isNew && !isLocked && (
                      <span className="px-1.5 py-0.5 rounded bg-[#EC4899] text-black font-black text-3xs uppercase tracking-wider">
                        NOUVEAU
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className={`text-3xs font-bold num ${isLight ? 'text-[#7d5a47]' : 'text-[#A7A7A7]'}`}>
                      +{badge.rewardXp || 100} XP
                    </span>
                    {isLocked && (
                      <div className="w-5 h-5 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center shadow-sm shrink-0">
                        <Lock className="w-3 h-3 text-white stroke-[2.5]" />
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. Middle Content: Badge Emoji & Texts */}
                <div className="space-y-2 z-20 relative my-auto">
                  {/* Badge Emoji / Visual (Version précédente) */}
                  <div className={`w-12 h-12 rounded-control flex items-center justify-center text-2xl relative ${isLight ? 'bg-black/5 border border-black/5' : 'bg-white/5 border border-white/5'} transition-transform group-hover:scale-105 ${
                    isLocked ? 'grayscale opacity-60' : ''
                  }`}>
                    <span className="text-2xl filter drop-shadow select-none">{badge.emoji}</span>
                  </div>

                  <div>
                    <h4 className={`text-xs font-black uppercase tracking-tight leading-tight ${
                      isLocked
                        ? isLight ? 'text-[#7d5a47]' : 'text-white/80'
                        : isLight ? 'text-[#3d2317]' : 'text-white'
                    }`}>
                      {badge.title}
                    </h4>
                    {/* Humorous description ONLY when unlocked; How to unlock when locked */}
                    {isLocked ? (
                      <p className={`text-2xs ${isLight ? 'text-[#7d5a47]' : 'text-[#A7A7A7]'} line-clamp-3 mt-1 leading-snug`}>
                        <span className={`${isLight ? 'text-[#3d2317]' : 'text-white/90'} font-bold`}>Déblocage : </span>
                        {getBadgeUnlockRequirement(badge.id, badge.progressTarget, badge.progressUnit)}
                      </p>
                    ) : (
                      <p className={`text-2xs ${isLight ? 'text-[#7d5a47]' : 'text-[#A7A7A7]'} line-clamp-3 mt-1 leading-snug`}>
                        {badge.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* 3. Bottom Progress Bar: Fixed height container so all cards align perfectly */}
                <BadgeProgress
                  badge={badge}
                  isLocked={isLocked}
                  isLight={isLight}
                  progressPercent={progressPercent}
                  minHeightClass="min-h-[2rem]"
                />

                {/* 4. Subtle gray veil overlay: 100% card coverage without bottom gap */}
                {isLocked && (
                  <div className={`absolute inset-0 z-10 m-0 w-full h-full ${isLight ? 'bg-[#3d2317]/15' : 'bg-neutral-900/40'} backdrop-blur-[0.5px] rounded-card pointer-events-none`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal: Enregistrer un nouveau Record Personnel */}
      {showAddPrModal && (
        <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-150 ${
          isLight ? 'bg-[#3d2317]/65 backdrop-blur-xl' : 'bg-black/80 backdrop-blur-md'
        }`}>
          <div className={`w-full max-w-sm rounded-card p-5 space-y-4 shadow-2xl border transition-colors ${
            isLight ? 'bg-[#faebe0] border-[#7d5a47]/20 text-[#3d2317]' : 'bg-[#181818] border-white/10 text-white'
          }`}>
            <div className="space-y-1">
              <span className="text-2xs font-black uppercase tracking-widest text-[#EC4899]">
                NOUVEAU PR PERSONNEL
              </span>
              <h3 className={`text-xl font-black uppercase tracking-tight ${isLight ? 'text-[#3d2317]' : 'text-white'}`}>
                Enregistrer un record
              </h3>
              <p className={`text-caption ${isLight ? 'text-[#7d5a47]' : 'text-[#A7A7A7]'}`}>
                Entrée datée d’aujourd’hui (remplace celle du jour si elle existe déjà).
              </p>
            </div>

            <form onSubmit={handleSavePr} className="space-y-3">
              <div>
                <label className={`text-xs font-bold uppercase block mb-1 ${isLight ? 'text-[#7d5a47]' : 'text-[#A7A7A7]'}`}>
                  Mouvement
                </label>
                <select
                  value={newExerciseChoice}
                  onChange={(e) => {
                    setNewExerciseChoice(e.target.value);
                    setPrError(null);
                  }}
                  className={`w-full rounded-control px-3 py-2 text-sm border focus:outline-none focus:border-[#EC4899] ${
                    isLight ? 'bg-[#fff7f0] border-[#7d5a47]/20 text-[#3d2317]' : 'bg-[#121212] border-white/10 text-white'
                  }`}
                >
                  {data.exercises.map((ex) => {
                    const cur = currentPR(ex);
                    return (
                      <option key={ex.id} value={ex.id}>
                        {ex.name}{cur !== null ? ` (record ${cur} kg)` : ''}
                      </option>
                    );
                  })}
                  <option value={NEW_EXERCISE}>+ Nouvel exercice…</option>
                </select>
                {newExerciseChoice === NEW_EXERCISE && (
                  <input
                    type="text"
                    value={newExerciseName}
                    maxLength={60}
                    autoFocus
                    placeholder="Ex: Développé couché"
                    onChange={(e) => setNewExerciseName(e.target.value)}
                    className={`mt-2 w-full rounded-control px-3 py-2 text-sm border focus:outline-none focus:border-[#EC4899] ${
                      isLight ? 'bg-[#fff7f0] border-[#7d5a47]/20 text-[#3d2317]' : 'bg-[#121212] border-white/10 text-white'
                    }`}
                  />
                )}
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className={`text-xs font-bold uppercase block mb-1 ${isLight ? 'text-[#7d5a47]' : 'text-[#A7A7A7]'}`}>
                    Charge (KG)
                  </label>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.5"
                    min="0"
                    value={newWeight}
                    placeholder="0"
                    onChange={(e) => setNewWeight(e.target.value)}
                    className={`w-full rounded-control px-3 py-2 text-xl font-black font-mono num border focus:outline-none focus:border-[#EC4899] ${
                      isLight ? 'bg-[#fff7f0] border-[#7d5a47]/20 text-[#3d2317]' : 'bg-[#121212] border-white/10 text-white'
                    }`}
                  />
                </div>
                <div>
                  <label className={`text-xs font-bold uppercase block mb-1 ${isLight ? 'text-[#7d5a47]' : 'text-[#A7A7A7]'}`}>
                    Reps
                  </label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="1"
                    value={newReps}
                    placeholder="—"
                    onChange={(e) => setNewReps(e.target.value)}
                    className={`w-full rounded-control px-3 py-2 text-xl font-black font-mono num border focus:outline-none focus:border-[#EC4899] ${
                      isLight ? 'bg-[#fff7f0] border-[#7d5a47]/20 text-[#3d2317]' : 'bg-[#121212] border-white/10 text-white'
                    }`}
                  />
                </div>
              </div>

              {prError && <p className="text-xs font-bold text-rose-400">{prError}</p>}

              <div className="flex items-center gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddPrModal(false)}
                  className={`flex-1 py-2.5 rounded-control text-xs font-bold uppercase transition-colors border ${
                    isLight
                      ? 'bg-[#f0ded0] text-[#7d5a47] hover:text-[#3d2317] hover:bg-[#fff3ea] border-[#7d5a47]/20'
                      : 'bg-[#202020] text-[#A7A7A7] hover:text-white border-transparent'
                  }`}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-control bg-gradient-to-r from-[#7C3AED] to-[#EC4899] text-xs font-black text-white uppercase glow-main"
                >
                  Valider
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Modifier stats */}
      {editingStatType && onUpdateUserStats && (
        <EditStatModal
          initialType={editingStatType}
          userStats={userStats}
          onClose={() => setEditingStatType(null)}
          onSave={onUpdateUserStats}
          onOpenBodyComposition={onOpenBodyComposition}
          theme={theme}
        />
      )}

      {/* Modal: Analyse & Modification d'un exercice (historique daté) */}
      {selectedExerciseId && (
        <Suspense fallback={null}>
          <PRProgressionModal exerciseId={selectedExerciseId} onClose={() => setSelectedExerciseId(null)} theme={theme} />
        </Suspense>
      )}

      {/* Modal: Détail d'un badge */}
      {selectedBadgeForModal && (
        <BadgeDetailModal
          badge={selectedBadgeForModal}
          onClose={() => setSelectedBadgeForModal(null)}
          onUnlockBadge={onUnlockBadge}
          theme={theme}
        />
      )}

      {/* Modal: Modifier Poids de Départ d'un Exercice */}
      {editingStartExercise && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200 ${
            isLight ? 'bg-[#3d2317]/65 backdrop-blur-xl' : 'bg-black/85 backdrop-blur-sm'
          }`}
          onClick={() => setEditingStartExerciseId(null)}
        >
          <div
            className={`w-full max-w-sm rounded-sheet p-5 space-y-4 shadow-2xl border transition-colors ${
              isLight ? 'bg-[#faebe0] border-[#7d5a47]/20 text-[#3d2317]' : 'bg-[#161616] border-white/15 text-white'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`flex items-center justify-between border-b pb-3 ${
              isLight ? 'border-[#7d5a47]/15' : 'border-white/10'
            }`}>
              <div>
                <span className="text-2xs font-black uppercase text-[#00C6FF] tracking-wider block">
                  PROGRESSION
                </span>
                <h3 className={`text-sm font-black uppercase ${isLight ? 'text-[#3d2317]' : 'text-white'}`}>
                  Poids de départ : {editingStartExercise.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingStartExerciseId(null)}
                className={`p-1 rounded-full ${isLight ? 'text-[#7d5a47] hover:text-[#3d2317]' : 'text-[#A7A7A7] hover:text-white'}`}
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-[#A7A7A7]">
              Indique la charge avec laquelle tu as débuté cet exercice pour calculer ton gain réel de force.
              {startFirstEntry && ` Sans saisie, le départ est ta 1re entrée (${startFirstEntry.weightKg} kg le ${formatShortDate(startFirstEntry.date)}).`}
            </p>

            <div className="space-y-1.5 py-1">
              <label className="text-caption font-bold text-[#A7A7A7] uppercase block">
                Poids initial / de départ (KG)
              </label>
              <div className="relative">
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  max={LIMITS.loadKg[1]}
                  step="0.5"
                  value={inputStartWeight}
                  onChange={(e) => {
                    setInputStartWeight(e.target.value);
                    setStartError(null);
                  }}
                  className="w-full bg-[#0D0D0D] border-2 border-white/20 focus:border-[#0088FF] rounded-card py-3 px-4 text-2xl font-black font-mono num text-white text-center focus:outline-none"
                  autoFocus
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-[#0088FF]">
                  KG
                </span>
              </div>
              {startError && <p className="text-xs font-bold text-rose-400">{startError}</p>}
            </div>

            <div className="p-3 rounded-control bg-[#202020] border border-white/5 space-y-1 text-xs">
              <div className="flex justify-between text-[#A7A7A7]">
                <span>Record actuel :</span>
                <span className="text-white font-bold">{startCur === null ? '—' : `${startCur} kg`}</span>
              </div>
              <div className="flex justify-between text-[#A7A7A7]">
                <span>Gain de progression :</span>
                <span className={`font-bold font-mono num ${startPreviewGain !== null && startPreviewGain < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {startPreviewGain === null ? '—' : `${signed(startPreviewGain)} kg`}
                </span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              {typeof editingStartExercise.startKg === 'number' && startFirstEntry && (
                <button
                  type="button"
                  onClick={() => {
                    updateExercise(editingStartExercise.id, { startKg: undefined });
                    setEditingStartExerciseId(null);
                  }}
                  className="px-3 py-2.5 rounded-control bg-white/5 hover:bg-white/10 text-caption font-bold text-[#A7A7A7] hover:text-white transition-colors"
                  title="Revenir à la première entrée de l'historique"
                >
                  1re entrée
                </button>
              )}
              <button
                type="button"
                onClick={() => setEditingStartExerciseId(null)}
                className="flex-1 py-2.5 rounded-control bg-white/5 hover:bg-white/10 text-xs font-bold text-white transition-colors"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleSaveStart}
                className="flex-1 py-2.5 rounded-control bg-[#0088FF] hover:bg-[#0070DD] text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-[#0088FF]/30 transition-all cursor-pointer"
              >
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Gérer et personnaliser les charges maximales (1RM) */}
      {show1RmModal && <Manage1RmModal onClose={() => setShow1RmModal(false)} theme={theme} />}
    </div>
  );
};
