import React, { useState, useMemo } from 'react';
import { Play, Flame, ArrowRight, Zap, Target, Dumbbell, Clock, Edit3, Lock, Award, Scale } from 'lucide-react';
import { Workout, UserStats, AchievementBadge, ScheduledDay } from '../types';
import { EditStatModal, EditableStatType } from './EditStatModal';
import { BadgeDetailModal } from './BadgeDetailModal';
import { getBadgeUnlockRequirement } from './BadgeIcon';
import { BadgeProgress } from './BadgeProgress';
import { RotationModal } from './RotationModal';
import { getRotationOrder, loadRotation, recommendWorkout, saveRotation } from '../utils/recommendation';

interface HomeTabProps {
  userStats: UserStats;
  workouts: Workout[];
  badges: AchievementBadge[];
  schedule: ScheduledDay[];
  onSelectWorkout: (workout: Workout) => void;
  onStartWorkout: (workout: Workout) => void;
  onNavigateToTab: (tab: 'workouts' | 'progress' | 'planning') => void;
  onUpdateUserStats: (updated: Partial<UserStats>) => void;
  onUnlockBadge?: (badgeId: string) => void;
  onOpenBodyComposition?: () => void;
  theme?: 'dark' | 'warm-light';
}

export const HomeTab: React.FC<HomeTabProps> = ({
  userStats,
  workouts,
  badges,
  schedule,
  onSelectWorkout,
  onStartWorkout,
  onNavigateToTab,
  onUpdateUserStats,
  onUnlockBadge,
  onOpenBodyComposition,
  theme,
}) => {
  const isLight = theme === 'warm-light';
  // Modal states for editing stats and viewing badges
  const [editingStatType, setEditingStatType] = useState<EditableStatType | null>(null);
  const [selectedBadge, setSelectedBadge] = useState<AchievementBadge | null>(null);

  // Rotation order (saved separately) and recommendation based on yesterday's session
  const [rotation, setRotation] = useState<string[]>(loadRotation);
  const [showRotation, setShowRotation] = useState(false);
  const recommendation = useMemo(
    () => recommendWorkout(workouts, schedule, rotation),
    [workouts, schedule, rotation]
  );

  // Featured workout: recommendation if any created workout exists, else the default one
  const heroWorkout = recommendation?.workout || workouts.find((w) => w.id === 'full-body-beast') || workouts[0];

  // Calculate weight difference
  const weightDiff = Math.abs(Math.round((userStats.targetWeightKg - userStats.currentWeightKg) * 10) / 10);

  // Unlocked & locked badges preview (e.g. first 2 unlocked and first 3 locked/grisés)
  const unlockedBadges = badges.filter((b) => !b.isLocked);

  // Calcul intelligent de progression : gère fidèlement la perte de poids (sèche) et la progression croissante
  const goalProgress = useMemo(() => {
    const goal = userStats.nextGoal;
    const isPertePoids = 
      goal.goalType === 'perte_poids' ||
      (goal.unit?.toLowerCase() === 'kg' && goal.current > goal.target) ||
      goal.title?.toLowerCase().includes('sèche') ||
      goal.title?.toLowerCase().includes('perte');

    if (isPertePoids) {
      // Pour une perte de poids : le départ est supérieur à la cible.
      const start = goal.startValue ?? (
        userStats.bodyComposition?.recommendation?.currentWeightKg ??
        Math.max(goal.current, goal.target + 5)
      );

      const totalToLose = Math.max(0.1, start - goal.target);
      const lost = start - goal.current;
      // Pourcentage de progression : 0% au départ, 100% à l'arrivée (ou dépassement)
      const percent = Math.min(100, Math.max(0, Math.round((lost / totalToLose) * 100)));
      const remainingToLose = Math.max(0, Math.round((goal.current - goal.target) * 10) / 10);

      return {
        percent,
        isPertePoids: true,
        start,
        current: goal.current,
        target: goal.target,
        remainingText: remainingToLose > 0 ? `${remainingToLose} kg restants` : 'Objectif atteint !',
        deltaText: lost > 0 ? `-${lost.toFixed(1)} kg perdus` : lost < 0 ? `+${Math.abs(lost).toFixed(1)} kg` : 'Départ',
      };
    } else {
      // Progression croissante (charge, volume, prise de masse)
      const start = goal.startValue ?? 0;
      const totalToGain = Math.max(0.1, goal.target - start);
      const gained = goal.current - start;
      const percent = Math.min(100, Math.max(0, Math.round((gained / totalToGain) * 100)));
      const remaining = Math.max(0, Math.round((goal.target - goal.current) * 10) / 10);

      return {
        percent,
        isPertePoids: false,
        start,
        current: goal.current,
        target: goal.target,
        remainingText: remaining > 0 ? `${remaining} ${goal.unit} restants` : 'Objectif atteint !',
        deltaText: gained > 0 ? `+${gained.toFixed(1)} ${goal.unit}` : 'Départ',
      };
    }
  }, [userStats.nextGoal, userStats.bodyComposition]);

  return (
    <div className="pb-36 pt-2 px-4 space-y-7 max-w-lg mx-auto">
      {/* 1. TOP HEADER: MOTIVATIONAL STATUS */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <span className="text-[10px] font-black uppercase tracking-widest text-[#EC4899] block">
            TABLEAU DE BORD ATHLÈTE
          </span>
          <h2 className="text-2xl font-black text-white tracking-tight uppercase leading-tight">
            Bonjour, {userStats.name.split(' ')[0]}
          </h2>
        </div>

        <button
          onClick={() => setEditingStatType('currentWeight')}
          className="px-3 py-1.5 rounded-full bg-[#181818] border border-white/10 hover:border-[#EC4899]/50 text-xs font-black text-white flex items-center gap-1.5 transition-all shadow-md group"
          title="Modifier tes données"
        >
          <Edit3 className="w-3.5 h-3.5 text-[#EC4899] group-hover:rotate-12 transition-transform" />
          <span>Modifier</span>
        </button>
      </div>

      {/* BOUTON EXERCICE / SÉANCE EN DIRECT (ACCÈS DIRECT DEMANDÉ PAR L'UTILISATEUR) */}
      <div 
        id="banner-direct-workout-launch"
        onClick={() => {
          const quickSession: Workout = {
            id: "quick-curl-session",
            title: "Entraînement",
            subtitle: "SÉANCE EN DIRECT",
            category: "hypertrophie",
            durationMin: 45,
            exerciseCount: 1,
            difficulty: "INTERMÉDIAIRE",
            estimatedCalories: 350,
            intensity: "ÉLEVÉE",
            gradientType: "main",
            imageUrl: `${import.meta.env.BASE_URL}img/photo-1581009146145-b5ef050c2e1e-1200.jpg`,
            description: "Séance en direct avec suivi des séries, charges et répétitions.",
            targetAreas: ["Biceps", "Avant-bras"],
            exercises: [
              {
                id: "ex-curl-1",
                name: "Curl Biceps (Haltère)",
                sets: 4,
                reps: 0,
                targetWeightKg: 0,
                restSeconds: null,
                targetMuscles: ["Biceps", "Avant-bras"],
                notes: ""
              }
            ]
          };
          onStartWorkout(quickSession);
        }}
        className="p-4 rounded-2xl bg-gradient-to-r from-[#0088FF] via-[#0070DD] to-[#0055CC] text-white shadow-xl shadow-[#0088FF]/30 border border-white/20 cursor-pointer hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-between gap-3 group"
      >
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-black/30 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/15">
            <Dumbbell className="w-5 h-5 text-white group-hover:rotate-12 transition-transform stroke-[2.5]" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-white/90 block flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-white" />
              SÉANCE DU JOUR EN DIRECT
            </span>
            <span className="text-sm sm:text-base font-black uppercase tracking-tight block">
              Démarrer l'entraînement (Exercice) →
            </span>
            <span className="text-[11px] text-white/80 block">
              Curl Biceps, chronomètre, séries, charges et volume
            </span>
          </div>
        </div>

        <span className="px-3.5 py-2 rounded-xl bg-white text-[#0088FF] text-xs font-black uppercase tracking-wider shadow-md shrink-0 group-hover:scale-105 transition-all">
          Lancer
        </span>
      </div>

      {/* 2. STATS DE PROGRESSION EN HAUT DE L'APPLICATION (DEMANDE UTILISATEUR) */}
      <section className="space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-black text-white tracking-tight uppercase flex items-center gap-2">
              <span>Ta progression</span>
              <span className="w-2 h-2 rounded-full bg-[#00C6FF] shadow-sm shadow-[#00C6FF]/50" />
            </h3>
            <span className="text-[10px] text-[#A7A7A7] font-bold hidden sm:inline">
              (Toucher pour modifier)
            </span>
          </div>

          <button 
            onClick={() => onNavigateToTab('progress')}
            className="text-xs font-bold text-[#A7A7A7] hover:text-white flex items-center gap-1 transition-colors"
          >
            <span>Détails</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* The 4 Main Interactive Stat Cards (from user screenshot) */}
        <div className="grid grid-cols-2 gap-3">
          {/* Card: Poids Actuel (Clickable to edit) */}
          <div
            id="stat-card-poids-actuel"
            onClick={() => setEditingStatType('currentWeight')}
            className="p-4 rounded-2xl bg-[#181818] border border-white/[0.08] hover:border-[#00C6FF]/60 transition-all duration-200 space-y-1 group cursor-pointer relative overflow-hidden shadow-xl active:scale-[0.98]"
          >
            {/* Subtle edit prompt indicator on hover */}
            <div className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-black/60 px-1.5 py-0.5 rounded text-[9px] text-[#00C6FF] font-bold">
              <Edit3 className="w-2.5 h-2.5" />
              <span>Éditer</span>
            </div>

            <span className="text-[11px] font-bold text-[#A7A7A7] uppercase tracking-wider block">
              Poids actuel
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black text-white tracking-tight group-hover:text-[#00C6FF] transition-colors">
                {userStats.currentWeightKg}
              </span>
              <span className="text-xs font-bold text-[#A7A7A7]">KG</span>
            </div>
            <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 pt-1">
              <span>+0.8 kg ce mois</span>
            </div>
          </div>

          {/* Card: Objectif Poids (Clickable to edit) */}
          <div
            id="stat-card-objectif-poids"
            onClick={() => setEditingStatType('targetWeight')}
            className="p-4 rounded-2xl bg-[#181818] border border-white/[0.08] hover:border-[#00C6FF]/60 transition-all duration-200 space-y-1 group cursor-pointer relative overflow-hidden shadow-xl active:scale-[0.98]"
          >
            <div className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-black/60 px-1.5 py-0.5 rounded text-[9px] text-[#00C6FF] font-bold">
              <Edit3 className="w-2.5 h-2.5" />
              <span>Éditer</span>
            </div>

            <span className="text-[11px] font-bold text-[#A7A7A7] uppercase tracking-wider block">
              Objectif
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black text-gradient-performance tracking-tight">
                {userStats.targetWeightKg}
              </span>
              <span className="text-xs font-bold text-[#A7A7A7]">KG</span>
            </div>
            <div className="flex items-center gap-1 text-[10px] font-bold text-[#00C6FF] pt-1">
              <Target className="w-3 h-3 shrink-0" />
              <span className="truncate">
                {weightDiff === 0 ? 'Objectif atteint !' : `Plus que ${weightDiff} kg`}
              </span>
            </div>
          </div>

          {/* Card: Série Active (Clickable to edit) */}
          <div
            id="stat-card-serie-active"
            onClick={() => setEditingStatType('streak')}
            className="p-4 rounded-2xl bg-[#181818] border border-white/[0.08] hover:border-[#FF512F]/60 transition-all duration-200 space-y-1 group cursor-pointer relative overflow-hidden shadow-xl active:scale-[0.98]"
          >
            <div className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-black/60 px-1.5 py-0.5 rounded text-[9px] text-[#FF512F] font-bold">
              <Edit3 className="w-2.5 h-2.5" />
              <span>Éditer</span>
            </div>

            <span className="text-[11px] font-bold text-[#A7A7A7] uppercase tracking-wider block">
              Série active
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black text-gradient-energy tracking-tight">
                {userStats.streakDays}
              </span>
              <span className="text-xs font-bold text-[#A7A7A7]">JOURS</span>
            </div>
            <div className="flex items-center gap-1 text-[10px] font-bold text-amber-400 pt-1">
              <Flame className="w-3 h-3 fill-amber-400 shrink-0" />
              <span>Record personnel !</span>
            </div>
          </div>

          {/* Card: Workouts Validés (Clickable to edit) */}
          <div
            id="stat-card-workouts"
            onClick={() => setEditingStatType('workouts')}
            className="p-4 rounded-2xl bg-[#181818] border border-white/[0.08] hover:border-[#EC4899]/60 transition-all duration-200 space-y-1 group cursor-pointer relative overflow-hidden shadow-xl active:scale-[0.98]"
          >
            <div className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-black/60 px-1.5 py-0.5 rounded text-[9px] text-[#EC4899] font-bold">
              <Edit3 className="w-2.5 h-2.5" />
              <span>Éditer</span>
            </div>

            <span className="text-[11px] font-bold text-[#A7A7A7] uppercase tracking-wider block">
              Workouts
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black text-white tracking-tight group-hover:text-[#EC4899] transition-colors">
                {userStats.totalWorkouts}
              </span>
              <span className="text-xs font-bold text-[#A7A7A7]">VALIDÉS</span>
            </div>
            <div className="flex items-center gap-1 text-[10px] font-bold text-[#EC4899] pt-1">
              <Zap className="w-3 h-3 fill-[#EC4899] shrink-0" />
              <span>4 ce mois-ci</span>
            </div>
          </div>
        </div>

        {/* Highlight Banner: Calories Brûlées (Clickable to edit) */}
        <div
          id="stat-card-calories"
          onClick={() => setEditingStatType('calories')}
          className="p-4 rounded-2xl bg-[#181818] border border-white/[0.08] hover:border-[#FF512F]/50 transition-all cursor-pointer flex items-center justify-between group shadow-xl active:scale-[0.99]"
        >
          <div>
            <span className="text-[11px] font-bold text-[#A7A7A7] uppercase tracking-wider flex items-center gap-1.5">
              <span>Énergie dépensée ce mois</span>
              <Edit3 className="w-3 h-3 text-[#A7A7A7] group-hover:text-[#FF512F] transition-colors" />
            </span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-3xl font-black text-white tracking-tight group-hover:text-gradient-energy transition-colors">
                {userStats.totalCaloriesBurned.toLocaleString('fr-FR')}
              </span>
              <span className="text-xs font-bold text-[#FF512F] uppercase">KCAL</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-[#FF512F]/10 border border-[#FF512F]/30 flex items-center justify-center text-[#FF512F] group-hover:scale-105 transition-transform">
            <Flame className="w-6 h-6 fill-[#FF512F]" />
          </div>
        </div>

        {/* Biometrics & Body Composition Card in Home */}
        {onOpenBodyComposition && (
          <div
            onClick={onOpenBodyComposition}
            className="p-4 rounded-2xl bg-[#181818] border border-white/[0.08] hover:border-[#EC4899]/50 transition-all cursor-pointer flex items-center justify-between group shadow-xl active:scale-[0.99]"
          >
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#7C3AED] to-[#EC4899] flex items-center justify-center text-white shadow-md glow-main shrink-0">
                <Scale className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-[#A7A7A7] uppercase tracking-wider flex items-center gap-1.5">
                  <span>Composition Corporelle</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#EC4899]/20 text-[#EC4899] font-black">
                    ESTIMATION
                  </span>
                </span>
                <div className="flex items-center gap-2 mt-0.5">
                  {userStats.bodyComposition ? (
                    <div className="space-y-0.5">
                      <span className="text-xs sm:text-sm font-black text-white block">
                        Gras: <span className="text-[#EC4899]">{userStats.bodyComposition.fatPercent}%</span> • Muscle: <span className="text-[#00C6FF]">{userStats.bodyComposition.muscleMassKg}kg</span> • Os: <span className="text-[#F59E0B]">{userStats.bodyComposition.boneMassKg}kg</span>
                      </span>
                      {userStats.bodyComposition.chosenGoal && (
                        <span className="text-[10px] font-bold text-[#10B981] flex items-center gap-1">
                          <span className="px-1.5 py-0.2 rounded bg-[#10B981]/20 uppercase">
                            {userStats.bodyComposition.chosenGoal.type === 'seche' ? 'Sèche' : userStats.bodyComposition.chosenGoal.type === 'prise_de_masse' ? 'Prise de Masse' : 'Recomposition'}
                          </span>
                          <span>• Cible {userStats.bodyComposition.chosenGoal.targetWeightKg} kg ({userStats.bodyComposition.chosenGoal.targetFatPercent}% MG)</span>
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs font-semibold text-white">
                      Estime ta masse grasse, sèche & osseuse
                    </span>
                  )}
                </div>
              </div>
            </div>

            <span className="text-xs font-black text-[#EC4899] group-hover:translate-x-0.5 transition-transform flex items-center gap-1 whitespace-nowrap ml-2">
              Calculer →
            </span>
          </div>
        )}

        {/* TON PROCHAIN OBJECTIF with Animated Progress Bar (Clickable to edit) */}
        <div
          id="stat-card-challenge"
          onClick={() => setEditingStatType('nextGoal')}
          className="p-4 sm:p-5 rounded-2xl bg-[#181818] border border-white/[0.08] hover:border-[#EC4899]/50 transition-all cursor-pointer space-y-3 relative overflow-hidden group shadow-xl"
        >
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-[#EC4899] flex items-center gap-1">
                <span>CHALLENGE EN COURS</span>
                <Edit3 className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
              </span>
              <h4 className="text-base font-black text-white tracking-tight uppercase group-hover:text-[#EC4899] transition-colors">
                {userStats.nextGoal.title}
              </h4>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-[#202020] text-xs font-extrabold text-[#00C6FF] border border-white/10">
              {goalProgress.percent}%
            </span>
          </div>

          <p className="text-xs text-[#A7A7A7] leading-relaxed">
            {userStats.nextGoal.description}
          </p>

          {/* Animated Progress Bar */}
          <div className="space-y-1.5">
            <div className="w-full h-2.5 rounded-full bg-[#121212] overflow-hidden p-0.5 border border-white/[0.06]">
              <div 
                className="h-full rounded-full bg-gradient-to-r from-[#7C3AED] via-[#EC4899] to-[#00C6FF] transition-all duration-1000 ease-out glow-main"
                style={{ width: `${goalProgress.percent}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] font-bold text-[#A7A7A7]">
              <span>
                {goalProgress.isPertePoids 
                  ? `Départ : ${goalProgress.start} ${userStats.nextGoal.unit}` 
                  : `${goalProgress.start} ${userStats.nextGoal.unit}`}
              </span>
              <span className="text-[#00C6FF] font-semibold">
                {goalProgress.isPertePoids 
                  ? `Actuel : ${goalProgress.current} ${userStats.nextGoal.unit}` 
                  : goalProgress.deltaText}
              </span>
              <span className="text-white">
                Cible : {userStats.nextGoal.target} {userStats.nextGoal.unit}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. GAMIFICATION & BADGES GRISÉS (POUR DONNER ENVIE DE LES OBTENIR) */}
      <section className="space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-400" />
            <h3 className="text-lg font-black text-white uppercase tracking-tight">
              Badges & Défis
            </h3>
          </div>
          <button
            onClick={() => onNavigateToTab('progress')}
            className="text-xs font-bold text-[#EC4899] hover:underline flex items-center gap-1"
          >
            <span>{unlockedBadges.length}/{badges.length} Débloqués</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Horizontal Badges Reel with Unlocked (Glowing) and Locked (Grisés / Grayed-out) */}
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 pt-1 -mx-4 px-4">
          {badges.map((badge) => {
            const isLocked = badge.isLocked ?? false;
            const progressPercent = badge.progressTarget && badge.progressCurrent
              ? Math.min(100, Math.round((badge.progressCurrent / badge.progressTarget) * 100))
              : 0;

            return (
              <div
                key={badge.id}
                id={`badge-card-${badge.id}`}
                onClick={() => setSelectedBadge(badge)}
                className={`shrink-0 w-48 p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between h-44 relative overflow-hidden group select-none active:scale-95 ${
                  isLocked
                    ? isLight
                      ? 'bg-[#f0dfd0] border-[#7d5a47]/20 hover:border-[#7d5a47]/40 shadow-sm'
                      : 'bg-[#141414] border-white/[0.06] hover:border-white/20'
                    : isLight
                    ? 'bg-[#fff7f0] border-[#EC4899]/30 hover:border-[#EC4899] shadow-lg shadow-[#EC4899]/10'
                    : 'bg-[#181818] border-[#EC4899]/30 hover:border-[#EC4899] shadow-lg shadow-[#EC4899]/10'
                }`}
              >
                {/* 1. Header with XP and Lock Icon */}
                <div className="flex items-center justify-between z-20 relative">
                  <div />
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
                <div className="flex items-center gap-3 pt-0.5 z-20 relative my-auto">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl relative shrink-0 ${isLight ? 'bg-black/5 border border-black/5' : 'bg-white/5 border border-white/5'} transition-transform group-hover:scale-105 ${
                    isLocked ? 'grayscale opacity-60' : ''
                  }`}>
                    <span className="text-2xl filter drop-shadow select-none">{badge.emoji}</span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <h5 className={`text-xs font-black uppercase tracking-tight truncate ${
                      isLocked
                        ? isLight ? 'text-[#7d5a47]' : 'text-white/80'
                        : isLight ? 'text-[#3d2317]' : 'text-white'
                    }`}>
                      {badge.title}
                    </h5>
                    {/* Humorous description ONLY when unlocked; How to unlock when locked */}
                    {isLocked ? (
                      <p className={`text-[10px] ${isLight ? 'text-[#7d5a47]' : 'text-[#A7A7A7]'} line-clamp-2 leading-snug`}>
                        <span className={`${isLight ? 'text-[#3d2317]' : 'text-white/90'} font-bold`}>Déblocage : </span>
                        {getBadgeUnlockRequirement(badge.id, badge.progressTarget, badge.progressUnit)}
                      </p>
                    ) : (
                      <p className={`text-[10px] ${isLight ? 'text-[#7d5a47]' : 'text-[#A7A7A7]'} line-clamp-2 leading-snug`}>
                        {badge.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* 3. Micro progress bar for locked badges */}
                <BadgeProgress
                  badge={badge}
                  isLocked={isLocked}
                  isLight={isLight}
                  progressPercent={progressPercent}
                  minHeightClass="min-h-[1.75rem]"
                />

                {/* 4. Subtle gray veil overlay: 100% card coverage */}
                {isLocked && (
                  <div className={`absolute inset-0 z-10 m-0 w-full h-full ${isLight ? 'bg-[#3d2317]/15' : 'bg-neutral-900/40'} backdrop-blur-[0.5px] rounded-2xl pointer-events-none`} />
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. LES SÉANCES D'ENTRAÎNEMENT EN BAS (DEMANDE UTILISATEUR) */}
      <section className="space-y-5 pt-2 border-t border-white/[0.06]">
        <div className="space-y-1">
          <span className="text-xs font-extrabold uppercase tracking-widest text-[#A7A7A7]">
            SÉANCES D'ENTRAÎNEMENT
          </span>
          <h3 className="text-2xl font-black text-white tracking-tight uppercase leading-tight">
            Prêt pour ton entraînement ?
          </h3>
        </div>

        {/* HERO WORKOUT CARD */}
        <div 
          id="hero-workout-card"
          onClick={() => onSelectWorkout(heroWorkout)}
          className="group relative w-full h-[360px] rounded-2xl overflow-hidden cursor-pointer shadow-2xl transition-all duration-300 hover:scale-[1.01] border border-white/[0.08]"
        >
          {/* Background Image with dramatic sports contrast */}
          <img
            src={heroWorkout.imageUrl}
            alt={heroWorkout.title}
            className="absolute inset-0 w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 brightness-[0.7]"
          />

          {/* Multi-layered Gradients: Mesh Neon + Dark Base */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#090909] via-[#090909]/70 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-br from-[#7C3AED]/35 via-transparent to-[#EC4899]/30 mix-blend-screen pointer-events-none" />

          {/* Top Tag Badges */}
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
            <span className="px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-[11px] font-black tracking-widest text-white uppercase">
              SESSION RECOMMANDÉE{recommendation ? ` · ${recommendation.reason}` : ''}
            </span>
            <span className="px-2.5 py-1 rounded-full bg-[#EC4899] text-black font-black text-[10px] tracking-wider uppercase">
              {heroWorkout.difficulty}
            </span>
          </div>

          {/* Bottom Content */}
          <div className="absolute bottom-4 left-4 right-4 space-y-3">
            <div className="space-y-1">
              <div className="flex items-center gap-3 text-xs font-bold text-[#A7A7A7] uppercase tracking-wider">
                <span className="flex items-center gap-1 text-white">
                  <Clock className="w-3.5 h-3.5 text-[#EC4899]" />
                  {heroWorkout.durationMin} MIN
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 text-[#FF512F]">
                  <Flame className="w-3.5 h-3.5 fill-[#FF512F]" />
                  {heroWorkout.intensity}
                </span>
                <span>•</span>
                <span>{heroWorkout.exerciseCount} EXERCICES</span>
              </div>

              <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight uppercase leading-none drop-shadow-md">
                {heroWorkout.title}
              </h3>
              <p className="text-xs text-[#A7A7A7] line-clamp-2 leading-relaxed">
                {heroWorkout.description}
              </p>
            </div>

            {/* Action CTA Button */}
            <div className="pt-1 flex items-center gap-3">
              <button
                id="btn-hero-start"
                onClick={(e) => {
                  e.stopPropagation();
                  onStartWorkout(heroWorkout);
                }}
                className="flex-1 py-3.5 px-6 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#EC4899] text-white font-black text-sm tracking-wider uppercase flex items-center justify-center gap-2 shadow-lg shadow-[#EC4899]/30 hover:brightness-110 active:scale-95 transition-all"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>COMMENCER LA SÉANCE</span>
              </button>

              <button
                id="btn-hero-details"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectWorkout(heroWorkout);
                }}
                className="py-3.5 px-4 rounded-xl bg-[#202020]/90 backdrop-blur-md border border-white/10 text-white hover:bg-white/10 transition-all"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {recommendation && (
          <button
            type="button"
            onClick={() => setShowRotation(true)}
            className="w-full -mt-2 text-xs font-bold text-[#A7A7A7] hover:text-white transition-colors cursor-pointer"
          >
            Modifier l&apos;ordre de rotation
          </button>
        )}

        {/* Motivational Banner */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-[#181818] to-[#121212] border border-white/[0.08] relative overflow-hidden">
          <div className="absolute -right-8 -bottom-8 w-36 h-36 bg-[#7C3AED]/20 rounded-full blur-2xl pointer-events-none" />
          <p className="text-xs font-black tracking-widest text-[#A7A7A7] uppercase mb-1">
            MANIFESTE VOLT
          </p>
          <h4 className="text-xl font-black text-white tracking-tight uppercase leading-tight">
            PRÊT À <span className="text-gradient-main">DÉPASSER</span> TES LIMITES ?
          </h4>
          <p className="text-xs text-[#A7A7A7] mt-1 font-medium">
            Chaque répétition enregistrée forge une nouvelle version de toi-même.
          </p>
        </div>

        {/* HORIZONTAL CAROUSEL - SÉANCES RECOMMANDÉES */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-base font-black text-white tracking-tight uppercase">
              Autres Séances Recommandées
            </h4>
            <button 
              onClick={() => onNavigateToTab('workouts')}
              className="text-xs font-bold text-[#A7A7A7] hover:text-white flex items-center gap-1 transition-colors"
            >
              <span>Tout voir</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 pt-1 -mx-4 px-4">
            {workouts.map((w) => (
              <div
                key={w.id}
                onClick={() => onSelectWorkout(w)}
                className="shrink-0 w-56 rounded-2xl bg-[#181818] border border-white/[0.08] overflow-hidden cursor-pointer hover:border-white/20 transition-all group active:scale-95"
              >
                <div className="relative h-28 w-full overflow-hidden">
                  <img
                    src={w.imageUrl}
                    alt={w.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 brightness-90"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#181818] via-transparent to-transparent" />
                  <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-[9px] font-black tracking-wider text-white uppercase">
                    {w.durationMin} MIN
                  </span>
                </div>

                <div className="p-3 space-y-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#EC4899]">
                    {w.category}
                  </span>
                  <h5 className="text-xs font-black text-white uppercase tracking-tight truncate">
                    {w.title}
                  </h5>
                  <div className="flex items-center justify-between text-[10px] text-[#A7A7A7] font-semibold pt-1">
                    <span>{w.exerciseCount} exercices</span>
                    <span className="text-[#FF512F] font-bold">{w.estimatedCalories} kcal</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {showRotation && (
        <RotationModal
          workouts={getRotationOrder(workouts, rotation)}
          onSave={(order) => {
            saveRotation(order);
            setRotation(order);
          }}
          onClose={() => setShowRotation(false)}
          theme={theme}
        />
      )}

      {/* Modal to edit user stats */}
      {editingStatType && (
        <EditStatModal
          initialType={editingStatType}
          userStats={userStats}
          onClose={() => setEditingStatType(null)}
          onSave={(updatedStats) => onUpdateUserStats(updatedStats)}
          onOpenBodyComposition={onOpenBodyComposition}
          theme={theme}
        />
      )}

      {/* Modal to inspect or unlock badges */}
      {selectedBadge && (
        <BadgeDetailModal
          badge={selectedBadge}
          onClose={() => setSelectedBadge(null)}
          onUnlockBadge={onUnlockBadge}
          theme={theme}
          onStartTraining={() => {
            setSelectedBadge(null);
            onSelectWorkout(heroWorkout);
          }}
        />
      )}
    </div>
  );
};
