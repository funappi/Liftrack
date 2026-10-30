import React from 'react';
import { X, Lock, CheckCircle2, Zap, Play } from 'lucide-react';
import { AchievementBadge } from '../types';
import { audioSynth } from '../utils/audioSynth';
import confetti from 'canvas-confetti';
import { getBadgeUnlockRequirement } from './BadgeIcon';

interface BadgeDetailModalProps {
  badge: AchievementBadge;
  onClose: () => void;
  onUnlockBadge?: (badgeId: string) => void;
  onStartTraining?: () => void;
  theme?: 'dark' | 'warm-light';
}

export const BadgeDetailModal: React.FC<BadgeDetailModalProps> = ({
  badge,
  onClose,
  onUnlockBadge,
  onStartTraining,
  theme,
}) => {
  const isLight = theme === 'warm-light';
  const isLocked = badge.isLocked ?? false;
  const progressPercent = badge.progressTarget && badge.progressCurrent
    ? Math.min(100, Math.round((badge.progressCurrent / badge.progressTarget) * 100))
    : (isLocked ? 40 : 100);

  const getRarityBadge = (rarity?: string) => {
    switch (rarity) {
      case 'LÉGENDAIRE':
        return 'bg-gradient-to-r from-amber-500 to-yellow-300 text-black shadow-amber-500/20';
      case 'ÉPIQUE':
        return 'bg-gradient-to-r from-[#8E2DE2] to-[#EC4899] text-white shadow-purple-500/20';
      case 'RARE':
        return 'bg-gradient-to-r from-[#00C6FF] to-[#0072FF] text-white shadow-blue-500/20';
      case 'COMMUN':
      default:
        return 'bg-[#202020] text-[#A7A7A7] border border-white/10';
    }
  };

  const handleTestUnlock = () => {
    audioSynth.playCelebrationSound();
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.5 },
        colors: ['#EC4899', '#7C3AED', '#00C6FF', '#F59E0B'],
      });
    } catch {
      // ignore
    }
    if (onUnlockBadge) {
      onUnlockBadge(badge.id);
    }
    onClose();
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200 ${
      isLight ? 'bg-[#3d2317]/65 backdrop-blur-xl' : 'bg-black/85 backdrop-blur-md'
    }`}>
      <div 
        id="badge-detail-modal"
        className={`w-full max-w-sm rounded-3xl p-6 space-y-5 shadow-2xl relative border overflow-hidden transition-colors ${
          isLight
            ? 'bg-[#faebe0] border-[#7d5a47]/20 text-[#3d2317]'
            : (isLocked ? 'bg-[#181818] border-white/10 text-white' : 'bg-[#211b17] border-[#EC4899]/30 text-white')
        }`}
      >
        {/* Glow ambient background if unlocked */}
        {!isLocked && (
          <div className={`absolute -top-16 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full blur-3xl pointer-events-none ${
            isLight ? 'bg-[#EC4899]/10' : 'bg-[#EC4899]/20'
          }`} />
        )}

        {/* Top close bar */}
        <div className="flex items-center justify-between relative z-10">
          <span className={`px-2.5 py-0.5 rounded-full text-2xs font-black uppercase tracking-wider shadow-sm ${getRarityBadge(badge.rarity)}`}>
            {badge.rarity || 'TROPHÉE'}
          </span>

          <button
            onClick={onClose}
            className={`w-control-sm h-control-sm relative after:absolute after:-inset-1.5 rounded-full flex items-center justify-center transition-colors border ${
              isLight
                ? 'bg-[#f3dfcb] hover:bg-[#fff3ea] text-[#7d5a47] hover:text-[#3d2317] border-[#7d5a47]/20'
                : 'bg-[#202020] text-[#A7A7A7] hover:text-white border-white/10'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Central Badge Representation with Emoji */}
        <div className="flex flex-col items-center justify-center text-center space-y-3 pt-2 relative z-10">
          <div className={`relative w-24 h-24 rounded-2xl flex items-center justify-center transition-all ${
            isLocked
              ? 'bg-[#121212] border border-white/10'
              : 'bg-gradient-to-br from-[#7C3AED]/30 to-[#EC4899]/30 border border-[#EC4899]/50 shadow-xl shadow-[#EC4899]/20 glow-main'
          }`}>
            <span className={`text-5xl filter drop-shadow select-none ${isLocked ? 'grayscale opacity-60' : ''}`}>
              {badge.emoji}
            </span>

            {isLocked && (
              <div className="absolute inset-0 bg-neutral-900/50 backdrop-blur-[0.5px] rounded-2xl flex items-center justify-center">
                <div className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-white shadow-md">
                  <Lock className="w-4 h-4 text-white stroke-[2.5]" />
                </div>
              </div>
            )}
          </div>

          <div className="space-y-1">
            <h3 className={`text-xl font-black uppercase tracking-tight ${isLight ? 'text-[#3d2317]' : 'text-white'}`}>
              {badge.title}
            </h3>

            <div className="flex items-center justify-center gap-2 text-xs">
              {isLocked ? (
                <span className="flex items-center gap-1 font-bold text-amber-500 uppercase tracking-wider">
                  <Lock className="w-3.5 h-3.5 text-white" />
                  Badge Verrouillé
                </span>
              ) : (
                <span className="flex items-center gap-1 font-bold text-emerald-500 uppercase tracking-wider">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Débloqué ({badge.unlockedAt || 'Validé'})
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Description & Requirements */}
        <div className={`p-4 rounded-2xl border space-y-3 relative z-10 ${
          isLight ? 'bg-[#fff7f0] border-[#7d5a47]/15' : 'bg-[#121212] border-white/[0.06]'
        }`}>
          {isLocked ? (
            <div className="space-y-1 text-center">
              <span className="text-2xs font-black uppercase text-[#EC4899] block tracking-wider">
                Comment débloquer
              </span>
              <p className={`text-xs leading-relaxed font-medium ${isLight ? 'text-[#3d2317]' : 'text-[#f7eee4]'}`}>
                {getBadgeUnlockRequirement(badge.id, badge.progressTarget, badge.progressUnit)}
              </p>
            </div>
          ) : (
            <p className={`text-xs leading-relaxed text-center ${isLight ? 'text-[#7d5a47]' : 'text-[#A7A7A7]'}`}>
              {badge.description}
            </p>
          )}

          {/* Progress Bar if locked or target defined */}
          {isLocked && badge.progressTarget && (
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-caption font-bold">
                <span className={`uppercase ${isLight ? 'text-[#7d5a47]' : 'text-[#A7A7A7]'}`}>Progression</span>
                <span className={`font-mono num ${isLight ? 'text-[#3d2317]' : 'text-white'}`}>
                  {badge.progressCurrent} / {badge.progressTarget} {badge.progressUnit || ''} ({progressPercent}% )
                </span>
              </div>
              <div className={`w-full h-2 rounded-full overflow-hidden p-0.5 border ${
                isLight ? 'bg-[#e5d2c1] border-[#7d5a47]/15' : 'bg-[#181818] border-white/5'
              }`}>
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#7C3AED] to-[#EC4899] transition-all duration-700"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* Reward info */}
          <div className="flex items-center justify-between pt-1 border-t border-white/5 text-caption font-bold">
            <span className={isLight ? 'text-[#7d5a47]' : 'text-[#A7A7A7]'}>Récompense Volt</span>
            <span className="text-amber-500 font-black">+{badge.rewardXp || 100} XP</span>
          </div>
        </div>

        {/* Action Button: Train or Test Unlock */}
        <div className="space-y-2 relative z-10 pt-1">
          {onStartTraining && (
            <button
              onClick={onStartTraining}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#7C3AED] to-[#EC4899] text-white font-black text-xs uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>S'entraîner pour cet objectif</span>
            </button>
          )}

          {isLocked && onUnlockBadge && (
            <button
              onClick={handleTestUnlock}
              className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1.5 cursor-pointer ${
                isLight
                  ? 'bg-[#f3dfcb] hover:bg-[#fff3ea] text-[#7d5a47] border-[#7d5a47]/20'
                  : 'bg-[#202020] hover:bg-[#252525] text-[#A7A7A7] hover:text-white border-white/10'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Débloquer ce badge (Mode Démo)</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
