import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, Flame, Dumbbell, Clock, Share2, ArrowRight, Zap, CheckCircle2, X } from 'lucide-react';
import { Workout } from '../types';
import { audioSynth } from '../utils/audioSynth';

interface WorkoutFinishedModalProps {
  summary: {
    workout: Workout;
    durationSeconds: number;
    completedSetsCount: number;
    totalVolumeKg: number;
  };
  onClose: () => void;
  theme?: 'dark' | 'warm-light';
}

export const WorkoutFinishedModal: React.FC<WorkoutFinishedModalProps> = ({
  summary,
  onClose,
  theme,
}) => {
  const { workout, durationSeconds, completedSetsCount, totalVolumeKg } = summary;
  const isLight = theme === 'warm-light';

  useEffect(() => {
    // Sound celebration
    audioSynth.playCelebrationSound();

    // Confetti burst
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#7C3AED', '#EC4899', '#00C6FF', '#FF512F'],
      });
    } catch {
      // Ignore if canvas blocked
    }
  }, []);

  const formatDuration = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins}m ${s}s`;
  };

  return (
    <div className={`fixed inset-0 z-50 flex flex-col justify-start sm:justify-center items-center p-4 max-w-lg mx-auto overflow-y-auto py-6 animate-in fade-in zoom-in-95 duration-200 ${
      isLight ? 'bg-[#3d2317]/65 backdrop-blur-xl' : 'bg-black/90 backdrop-blur-2xl'
    }`}>
      <div className={`w-full rounded-3xl p-5 sm:p-6 space-y-5 shadow-2xl relative overflow-hidden text-center my-auto border transition-colors ${
        isLight ? 'bg-[#faebe0] border-[#7d5a47]/20 text-[#3d2317]' : 'bg-[#121212] border-white/10 text-white'
      }`}>
        {/* Top-Right Close Button (Direct escape to home screen) */}
        <button
          type="button"
          id="btn-close-finished-workout"
          onClick={onClose}
          className={`absolute top-4 right-4 z-20 p-2 rounded-full active:scale-95 transition-all cursor-pointer border ${
            isLight
              ? 'bg-[#f3dfcb] hover:bg-[#fff3ea] text-[#7d5a47] hover:text-[#3d2317] border-[#7d5a47]/20'
              : 'bg-white/10 hover:bg-white/20 text-white border-transparent'
          }`}
          title="Fermer et retourner à l'accueil"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Neon decorative gradient circle */}
        <div className="absolute -top-16 -left-16 w-48 h-48 bg-[#EC4899]/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -right-16 w-48 h-48 bg-[#7C3AED]/20 rounded-full blur-3xl pointer-events-none" />

        {/* Celebration Trophy Badge */}
        <div className="relative inline-flex items-center justify-center pt-2">
          <div className="w-18 h-18 rounded-2xl bg-gradient-to-tr from-[#7C3AED] via-[#EC4899] to-[#FF512F] flex items-center justify-center shadow-xl glow-main">
            <Trophy className="w-9 h-9 text-white" />
          </div>
          <div className="absolute -bottom-1 -right-1 p-1 bg-[#121212] rounded-full">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 fill-emerald-500/20" />
          </div>
        </div>

        {/* Title */}
        <div className="space-y-1">
          <span className="text-xs font-black uppercase tracking-widest text-[#EC4899]">
            ENTRAÎNEMENT VALIDÉ !
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight uppercase">
            {workout.title}
          </h2>
          <p className="text-xs text-[#A7A7A7]">
            Séance enregistrée dans ton carnet d'entraînement VOLT.
          </p>
        </div>

        {/* VOLT Score Boost Banner */}
        <div className="p-3 rounded-xl bg-[#181818] border border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2 text-left">
            <div className="w-8 h-8 rounded-lg bg-[#EC4899]/20 flex items-center justify-center text-[#EC4899]">
              <Zap className="w-4 h-4 fill-[#EC4899]" />
            </div>
            <div>
              <p className="text-xs font-black text-white uppercase">INDICE DE PUISSANCE</p>
              <p className="text-[10px] text-[#A7A7A7]">Score mis à jour</p>
            </div>
          </div>
          <span className="text-sm font-black text-emerald-400">+15 VOLT PTS</span>
        </div>

        {/* Recap Metrics Grid */}
        <div className="grid grid-cols-2 gap-2.5 text-left">
          <div className="p-3 rounded-xl bg-[#181818] border border-white/[0.06] space-y-0.5">
            <span className="text-[10px] font-bold text-[#A7A7A7] uppercase flex items-center gap-1">
              <Clock className="w-3 h-3 text-[#EC4899]" /> Durée
            </span>
            <p className="text-lg font-black text-white">{formatDuration(durationSeconds)}</p>
          </div>

          <div className="p-3 rounded-xl bg-[#181818] border border-white/[0.06] space-y-0.5">
            <span className="text-[10px] font-bold text-[#A7A7A7] uppercase flex items-center gap-1">
              <Flame className="w-3 h-3 text-[#FF512F]" /> Calories
            </span>
            <p className="text-lg font-black text-[#FF512F]">{workout.estimatedCalories} KCAL</p>
          </div>

          <div className="p-3 rounded-xl bg-[#181818] border border-white/[0.06] space-y-0.5">
            <span className="text-[10px] font-bold text-[#A7A7A7] uppercase flex items-center gap-1">
              <Dumbbell className="w-3 h-3 text-[#00C6FF]" /> Séries faites
            </span>
            <p className="text-lg font-black text-white">{completedSetsCount} séries</p>
          </div>

          <div className="p-3 rounded-xl bg-[#181818] border border-white/[0.06] space-y-0.5">
            <span className="text-[10px] font-bold text-[#A7A7A7] uppercase flex items-center gap-1">
              <Zap className="w-3 h-3 text-amber-400" /> Tonnage total
            </span>
            <p className="text-lg font-black text-white">
              {totalVolumeKg > 0 ? `${totalVolumeKg.toLocaleString()} KG` : 'Poids corps'}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-1">
          <button
            type="button"
            id="btn-finish-modal-done"
            onClick={onClose}
            className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-[#7C3AED] to-[#EC4899] text-white font-black text-xs sm:text-sm uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl glow-main hover:brightness-110 active:scale-98 transition-all cursor-pointer"
          >
            <span>RETOUR À L'ACCUEIL</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: `Séance VOLT validée : ${workout.title}`,
                  text: `Je viens de terminer ma séance ${workout.title} chez VOLT Gym !`,
                }).catch(() => {});
              } else if (navigator.clipboard) {
                navigator.clipboard.writeText(`Je viens de terminer ma séance ${workout.title} chez VOLT Gym ! (Durée: ${formatDuration(durationSeconds)}, Volume: ${totalVolumeKg}kg)`).catch(() => {});
              }
            }}
            className="w-full py-2.5 px-4 rounded-xl bg-[#181818] text-[#A7A7A7] hover:text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all border border-white/10 cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Partager ma performance</span>
          </button>
        </div>
      </div>
    </div>
  );
};
