import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { UserStats } from '../types';
import { useVoltData } from '../data/VoltDataContext';
import {
  CoachMessage,
  CoachPeriod,
  MASCOTS,
  MASCOT_ORDER,
  MascotId,
  buildCoachMessage,
  computeCoachFacts,
  defaultCoachPeriod,
  loadMascot,
  saveMascot,
} from '../utils/coach';

const PERIODS: { id: CoachPeriod; label: string }[] = [
  { id: 'day', label: 'Jour' },
  { id: 'week', label: 'Semaine' },
  { id: 'month', label: 'Mois' },
];

const RING: Record<CoachMessage['mood'], string> = {
  proud: 'from-[#F59E0B] to-[#EC4899]',
  push: 'from-[#7C3AED] to-[#EC4899]',
  soft: 'from-[#00C6FF] to-[#7C3AED]',
};

const imageUrl = (id: MascotId) => `${import.meta.env.BASE_URL}${MASCOTS[id].image}`;

/** Home screen coach: a cartoon mascot commenting on the day, week or month stats */
export const MascotCoach: React.FC<{ userStats: UserStats }> = ({ userStats }) => {
  const { data } = useVoltData();
  const facts = useMemo(() => computeCoachFacts(data, userStats), [data, userStats]);

  const [mascot, setMascot] = useState<MascotId>(loadMascot);
  const [period, setPeriod] = useState<CoachPeriod>(() => defaultCoachPeriod(facts));
  const [message, setMessage] = useState<CoachMessage | null>(null);
  const [hop, setHop] = useState(0);

  // Stats objects are rebuilt on every render upstream: compare by content
  const factsKey = JSON.stringify(facts);
  const factsRef = useRef(facts);
  factsRef.current = facts;

  const draw = useCallback(() => {
    setMessage(buildCoachMessage(factsRef.current, period, mascot, (Math.random() * 2 ** 31) | 0));
  }, [period, mascot]);

  // New sentence whenever the stats, the period or the mascot change
  useEffect(draw, [draw, factsKey]);

  const another = () => {
    draw();
    setHop((h) => h + 1);
  };

  const chooseMascot = (id: MascotId) => {
    if (id === mascot) return another();
    setMascot(id);
    saveMascot(id);
    setHop((h) => h + 1);
  };

  const mood = message?.mood ?? 'push';

  return (
    <div id="mascot-coach" className="p-4 rounded-2xl bg-[#181818] border border-white/[0.08] shadow-xl">
      <div className="flex gap-3.5">
        {/* Avatar: tap for another sentence */}
        <div className="flex flex-col items-center gap-2 shrink-0">
          <button
            onClick={another}
            title="Une autre phrase"
            aria-label={`${MASCOTS[mascot].name}, une autre phrase`}
            className="mascot-bob rounded-full"
          >
            <span
              key={`${mascot}-${hop}`}
              className={`block p-[3px] rounded-full bg-gradient-to-br ${RING[mood]} ${hop ? 'mascot-hop' : ''}`}
            >
              <img
                src={imageUrl(mascot)}
                alt={MASCOTS[mascot].name}
                width={80}
                height={80}
                className="w-20 h-20 rounded-full object-cover bg-[#e9f0f7] border-2 border-[#181818]"
              />
            </span>
          </button>
          {/* Mascot switcher */}
          <div className="flex gap-1">
            {MASCOT_ORDER.map((id) => (
              <button
                key={id}
                onClick={() => chooseMascot(id)}
                title={MASCOTS[id].name}
                aria-label={`Choisir ${MASCOTS[id].name}`}
                aria-pressed={id === mascot}
                className={`rounded-full transition-all ${id === mascot ? 'ring-2 ring-[#EC4899] scale-110' : 'opacity-50 hover:opacity-100'}`}
              >
                <img src={imageUrl(id)} alt="" width={22} height={22} className="w-[22px] h-[22px] rounded-full object-cover bg-[#e9f0f7]" />
              </button>
            ))}
          </div>
        </div>

        {/* Speech bubble */}
        <div className="flex-1 min-w-0 flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-2xs font-black uppercase tracking-widest text-[#EC4899] truncate">
              {MASCOTS[mascot].name} · ton coach
            </span>
            <button
              onClick={another}
              className="p-1.5 rounded-full text-[#A7A7A7] hover:text-white hover:bg-white/5 transition-colors"
              title="Une autre phrase"
              aria-label="Une autre phrase"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="relative">
            <span aria-hidden className="absolute -left-1.5 top-3 w-3 h-3 rotate-45 bg-white/[0.06] border-l border-b border-white/[0.08]" />
            <p
              key={message?.key + String(hop)}
              aria-live="polite"
              className="mascot-bubble-in relative rounded-2xl rounded-tl-md bg-white/[0.06] border border-white/[0.08] px-3.5 py-2.5 text-sm font-semibold text-white leading-snug"
            >
              {message?.text ?? '…'}
            </p>
          </div>

          <div className="flex gap-1 mt-auto" role="tablist" aria-label="Période">
            {PERIODS.map((p) => (
              <button
                key={p.id}
                role="tab"
                aria-selected={period === p.id}
                onClick={() => setPeriod(p.id)}
                className={`px-2.5 py-1 rounded-full text-2xs font-black uppercase tracking-wider transition-colors ${
                  period === p.id ? 'bg-[#EC4899] text-white' : 'bg-white/[0.05] text-[#A7A7A7] hover:text-white'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
