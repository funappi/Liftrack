import React, { useEffect, useState } from 'react';
import { Minus, Plus, X } from 'lucide-react';
import { UserStats } from '../../types';

export interface GoalsSectionProps {
  userStats: UserStats;
  onUpdateUserStats: (p: Partial<UserStats>) => void;
  theme: 'dark' | 'warm-light';
}

const VOLUME_STEP = 500;
const VOLUME_MIN = 500;
const VOLUME_MAX = 200000;
const VOLUME_START = 5000; // first value when "+" is pressed with no goal set
const WEIGHT_STEP = 0.5;
const WEIGHT_MIN = 30;
const WEIGHT_MAX = 250;

const parseNum = (s: string) => parseFloat(s.replace(',', '.').replace(/\s/g, ''));
const fmt = (n: number, decimals = 0) =>
  n.toLocaleString('fr-FR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

// Stepper with an editable value. `value === undefined` means empty (only when `allowEmpty`).
function Stepper({
  id,
  label,
  unit,
  value,
  step,
  min,
  max,
  decimals = 0,
  allowEmpty = false,
  emptyPlaceholder,
  startValue,
  onChange,
  isLight,
}: {
  id: string;
  label: string;
  unit: string;
  value: number | undefined;
  step: number;
  min: number;
  max: number;
  decimals?: number;
  allowEmpty?: boolean;
  emptyPlaceholder?: string;
  startValue?: number;
  onChange: (v: number | undefined) => void;
  isLight: boolean;
}) {
  const show = (v: number | undefined) => (v === undefined ? '' : fmt(v, decimals));
  const [draft, setDraft] = useState(show(value));
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    if (!focused) setDraft(show(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, focused]);

  const roundTo = (v: number) => Math.round(v / step) * step;
  const clamp = (v: number) => Math.min(max, Math.max(min, v));
  const commit = (v: number | undefined) => {
    if (v !== value) onChange(v);
  };

  const dec = () => {
    if (value === undefined) return;
    const next = roundTo(value - step);
    if (next < min) {
      if (allowEmpty) commit(undefined);
      return;
    }
    commit(clamp(next));
  };
  const inc = () => {
    if (value === undefined) {
      commit(startValue ?? min);
      return;
    }
    commit(clamp(roundTo(value + step)));
  };

  const btn = `w-11 h-11 shrink-0 rounded-xl flex items-center justify-center border transition-colors disabled:opacity-35 ${
    isLight
      ? 'bg-[#faebe0] border-[#7d5a47]/20 text-[#3d2317] active:bg-[#f4dfce]'
      : 'bg-white/[0.04] border-white/[0.08] text-white active:bg-white/[0.1]'
  }`;
  const muted = isLight ? 'text-[#7d5a47]' : 'text-[#A7A7A7]';

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className={`block text-[11px] font-black uppercase tracking-wider ${muted}`}>
        {label}
      </label>
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label={`Diminuer : ${label}`}
          className={btn}
          disabled={value === undefined || (!allowEmpty && value <= min)}
          onClick={dec}
        >
          <Minus className="w-4 h-4" />
        </button>
        <div
          className={`flex-1 min-w-0 h-11 rounded-xl border flex items-center justify-center gap-1 px-2 ${
            isLight ? 'bg-white/60 border-[#7d5a47]/20' : 'bg-[#101010] border-white/[0.08]'
          }`}
        >
          <input
            id={id}
            type="text"
            inputMode={decimals > 0 ? 'decimal' : 'numeric'}
            placeholder={emptyPlaceholder}
            value={draft}
            onFocus={() => setFocused(true)}
            onChange={(e) => {
              setDraft(e.target.value);
              const t = e.target.value.trim();
              if (t === '') {
                if (allowEmpty) commit(undefined);
                return;
              }
              const n = parseNum(t);
              if (Number.isFinite(n) && n >= min && n <= max) commit(Math.round(n * 10 ** decimals) / 10 ** decimals);
            }}
            onBlur={() => {
              setFocused(false);
              const t = draft.trim();
              if (t === '') {
                if (allowEmpty) commit(undefined);
                setDraft(show(allowEmpty ? undefined : value));
                return;
              }
              const n = parseNum(t);
              if (!Number.isFinite(n)) {
                setDraft(show(value));
                return;
              }
              const v = clamp(roundTo(n));
              commit(v);
              setDraft(show(v));
            }}
            className={`w-full min-w-0 bg-transparent text-center text-base font-black font-mono outline-none placeholder:font-bold placeholder:text-xs ${
              isLight ? 'text-[#3d2317] placeholder:text-[#7d5a47]/70' : 'text-white placeholder:text-[#A7A7A7]/70'
            }`}
          />
          {value !== undefined && <span className={`text-xs font-bold ${muted}`}>{unit}</span>}
        </div>
        <button
          type="button"
          aria-label={`Augmenter : ${label}`}
          className={btn}
          disabled={value !== undefined && value >= max}
          onClick={inc}
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export function GoalsSection({ userStats, onUpdateUserStats, theme }: GoalsSectionProps) {
  const isLight = theme === 'warm-light';
  const muted = isLight ? 'text-[#7d5a47]' : 'text-[#A7A7A7]';
  const strong = isLight ? 'text-[#3d2317]' : 'text-white';
  const card = `rounded-2xl border p-4 sm:p-5 ${isLight ? 'bg-[#fff7f0] border-[#7d5a47]/20' : 'bg-[#181818] border-white/[0.08]'}`;
  const title = `text-base font-black uppercase tracking-tight ${strong}`;

  const sessions = Math.min(7, Math.max(1, userStats.weeklyGoalWorkouts || 1));
  const volume = userStats.weeklyVolumeTargetKg && userStats.weeklyVolumeTargetKg > 0 ? userStats.weeklyVolumeTargetKg : undefined;
  const weightDelta = Math.round((userStats.targetWeightKg - userStats.currentWeightKg) * 10) / 10;

  return (
    <section className={card}>
      <h3 className={title}>Objectifs</h3>
      <p className={`text-xs mt-0.5 ${muted}`}>Enregistrés automatiquement à chaque changement.</p>

      <div className="mt-4 space-y-5">
        {/* Sessions per week: 1-7 as a segmented row */}
        <div className="space-y-1.5">
          <span className={`block text-[11px] font-black uppercase tracking-wider ${muted}`}>
            Séances par semaine
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Une séance de moins"
              disabled={sessions <= 1}
              onClick={() => onUpdateUserStats({ weeklyGoalWorkouts: sessions - 1 })}
              className={`w-11 h-11 shrink-0 rounded-xl flex items-center justify-center border disabled:opacity-35 ${
                isLight ? 'bg-[#faebe0] border-[#7d5a47]/20 text-[#3d2317]' : 'bg-white/[0.04] border-white/[0.08] text-white'
              }`}
            >
              <Minus className="w-4 h-4" />
            </button>
            <div className="flex-1 min-w-0 grid grid-cols-7 gap-1" role="group" aria-label="Séances par semaine">
              {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                <button
                  key={n}
                  type="button"
                  aria-pressed={n === sessions}
                  aria-label={`${n} séance${n > 1 ? 's' : ''}`}
                  onClick={() => onUpdateUserStats({ weeklyGoalWorkouts: n })}
                  className={`h-11 rounded-lg text-sm font-black font-mono transition-colors ${
                    n <= sessions
                      ? 'bg-gradient-to-b from-[#7C3AED] to-[#EC4899] text-white'
                      : isLight
                        ? 'bg-white/60 border border-[#7d5a47]/15 text-[#7d5a47]'
                        : 'bg-white/[0.04] border border-white/[0.06] text-[#A7A7A7]'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            <button
              type="button"
              aria-label="Une séance de plus"
              disabled={sessions >= 7}
              onClick={() => onUpdateUserStats({ weeklyGoalWorkouts: sessions + 1 })}
              className={`w-11 h-11 shrink-0 rounded-xl flex items-center justify-center border disabled:opacity-35 ${
                isLight ? 'bg-[#faebe0] border-[#7d5a47]/20 text-[#3d2317]' : 'bg-white/[0.04] border-white/[0.08] text-white'
              }`}
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <p className={`text-xs ${muted}`}>
            <span className={`font-black ${strong}`}>{sessions}</span> séance{sessions > 1 ? 's' : ''} par semaine
          </p>
        </div>

        {/* Weekly volume */}
        <div className="space-y-1.5">
          <Stepper
            id="goal-volume"
            label="Volume hebdomadaire cible"
            unit="kg"
            value={volume}
            step={VOLUME_STEP}
            min={VOLUME_MIN}
            max={VOLUME_MAX}
            allowEmpty
            emptyPlaceholder="Pas d'objectif"
            startValue={VOLUME_START}
            isLight={isLight}
            onChange={(v) => onUpdateUserStats({ weeklyVolumeTargetKg: v })}
          />
          <div className="flex items-center justify-between gap-2">
            <p className={`text-xs ${muted}`}>Total des charges soulevées (poids × répétitions) sur la semaine.</p>
            {volume !== undefined && (
              <button
                type="button"
                onClick={() => onUpdateUserStats({ weeklyVolumeTargetKg: undefined })}
                className={`shrink-0 h-8 px-2 rounded-lg flex items-center gap-1 text-[11px] font-black uppercase tracking-tight ${muted}`}
              >
                <X className="w-3.5 h-3.5" /> Retirer
              </button>
            )}
          </div>
        </div>

        {/* Target weight */}
        <div className="space-y-1.5">
          <Stepper
            id="goal-weight"
            label="Poids cible"
            unit="kg"
            value={userStats.targetWeightKg}
            step={WEIGHT_STEP}
            min={WEIGHT_MIN}
            max={WEIGHT_MAX}
            decimals={1}
            isLight={isLight}
            onChange={(v) => {
              if (v !== undefined) onUpdateUserStats({ targetWeightKg: v });
            }}
          />
          <p className={`text-xs ${muted}`}>
            Poids actuel : <span className={`font-bold ${strong}`}>{fmt(userStats.currentWeightKg, 1)} kg</span>
            {weightDelta !== 0 && (
              <>
                {' · '}
                <span className={`font-bold ${strong}`}>
                  {weightDelta > 0 ? '+' : '−'}
                  {fmt(Math.abs(weightDelta), 1)} kg
                </span>{' '}
                à {weightDelta > 0 ? 'prendre' : 'perdre'}
              </>
            )}
          </p>
        </div>
      </div>
    </section>
  );
}

