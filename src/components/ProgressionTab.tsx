import React, { Suspense, lazy, useState } from 'react';
import { Trophy, Plus, Award, Activity, Lock, Edit3, Sparkles, Scale, TrendingUp, Target } from 'lucide-react';
import { UserStats, AchievementBadge, PersonalRecord, MeasurementEntry } from '../types';
import { audioSynth } from '../utils/audioSynth';
import confetti from 'canvas-confetti';
import { EditStatModal, EditableStatType } from './EditStatModal';
import { PerformanceTrackerView } from './PerformanceTrackerView';
import { BadgeDetailModal } from './BadgeDetailModal';
import { getBadgeUnlockRequirement } from './BadgeIcon';
import { BadgeProgress } from './BadgeProgress';
import { Manage1RmModal, MaxChargeExercise, DEFAULT_1RM_EXERCISES } from './Manage1RmModal';

// Opened on demand only: separate chunk
const PRProgressionModal = lazy(() => import('./PRProgressionModal').then((m) => ({ default: m.PRProgressionModal })));
import { loadJSON, saveJSON } from '../utils/storage';

interface ProgressionTabProps {
  userStats: UserStats;
  personalRecords: PersonalRecord[];
  badges: AchievementBadge[];
  measurements?: MeasurementEntry[];
  onLogNewRecord: (record: { exercise: string; weightKg: number }) => void;
  onUpdatePR?: (updated: PersonalRecord) => void;
  onDeletePR?: (id: string) => void;
  onUpdateUserStats?: (updated: Partial<UserStats>) => void;
  onUnlockBadge?: (badgeId: string) => void;
  onOpenBodyComposition?: () => void;
  onAddMeasurement?: (entry: Omit<MeasurementEntry, 'id'>) => void;
  onDeleteMeasurement?: (id: string) => void;
  theme?: 'dark' | 'warm-light';
}

export const ProgressionTab: React.FC<ProgressionTabProps> = ({
  userStats,
  personalRecords,
  badges,
  measurements = [],
  onLogNewRecord,
  onUpdatePR,
  onDeletePR,
  onUpdateUserStats,
  onUnlockBadge,
  onOpenBodyComposition,
  onAddMeasurement = () => {},
  onDeleteMeasurement = () => {},
  theme,
}) => {
  const isLight = theme === 'warm-light';
  const [activeMetric, setActiveMetric] = useState<'force' | 'poids' | 'composition' | 'workouts' | 'calories'>('force');
  const [showAddPrModal, setShowAddPrModal] = useState(false);
  const [selectedBadgeForModal, setSelectedBadgeForModal] = useState<AchievementBadge | null>(null);
  const [selectedPrForModal, setSelectedPrForModal] = useState<PersonalRecord | null>(null);
  const [editingStatType, setEditingStatType] = useState<EditableStatType | null>(null);
  const [editingStartWeightPr, setEditingStartWeightPr] = useState<PersonalRecord | null>(null);
  const [inputStartWeight, setInputStartWeight] = useState<number>(0);

  // Badge filter tab: 'all' | 'unlocked' | 'locked'
  const [badgeFilter, setBadgeFilter] = useState<'all' | 'unlocked' | 'locked'>('all');

  const [newExerciseName, setNewExerciseName] = useState('Développé couché');
  const [newWeight, setNewWeight] = useState(110);

  // Custom 1RM Max Charges exercises persisted in localStorage (Image 1 request)
  const [maxChargesExercises, setMaxChargesExercises] = useState<MaxChargeExercise[]>(() => loadJSON('volt_1rm_exercises', DEFAULT_1RM_EXERCISES));
  const [show1RmModal, setShow1RmModal] = useState(false);

  const handleSave1RmExercises = (updated: MaxChargeExercise[]) => {
    setMaxChargesExercises(updated);
    saveJSON('volt_1rm_exercises', updated);
  };

  const workoutsData = [
    { label: 'Sem 1', val: 4 },
    { label: 'Sem 2', val: 5 },
    { label: 'Sem 3', val: 4 },
    { label: 'Sem 4', val: userStats.weeklyCompletedWorkouts || 4 },
  ];

  const caloriesData = [
    { label: 'Lun', val: 580 },
    { label: 'Mar', val: 690 },
    { label: 'Mer', val: 540 },
    { label: 'Jeu', val: 620 },
    { label: 'Ven', val: 510 },
  ];

  const handleSavePr = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExerciseName || newWeight <= 0) return;

    audioSynth.playCelebrationSound();
    try {
      confetti({
        particleCount: 60,
        spread: 60,
        origin: { y: 0.5 },
        colors: ['#EC4899', '#7C3AED', '#00C6FF'],
      });
    } catch {
      // Ignore
    }

    onLogNewRecord({
      exercise: newExerciseName,
      weightKg: newWeight,
    });
    setShowAddPrModal(false);
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
      <div className={`p-5 rounded-2xl border space-y-4 shadow-xl transition-colors ${
        isLight ? 'bg-[#fff7f0] border-[#7d5a47]/20 text-[#3d2317]' : 'bg-[#181818] border-white/[0.08] text-white'
      }`}>
        <div className="flex items-center justify-between">
          <div>
            <span className={`text-[10px] font-black uppercase tracking-widest ${
              isLight ? 'text-[#7d5a47]' : 'text-[#A7A7A7]'
            }`}>
              {activeMetric === 'force' && 'CHARGES MAXIMALES (1RM)'}
              {activeMetric === 'poids' && 'COURBE DE MASSE CORPORELLE'}
              {activeMetric === 'composition' && 'COMPOSITION CORPORELLE ESTIMÉE'}
              {activeMetric === 'workouts' && 'FRÉQUENCE MENSUELLE'}
              {activeMetric === 'calories' && 'DÉPENSE PAR SÉANCE'}
            </span>
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl font-black ${isLight ? 'text-[#3d2317]' : 'text-white'}`}>
                {activeMetric === 'force' && '+12.5%'}
                {activeMetric === 'poids' && `${userStats.currentWeightKg} KG`}
                {activeMetric === 'composition' && `${userStats.currentWeightKg} KG TOTAL`}
                {activeMetric === 'workouts' && `${userStats.totalWorkouts} SÉANCES`}
                {activeMetric === 'calories' && `${userStats.totalCaloriesBurned.toLocaleString('fr-FR')} KCAL`}
              </span>
              <span className="text-xs font-bold text-emerald-500">
                {activeMetric === 'force' && 'En progression constante'}
                {activeMetric === 'poids' && `Cible: ${userStats.targetWeightKg} kg`}
                {activeMetric === 'composition' && 'US Navy & Boer'}
                {activeMetric === 'workouts' && 'Total validé'}
                {activeMetric === 'calories' && 'Ce mois-ci'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activeMetric === 'force' && (
              <button
                type="button"
                id="btn-manage-1rm-exercises"
                onClick={() => setShow1RmModal(true)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm ${
                  isLight
                    ? 'bg-[#faebe0] hover:bg-[#f0ded0] text-[#b85d38] border border-[#b85d38]/25'
                    : 'bg-white/5 hover:bg-white/10 text-white border border-white/10 hover:border-[#EC4899]/50'
                }`}
                title="Choisir et modifier les exercices affichés"
              >
                <Edit3 className="w-3.5 h-3.5 text-[#EC4899]" />
                <span className="text-[11px] font-black uppercase">Gérer ({maxChargesExercises.length})</span>
              </button>
            )}
            <Activity className="w-5 h-5 text-[#EC4899]" />
          </div>
        </div>

        {/* Minimalist Chart Visualizer */}
        <div className="pt-2">
          {activeMetric === 'force' && (
            <div className="space-y-3">
              {maxChargesExercises.map((item) => {
                const percent = Math.min(100, Math.round((item.val / item.target) * 100));
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
                      <span className={`font-mono ${isLight ? 'text-[#3d2317]' : 'text-white'}`}>
                        {item.val} kg <span className={`${isLight ? 'text-[#7d5a47]' : 'text-[#A7A7A7]'} font-normal`}>/ {item.target} kg</span>
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
              <PerformanceTrackerView
                measurements={measurements}
                onAddMeasurement={onAddMeasurement}
                onDeleteMeasurement={onDeleteMeasurement}
                currentWeightKg={userStats.currentWeightKg}
                theme={theme}
              />

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
              {/* 4 mini cards (Grasse, Musculaire, Osseuse, Organes) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                <div className="p-2.5 rounded-xl bg-[#121212] border border-[#EC4899]/30">
                  <span className="text-[10px] font-bold text-[#EC4899] uppercase block">Masse Grasse</span>
                  <span className="text-base font-black text-white font-mono">
                    {userStats.bodyComposition ? `${userStats.bodyComposition.fatPercent}%` : '~15.2%'}
                  </span>
                  <span className="text-[9px] text-[#A7A7A7] block mt-0.5">
                    {userStats.bodyComposition ? `${userStats.bodyComposition.fatKg} kg` : `~${Math.round(userStats.currentWeightKg * 0.152)} kg`}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-[#121212] border border-[#00C6FF]/30">
                  <span className="text-[10px] font-bold text-[#00C6FF] uppercase block">Masse Musculaire</span>
                  <span className="text-base font-black text-white font-mono">
                    {userStats.bodyComposition ? `${userStats.bodyComposition.muscleMassKg}` : `~${Math.round(userStats.currentWeightKg * 0.52)}`}
                  </span>
                  <span className="text-[9px] text-[#A7A7A7] block mt-0.5">KG contractile</span>
                </div>

                <div className="p-2.5 rounded-xl bg-[#121212] border border-[#F59E0B]/30">
                  <span className="text-[10px] font-bold text-[#F59E0B] uppercase block">Masse Osseuse</span>
                  <span className="text-base font-black text-white font-mono">
                    {userStats.bodyComposition ? `${userStats.bodyComposition.boneMassKg}` : '~3.8'}
                  </span>
                  <span className="text-[9px] text-[#A7A7A7] block mt-0.5">KG squelette</span>
                </div>

                <div className="p-2.5 rounded-xl bg-[#121212] border border-[#3B82F6]/30">
                  <span className="text-[10px] font-bold text-[#3B82F6] uppercase block">Organes & Fluides</span>
                  <span className="text-base font-black text-white font-mono">
                    {userStats.bodyComposition ? `${userStats.bodyComposition.organMassKg || 18.2}` : '~18.2'}
                  </span>
                  <span className="text-[9px] text-[#A7A7A7] block mt-0.5">KG vitaux</span>
                </div>
              </div>

              {/* Cap Stratégique & Objectif Actif si défini */}
              {userStats.bodyComposition?.chosenGoal && (
                <div className="p-3 rounded-xl bg-gradient-to-r from-[#181520] to-[#121212] border border-[#10B981]/30 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-[#10B981]/20 text-[#10B981]">
                        Cap : {userStats.bodyComposition.chosenGoal.type === 'seche' ? 'Sèche Ciblée' : userStats.bodyComposition.chosenGoal.type === 'prise_de_masse' ? 'Prise de Masse' : 'Recomposition'}
                      </span>
                      <span className="text-[10px] text-[#A7A7A7] flex items-center gap-1">
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
                  <span className="text-xs font-black text-[#10B981] font-mono">
                    {userStats.bodyComposition.chosenGoal.targetWeightKg - userStats.currentWeightKg > 0 ? `+${(userStats.bodyComposition.chosenGoal.targetWeightKg - userStats.currentWeightKg).toFixed(1)}` : (userStats.bodyComposition.chosenGoal.targetWeightKg - userStats.currentWeightKg).toFixed(1)} kg
                  </span>
                </div>
              )}

              {/* Composition Bar */}
              <div className="space-y-1.5 pt-1">
                <div className="h-3 rounded-full overflow-hidden flex bg-[#121212]">
                  <div style={{ width: '16%' }} className="bg-[#EC4899]" title="Gras ~16%" />
                  <div style={{ width: '60%' }} className="bg-[#00C6FF]" title="Muscle ~60%" />
                  <div style={{ width: '5%' }} className="bg-[#F59E0B]" title="Os ~5%" />
                  <div style={{ width: '19%' }} className="bg-[#3B82F6]/60" title="Eau/Organes" />
                </div>
                <div className="flex justify-between text-[10px] text-[#A7A7A7]">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#EC4899]" /> Gras</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#00C6FF]" /> Muscle</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#F59E0B]" /> Os</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#3B82F6]" /> Eau</span>
                </div>
              </div>

              {onOpenBodyComposition && (
                <button
                  type="button"
                  onClick={onOpenBodyComposition}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#EC4899] text-xs font-black text-white uppercase tracking-wider hover:brightness-110 active:scale-[0.99] transition-all flex items-center justify-center gap-1.5 shadow-md"
                >
                  <Scale className="w-3.5 h-3.5" />
                  <span>Ouvrir le Calculateur Multi-Formules</span>
                </button>
              )}
            </div>
          )}

          {activeMetric === 'workouts' && (
            <div className="h-28 flex items-end justify-between gap-3 pt-2">
              {workoutsData.map((pt, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                  <span className="text-xs font-black text-white">{pt.val}</span>
                  <div
                    className="w-full rounded-t-lg bg-gradient-to-t from-[#7C3AED] to-[#EC4899] transition-all duration-500 glow-main"
                    style={{ height: `${Math.min(100, (pt.val / 6) * 100)}%` }}
                  />
                  <span className="text-[11px] font-bold text-[#A7A7A7]">{pt.label}</span>
                </div>
              ))}
            </div>
          )}

          {activeMetric === 'calories' && (
            <div className="h-28 flex items-end justify-between gap-3 pt-2">
              {caloriesData.map((pt, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                  <span className="text-[10px] font-bold text-[#FF512F]">{pt.val}</span>
                  <div
                    className="w-full rounded-t-lg bg-gradient-to-t from-[#FF512F] to-[#DD2476] transition-all duration-500 glow-energy"
                    style={{ height: `${(pt.val / 750) * 100}%` }}
                  />
                  <span className="text-[11px] font-bold text-[#A7A7A7]">{pt.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Biometrics & Body Composition Card Banner */}
      {onOpenBodyComposition && (
        <div className="p-4 sm:p-5 rounded-2xl bg-[#181818] border border-white/[0.08] flex items-center justify-between shadow-xl">
          <span className="text-sm font-black text-white uppercase tracking-tight">
            Composition Corporelle & Objectifs
          </span>

          <button
            type="button"
            onClick={onOpenBodyComposition}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#EC4899] text-xs font-black text-white uppercase tracking-wide hover:brightness-110 active:scale-95 transition-all shadow-md shrink-0 ml-2 cursor-pointer"
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
            onClick={() => setShowAddPrModal(true)}
            className="text-xs font-black text-[#EC4899] uppercase hover:underline flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nouveau Record</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {personalRecords.map((pr) => {
            const startWeight = pr.previousWeightKg || 0;
            const gain = pr.weightKg - startWeight;

            return (
              <div
                key={pr.id}
                className={`p-4 rounded-2xl border transition-all space-y-3 relative overflow-hidden group shadow-lg ${
                  isLight
                    ? 'bg-[#fff7f0] border-[#7d5a47]/20 hover:border-[#EC4899]/50 hover:bg-[#faebe0] shadow-sm'
                    : 'bg-[#181818] border-white/[0.08] hover:border-[#EC4899]/40 hover:bg-[#202020]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-black uppercase tracking-wider ${
                    isLight ? 'text-[#7d5a47]' : 'text-[#A7A7A7]'
                  }`}>
                    {pr.category}
                  </span>
                  <span className="text-[11px] text-emerald-500 font-bold font-mono">
                    {gain >= 0 ? `+${gain}` : gain} kg de progression
                  </span>
                </div>

                <div 
                  onClick={() => setSelectedPrForModal(pr)}
                  className="cursor-pointer space-y-1"
                >
                  <h4 className={`text-base font-black uppercase tracking-tight leading-tight group-hover:text-[#EC4899] transition-colors ${
                    isLight ? 'text-[#3d2317]' : 'text-white'
                  }`}>
                    {pr.exercise}
                  </h4>

                  <div className="flex items-baseline gap-2 pt-0.5">
                    <span className={`text-3xl font-black tracking-tight font-mono ${
                      isLight ? 'text-[#3d2317]' : 'text-white'
                    }`}>
                      {pr.weightKg}
                    </span>
                    <span className="text-xs font-bold text-[#EC4899]">KG (RECORD ACTUEL)</span>
                  </div>
                </div>

                {/* Starting weight section with direct modifier button */}
                <div className={`flex items-center justify-between pt-2 border-t text-xs ${
                  isLight ? 'border-[#7d5a47]/10' : 'border-white/5'
                }`}>
                  <div className="space-y-0.5">
                    <span className={`text-[10px] uppercase font-bold block ${
                      isLight ? 'text-[#7d5a47]' : 'text-[#A7A7A7]'
                    }`}>
                      Poids de départ :
                    </span>
                    <span className={`text-sm font-black font-mono ${
                      isLight ? 'text-[#3d2317]' : 'text-white'
                    }`}>
                      {startWeight} kg
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingStartWeightPr(pr);
                        setInputStartWeight(startWeight);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border flex items-center gap-1 transition-colors cursor-pointer ${
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
                      onClick={() => setSelectedPrForModal(pr)}
                      className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
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
          <span className="text-xs font-bold text-[#A7A7A7]">
            {unlockedCount} / {badges.length} Débloqués
          </span>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setBadgeFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase transition-all ${
              badgeFilter === 'all'
                ? 'bg-white text-black'
                : 'bg-[#181818] text-[#A7A7A7] hover:text-white'
            }`}
          >
            Tous ({badges.length})
          </button>
          <button
            onClick={() => setBadgeFilter('unlocked')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase transition-all ${
              badgeFilter === 'unlocked'
                ? 'bg-gradient-to-r from-[#7C3AED] to-[#EC4899] text-white shadow-md glow-main'
                : 'bg-[#181818] text-[#A7A7A7] hover:text-white'
            }`}
          >
            Débloqués ({unlockedCount})
          </button>
          <button
            onClick={() => setBadgeFilter('locked')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase transition-all flex items-center gap-1.5 ${
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
                className={`p-4 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between h-full min-h-[14rem] relative overflow-hidden group select-none active:scale-95 ${
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
                      <span className="px-1.5 py-0.5 rounded bg-[#EC4899] text-black font-black text-[9px] uppercase tracking-wider">
                        NOUVEAU
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className={`text-[9px] font-bold ${isLight ? 'text-[#7d5a47]' : 'text-[#A7A7A7]'}`}>
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
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl relative ${isLight ? 'bg-black/5 border border-black/5' : 'bg-white/5 border border-white/5'} transition-transform group-hover:scale-105 ${
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
                      <p className={`text-[10px] ${isLight ? 'text-[#7d5a47]' : 'text-[#A7A7A7]'} line-clamp-3 mt-1 leading-snug`}>
                        <span className={`${isLight ? 'text-[#3d2317]' : 'text-white/90'} font-bold`}>Déblocage : </span>
                        {getBadgeUnlockRequirement(badge.id, badge.progressTarget, badge.progressUnit)}
                      </p>
                    ) : (
                      <p className={`text-[10px] ${isLight ? 'text-[#7d5a47]' : 'text-[#A7A7A7]'} line-clamp-3 mt-1 leading-snug`}>
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
                  <div className={`absolute inset-0 z-10 m-0 w-full h-full ${isLight ? 'bg-[#3d2317]/15' : 'bg-neutral-900/40'} backdrop-blur-[0.5px] rounded-2xl pointer-events-none`} />
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
          <div className={`w-full max-w-sm rounded-2xl p-5 space-y-4 shadow-2xl border transition-colors ${
            isLight ? 'bg-[#faebe0] border-[#7d5a47]/20 text-[#3d2317]' : 'bg-[#181818] border-white/10 text-white'
          }`}>
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#EC4899]">
                NOUVEAU PR PERSONNEL
              </span>
              <h3 className={`text-xl font-black uppercase tracking-tight ${isLight ? 'text-[#3d2317]' : 'text-white'}`}>
                Enregistrer un record
              </h3>
            </div>

            <form onSubmit={handleSavePr} className="space-y-3">
              <div>
                <label className={`text-xs font-bold uppercase block mb-1 ${isLight ? 'text-[#7d5a47]' : 'text-[#A7A7A7]'}`}>
                  Mouvement
                </label>
                <input
                  type="text"
                  value={newExerciseName}
                  onChange={(e) => setNewExerciseName(e.target.value)}
                  className={`w-full rounded-xl px-3 py-2 text-sm border focus:outline-none focus:border-[#EC4899] ${
                    isLight ? 'bg-[#fff7f0] border-[#7d5a47]/20 text-[#3d2317]' : 'bg-[#121212] border-white/10 text-white'
                  }`}
                />
              </div>

              <div>
                <label className={`text-xs font-bold uppercase block mb-1 ${isLight ? 'text-[#7d5a47]' : 'text-[#A7A7A7]'}`}>
                  Charge maximale (KG)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.5"
                    value={newWeight}
                    onChange={(e) => setNewWeight(parseFloat(e.target.value) || 0)}
                    className={`flex-1 rounded-xl px-3 py-2 text-xl font-black font-mono border focus:outline-none focus:border-[#EC4899] ${
                      isLight ? 'bg-[#fff7f0] border-[#7d5a47]/20 text-[#3d2317]' : 'bg-[#121212] border-white/10 text-white'
                    }`}
                  />
                  <span className={`text-sm font-bold ${isLight ? 'text-[#7d5a47]' : 'text-[#A7A7A7]'}`}>KG</span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddPrModal(false)}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold uppercase transition-colors border ${
                    isLight
                      ? 'bg-[#f0ded0] text-[#7d5a47] hover:text-[#3d2317] hover:bg-[#fff3ea] border-[#7d5a47]/20'
                      : 'bg-[#202020] text-[#A7A7A7] hover:text-white border-transparent'
                  }`}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#EC4899] text-xs font-black text-white uppercase glow-main"
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

      {/* Modal: Analyse & Modification du PR avec Graphique de Progression */}
      {selectedPrForModal && (
        <Suspense fallback={null}>
          <PRProgressionModal
            initialPr={selectedPrForModal}
            allPrs={personalRecords}
            onUpdatePR={(updated) => {
              onUpdatePR?.(updated);
              setSelectedPrForModal(null);
            }}
            onDeletePR={(id) => {
              onDeletePR?.(id);
              setSelectedPrForModal(null);
            }}
            onClose={() => setSelectedPrForModal(null)}
            theme={theme}
          />
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
      {editingStartWeightPr && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200 ${
            isLight ? 'bg-[#3d2317]/65 backdrop-blur-xl' : 'bg-black/85 backdrop-blur-sm'
          }`}
          onClick={() => setEditingStartWeightPr(null)}
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
              <div>
                <span className="text-[10px] font-black uppercase text-[#00C6FF] tracking-wider block">
                  PROGRESSION
                </span>
                <h3 className={`text-sm font-black uppercase ${isLight ? 'text-[#3d2317]' : 'text-white'}`}>
                  Poids de départ : {editingStartWeightPr.exercise}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingStartWeightPr(null)}
                className={`p-1 rounded-full ${isLight ? 'text-[#7d5a47] hover:text-[#3d2317]' : 'text-[#A7A7A7] hover:text-white'}`}
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-[#A7A7A7]">
              Indique la charge avec laquelle tu as débuté cet exercice pour calculer ton gain réel de force.
            </p>

            <div className="space-y-1.5 py-1">
              <label className="text-[11px] font-bold text-[#A7A7A7] uppercase block">
                Poids initial / de départ (KG)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="500"
                  step="0.5"
                  value={inputStartWeight}
                  onChange={(e) => setInputStartWeight(parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#0D0D0D] border-2 border-white/20 focus:border-[#0088FF] rounded-2xl py-3 px-4 text-2xl font-black font-mono text-white text-center focus:outline-none"
                  autoFocus
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-[#0088FF]">
                  KG
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#202020] border border-white/5 space-y-1 text-xs">
              <div className="flex justify-between text-[#A7A7A7]">
                <span>Record actuel :</span>
                <span className="text-white font-bold">{editingStartWeightPr.weightKg} kg</span>
              </div>
              <div className="flex justify-between text-[#A7A7A7]">
                <span>Gain de progression :</span>
                <span className="text-emerald-400 font-bold font-mono">
                  {editingStartWeightPr.weightKg - inputStartWeight >= 0 
                    ? `+${editingStartWeightPr.weightKg - inputStartWeight} kg` 
                    : `${editingStartWeightPr.weightKg - inputStartWeight} kg`}
                </span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingStartWeightPr(null)}
                className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-white transition-colors"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onUpdatePR && editingStartWeightPr) {
                    onUpdatePR({
                      ...editingStartWeightPr,
                      previousWeightKg: inputStartWeight,
                    });
                  }
                  setEditingStartWeightPr(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-[#0088FF] hover:bg-[#0070DD] text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-[#0088FF]/30 transition-all cursor-pointer"
              >
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Gérer et personnaliser les charges maximales (1RM) (Image 1) */}
      {show1RmModal && (
        <Manage1RmModal
          initialExercises={maxChargesExercises}
          onSave={handleSave1RmExercises}
          onClose={() => setShow1RmModal(false)}
          theme={theme}
        />
      )}
    </div>
  );
};
