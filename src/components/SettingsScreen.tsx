import React, { useState } from 'react';
import { ArrowLeft, Bell, Palette, SlidersHorizontal, Target, User } from 'lucide-react';
import { ScheduledDay, UserStats, Workout } from '../types';
import { ProfileSection } from './settings/ProfileSection';
import { ThemePicker } from './settings/ThemePicker';
import { GoalsSection } from './settings/GoalsSection';
import NotificationSettings from './settings/NotificationSettings';
import { OtherSettingsSection } from './settings/OtherSettingsSection';

export type SettingsSectionId = 'profile' | 'themes' | 'goals' | 'notifications' | 'other';

interface SettingsScreenProps {
  initialSection?: SettingsSectionId;
  userStats: UserStats;
  onUpdateUserStats: (p: Partial<UserStats>) => void;
  themeId: string;
  onApplyTheme: (id: string) => void;
  getNotificationContext: () => { schedule: ScheduledDay[]; workouts: Workout[] };
  onClose: () => void;
  theme: 'dark' | 'warm-light';
}

const SECTIONS: { id: SettingsSectionId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'profile', label: 'Profil', icon: User },
  { id: 'themes', label: 'Thèmes', icon: Palette },
  { id: 'goals', label: 'Objectifs', icon: Target },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'other', label: 'Autres', icon: SlidersHorizontal },
];

// Full-screen settings opened from the gear icon of the header
export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  initialSection = 'profile',
  userStats,
  onUpdateUserStats,
  themeId,
  onApplyTheme,
  getNotificationContext,
  onClose,
  theme,
}) => {
  const isLight = theme === 'warm-light';
  const [section, setSection] = useState<SettingsSectionId>(initialSection);

  return (
    <div
      className={`fixed inset-0 z-40 max-w-lg mx-auto flex flex-col animate-in fade-in duration-200 ${
        isLight ? 'bg-[#f3dfcb] text-[#3d2317]' : 'bg-[#090909] text-white'
      }`}
    >
      <div
        className={`shrink-0 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-3 border-b space-y-3 ${
          isLight ? 'bg-[#f3dfcb] border-[#7d5a47]/20' : 'bg-[#121212] border-white/10'
        }`}
      >
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            aria-label="Retour"
            className={`w-9 h-9 relative after:absolute after:-inset-1 rounded-full flex items-center justify-center border transition-colors cursor-pointer ${
              isLight ? 'bg-[#faebe0] border-[#7d5a47]/20 text-[#3d2317]' : 'bg-white/10 border-transparent text-white hover:bg-white/20'
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className={`text-xl font-black uppercase tracking-tight ${isLight ? 'text-[#3d2317]' : 'text-white'}`}>Paramètres</h1>
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4">
          {SECTIONS.map(({ id, label, icon: Icon }) => {
            const active = section === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setSection(id)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wide flex items-center gap-1.5 border transition-all cursor-pointer ${
                  active
                    ? 'bg-gradient-to-r from-[#7C3AED] to-[#EC4899] text-white border-transparent shadow-md'
                    : isLight
                    ? 'bg-[#faebe0] text-[#7d5a47] border-[#7d5a47]/20'
                    : 'bg-[#181818] text-[#A7A7A7] border-white/[0.08] hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-[max(2rem,env(safe-area-inset-bottom))] space-y-4">
        {section === 'profile' && <ProfileSection userStats={userStats} onUpdateUserStats={onUpdateUserStats} theme={theme} />}
        {section === 'themes' && <ThemePicker currentThemeId={themeId} onApply={onApplyTheme} theme={theme} />}
        {section === 'goals' && <GoalsSection userStats={userStats} onUpdateUserStats={onUpdateUserStats} theme={theme} />}
        {section === 'notifications' && <NotificationSettings theme={theme} getContext={getNotificationContext} />}
        {section === 'other' && <OtherSettingsSection theme={theme} />}
      </div>
    </div>
  );
};
