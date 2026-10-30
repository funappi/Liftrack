import React from 'react';
import { Settings } from 'lucide-react';
import { UserStats } from '../types';

interface HeaderProps {
  userStats: UserStats;
  onOpenSettings: () => void;
  onOpenProfile: () => void;
  theme?: 'dark' | 'warm-light';
}

const DEFAULT_AVATAR = `${import.meta.env.BASE_URL}img/photo-1534528741775-53994a69daeb-200.jpg`;

export const Header: React.FC<HeaderProps> = ({ userStats, onOpenSettings, onOpenProfile, theme = 'dark' }) => {
  const isLight = theme === 'warm-light';
  const firstName = (userStats.name || '').trim().split(/\s+/)[0] || 'toi';

  return (
    <header
      className={`sticky top-0 z-30 backdrop-blur-md px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-3 border-b flex items-center justify-between transition-colors duration-200 ${
        isLight ? 'bg-[#f3dfcb]/98 border-[#7d5a47]/20' : 'bg-[#161311]/98 border-[#3e342b]/80'
      }`}
    >
      {/* Avatar & greeting: tap opens the profile */}
      <button type="button" onClick={onOpenProfile} className="flex items-center gap-3 min-w-0 text-left cursor-pointer" title="Mon profil">
        <span
          className={`relative w-10 h-10 rounded-full overflow-hidden ring-2 shrink-0 transition-all ${
            isLight ? 'ring-[#b85d38]/60' : 'ring-[#c05a3e]/60'
          }`}
        >
          <img src={userStats.avatarUrl || DEFAULT_AVATAR} alt={firstName} className="w-full h-full object-cover" />
        </span>
        <h1
          className={`text-base font-extrabold tracking-tight leading-none truncate ${isLight ? 'text-[#3d2317]' : 'text-[#f7eee4]'}`}
        >
          Bonjour {firstName}
        </h1>
      </button>

      <button
        type="button"
        id="btn-open-settings"
        onClick={onOpenSettings}
        aria-label="Paramètres"
        title="Paramètres"
        className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all cursor-pointer shrink-0 ${
          isLight
            ? 'bg-[#faebe0] border-[#7d5a47]/30 text-[#3d2317] hover:border-[#b85d38]'
            : 'bg-[#211b17] border-[#3e342b]/80 text-[#f7eee4] hover:border-[#d97706]/60'
        }`}
      >
        <Settings className="w-5 h-5" />
      </button>
    </header>
  );
};
