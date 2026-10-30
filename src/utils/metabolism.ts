// Pure metabolism helpers: BMR, TDEE, target calories and daily macros.

type Gender = 'homme' | 'femme';
export type ActivityLevel = 'sedentaire' | 'leger' | 'modere' | 'actif' | 'tres_actif';
export type MetabolicGoal = 'seche' | 'maintien' | 'prise_de_masse';

interface Range {
  min: number;
  max: number;
}

export interface MetabolismInput {
  gender: Gender;
  age: number;
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel;
  goal: MetabolicGoal;
  leanMassKg?: number;
}

export interface MetabolismResult {
  bmrMifflin: number;
  bmrKatch: number | null;
  bmr: number;
  bmrFormula: 'mifflin' | 'katch';
  activityFactor: number;
  tdee: number;
  calories: Range;
  proteinG: Range;
  fatG: Range;
  carbsG: Range;
  formulas: string[];
}

const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentaire: 1.2,
  leger: 1.375,
  modere: 1.55,
  actif: 1.725,
  tres_actif: 1.9,
};

export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentaire: 'Sédentaire',
  leger: 'Léger (1-3 séances/sem.)',
  modere: 'Modéré (3-5 séances/sem.)',
  actif: 'Actif (6-7 séances/sem.)',
  tres_actif: 'Très actif (2x/jour, métier physique)',
};

export const GOAL_LABELS: Record<MetabolicGoal, string> = {
  seche: 'Sèche',
  maintien: 'Maintien',
  prise_de_masse: 'Prise de masse',
};

// Calorie multipliers applied to TDEE, as [min, max]
const GOAL_CALORIE_FACTORS: Record<MetabolicGoal, [number, number]> = {
  seche: [0.8, 0.85],
  maintien: [0.95, 1.05],
  prise_de_masse: [1.1, 1.15],
};

// Protein in g per kg of body weight, as [min, max]
const PROTEIN_PER_KG: Record<MetabolicGoal, [number, number]> = {
  seche: [2.0, 2.4],
  maintien: [1.6, 2.2],
  prise_de_masse: [1.6, 2.2],
};

const FAT_PER_KG: [number, number] = [0.8, 1.0];
const FAT_MIN_CALORIE_SHARE = 0.2;

const KCAL_PER_G = { protein: 4, carbs: 4, fat: 9 };

function bmrMifflinStJeor(gender: Gender, weightKg: number, heightCm: number, age: number): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return gender === 'homme' ? base + 5 : base - 161;
}

function bmrKatchMcArdle(leanMassKg: number): number {
  return 370 + 21.6 * leanMassKg;
}

function tdeeFromBmr(bmr: number, activityLevel: ActivityLevel): number {
  return bmr * ACTIVITY_FACTORS[activityLevel];
}

function targetCalories(tdee: number, goal: MetabolicGoal): Range {
  const [lo, hi] = GOAL_CALORIE_FACTORS[goal];
  return { min: Math.round(tdee * lo), max: Math.round(tdee * hi) };
}

function macroRanges(weightKg: number, calories: Range, goal: MetabolicGoal): { proteinG: Range; fatG: Range; carbsG: Range } {
  const [pLo, pHi] = PROTEIN_PER_KG[goal];
  const proteinG = { min: Math.round(weightKg * pLo), max: Math.round(weightKg * pHi) };

  // Fat: 0.8-1.0 g/kg, but never under 20 % of the calories at each end of the range
  const fatFloor = (kcal: number) => (kcal * FAT_MIN_CALORIE_SHARE) / KCAL_PER_G.fat;
  const fatMin = Math.max(weightKg * FAT_PER_KG[0], fatFloor(calories.min));
  const fatMax = Math.max(weightKg * FAT_PER_KG[1], fatFloor(calories.max), fatMin);
  const fatG = { min: Math.round(fatMin), max: Math.round(fatMax) };

  // Carbs: what remains. Low end = fewest calories with most protein and fat; high end = the opposite.
  const carbsFor = (kcal: number, p: number, f: number) =>
    Math.max(0, Math.round((kcal - p * KCAL_PER_G.protein - f * KCAL_PER_G.fat) / KCAL_PER_G.carbs));
  const carbsG = {
    min: carbsFor(calories.min, proteinG.max, fatG.max),
    max: carbsFor(calories.max, proteinG.min, fatG.min),
  };

  return { proteinG, fatG, carbsG };
}

export function computeMetabolism(input: MetabolismInput): MetabolismResult {
  const { gender, age, heightCm, weightKg, activityLevel, goal, leanMassKg } = input;

  const bmrMifflin = Math.round(bmrMifflinStJeor(gender, weightKg, heightCm, age));
  const hasLean = typeof leanMassKg === 'number' && leanMassKg > 0;
  const bmrKatch = hasLean ? Math.round(bmrKatchMcArdle(leanMassKg as number)) : null;
  // Katch-McArdle is preferred when lean mass is known (it accounts for body composition)
  const bmrFormula: 'mifflin' | 'katch' = bmrKatch !== null ? 'katch' : 'mifflin';
  const bmr = bmrKatch ?? bmrMifflin;

  const activityFactor = ACTIVITY_FACTORS[activityLevel];
  const tdee = Math.round(tdeeFromBmr(bmr, activityLevel));
  const calories = targetCalories(tdee, goal);
  const { proteinG, fatG, carbsG } = macroRanges(weightKg, calories, goal);

  const [cLo, cHi] = GOAL_CALORIE_FACTORS[goal];
  const [pLo, pHi] = PROTEIN_PER_KG[goal];
  const pct = (f: number) => `${f >= 1 ? '+' : '−'}${Math.round(Math.abs(f - 1) * 100)} %`;

  const formulas = [
    gender === 'homme'
      ? 'Mifflin-St Jeor (homme) : 10 × poids + 6,25 × taille − 5 × âge + 5'
      : 'Mifflin-St Jeor (femme) : 10 × poids + 6,25 × taille − 5 × âge − 161',
    ...(bmrKatch !== null
      ? ['Katch-McArdle : 370 + 21,6 × masse maigre (retenue, car elle tient compte de ta composition corporelle)']
      : []),
    `TDEE = BMR × ${String(activityFactor).replace('.', ',')} (activité : ${ACTIVITY_LABELS[activityLevel]})`,
    `Calories cibles (${GOAL_LABELS[goal]}) : TDEE ${pct(cLo)} à ${pct(cHi)}`,
    `Protéines : ${pLo.toFixed(1).replace('.', ',')}–${pHi.toFixed(1).replace('.', ',')} g/kg · Lipides : 0,8–1,0 g/kg (min. 20 % des kcal) · Glucides : le reste`,
  ];

  return { bmrMifflin, bmrKatch, bmr, bmrFormula, activityFactor, tdee, calories, proteinG, fatG, carbsG, formulas };
}
