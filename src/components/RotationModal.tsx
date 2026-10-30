import React, { useState } from 'react';
import { X, ArrowUp, ArrowDown } from 'lucide-react';
import { Workout } from '../types';

interface RotationModalProps {
  workouts: Workout[];
  onSave: (order: string[]) => void;
  onClose: () => void;
  theme?: 'dark' | 'warm-light';
}

export const RotationModal: React.FC<RotationModalProps> = ({ workouts, onSave, onClose, theme = 'dark' }) => {
  const isLight = theme === 'warm-light';
  const [order, setOrder] = useState<Workout[]>(workouts);

  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= order.length) return;
    setOrder((prev) => {
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className={`w-full max-w-sm rounded-3xl border p-5 space-y-4 shadow-2xl ${
          isLight ? 'bg-[#faebe0] border-[#7d5a47]/20 text-[#3d2317]' : 'bg-[#161616] border-white/15 text-white'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-black tracking-tight">Ordre de rotation</h2>
          <button type="button" onClick={onClose} className="p-1 cursor-pointer" aria-label="Fermer">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-xs opacity-70">
          La séance recommandée suit cet ordre : après la séance faite hier, la suivante de la liste, puis on recommence.
        </p>

        {order.length === 0 ? (
          <p className="text-sm opacity-70 py-4 text-center">Crée d&apos;abord des séances pour définir une rotation.</p>
        ) : (
          <ol className="space-y-2 max-h-64 overflow-y-auto">
            {order.map((w, i) => (
              <li
                key={w.id}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl border ${
                  isLight ? 'bg-white border-[#7d5a47]/15' : 'bg-[#211b17] border-[#3e342b]/80'
                }`}
              >
                <span className="text-xs font-black w-4 text-[#d97706]">{i + 1}</span>
                <span className="flex-1 text-sm font-extrabold truncate">{w.title}</span>
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="p-1 disabled:opacity-30 cursor-pointer" aria-label="Monter">
                  <ArrowUp className="w-4 h-4" />
                </button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === order.length - 1} className="p-1 disabled:opacity-30 cursor-pointer" aria-label="Descendre">
                  <ArrowDown className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ol>
        )}

        <button
          type="button"
          onClick={() => {
            onSave(order.map((w) => w.id));
            onClose();
          }}
          className="w-full py-2.5 rounded-xl bg-[#c05a3e] text-xs font-black uppercase tracking-wider text-white cursor-pointer"
        >
          Enregistrer
        </button>
      </div>
    </div>
  );
};
