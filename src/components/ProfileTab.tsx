import React, { useState } from 'react';
import { User, QrCode, Shield, Settings, History, Target, ChevronRight, Zap, Flame, Bell, Volume2, Award, LogOut, Edit3, Mail } from 'lucide-react';
import { UserStats } from '../types';
import { EditProfileModal } from './EditProfileModal';

interface ProfileTabProps {
  userStats: UserStats;
  onUpdateUserStats?: (updated: Partial<UserStats>) => void;
  onNavigateToTab: (tab: 'progress' | 'workouts') => void;
  theme?: 'dark' | 'warm-light';
}

export const ProfileTab: React.FC<ProfileTabProps> = ({
  userStats,
  onUpdateUserStats,
  onNavigateToTab,
  theme,
}) => {
  const isLight = theme === 'warm-light';
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [hapticEnabled, setHapticEnabled] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [showQrModal, setShowQrModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  return (
    <div className="pb-36 pt-2 px-4 space-y-6 max-w-lg mx-auto">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <span className="text-xs font-black uppercase tracking-widest text-[#A7A7A7]">
            ESPACE MEMBRE
          </span>
          <h2 className="text-2xl font-black text-white tracking-tight uppercase">
            Profil Athlète
          </h2>
        </div>

        <button
          type="button"
          id="btn-edit-profile-top"
          onClick={() => setShowEditModal(true)}
          className="px-3.5 py-2 rounded-xl bg-[#1C1C1C] hover:bg-[#252525] border border-white/10 hover:border-[#EC4899]/50 text-xs font-bold text-white flex items-center gap-1.5 transition-all cursor-pointer"
        >
          <Edit3 className="w-3.5 h-3.5 text-[#EC4899]" />
          <span>Modifier</span>
        </button>
      </div>

      {/* Athlete Identity Card */}
      <div className="p-5 rounded-2xl bg-[#181818] border border-white/[0.08] relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-36 h-36 bg-gradient-to-bl from-[#EC4899]/20 via-transparent to-transparent rounded-bl-full pointer-events-none" />

        <div className="flex items-center gap-4">
          <div 
            onClick={() => setShowEditModal(true)}
            className="relative w-16 h-16 rounded-full overflow-hidden ring-2 ring-[#EC4899] shadow-lg shrink-0 cursor-pointer group"
            title="Cliquer pour changer de photo"
          >
            <img
              src={userStats.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80"}
              alt={userStats.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              <Edit3 className="w-4 h-4 text-white" />
            </div>
          </div>

          <div className="space-y-1 flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-[#7C3AED] to-[#EC4899] text-white font-black text-[10px] uppercase tracking-wider">
                {userStats.role}
              </span>
              <span className="text-[10px] text-emerald-400 font-bold uppercase">● EN LIGNE</span>
            </div>

            <h3 className="text-xl font-black text-white uppercase tracking-tight truncate">
              {userStats.name}
            </h3>

            {userStats.email && (
              <p className="text-xs text-[#00C6FF] font-mono flex items-center gap-1 truncate">
                <Mail className="w-3 h-3 shrink-0" />
                <span>{userStats.email}</span>
              </p>
            )}

            <p className="text-xs text-[#A7A7A7] font-medium">
              Membre {userStats.membership?.type || 'VOLT Black'} depuis 2025
            </p>
          </div>
        </div>

        {/* Button to edit account details */}
        <div className="pt-3 mt-3 border-t border-white/[0.06]">
          <button
            type="button"
            onClick={() => setShowEditModal(true)}
            className="w-full py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-white flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5 text-[#EC4899]" />
            <span>Modifier mes informations (Nom, email, objectif, poids)</span>
          </button>
        </div>

        {/* Quick Numbers Bar */}
        <div className="grid grid-cols-3 gap-2 pt-4 mt-3 border-t border-white/[0.06] text-center">
          <div>
            <span className="text-xl font-black text-white">{userStats.totalWorkouts}</span>
            <span className="text-[10px] font-bold text-[#A7A7A7] uppercase block">Séances</span>
          </div>
          <div>
            <span className="text-xl font-black text-gradient-energy">{userStats.streakDays}j</span>
            <span className="text-[10px] font-bold text-[#A7A7A7] uppercase block">Série</span>
          </div>
          <div>
            <span className="text-xl font-black text-[#00C6FF]">{userStats.voltScore}</span>
            <span className="text-[10px] font-bold text-[#A7A7A7] uppercase block">VOLT Score</span>
          </div>
        </div>
      </div>

      {/* Digital Membership Pass (VOLT Black Pass) */}
      <div 
        onClick={() => setShowQrModal(true)}
        className="group p-5 rounded-2xl bg-gradient-to-br from-[#181818] via-[#121212] to-[#202020] border border-white/[0.12] hover:border-[#EC4899]/50 transition-all cursor-pointer relative overflow-hidden shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-black tracking-widest text-[#EC4899] uppercase">
              <Shield className="w-4 h-4" />
              <span>{userStats.membership.type}</span>
            </div>
            <h4 className="text-base font-black text-white uppercase tracking-tight">
              Badge d'accès club 24/7
            </h4>
            <p className="text-xs text-[#A7A7A7]">
              Valide jusqu'au {userStats.membership.validUntil}
            </p>
          </div>

          <div className="w-14 h-14 rounded-xl bg-white p-2 flex items-center justify-center shrink-0 shadow-lg group-hover:scale-105 transition-transform">
            <QrCode className="w-full h-full text-black" />
          </div>
        </div>

        <div className="mt-3 pt-2 border-t border-white/[0.06] flex items-center justify-between text-[11px] font-bold text-[#A7A7A7]">
          <span>ID: {userStats.membership.qrCodeId}</span>
          <span className="text-white flex items-center gap-1 group-hover:text-[#EC4899] transition-colors">
            Afficher le QR code <ChevronRight className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>

      {/* Navigation Sections Menu */}
      <div className="space-y-2">
        {/* Statistiques & Graphiques */}
        <div
          onClick={() => onNavigateToTab('progress')}
          className="p-4 rounded-xl bg-[#181818] border border-white/[0.06] hover:border-white/20 transition-all flex items-center justify-between cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#7C3AED]/20 text-[#EC4899] flex items-center justify-center">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h5 className="text-sm font-black text-white uppercase">Statistiques & Records</h5>
              <p className="text-xs text-[#A7A7A7]">Charges 1RM, évolution corporelle, badges</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[#A7A7A7]" />
        </div>

        {/* Objectifs */}
        <div
          onClick={() => onNavigateToTab('workouts')}
          className="p-4 rounded-xl bg-[#181818] border border-white/[0.06] hover:border-white/20 transition-all flex items-center justify-between cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#00C6FF]/20 text-[#00C6FF] flex items-center justify-center">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h5 className="text-sm font-black text-white uppercase">Objectifs de la saison</h5>
              <p className="text-xs text-[#A7A7A7]">85 kg poids cible • 5 séances par semaine</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[#A7A7A7]" />
        </div>

        {/* Historique des séances */}
        <div
          onClick={() => onNavigateToTab('progress')}
          className="p-4 rounded-xl bg-[#181818] border border-white/[0.06] hover:border-white/20 transition-all flex items-center justify-between cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#FF512F]/20 text-[#FF512F] flex items-center justify-center">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h5 className="text-sm font-black text-white uppercase">Historique des séances</h5>
              <p className="text-xs text-[#A7A7A7]">38 séances enregistrées dans l'app</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[#A7A7A7]" />
        </div>
      </div>

      {/* Application Settings & Preferences */}
      <div className="p-4 rounded-2xl bg-[#181818] border border-white/[0.06] space-y-3">
        <h5 className="text-xs font-black text-[#A7A7A7] uppercase tracking-wider">
          PARAMÈTRES DE L'EXPÉRIENCE
        </h5>

        <div className="space-y-3">
          {/* Sounds */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Volume2 className="w-4 h-4 text-[#EC4899]" />
              <span className="text-xs font-bold text-white">Effets sonores & Bip de repos</span>
            </div>
            <input
              type="checkbox"
              checked={soundEnabled}
              onChange={(e) => setSoundEnabled(e.target.checked)}
              className="accent-[#EC4899] w-4 h-4 cursor-pointer"
            />
          </div>

          {/* Haptic */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Zap className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold text-white">Vibrations haptiques (Série validée)</span>
            </div>
            <input
              type="checkbox"
              checked={hapticEnabled}
              onChange={(e) => setHapticEnabled(e.target.checked)}
              className="accent-[#EC4899] w-4 h-4 cursor-pointer"
            />
          </div>

          {/* Notifications */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Bell className="w-4 h-4 text-[#00C6FF]" />
              <span className="text-xs font-bold text-white">Rappels de séance programmée</span>
            </div>
            <input
              type="checkbox"
              checked={notificationsEnabled}
              onChange={(e) => setNotificationsEnabled(e.target.checked)}
              className="accent-[#EC4899] w-4 h-4 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Version & Brand Footer */}
      <div className="text-center pt-2 text-[#A7A7A7] space-y-1">
        <p className="text-[11px] font-black uppercase tracking-widest text-white">
          VOLT GYM // VERSION 2.4.0 (OLED DARK)
        </p>
        <p className="text-[10px]">TRAIN HARDER. BECOME STRONGER.</p>
      </div>

      {/* QR Code Modal for Gym Entrance */}
      {showQrModal && (
        <div className={`fixed inset-0 z-50 flex items-center justify-center p-5 animate-in fade-in duration-150 ${
          isLight ? 'bg-[#3d2317]/65 backdrop-blur-xl' : 'bg-black/85 backdrop-blur-md'
        }`}>
          <div className={`w-full max-w-xs rounded-3xl p-6 text-center space-y-4 shadow-2xl animate-in zoom-in-95 border transition-colors ${
            isLight ? 'bg-[#faebe0] border-[#7d5a47]/20 text-[#3d2317]' : 'bg-[#181818] border-white/15 text-white'
          }`}>
            <span className="text-xs font-black uppercase text-[#EC4899] tracking-widest">
              VOLT CLUB ACCESS
            </span>
            <h3 className={`text-xl font-black uppercase ${isLight ? 'text-[#3d2317]' : 'text-white'}`}>
              Portique d'entrée
            </h3>

            <div className={`w-48 h-48 mx-auto p-4 rounded-2xl shadow-xl flex items-center justify-center border ${
              isLight ? 'bg-[#fff7f0] border-[#7d5a47]/15' : 'bg-white'
            }`}>
              <QrCode className="w-full h-full text-black" />
            </div>

            <div className="space-y-1 text-xs">
              <p className={`font-bold uppercase ${isLight ? 'text-[#3d2317]' : 'text-white'}`}>{userStats.name}</p>
              <p className={`font-mono ${isLight ? 'text-[#7d5a47]' : 'text-[#A7A7A7]'}`}>{userStats.membership.qrCodeId}</p>
              <p className="text-emerald-500 font-bold pt-1">● ACCÈS AUTORISÉ 24/7</p>
            </div>

            <button
              onClick={() => setShowQrModal(false)}
              className={`w-full py-3 rounded-xl text-xs font-black uppercase transition-all border ${
                isLight
                  ? 'bg-[#f0ded0] text-[#7d5a47] hover:text-[#3d2317] hover:bg-[#fff3ea] border-[#7d5a47]/20'
                  : 'bg-[#202020] text-white hover:bg-white/10 border-transparent'
              }`}
            >
              Fermer
            </button>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {showEditModal && onUpdateUserStats && (
        <EditProfileModal
          userStats={userStats}
          onSave={onUpdateUserStats}
          onClose={() => setShowEditModal(false)}
          theme={theme}
        />
      )}
    </div>
  );
};
