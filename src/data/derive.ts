import { UserStats } from '../types';
import { VoltData } from './model';
import { checkedDaysCount, currentWeight, latestComposition, totalKcal, totalVisits } from './selectors';

// Stats shown everywhere: counters, weight, goal and composition always come from the histories
// (VoltData) plus the single stored weight target. The stored copies in the profile are never trusted.
export const deriveUserStats = (userStats: UserStats, data: VoltData, ref: Date = new Date()): UserStats => {
  const composition = latestComposition(data);
  const weightKg = currentWeight(data) ?? userStats.currentWeightKg;
  const stored = userStats.bodyComposition;

  return {
    ...userStats,
    currentWeightKg: weightKg,
    // The challenge is a weight goal: its current/target always mirror the weigh-ins and the weight target
    nextGoal: { ...userStats.nextGoal, current: weightKg, target: userStats.targetWeightKg },
    totalWorkouts: totalVisits(data),
    totalCaloriesBurned: totalKcal(data),
    weeklyCompletedWorkouts: checkedDaysCount(data, ref),
    streakDays: 0,
    bodyComposition: stored
      ? {
          ...stored,
          ...(composition
            ? {
                fatPercent: composition.fatPercent ?? stored.fatPercent,
                fatKg: composition.fatKg ?? stored.fatKg,
                leanMassKg: composition.leanMassKg ?? stored.leanMassKg,
                muscleMassKg: composition.muscleMassKg ?? stored.muscleMassKg,
                boneMassKg: composition.boneMassKg ?? stored.boneMassKg,
                organMassKg: composition.organMassKg ?? stored.organMassKg,
                waterLiters: composition.waterLiters ?? stored.waterLiters,
                date: composition.date,
              }
            : {}),
          // Second copy of the weight target: follows the single target
          chosenGoal: stored.chosenGoal ? { ...stored.chosenGoal, targetWeightKg: userStats.targetWeightKg } : stored.chosenGoal,
        }
      : stored,
  };
};
