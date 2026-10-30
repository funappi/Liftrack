import React, { useEffect, useState } from 'react';
import { X, Play, Minus, Plus, Timer } from 'lucide-react';
import { Workout } from '../types';

interface QuickLaunchModalProps {
  workouts: Workout[];
  onStart: (workout: Workout) => void;
  onClose: () => void;
  onCreate: () => void;
  theme?: 'dark' | 'warm-light';
}

const COUNTDOWN_KEY = 'volt_launch_countdown';
const MIN_COUNTDOWN = 0;
const MAX_COUNTDOWN = 30;

const loadCountdown = (): number => {
  try {
    const raw = localStorage.getItem(COUNTDOWN_KEY);
    if (raw !== null) {
      const saved = Number(raw);
      if (Number.isFinite(saved) && saved >= MIN_COUNTDOWN && saved <= MAX_COUNTDOWN) return saved;
    }
  } catch {
    // ignore
  }
  return 3;
};

export const QuickLaunchModal: React.FC<QuickLaunchModalProps> = ({
  workouts,
  onStart,
  onClose,
  onCreate,
  theme = 'dark',
}) => {
  const isLight = theme === 'warm-light';
  const [countdownSetting, setCountdownSetting] = useState<number>(loadCountdown);
  const [pending, setPending] = useState<Workout | null>(null);
  const [remaining, setRemaining] = useState(0);

  const updateCountdown = (value: number) => {
    const next = Math.min(MAX_COUNTDOWN, Math.max(MIN_COUNTDOWN, value));
    setCountdownSetting(next);
    try {
      localStorage.setItem(COUNTDOWN_KEY, String(next));
    } catch {
      // ignore
    }
  };

  const handlePick = (workout: Workout) => {
    if (countdownSetting === 0) {
      onStart(workout);
      return;
    }
    setPending(workout);
    setRemaining(countdownSetting);
  };

  useEffect(() => {
    if (!pending) return;
    if (remaining <= 0) {
      onStart(pending);
      return;
    }
    const timer = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(timer);
  }, [pending, remaining, onStart]);

  const panel = isLight ? 'bg-[#faebe0] border-[#7d5a47]/20 text-[#3d2317]' : 'bg-[#161616] border-white/15 text-white';
  const row = isLight ? 'bg-white border-[#7d5a47]/15 hover:border-[#b85d38]' : 'bg-[#211b17] border-[#3e342b]/80 hover:border-[#d97706]/60';
  const muted = isLight ? 'text-[#7d5a47]' : 'text-[#ab9a8a]';

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={pending ? undefined : onClose}
    >
      <div
        className={`w-full max-w-sm rounded-3xl border p-5 space-y-4 shadow-2xl ${panel}`}
        onClick={(e) => e.stopPropagation()}
      >
        {pending ? (
          <div className="flex flex-col items-center gap-4 py-6">
            <p className={`text-xs font-bold uppercase tracking-widest ${muted}`}>{pending.title}</p>
            <div className="text-7xl font-black tabular-nums text-[#d97706]">{remaining}</div>
            <p className={`text-xs ${muted}`}>La séance démarre…</p>
            <div className="flex gap-2 w-full">
              <button
                type="button"
                onClick={() => setPending(null)}
                className="flex-1 py-2.5 rounded-xl border border-white/15 text-xs font-black uppercase tracking-wider cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => onStart(pending)}
                className="flex-1 py-2.5 rounded-xl bg-[#c05a3e] text-xs font-black uppercase tracking-wider text-white cursor-pointer"
              >
                Démarrer
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-black tracking-tight">Mes séances créées</h2>
              <button type="button" onClick={onClose} className="p-1 cursor-pointer" aria-label="Fermer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {workouts.length === 0 ? (
              <div className="py-6 text-center space-y-3">
                <p className={`text-sm ${muted}`}>Tu n&apos;as pas encore créé de séance.</p>
                <button
                  type="button"
                  onClick={onCreate}
                  className="px-4 py-2 rounded-xl bg-[#c05a3e] text-xs font-black uppercase tracking-wider text-white cursor-pointer"
                >
                  Créer une séance
                </button>
              </div>
            ) : (
              <ul className="space-y-2 max-h-64 overflow-y-auto">
                {workouts.map((w) => (
                  <li key={w.id}>
                    <button
                      type="button"
                      onClick={() => handlePick(w)}
                      className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border text-left transition-colors cursor-pointer ${row}`}
                    >
                      <span className="min-w-0">
                        <span className="block text-sm font-extrabold truncate">{w.title}</span>
                        <span className={`block text-[11px] ${muted}`}>
                          {w.durationMin} min · {w.exercises.length} exercice{w.exercises.length > 1 ? 's' : ''}
                        </span>
                      </span>
                      <Play className="w-4 h-4 shrink-0 text-[#d97706] fill-[#d97706]" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className={`flex items-center justify-between pt-3 border-t ${isLight ? 'border-[#7d5a47]/15' : 'border-white/10'}`}>
              <span className={`flex items-center gap-1.5 text-xs font-bold ${muted}`}>
                <Timer className="w-3.5 h-3.5" />
                Décompte
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => updateCountdown(countdownSetting - 1)}
                  className="w-7 h-7 rounded-full border border-white/15 flex items-center justify-center cursor-pointer"
                  aria-label="Réduire le décompte"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="w-10 text-center text-sm font-black tabular-nums">{countdownSetting}s</span>
                <button
                  type="button"
                  onClick={() => updateCountdown(countdownSetting + 1)}
                  className="w-7 h-7 rounded-full border border-white/15 flex items-center justify-center cursor-pointer"
                  aria-label="Augmenter le décompte"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
