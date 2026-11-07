// Progress of a weight goal (loss or gain): one pure function shared by the Home card
// and the live preview of the challenge editor.

export interface GoalProgress {
  percent: number;
  isPertePoids: boolean;
  start: number;
  current: number;
  target: number;
  /** Signed change since the start, e.g. "-8.0 kg" or "Départ" */
  deltaText: string;
  /** Kilograms still to go in the direction of the goal (0 once reached) */
  remainingKg: number;
  reached: boolean;
  description: string;
}

const round1 = (v: number) => Math.round(v * 10) / 10;
const fmt = (v: number) => round1(Math.abs(v)).toLocaleString('fr-FR');

export const computeGoalProgress = (start: number, current: number, target: number): GoalProgress => {
  const isPertePoids = start > target || (start === target && current > target);
  const total = Math.abs(target - start);
  const done = isPertePoids ? start - current : current - start;
  const percent =
    total < 0.1
      ? Math.abs(current - target) < 0.1 ? 100 : 0
      : Math.min(100, Math.max(0, Math.round((done / total) * 100)));

  const remaining = isPertePoids ? current - target : target - current;
  const reached = remaining <= 0.05;
  const verb = isPertePoids ? 'perdre' : 'gagner';

  let description: string;
  if (reached) {
    description = `Objectif atteint : ${fmt(target)} kg.`;
  } else {
    description = `Encore ${fmt(remaining)} kg à ${verb} pour atteindre ${fmt(target)} kg`;
    if (Math.abs(done) >= 0.05) {
      description += done > 0
        ? ` · ${fmt(done)} kg déjà ${isPertePoids ? 'perdus' : 'gagnés'}`
        : ` · ${fmt(done)} kg dans le mauvais sens`;
    }
  }

  const delta = round1(current - start);
  return {
    percent,
    isPertePoids,
    start,
    current,
    target,
    deltaText: delta === 0 ? 'Départ' : `${delta > 0 ? '+' : ''}${delta.toFixed(1)} kg`,
    remainingKg: reached ? 0 : round1(remaining),
    reached,
    description,
  };
};
