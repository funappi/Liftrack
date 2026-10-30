/**
 * Utilitaires de calcul scientifique de la composition corporelle
 * Modèles : US Navy, Deurenberg, Boer, James, Hume, Martin & Drinkwater (masse osseuse)
 */

export interface BodyCompositionInputs {
  weightKg: number;
  heightCm: number;
  age: number;
  gender: 'homme' | 'femme';
  waistCm: number;      // Tour de taille (au nombril)
  neckCm: number;       // Tour de cou
  hipCm?: number;       // Tour de hanches (recommandé femmes)
  wristCm?: number;     // Tour de poignet (structure osseuse)
}

export type BodyFatFormulaType = 'us_navy' | 'deurenberg' | 'boer_derived' | 'average';

type RequiredFieldKey = 'gender' | 'age' | 'weight' | 'height' | 'waist' | 'neck' | 'hip' | 'wrist';

export interface FormulaMeta {
  id: BodyFatFormulaType;
  name: string;
  precisionPercent: number; // e.g. 91%
  badge: string;
  shortDesc: string;
  toolRequirement: string;
  requiredFields: RequiredFieldKey[];
  explanation: string;
  hintNoTapeMeasure?: boolean;
}

export const FORMULA_METADATA: Record<BodyFatFormulaType, FormulaMeta> = {
  us_navy: {
    id: 'us_navy',
    name: 'US Navy',
    precisionPercent: 91,
    badge: 'Recommandé',
    shortDesc: 'Taille & Cou',
    toolRequirement: 'Mètre ruban requis',
    requiredFields: ['gender', 'weight', 'height', 'waist', 'neck', 'hip'],
    explanation: 'Mesures circonférentielles directes : cou, taille, hanches. Mètre ruban requis pour le calcul.',
  },
  deurenberg: {
    id: 'deurenberg',
    name: 'Deurenberg',
    precisionPercent: 82,
    badge: 'Universel',
    shortDesc: 'IMC & Âge',
    toolRequirement: 'Sans mètre ruban',
    requiredFields: ['gender', 'age', 'weight', 'height'],
    explanation: 'Basée uniquement sur l\'IMC, l\'âge et le sexe. Aucun mètre ruban requis !',
    hintNoTapeMeasure: true,
  },
  boer_derived: {
    id: 'boer_derived',
    name: 'Boer & James',
    precisionPercent: 87,
    badge: 'Médical',
    shortDesc: 'Poids & Taille',
    toolRequirement: 'Calcul direct',
    requiredFields: ['gender', 'weight', 'height'],
    explanation: 'Modèles anthropométriques cliniques directs : uniquement besoin de ton Poids et de ta Taille !',
    hintNoTapeMeasure: true,
  },
  average: {
    id: 'average',
    name: 'Synthèse',
    precisionPercent: 94,
    badge: 'Consensus',
    shortDesc: 'Moyenne multi-méthodes',
    toolRequirement: 'Croisement 3 formules',
    requiredFields: ['gender', 'age', 'weight', 'height', 'waist', 'neck', 'hip'],
    explanation: 'Croise toutes les formules : US Navy, Deurenberg et Boer pour éliminer les biais individuels.',
  },
};

export interface BodyRecommendation {
  type: 'seche' | 'prise_de_masse' | 'recomposition';
  title: string;
  badge: string;
  headline: string;
  rationale: string;
  currentFatPercent: number;
  currentWeightKg: number;
  targetFatPercent: number;
  targetWeightKg: number;
  fatDeltaKg: number; // e.g. -4.2 kg (loss)
  muscleDeltaKg: number; // e.g. +2.0 kg (gain)
  dailyCalorieDelta: string;
  proteinTargetGrams: number;
  estimatedDurationWeeks: string;
  actionSummary: string;
}

/**
 * Moteur de recommandation intelligente selon le % de masse grasse et le sexe
 */
export function calculateBodyRecommendation(
  output: BodyCompositionOutput,
  gender: 'homme' | 'femme'
): BodyRecommendation {
  const isMale = gender === 'homme';
  const { fatPercent, totalWeightKg, leanMassKg } = output;

  if (isMale) {
    if (fatPercent > 16.5) {
      // Recommandation : SÈCHE
      const targetFat = 13.0;
      const targetWeight = Math.round((leanMassKg / (1 - targetFat / 100)) * 10) / 10;
      const fatDelta = Math.round((targetWeight - totalWeightKg) * 10) / 10;
      const weeks = Math.max(4, Math.ceil(Math.abs(fatDelta) / 0.5));

      return {
        type: 'seche',
        title: 'Sèche Ciblée (Perte de gras)',
        badge: 'RECOMMANDATION VOLT',
        headline: `Perdre ~${Math.abs(fatDelta)} kg de masse grasse pour atteindre ${targetFat}% de MG`,
        rationale: `Avec un taux de masse grasse de ${fatPercent}%, une phase de sèche modérée optimisera ta sensibilité à l'insuline, mettra en valeur ton relief musculaire et réduira la graisse viscérale.`,
        currentFatPercent: fatPercent,
        currentWeightKg: totalWeightKg,
        targetFatPercent: targetFat,
        targetWeightKg: targetWeight,
        fatDeltaKg: fatDelta,
        muscleDeltaKg: 0,
        dailyCalorieDelta: '-350 à -450 kcal/j (Déficit modéré)',
        proteinTargetGrams: Math.round(totalWeightKg * 2.0),
        estimatedDurationWeeks: `${weeks} à ${weeks + 3} semaines`,
        actionSummary: 'Déficit contrôlé + musculation lourde pour conserver 100% du muscle.',
      };
    } else if (fatPercent < 11.5) {
      // Recommandation : PRISE DE MASSE
      const targetWeight = Math.round((totalWeightKg + 3.5) * 10) / 10;
      const targetFat = 13.5;

      return {
        type: 'prise_de_masse',
        title: 'Prise de Masse Propre (Lean Bulk)',
        badge: 'RECOMMANDATION VOLT',
        headline: `Viser ${targetWeight} kg (+2.5 kg muscle, +1.0 kg gras)`,
        rationale: `Ton taux de masse grasse est très affûté (${fatPercent}%). Ton profil hormonal est dans une configuration idéale pour bâtir du tissu musculaire neuf sans prise de gras excessive.`,
        currentFatPercent: fatPercent,
        currentWeightKg: totalWeightKg,
        targetFatPercent: targetFat,
        targetWeightKg: targetWeight,
        fatDeltaKg: 1.0,
        muscleDeltaKg: 2.5,
        dailyCalorieDelta: '+250 à +350 kcal/j (Surplus propre)',
        proteinTargetGrams: Math.round(totalWeightKg * 2.0),
        estimatedDurationWeeks: '12 à 16 semaines',
        actionSummary: 'Léger surplus énergétique + surcharge progressive à la salle.',
      };
    } else {
      // Recommandation : RECOMPOSITION CORPORELLE
      const targetWeight = Math.round((totalWeightKg + 1.0) * 10) / 10;
      const targetFat = 12.0;

      return {
        type: 'recomposition',
        title: 'Recomposition Corporelle (Muscle Sec)',
        badge: 'RECOMMANDATION VOLT',
        headline: `Prendre du muscle tout en affinant la silhouette à ~${totalWeightKg} kg`,
        rationale: `Tu es dans la zone athlétique optimale (12-16% de MG). Tu peux progresser en force et en galbe musculaire sans restriction calorique sévère.`,
        currentFatPercent: fatPercent,
        currentWeightKg: totalWeightKg,
        targetFatPercent: targetFat,
        targetWeightKg: targetWeight,
        fatDeltaKg: -1.0,
        muscleDeltaKg: 2.0,
        dailyCalorieDelta: 'Maintenance isocalorique (±100 kcal/j)',
        proteinTargetGrams: Math.round(totalWeightKg * 2.0),
        estimatedDurationWeeks: '8 à 12 semaines',
        actionSummary: 'Apport de maintien + priorité sur l\'intensité d\'entraînement.',
      };
    }
  } else {
    // FEMME
    if (fatPercent > 25.5) {
      const targetFat = 21.0;
      const targetWeight = Math.round((leanMassKg / (1 - targetFat / 100)) * 10) / 10;
      const fatDelta = Math.round((targetWeight - totalWeightKg) * 10) / 10;
      const weeks = Math.max(4, Math.ceil(Math.abs(fatDelta) / 0.4));

      return {
        type: 'seche',
        title: 'Affinement & Sèche Harmonieuse',
        badge: 'RECOMMANDATION VOLT',
        headline: `Perdre ~${Math.abs(fatDelta)} kg de masse grasse pour atteindre ${targetFat}% de MG`,
        rationale: `À ${fatPercent}% de MG, un léger déficit calorique combiné à tes séances de musculation ciblera les réserves adipeuses tout en tonifiant harmonieusement les jambes et le tronc.`,
        currentFatPercent: fatPercent,
        currentWeightKg: totalWeightKg,
        targetFatPercent: targetFat,
        targetWeightKg: targetWeight,
        fatDeltaKg: fatDelta,
        muscleDeltaKg: 0,
        dailyCalorieDelta: '-300 à -400 kcal/j (Déficit doux)',
        proteinTargetGrams: Math.round(totalWeightKg * 1.8),
        estimatedDurationWeeks: `${weeks} à ${weeks + 3} semaines`,
        actionSummary: 'Déficit doux + entraînement régulier sans perte d\'énergie.',
      };
    } else if (fatPercent < 19.0) {
      const targetWeight = Math.round((totalWeightKg + 2.5) * 10) / 10;
      const targetFat = 21.5;

      return {
        type: 'prise_de_masse',
        title: 'Prise de Masse & Galbe Musculaire',
        badge: 'RECOMMANDATION VOLT',
        headline: `Viser ${targetWeight} kg (+1.8 kg galbe musculaire)`,
        rationale: `Ton taux de masse grasse est très bas (${fatPercent}%). Un léger surplus fournira l'énergie vitale pour développer le volume des fessiers, des cuisses et du dos.`,
        currentFatPercent: fatPercent,
        currentWeightKg: totalWeightKg,
        targetFatPercent: targetFat,
        targetWeightKg: targetWeight,
        fatDeltaKg: 0.7,
        muscleDeltaKg: 1.8,
        dailyCalorieDelta: '+200 à +300 kcal/j (Surplus contrôlé)',
        proteinTargetGrams: Math.round(totalWeightKg * 1.8),
        estimatedDurationWeeks: '10 à 14 semaines',
        actionSummary: 'Surplus nutritif + exercices polyarticulaires ciblés.',
      };
    } else {
      return {
        type: 'recomposition',
        title: 'Tonification & Maintien Athlétique',
        badge: 'RECOMMANDATION VOLT',
        headline: `Densifier le muscle et sublimer la définition à ${totalWeightKg} kg`,
        rationale: `Ton taux de masse grasse (${fatPercent}%) est dans le standard de forme athlétique féminin idéal. Maintiens ton apport calorique actuel avec une alimentation riche en protéines.`,
        currentFatPercent: fatPercent,
        currentWeightKg: totalWeightKg,
        targetFatPercent: 20.5,
        targetWeightKg: totalWeightKg,
        fatDeltaKg: -0.5,
        muscleDeltaKg: 1.5,
        dailyCalorieDelta: 'Maintenance isocalorique',
        proteinTargetGrams: Math.round(totalWeightKg * 1.8),
        estimatedDurationWeeks: '8 à 12 semaines',
        actionSummary: 'Alimentation d\'équilibre + progression continue sur les charges.',
      };
    }
  }
}

/**
 * Calcul dynamique pour un objectif personnalisé choisi par l'utilisateur
 */
export function calculateCustomGoalStats(
  currentWeightKg: number,
  currentFatPercent: number,
  leanMassKg: number,
  goalType: 'seche' | 'prise_de_masse' | 'recomposition',
  targetWeightKg: number,
  gender: 'homme' | 'femme'
) {
  const weightDelta = Math.round((targetWeightKg - currentWeightKg) * 10) / 10;
  let estimatedTargetFatPercent = currentFatPercent;
  let fatDeltaKg = 0;
  let muscleDeltaKg = 0;
  let calorieAdvice = 'Maintenance';

  if (goalType === 'seche') {
    // Dans une bonne sèche, ~80-85% de la perte de poids est de la graisse
    fatDeltaKg = Math.min(0, weightDelta);
    const newFatKg = Math.max(3, (currentWeightKg * (currentFatPercent / 100)) + fatDeltaKg);
    estimatedTargetFatPercent = Math.max(5, Math.min(50, Math.round((newFatKg / targetWeightKg) * 1000) / 10));
    const deficitKcal = Math.min(600, Math.max(250, Math.round((Math.abs(weightDelta) * 7700) / (8 * 7))));
    calorieAdvice = `-${deficitKcal} kcal/jour`;
  } else if (goalType === 'prise_de_masse') {
    // Dans un lean bulk bien mené, ~60% est du muscle et 40% du gras
    muscleDeltaKg = Math.max(0, Math.round(weightDelta * 0.65 * 10) / 10);
    fatDeltaKg = Math.max(0, Math.round(weightDelta * 0.35 * 10) / 10);
    const newFatKg = (currentWeightKg * (currentFatPercent / 100)) + fatDeltaKg;
    estimatedTargetFatPercent = Math.max(5, Math.min(50, Math.round((newFatKg / targetWeightKg) * 1000) / 10));
    calorieAdvice = '+250 à +350 kcal/jour';
  } else {
    // Recomposition
    estimatedTargetFatPercent = Math.max(5, currentFatPercent - 1.0);
    muscleDeltaKg = 1.5;
    fatDeltaKg = -1.5;
    calorieAdvice = 'Maintenance isocalorique';
  }

  return {
    targetWeightKg,
    weightDelta,
    estimatedTargetFatPercent,
    fatDeltaKg,
    muscleDeltaKg,
    calorieAdvice,
    proteinTargetGrams: Math.round(currentWeightKg * (gender === 'homme' ? 2.0 : 1.8)),
  };
}

export interface BodyCompositionOutput {
  // Poids total
  totalWeightKg: number;

  // Masse Grasse (Fat Mass)
  fatPercent: number;
  fatKg: number;
  fatCategory: 'Athlète' | 'Fitness' | 'Moyen' | 'Élevé' | 'Très élevé';
  fatCategoryColor: string;

  // Masse Maigre / Sèche (Lean Body Mass)
  leanMassKg: number;
  leanMassPercent: number;

  // Masse Musculaire Squelettique estimée (Skeletal Muscle Mass)
  muscleMassKg: number;
  muscleMassPercent: number;
  muscleCategory: 'Faible' | 'Normal' | 'Athlétique' | 'Élite';

  // Masse Osseuse estimée (Bone Mass / BMC)
  boneMassKg: number;
  boneMassPercent: number;
  boneMassCategory: 'Légère' | 'Normale' | 'Robuste / Forte';

  // Masse des Organes et fluides vitaux résiduels
  organMassKg: number;
  organMassPercent: number;

  // Masse Hydrique estimée (Total Body Water)
  waterLiters: number;
  waterPercent: number;

  // IMC & santé
  bmi: number;
  bmiCategory: string;

  // Détail par formule pour comparaison
  formulaBreakdown: {
    usNavyFatPercent: number;
    deurenbergFatPercent: number;
    boerLeanMassKg: number;
    jamesLeanMassKg: number;
  };
}

/**
 * Calcul complet de la composition corporelle
 */
export function calculateBodyComposition(
  inputs: BodyCompositionInputs,
  selectedFormula: BodyFatFormulaType = 'us_navy'
): BodyCompositionOutput {
  const { weightKg, heightCm, age, gender, waistCm, neckCm } = inputs;
  const isMale = gender === 'homme';
  const heightM = heightCm / 100;
  const bmi = Math.round((weightKg / (heightM * heightM)) * 10) / 10;

  // 1. Formule de Deurenberg (IMC, Âge, Sexe)
  // %MG = (1.20 × IMC) + (0.23 × Âge) - (10.8 × Sexe) - 5.4 (Sexe: 1 = homme, 0 = femme)
  const sexFactor = isMale ? 1 : 0;
  let deurenbergFat = (1.20 * bmi) + (0.23 * age) - (10.8 * sexFactor) - 5.4;
  deurenbergFat = Math.max(4, Math.min(55, Math.round(deurenbergFat * 10) / 10));

  // 2. Formule US Navy (Circonférences en cm)
  // Homme : 495 / (1.0324 - 0.19077 * log10(waist - neck) + 0.15456 * log10(height)) - 450
  // Femme : 495 / (1.29579 - 0.35004 * log10(waist + hip - neck) + 0.22100 * log10(height)) - 450
  let usNavyFat = 15;
  if (isMale) {
    const diff = Math.max(1, waistCm - neckCm);
    const denom = 1.0324 - 0.19077 * Math.log10(diff) + 0.15456 * Math.log10(heightCm);
    if (denom > 0) {
      usNavyFat = (495 / denom) - 450;
    }
  } else {
    const hip = inputs.hipCm || (waistCm * 1.18);
    const diff = Math.max(1, waistCm + hip - neckCm);
    const denom = 1.29579 - 0.35004 * Math.log10(diff) + 0.22100 * Math.log10(heightCm);
    if (denom > 0) {
      usNavyFat = (495 / denom) - 450;
    }
  }
  usNavyFat = Math.max(4, Math.min(55, Math.round(usNavyFat * 10) / 10));

  // 3. Formule de Boer (Masse Maigre)
  // Homme: LBM = 0.407 * Poids + 0.267 * Taille - 19.2
  // Femme: LBM = 0.252 * Poids + 0.473 * Taille - 48.3
  const boerLean = isMale
    ? 0.407 * weightKg + 0.267 * heightCm - 19.2
    : 0.252 * weightKg + 0.473 * heightCm - 48.3;
  const boerLeanKg = Math.max(25, Math.min(weightKg * 0.95, Math.round(boerLean * 10) / 10));
  const boerFatPercent = Math.max(4, Math.min(55, Math.round(((weightKg - boerLeanKg) / weightKg) * 1000) / 10));

  // 4. Formule de James (Masse Maigre)
  // Homme: LBM = 1.1 * Poids - 128 * (Poids / Taille)^2
  // Femme: LBM = 1.07 * Poids - 148 * (Poids / Taille)^2
  const jamesRatio = weightKg / heightCm;
  const jamesLean = isMale
    ? 1.1 * weightKg - 128 * (jamesRatio * jamesRatio)
    : 1.07 * weightKg - 148 * (jamesRatio * jamesRatio);
  const jamesLeanKg = Math.max(25, Math.min(weightKg * 0.95, Math.round(jamesLean * 10) / 10));

  // Sélection du % de masse grasse selon le choix de formule
  let finalFatPercent = usNavyFat;
  if (selectedFormula === 'deurenberg') {
    finalFatPercent = deurenbergFat;
  } else if (selectedFormula === 'boer_derived') {
    finalFatPercent = boerFatPercent;
  } else if (selectedFormula === 'average') {
    finalFatPercent = Math.round(((usNavyFat + deurenbergFat + boerFatPercent) / 3) * 10) / 10;
  }

  // Masse grasse en KG
  const fatKg = Math.round(((finalFatPercent / 100) * weightKg) * 10) / 10;

  // Masse Maigre / Sèche (LBM) = Poids - Masse grasse
  const leanMassKg = Math.max(10, Math.round((weightKg - fatKg) * 10) / 10);
  const leanMassPercent = Math.round((leanMassKg / weightKg) * 1000) / 10;

  // 5. Masse Osseuse (Bone Mineral Content / Squelette minéral sec)
  // Modèle anthropométrique de Martin & Drinkwater ajusté au tour de poignet (densité de cadre osseux)
  // Chez un adulte en bonne santé : ~3.0 à 4.2 kg (hommes) et ~2.2 à 3.4 kg (femmes)
  const wrist = inputs.wristCm || (isMale ? 17.5 : 15.5);
  const wristRef = isMale ? 17.5 : 15.5;
  const wristModifier = Math.max(0.88, Math.min(1.15, wrist / wristRef));

  // Formule de référence Tanita / DEXA basée sur la masse maigre : os ~ 5.5% à 6% de la masse maigre
  let estimatedBoneKg = (leanMassKg * (isMale ? 0.058 : 0.052)) * wristModifier;
  estimatedBoneKg = Math.max(1.8, Math.min(5.5, Math.round(estimatedBoneKg * 10) / 10));
  const boneMassPercent = Math.round((estimatedBoneKg / weightKg) * 1000) / 10;

  let boneMassCategory: 'Légère' | 'Normale' | 'Robuste / Forte' = 'Normale';
  if (isMale) {
    if (estimatedBoneKg < 2.9) boneMassCategory = 'Légère';
    else if (estimatedBoneKg > 3.8) boneMassCategory = 'Robuste / Forte';
  } else {
    if (estimatedBoneKg < 2.2) boneMassCategory = 'Légère';
    else if (estimatedBoneKg > 3.1) boneMassCategory = 'Robuste / Forte';
  }

  // 6. Masse Musculaire Squelettique active (SMM)
  // Environ 72-76% de la masse maigre non-osseuse
  const nonBoneLean = Math.max(10, leanMassKg - estimatedBoneKg);
  const muscleMassKg = Math.round((nonBoneLean * (isMale ? 0.74 : 0.70)) * 10) / 10;
  const muscleMassPercent = Math.round((muscleMassKg / weightKg) * 1000) / 10;

  // 7. Masse Hydrique (Eau corporelle totale - Watson Formula)
  // Homme : TBW = 2.447 - 0.09156 * Âge + 0.1074 * Taille + 0.3362 * Poids
  // Femme : TBW = -2.097 + 0.1069 * Taille + 0.2466 * Poids
  let waterLiters = isMale
    ? 2.447 - (0.09156 * age) + (0.1074 * heightCm) + (0.3362 * weightKg)
    : -2.097 + (0.1069 * heightCm) + (0.2466 * weightKg);
  waterLiters = Math.max(20, Math.min(weightKg * 0.75, Math.round(waterLiters * 10) / 10));
  const waterPercent = Math.round((waterLiters / weightKg) * 1000) / 10;

  // 8. Masse des Organes & Fluides Résiduels (viscères, cœur, cerveau, poumons, foie, reins, sang & lymphe)
  // Modèle scientifique à 4 compartiments : Poids = Gras + Muscles + Os + Organes
  const organMassKg = Math.max(4, Math.round((weightKg - fatKg - muscleMassKg - estimatedBoneKg) * 10) / 10);
  const organMassPercent = Math.max(4, Math.round((organMassKg / weightKg) * 1000) / 10);

  // Catégorie masse musculaire
  let muscleCategory: 'Faible' | 'Normal' | 'Athlétique' | 'Élite' = 'Normal';
  if (isMale) {
    if (muscleMassPercent >= 58) muscleCategory = 'Élite';
    else if (muscleMassPercent >= 52) muscleCategory = 'Athlétique';
    else if (muscleMassPercent >= 45) muscleCategory = 'Normal';
    else muscleCategory = 'Faible';
  } else {
    if (muscleMassPercent >= 48) muscleCategory = 'Élite';
    else if (muscleMassPercent >= 42) muscleCategory = 'Athlétique';
    else if (muscleMassPercent >= 35) muscleCategory = 'Normal';
    else muscleCategory = 'Faible';
  }

  // Catégorie masse grasse (selon l'American Council on Exercise - ACE)
  let fatCategory: 'Athlète' | 'Fitness' | 'Moyen' | 'Élevé' | 'Très élevé' = 'Fitness';
  let fatCategoryColor = '#00C6FF';

  if (isMale) {
    if (finalFatPercent < 10) {
      fatCategory = 'Athlète';
      fatCategoryColor = '#EC4899';
    } else if (finalFatPercent <= 17) {
      fatCategory = 'Fitness';
      fatCategoryColor = '#10B981';
    } else if (finalFatPercent <= 24) {
      fatCategory = 'Moyen';
      fatCategoryColor = '#F59E0B';
    } else if (finalFatPercent <= 30) {
      fatCategory = 'Élevé';
      fatCategoryColor = '#FF512F';
    } else {
      fatCategory = 'Très élevé';
      fatCategoryColor = '#EF4444';
    }
  } else {
    if (finalFatPercent < 16) {
      fatCategory = 'Athlète';
      fatCategoryColor = '#EC4899';
    } else if (finalFatPercent <= 24) {
      fatCategory = 'Fitness';
      fatCategoryColor = '#10B981';
    } else if (finalFatPercent <= 31) {
      fatCategory = 'Moyen';
      fatCategoryColor = '#F59E0B';
    } else if (finalFatPercent <= 38) {
      fatCategory = 'Élevé';
      fatCategoryColor = '#FF512F';
    } else {
      fatCategory = 'Très élevé';
      fatCategoryColor = '#EF4444';
    }
  }

  // Catégorie IMC
  let bmiCategory = 'Poids normal';
  if (bmi < 18.5) bmiCategory = 'Insuffisance pondérale';
  else if (bmi < 25) bmiCategory = 'Corpulence normale';
  else if (bmi < 30) bmiCategory = 'Surpoids';
  else bmiCategory = 'Obésité';

  return {
    totalWeightKg: weightKg,
    fatPercent: finalFatPercent,
    fatKg,
    fatCategory,
    fatCategoryColor,
    leanMassKg,
    leanMassPercent,
    muscleMassKg,
    muscleMassPercent,
    muscleCategory,
    boneMassKg: estimatedBoneKg,
    boneMassPercent,
    boneMassCategory,
    organMassKg,
    organMassPercent,
    waterLiters,
    waterPercent,
    bmi,
    bmiCategory,
    formulaBreakdown: {
      usNavyFatPercent: usNavyFat,
      deurenbergFatPercent: deurenbergFat,
      boerLeanMassKg: boerLeanKg,
      jamesLeanMassKg: jamesLeanKg,
    },
  };
}

interface LadderTier {
  id: string;
  name: string;
  minPercentMale: number;
  maxPercentMale: number;
  minPercentFemale: number;
  maxPercentFemale: number;
  badgeColor: string;
  description: string;
  advice: string;
}

export interface CompartmentLadder {
  title: string;
  unit: string;
  definition: string;
  tiers: LadderTier[];
}

export const COMPARTMENT_LADDERS: Record<'fat' | 'muscle' | 'bone' | 'organ', CompartmentLadder> = {
  fat: {
    title: 'Masse Grasse (Tissu Adipeux)',
    unit: '% du poids corporel',
    definition: 'Réserve lipidique essentielle (graisse sous-cutanée protectrice, graisse viscérale et membranes cellulaires).',
    tiers: [
      {
        id: 'athlete',
        name: 'Athlète / Compétition',
        minPercentMale: 6,
        maxPercentMale: 13,
        minPercentFemale: 14,
        maxPercentFemale: 20,
        badgeColor: '#EC4899',
        description: 'Stries musculaires et vascularisation visibles.',
        advice: 'Taux très bas, idéal pour la compétition ou l\'esthétique poussée.',
      },
      {
        id: 'fitness',
        name: 'Fitness / Silhouette Athlétique',
        minPercentMale: 14,
        maxPercentMale: 17,
        minPercentFemale: 21,
        maxPercentFemale: 24,
        badgeColor: '#10B981',
        description: 'Abdominaux apparents, excellente forme physique.',
        advice: 'Taux optimal et durable pour la vitalité et la performance athlétique.',
      },
      {
        id: 'normal',
        name: 'Normal / Forme Équilibrée',
        minPercentMale: 18,
        maxPercentMale: 24,
        minPercentFemale: 25,
        maxPercentFemale: 31,
        badgeColor: '#00C6FF',
        description: 'Morphologie équilibrée, santé générale optimale.',
        advice: 'Bonne base : une légère sèche permet de révéler le galbe musculaire.',
      },
      {
        id: 'surpoids',
        name: 'Élevé / Légère Surcharge',
        minPercentMale: 25,
        maxPercentMale: 30,
        minPercentFemale: 32,
        maxPercentFemale: 38,
        badgeColor: '#F59E0B',
        description: 'Accumulation adipeuse abdominale ou péri-fémorale.',
        advice: 'Un déficit modéré (-350 à -500 kcal/j) est recommandé pour la santé cardiovasculaire.',
      },
      {
        id: 'obesite',
        name: 'Très Élevé / Risque Métabolique',
        minPercentMale: 31,
        maxPercentMale: 50,
        minPercentFemale: 39,
        maxPercentFemale: 55,
        badgeColor: '#EF4444',
        description: 'Excès important de tissu adipeux viscéral et sous-cutané.',
        advice: 'Sèche et rééquilibrage nutritionnel prioritaires recommandés.',
      },
    ],
  },
  muscle: {
    title: 'Masse Musculaire Squelettique (SMM)',
    unit: '% du poids corporel',
    definition: 'Masse contractile active des muscles striés (moteur de la force, de la posture et du métabolisme basal).',
    tiers: [
      {
        id: 'elite',
        name: 'Élite / Haut Niveau',
        minPercentMale: 58,
        maxPercentMale: 70,
        minPercentFemale: 48,
        maxPercentFemale: 60,
        badgeColor: '#7C3AED',
        description: 'Développement hypertrophique supérieur (pratiquant avancé/force).',
        advice: 'Métabolisme très élevé, besoin important en protéines (2.0 - 2.2g/kg).',
      },
      {
        id: 'athletic',
        name: 'Athlétique / Développé',
        minPercentMale: 52,
        maxPercentMale: 57.9,
        minPercentFemale: 42,
        maxPercentFemale: 47.9,
        badgeColor: '#00C6FF',
        description: 'Bonne densité musculaire, tonus marqué et réactif.',
        advice: 'Condition athlétique excellente, potentiel de progression continu.',
      },
      {
        id: 'normal',
        name: 'Normal / Actif',
        minPercentMale: 45,
        maxPercentMale: 51.9,
        minPercentFemale: 35,
        maxPercentFemale: 41.9,
        badgeColor: '#10B981',
        description: 'Musculature fonctionnelle pour la vie quotidienne.',
        advice: 'Un entraînement de musculation progressif stimulera l\'hypertrophie.',
      },
      {
        id: 'low',
        name: 'Faible / Déconditionné',
        minPercentMale: 20,
        maxPercentMale: 44.9,
        minPercentFemale: 15,
        maxPercentFemale: 34.9,
        badgeColor: '#F59E0B',
        description: 'Masse musculaire sous la moyenne fonctionnelle.',
        advice: 'Prioriser le renforcement musculaire pour protéger le squelette.',
      },
    ],
  },
  bone: {
    title: 'Masse Minérale Osseuse (Squelette Sec)',
    unit: 'kg de minéraux osseux',
    definition: 'Minéralisation et charpente osseuse sèche selon le modèle anthropométrique de Martin & Drinkwater.',
    tiers: [
      {
        id: 'forte',
        name: 'Robuste / Forte Charpente',
        minPercentMale: 3.9,
        maxPercentMale: 5.5,
        minPercentFemale: 3.2,
        maxPercentFemale: 4.5,
        badgeColor: '#F59E0B',
        description: 'Ossature dense et résistante (tour de poignet large).',
        advice: 'Excellente capacité à porter des charges lourdes et du volume musculaire.',
      },
      {
        id: 'normale',
        name: 'Normale / Standard',
        minPercentMale: 3.0,
        maxPercentMale: 3.8,
        minPercentFemale: 2.2,
        maxPercentFemale: 3.1,
        badgeColor: '#10B981',
        description: 'Densité osseuse physiologique saine.',
        advice: 'Entretenue par les exercices en charge axiale (squat, soulevé de terre).',
      },
      {
        id: 'fine',
        name: 'Fine / Légère',
        minPercentMale: 1.5,
        maxPercentMale: 2.9,
        minPercentFemale: 1.2,
        maxPercentFemale: 2.1,
        badgeColor: '#00C6FF',
        description: 'Squelette fin (poignets étroits).',
        advice: 'Veiller aux apports en calcium, vitamine D et charges progressives.',
      },
    ],
  },
  organ: {
    title: 'Masse des Organes & Fluides Résiduels',
    unit: 'kg et % du poids corporel',
    definition: 'Masse métaboliquement active des viscères (cœur, foie, poumons, reins, cerveau, lymphe et sang).',
    tiers: [
      {
        id: 'standard',
        name: 'Compartiment Vital Sain',
        minPercentMale: 18,
        maxPercentMale: 28,
        minPercentFemale: 18,
        maxPercentFemale: 28,
        badgeColor: '#3B82F6',
        description: 'Poids résiduel des systèmes biologiques vitaux et fluides.',
        advice: 'Les organes représentent environ 60 à 70% de la dépense calorique au repos.',
      },
    ],
  },
};
