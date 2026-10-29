import React, { useState } from 'react';
import { X, User, Mail, Shield, Scale, Target, Camera, Check, Sparkles } from 'lucide-react';
import { UserStats } from '../types';

interface EditProfileModalProps {
  userStats: UserStats;
  onSave: (updated: Partial<UserStats>) => void;
  onClose: () => void;
  theme?: 'dark' | 'warm-light';
}

const AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80',
];

const ROLES = [
  'ATHLÈTE ÉLITE',
  'FORCE ATHLÉTIQUE',
  'HYPERTROPHIE PRO',
  'CROSS-TRAINING',
  'ATHLÈTE HYBRIDE',
  'NOUVEAU MEMBRE',
];

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  userStats,
  onSave,
  onClose,
  theme,
}) => {
  const isLight = theme === 'warm-light';
  const [name, setName] = useState(userStats.name || 'Alexandre');
  const [email, setEmail] = useState(userStats.email || 'alexandre@volt.gym');
  const [role, setRole] = useState(userStats.role || 'ATHLÈTE ÉLITE');
  const [avatarUrl, setAvatarUrl] = useState(
    userStats.avatarUrl || AVATAR_PRESETS[0]
  );
  const [currentWeightKg, setCurrentWeightKg] = useState(userStats.currentWeightKg || 82);
  const [targetWeightKg, setTargetWeightKg] = useState(userStats.targetWeightKg || 85);
  const [membershipType, setMembershipType] = useState(
    userStats.membership?.type || 'VOLT BLACK PASS'
  );
  const [goalDescription, setGoalDescription] = useState(
    userStats.nextGoal?.description || '+3 kg de masse musculaire sèche'
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSave({
      name: name.trim(),
      email: email.trim(),
      role,
      avatarUrl,
      currentWeightKg: Number(currentWeightKg) || 80,
      targetWeightKg: Number(targetWeightKg) || 85,
      membership: {
        ...userStats.membership,
        type: membershipType,
      },
      nextGoal: {
        ...userStats.nextGoal,
        current: Number(currentWeightKg) || 80,
        target: Number(targetWeightKg) || 85,
        description: goalDescription,
      },
    });

    onClose();
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150 ${
      isLight ? 'bg-[#3d2317]/65 backdrop-blur-xl' : 'bg-black/85 backdrop-blur-md'
    }`}>
      <div className={`w-full max-w-md rounded-3xl p-6 space-y-5 shadow-2xl relative my-auto border transition-colors ${
        isLight ? 'bg-[#faebe0] border-[#7d5a47]/20 text-[#3d2317]' : 'bg-[#161616] border-white/10 text-white'
      }`}>
        {/* Top Header */}
        <div className={`flex items-center justify-between pb-3 border-b ${
          isLight ? 'border-[#7d5a47]/15' : 'border-white/[0.08]'
        }`}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#7C3AED] to-[#EC4899] flex items-center justify-center text-white">
              <User className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-[#EC4899] block">
                COMPTE ATHLÈTE
              </span>
              <h3 className={`text-lg font-black uppercase tracking-tight ${isLight ? 'text-[#3d2317]' : 'text-white'}`}>
                Modifier mes informations
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className={`p-1.5 rounded-full transition-colors border ${
              isLight
                ? 'bg-[#f3dfcb] hover:bg-[#fff3ea] text-[#7d5a47] hover:text-[#3d2317] border-[#7d5a47]/20'
                : 'bg-white/5 hover:bg-white/15 text-[#A7A7A7] hover:text-white border-transparent'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Avatar Selector */}
          <div className="space-y-2">
            <label className="text-[11px] font-black uppercase text-[#A7A7A7] tracking-wider block">
              Photo de profil
            </label>
            <div className="flex items-center gap-3">
              <img
                src={avatarUrl}
                alt={name}
                className="w-14 h-14 rounded-full object-cover ring-2 ring-[#EC4899] shadow-lg shrink-0"
              />
              <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
                {AVATAR_PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setAvatarUrl(preset)}
                    className={`w-10 h-10 rounded-full overflow-hidden border-2 transition-all shrink-0 ${
                      avatarUrl === preset
                        ? 'border-[#EC4899] scale-105 ring-2 ring-[#EC4899]/50'
                        : 'border-white/20 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={preset} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Prénom & Nom */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-black uppercase text-[#A7A7A7] tracking-wider flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-[#EC4899]" />
              <span>Ton Nom / Prénom</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Alexandre"
              className="w-full bg-[#1F1F1F] border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white font-bold placeholder:text-white/30 focus:outline-none focus:border-[#EC4899] transition-colors"
            />
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-black uppercase text-[#A7A7A7] tracking-wider flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-[#00C6FF]" />
              <span>Adresse Email</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="alexandre@volt.gym"
              className="w-full bg-[#1F1F1F] border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#00C6FF] transition-colors font-mono"
            />
          </div>

          {/* Rôle / Statut */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-black uppercase text-[#A7A7A7] tracking-wider flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-amber-400" />
              <span>Statut Athlète</span>
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full bg-[#1F1F1F] border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white font-bold focus:outline-none focus:border-amber-400 transition-colors"
            >
              {ROLES.map((r) => (
                <option key={r} value={r} className="bg-[#1F1F1F] text-white">
                  {r}
                </option>
              ))}
            </select>
          </div>

          {/* Double Poids : Actuel & Cible */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[11px] font-black uppercase text-[#A7A7A7] tracking-wider flex items-center gap-1">
                <Scale className="w-3 h-3 text-[#EC4899]" />
                <span>Poids Actuel</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  min="30"
                  max="250"
                  value={currentWeightKg}
                  onChange={(e) => setCurrentWeightKg(parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#1F1F1F] border border-white/15 rounded-xl px-3 py-2 text-sm text-white font-black font-mono focus:outline-none focus:border-[#EC4899]"
                />
                <span className="absolute right-3 top-2.5 text-xs text-[#A7A7A7] font-bold">
                  KG
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-black uppercase text-[#A7A7A7] tracking-wider flex items-center gap-1">
                <Target className="w-3 h-3 text-emerald-400" />
                <span>Poids Cible</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  min="30"
                  max="250"
                  value={targetWeightKg}
                  onChange={(e) => setTargetWeightKg(parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#1F1F1F] border border-white/15 rounded-xl px-3 py-2 text-sm text-white font-black font-mono focus:outline-none focus:border-emerald-400"
                />
                <span className="absolute right-3 top-2.5 text-xs text-[#A7A7A7] font-bold">
                  KG
                </span>
              </div>
            </div>
          </div>

          {/* Description Objectif */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-black uppercase text-[#A7A7A7] tracking-wider block">
              Description de ton objectif
            </label>
            <input
              type="text"
              value={goalDescription}
              onChange={(e) => setGoalDescription(e.target.value)}
              placeholder="Ex: Prise de masse sèche + force"
              className="w-full bg-[#1F1F1F] border border-white/15 rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-white/30"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-2 space-y-2">
            <button
              type="submit"
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#EC4899] text-white font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg glow-main hover:brightness-110 active:scale-98 transition-all cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Enregistrer les modifications</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-transparent hover:bg-white/5 text-xs font-bold text-[#A7A7A7] uppercase transition-colors"
            >
              Annuler
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
