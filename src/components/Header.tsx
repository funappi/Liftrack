import React from 'react';
import { Flame, Dumbbell, Sun, Moon } from 'lucide-react';
import { UserStats } from '../types';

interface HeaderProps {
  userStats: UserStats;
  onStartQuickWorkout?: () => void;
  theme?: 'dark' | 'warm-light';
  onToggleTheme?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  userStats,
  onStartQuickWorkout,
  theme = 'dark',
  onToggleTheme,
}) => {
  const isLight = theme === 'warm-light';

  return (
    <header className={`sticky top-0 z-30 backdrop-blur-md px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-3 border-b flex items-center justify-between transition-colors duration-200 ${
      isLight ? 'bg-[#f3dfcb]/98 border-[#7d5a47]/20' : 'bg-[#161311]/98 border-[#3e342b]/80'
    }`}>
      {/* Brand & User Greeting */}
      <div className="flex items-center gap-3">
        <div 
          className={`relative w-10 h-10 rounded-full overflow-hidden ring-2 transition-all ${
            isLight ? 'ring-[#b85d38]/60 hover:ring-[#b85d38]' : 'ring-[#c05a3e]/60 hover:ring-[#d97706]'
          }`}
        >
          <img 
            src={`${import.meta.env.BASE_URL}img/photo-1534528741775-53994a69daeb-200.jpg`} 
            alt="Paul" 
            className="w-full h-full object-cover"
          />
          <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 ${
            isLight ? 'border-[#f3dfcb]' : 'border-[#161311]'
          }`}></span>
        </div>

        <div>
          <div className="flex items-center gap-1.5">
            <span className={`text-xs font-bold tracking-widest uppercase ${
              isLight ? 'text-[#7d5a47]' : 'text-[#ab9a8a]'
            }`}>VOLT ATHLETE</span>
          </div>
          <h1 className={`text-base font-extrabold tracking-tight leading-none ${
            isLight ? 'text-[#3d2317]' : 'text-[#f7eee4]'
          }`}>
            Bonjour Paul
          </h1>
        </div>
      </div>

      {/* Right Action Widgets */}
      <div className="flex items-center gap-1.5">
        {/* Theme Switcher Toggle (#f3dfcb Crème vs Velours Cuir) */}
        {onToggleTheme && (
          <button
            type="button"
            id="btn-toggle-theme"
            onClick={onToggleTheme}
            className={`px-2.5 py-1.5 rounded-full border flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer ${
              isLight
                ? 'bg-[#faebe0] border-[#7d5a47]/30 text-[#3d2317] hover:border-[#b85d38]'
                : 'bg-[#211b17] border-[#3e342b]/80 text-[#f7eee4] hover:border-[#d97706]/60'
            }`}
            title={isLight ? "Basculer en mode sombre Velours Cuir" : "Basculer en mode Crème (#f3dfcb)"}
          >
            {isLight ? (
              <>
                <Moon className="w-3.5 h-3.5 text-[#3d2317] fill-[#3d2317]" />
                <span className="text-[10px] hidden xs:inline font-bold">Cuir</span>
              </>
            ) : (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                <span className="text-[10px] hidden xs:inline text-amber-200 font-bold">Crème</span>
              </>
            )}
          </button>
        )}

        {/* Quick Exercice Button */}
        {onStartQuickWorkout && (
          <button 
            id="btn-header-quick-workout"
            onClick={onStartQuickWorkout}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full active:scale-95 text-xs font-black text-white shadow-md transition-all cursor-pointer ${
              isLight ? 'bg-[#b85d38] hover:bg-[#a04e2e]' : 'bg-[#c05a3e] hover:bg-[#a84d33]'
            }`}
            title="Lancer une de mes séances créées"
          >
            <Dumbbell className="w-3.5 h-3.5 stroke-[2.5]" />
            <span className="hidden xs:inline">Exercice</span>
          </button>
        )}

        {/* Streak Pill */}
        <div 
          title="Série en cours"
          className={`flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-extrabold ${
            isLight
              ? 'bg-[#faebe0] border-[#7d5a47]/20 text-amber-600'
              : 'bg-[#211b17] border-[#3e342b]/80 text-amber-400'
          }`}
        >
          <Flame className="w-3 h-3 fill-amber-500 text-amber-500" />
          <span className="text-[11px]">{userStats.streakDays}J</span>
        </div>
      </div>
    </header>
  );
};
