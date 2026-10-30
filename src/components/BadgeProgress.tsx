import React from 'react';
import { AchievementBadge } from '../types';

interface BadgeProgressProps {
  badge: AchievementBadge;
  isLocked: boolean;
  isLight: boolean;
  progressPercent: number;
  // Fixed-height wrapper so all badge cards align (literal class, kept for Tailwind scanning)
  minHeightClass: string;
}

// Micro progress bar shown under locked badges
export const BadgeProgress: React.FC<BadgeProgressProps> = ({
  badge,
  isLocked,
  isLight,
  progressPercent,
  minHeightClass,
}) => (
  <div className={`${minHeightClass} flex flex-col justify-end z-20 relative pt-1`}>
    {isLocked && badge.progressTarget ? (
      <div className="space-y-1">
        <div className={`w-full h-1.5 rounded-full ${isLight ? 'bg-black/10' : 'bg-[#202020]'} overflow-hidden`}>
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-500 to-[#EC4899]"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className={`flex items-center justify-between text-[9px] font-bold ${isLight ? 'text-[#7d5a47]' : 'text-[#A7A7A7]'}`}>
          <span>Objectif</span>
          <span className={isLight ? 'text-[#3d2317]' : 'text-white'}>
            {badge.progressCurrent}/{badge.progressTarget} {badge.progressUnit || ''}
          </span>
        </div>
      </div>
    ) : (
      <div />
    )}
  </div>
);
