import React from 'react';
import { Home, Dumbbell, TrendingUp } from 'lucide-react';
import { TabType } from '../types';

interface NavbarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  theme?: 'dark' | 'warm-light';
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, onTabChange, theme = 'dark' }) => {
  const isLight = theme === 'warm-light';

  // Ordered: Exercice (gauche), Accueil (milieu), Progression (droite)
  const tabs: { id: TabType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'workouts', label: 'Exercice', icon: Dumbbell },
    { id: 'home', label: 'Accueil', icon: Home },
    { id: 'progress', label: 'Progression', icon: TrendingUp },
  ];

  return (
    <nav
      className={`fixed bottom-0 left-0 right-0 z-40 backdrop-blur-md border-t px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] max-w-lg mx-auto transition-colors duration-200 shadow-2xl ${
        isLight
          ? 'bg-white border-[#7d5a47]/15'
          : 'bg-[#161311]/98 border-[#3e342b]/80'
      }`}
    >
      <div className="grid grid-cols-3 items-stretch">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              id={`tab-btn-${tab.id}`}
              onClick={() => onTabChange(tab.id)}
              className={`w-full min-h-11 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all duration-200 relative cursor-pointer ${
                isActive 
                  ? isLight ? 'text-[#3d2317]' : 'text-[#f7eee4]' 
                  : isLight ? 'text-[#7d5a47] hover:text-[#3d2317]' : 'text-[#ab9a8a] hover:text-[#f7eee4]'
              }`}
            >
              <div className="relative">
                <Icon
                  className={`w-5 h-5 transition-transform duration-200 ${
                    isActive 
                      ? isLight ? 'scale-110 text-[#b85d38]' : 'scale-110 text-[#d97706]' 
                      : 'scale-100'
                  }`}
                />
              </div>

              <span
                className={`text-[10px] font-bold tracking-tight mt-1 transition-all ${
                  isActive 
                    ? isLight ? 'text-[#3d2317] font-extrabold' : 'text-[#f7eee4] font-extrabold' 
                    : isLight ? 'text-[#7d5a47]' : 'text-[#ab9a8a]'
                }`}
              >
                {tab.label}
              </span>

              {isActive && (
                <div className={`absolute -bottom-1 w-5 h-0.5 rounded-full ${
                  isLight 
                    ? 'bg-gradient-to-r from-[#b85d38] to-[#d97706]' 
                    : 'bg-gradient-to-r from-[#c05a3e] to-[#d97706]'
                }`} />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
