// Estimated time under tension per set, in seconds (execution only, rest excluded)
const SECONDS_PER_SET = 40;

// Average measured set duration (set chrono), or null while nothing has been measured
export const averageSetSeconds = (durations: Array<number | undefined>): number | null => {
  const measured = durations.filter((d): d is number => typeof d === 'number' && d > 0);
  return measured.length ? Math.round(measured.reduce((a, b) => a + b, 0) / measured.length) : null;
};

// Estimated duration of an exercise: every set + rest between sets
export const estimateExerciseSeconds = (
  sets: number,
  restSeconds: number,
  secondsPerSet: number = SECONDS_PER_SET
): number => {
  const safeSets = Math.max(0, sets);
  return safeSets * secondsPerSet + Math.max(0, safeSets - 1) * Math.max(0, restSeconds);
};

// "minutes:secondes" (e.g. 6:20)
export const formatMinSec = (totalSeconds: number): string => {
  const total = Math.max(0, Math.round(totalSeconds));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};
