import React, { useState, useMemo, useEffect } from 'react';
import { 
  X, 
  Activity, 
  Check, 
  Sparkles, 
  Info, 
  Flame, 
  Scale, 
  ShieldAlert, 
  Sliders, 
  RotateCcw,
  User,
  HeartPulse,
  Target,
  Dumbbell,
  
  Zap,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { 
  calculateBodyComposition, 
  BodyCompositionInputs, 
  BodyFatFormulaType,
  FORMULA_METADATA,
  calculateBodyRecommendation,
  calculateCustomGoalStats,
  BodyRecommendation,
  COMPARTMENT_LADDERS,
  
  
} from '../utils/bodyComposition';
import { UserStats } from '../types';

interface GraduatedGaugeProps {
  currentVal: number;
  minVal: number;
  maxVal: number;
  unit: string;
  color: string;
  ticks: { value: number; label?: string }[];
  tierLabel?: string;
  isLight?: boolean;
}

/**
 * Visual graduated line with glowing indicator thumb (Image 5 style)
 */
function GraduatedGauge({
  currentVal,
  minVal,
  maxVal,
  unit,
  color,
  ticks,
  tierLabel,
  isLight = false,
}: GraduatedGaugeProps) {
  const position = Math.max(3, Math.min(97, ((currentVal - minVal) / (maxVal - minVal)) * 100));

  return (
    <div className="space-y-1.5 pt-1.5">
      {/* Slider-style graduated track */}
      <div className={`relative h-2.5 w-full rounded-full flex items-center ${
        isLight ? 'bg-[#e5d2c1] border border-[#7d5a47]/15' : 'bg-[#202020] border border-white/[0.08]'
      }`}>
        {/* Filled colored track segment */}
        <div
          className="h-full rounded-full transition-all duration-300 opacity-80"
          style={{ width: `${position}%`, backgroundColor: color }}
        />

        {/* Graduated tick lines */}
        {ticks.map((tick, i) => {
          const tickPos = Math.max(0, Math.min(100, ((tick.value - minVal) / (maxVal - minVal)) * 100));
          return (
            <div
              key={i}
              className={`absolute top-0 bottom-0 w-[1.5px] z-10 pointer-events-none ${
                isLight ? 'bg-[#7d5a47]/30' : 'bg-white/20'
              }`}
              style={{ left: `${tickPos}%` }}
              title={`${tick.value}${unit}`}
            />
          );
        })}

        {/* Circular slider thumb without halo effect */}
        <div
          className={`absolute w-4 h-4 rounded-full border-2 transition-all duration-300 z-20 -ml-2 shadow-sm ${
            isLight ? 'border-[#3d2317]/80' : 'border-white/90'
          }`}
          style={{
            left: `${position}%`,
            backgroundColor: color,
          }}
        />
      </div>

      {/* Graduation labels */}
      <div className={`flex justify-between items-center text-[9px] font-mono px-0.5 ${
        isLight ? 'text-[#7d5a47]' : 'text-[#A7A7A7]'
      }`}>
        <span>{minVal}{unit}</span>
        {tierLabel && (
          <span className="font-extrabold uppercase text-[9px] tracking-wide" style={{ color }}>
            {tierLabel}
          </span>
        )}
        <span>{maxVal}{unit}</span>
      </div>
    </div>
  );
}

interface OptionalWristInputProps {
  show: boolean;
  onToggle: () => void;
  wristCm: number;
  onWristChange: (value: number) => void;
  sliderStyle: React.CSSProperties;
}

// Optional wrist circumference slider used by the formulas that need no tape measure
const OptionalWristInput: React.FC<OptionalWristInputProps> = ({ show, onToggle, wristCm, onWristChange, sliderStyle }) => (
  <div className="pt-2 border-t border-white/5">
    <button
      type="button"
      onClick={onToggle}
      className="text-[11px] font-bold text-[#F59E0B] hover:underline flex items-center gap-1.5"
    >
      {show ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      {show
        ? 'Masquer l\'estimation osseuse (poignet)'
        : 'Ajuster mon tour de poignet pour la masse osseuse (optionnel)'}
    </button>

    {show && (
      <div className="mt-3 p-3 rounded-xl bg-[#121212] border border-white/5 space-y-1.5">
        <div className="flex justify-between items-center text-xs">
          <span className="font-bold text-[#D1D5DB]">Tour de poignet (Ossature Martin)</span>
          <span className="font-black text-[#F59E0B] font-mono">{wristCm} cm</span>
        </div>
        <input
          type="range"
          min="13"
          max="22"
          step="0.5"
          value={wristCm}
          onChange={(e) => onWristChange(parseFloat(e.target.value))}
          style={sliderStyle}
          className="w-full accent-[#F59E0B] h-2 rounded-lg cursor-pointer appearance-none transition-all shadow-inner"
        />
      </div>
    )}
  </div>
);

interface BodyCompositionModalProps {
  userStats: UserStats;
  onSaveComposition: (updatedStats: Partial<UserStats>) => void;
  onClose: () => void;
  theme?: 'dark' | 'warm-light';
}

export function BodyCompositionModal({
  userStats,
  onSaveComposition,
  onClose,
  theme,
}: BodyCompositionModalProps) {
  const isLight = theme === 'warm-light';

  const getSliderTrack = (val: number, min: number, max: number, color: string) => {
    const pct = Math.max(0, Math.min(100, ((val - min) / (max - min)) * 100));
    const trackBg = isLight ? '#e5d2c1' : '#242424';
    return {
      background: `linear-gradient(to right, ${color} 0%, ${color} ${pct}%, ${trackBg} ${pct}%, ${trackBg} 100%)`,
    };
  };
  // Inputs state
  const [gender, setGender] = useState<'homme' | 'femme'>(userStats.profile?.gender ?? 'homme');
  const [weightKg, setWeightKg] = useState<number>(userStats.currentWeightKg || 82);
  const [heightCm, setHeightCm] = useState<number>(userStats.profile?.heightCm ?? 180);
  const [age, setAge] = useState<number>(userStats.profile?.age ?? 26);
  const [waistCm, setWaistCm] = useState<number>(84);
  const [neckCm, setNeckCm] = useState<number>(39);
  const [hipCm, setHipCm] = useState<number>(98);
  const [wristCm, setWristCm] = useState<number>(17.5);
  
  // Selected formula
  const [selectedFormula, setSelectedFormula] = useState<BodyFatFormulaType>('us_navy');
  const [showFormulaDetails, setShowFormulaDetails] = useState<boolean>(false);
  const [showOptionalBoneInputs, setShowOptionalBoneInputs] = useState<boolean>(false);

  // Compartment Ladder Info Popover / Modal state (Image 3)
  const [activeLadderCompartment, setActiveLadderCompartment] = useState<'fat' | 'muscle' | 'bone' | 'organ' | null>(null);

  // Goal & Recommendation mode
  const [goalMode, setGoalMode] = useState<'recommendation' | 'custom'>('recommendation');
  const [customGoalType, setCustomGoalType] = useState<'seche' | 'prise_de_masse' | 'recomposition'>('seche');
  const [customTargetWeight, setCustomTargetWeight] = useState<number>(userStats.targetWeightKg || 78);
  const [selectedGoalChoice, setSelectedGoalChoice] = useState<'recommendation' | 'custom'>('recommendation');

  const [savedFeedback, setSavedFeedback] = useState<boolean>(false);

  // Computed results based on inputs & formula
  const inputs: BodyCompositionInputs = useMemo(() => ({
    weightKg,
    heightCm,
    age,
    gender,
    waistCm,
    neckCm,
    hipCm: gender === 'femme' ? hipCm : undefined,
    wristCm,
  }), [weightKg, heightCm, age, gender, waistCm, neckCm, hipCm, wristCm]);

  const results = useMemo(() => {
    return calculateBodyComposition(inputs, selectedFormula);
  }, [inputs, selectedFormula]);

  // App Recommendation
  const recommendation: BodyRecommendation = useMemo(() => {
    return calculateBodyRecommendation(results, gender);
  }, [results, gender]);

  // Adjust custom target weight default if weight changes significantly
  useEffect(() => {
    if (customGoalType === 'seche') {
      setCustomTargetWeight((prev) => (prev >= weightKg ? Math.round((weightKg - 3.5) * 10) / 10 : prev));
    } else if (customGoalType === 'prise_de_masse') {
      setCustomTargetWeight((prev) => (prev <= weightKg ? Math.round((weightKg + 3.5) * 10) / 10 : prev));
    } else {
      setCustomTargetWeight(weightKg);
    }
  }, [customGoalType, weightKg]);

  // Custom goal calculations
  const customGoalStats = useMemo(() => {
    return calculateCustomGoalStats(
      weightKg,
      results.fatPercent,
      customGoalType,
      customTargetWeight,
      gender
    );
  }, [weightKg, results.fatPercent, customGoalType, customTargetWeight, gender]);

  // Formula metadata
  const currentFormulaMeta = FORMULA_METADATA[selectedFormula];

  const handleSave = () => {
    const isAppRec = selectedGoalChoice === 'recommendation';
    const chosenTargetWeight = isAppRec ? recommendation.targetWeightKg : customGoalStats.targetWeightKg;
    const chosenTargetFat = isAppRec ? recommendation.targetFatPercent : customGoalStats.estimatedTargetFatPercent;
    const chosenType = isAppRec ? recommendation.type : customGoalType;

    const goalTitle = chosenType === 'seche'
      ? `Objectif Sèche (${chosenTargetFat}% MG)`
      : chosenType === 'prise_de_masse'
        ? `Objectif Prise de Masse (${chosenTargetWeight} kg)`
        : `Objectif Recomposition (${chosenTargetWeight} kg)`;

    const goalDescription = isAppRec 
      ? recommendation.headline
      : chosenType === 'seche' 
        ? `Perdre ${Math.abs(customGoalStats.weightDelta)} kg de masse grasse`
        : chosenType === 'prise_de_masse'
          ? `Gagner ${customGoalStats.muscleDeltaKg} kg de muscle sec`
          : 'Stabiliser et densifier la masse musculaire';

    onSaveComposition({
      currentWeightKg: weightKg,
      targetWeightKg: chosenTargetWeight,
      profile: {
        activityLevel: 'modere',
        goal: 'maintien',
        ...userStats.profile,
        gender,
        age,
        heightCm,
      },
      nextGoal: {
        title: goalTitle,
        current: weightKg,
        target: chosenTargetWeight,
        unit: 'kg',
        description: goalDescription,
        startValue: weightKg,
        goalType: chosenType === 'seche' ? 'perte_poids' : chosenType === 'prise_de_masse' ? 'prise_masse' : 'autre',
      },
      bodyComposition: {
        fatPercent: results.fatPercent,
        fatKg: results.fatKg,
        leanMassKg: results.leanMassKg,
        boneMassKg: results.boneMassKg,
        muscleMassKg: results.muscleMassKg,
        organMassKg: results.organMassKg,
        waterLiters: results.waterLiters,
        formula: selectedFormula,
        date: new Date().toISOString(),
        recommendation: {
          type: recommendation.type,
          title: recommendation.title,
          targetWeightKg: recommendation.targetWeightKg,
          targetFatPercent: recommendation.targetFatPercent,
          fatDeltaKg: recommendation.fatDeltaKg,
          muscleDeltaKg: recommendation.muscleDeltaKg,
          dailyCalorieDelta: recommendation.dailyCalorieDelta,
        },
        chosenGoal: {
          source: isAppRec ? 'app_recommendation' : 'user_custom',
          type: chosenType,
          targetWeightKg: chosenTargetWeight,
          targetFatPercent: chosenTargetFat,
          fatDeltaKg: isAppRec ? recommendation.fatDeltaKg : customGoalStats.fatDeltaKg,
          muscleDeltaKg: isAppRec ? recommendation.muscleDeltaKg : customGoalStats.muscleDeltaKg,
        },
      },
    });

    setSavedFeedback(true);
    setTimeout(() => {
      onClose();
    }, 850);
  };

  const handleReset = () => {
    setWeightKg(userStats.currentWeightKg || 82);
    setHeightCm(180);
    setAge(26);
    setWaistCm(84);
    setNeckCm(39);
    setHipCm(98);
    setWristCm(17.5);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div 
        id="modal-body-composition"
        className="w-full max-w-2xl bg-[#141414] border-t sm:border border-white/10 rounded-t-3xl sm:rounded-3xl p-5 sm:p-7 space-y-6 shadow-2xl relative max-h-[92vh] overflow-y-auto no-scrollbar"
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-white/[0.08] pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-[#EC4899]/15 border border-[#EC4899]/30 text-[10px] font-black uppercase tracking-widest text-[#EC4899] flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                BIOMÉTRIE & OBJECTIFS
              </span>
              <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold text-[#A7A7A7]">
                MULTI-FORMULES SCIENTIFIQUES
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight">
              Composition Corporelle & Stratégie
            </h2>
            <p className="text-xs text-[#A7A7A7]">
              Estime ta <span className="text-[#EC4899] font-semibold">masse grasse</span>, <span className="text-[#00C6FF] font-semibold">masse sèche</span> et définis ton cap (<span className="text-[#10B981] font-semibold">Sèche</span> ou <span className="text-[#EC4899] font-semibold">Prise de masse</span>).
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-[#202020] text-[#A7A7A7] hover:text-white flex items-center justify-center transition-colors border border-white/10 shrink-0"
            title="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1. SÉLECTEUR DE FORMULE AVEC POURCENTAGE DE PRÉCISION SCIENTIFIQUE */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-[#A7A7A7] uppercase tracking-wider flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-[#EC4899]" />
              Formule de calcul & Précision
            </span>
            <button
              onClick={() => setShowFormulaDetails(!showFormulaDetails)}
              className="text-[11px] font-bold text-[#00C6FF] hover:underline flex items-center gap-1"
            >
              <Info className="w-3.5 h-3.5" />
              {showFormulaDetails ? 'Masquer comparaison' : 'Comparer les formules'}
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(Object.keys(FORMULA_METADATA) as BodyFatFormulaType[]).map((key) => {
              const meta = FORMULA_METADATA[key];
              const isSelected = selectedFormula === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedFormula(key)}
                  className={`p-2.5 rounded-2xl border text-left transition-all relative ${
                    isSelected
                      ? 'bg-gradient-to-b from-[#221620] to-[#161616] border-[#EC4899] shadow-lg shadow-[#EC4899]/15'
                      : 'bg-[#121212] border-white/[0.06] hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className={`text-xs font-black uppercase ${
                      isSelected ? 'text-white' : 'text-[#D1D5DB]'
                    }`}>
                      {meta.name}
                    </span>
                    <span className={`text-[10px] font-black font-mono px-2 py-0.5 rounded-md ${
                      isSelected
                        ? 'bg-[#EC4899]/20 text-[#EC4899] border border-[#EC4899]/40 shadow-sm'
                        : 'bg-white/5 text-[#00C6FF]'
                    }`}>
                      ~{meta.precisionPercent}%*
                    </span>
                  </div>

                  <p className="text-[10px] text-[#A7A7A7] mt-1 line-clamp-1">
                    {meta.shortDesc}
                  </p>

                  <div className="mt-1.5 flex items-center justify-between text-[9px]">
                    <span className={`px-1.5 py-0.2 rounded font-bold ${
                      isSelected ? 'bg-white/10 text-white' : 'text-[#737373]'
                    }`}>
                      {meta.badge}
                    </span>
                    {isSelected && (
                      <span className="text-[#EC4899] font-black text-[10px] flex items-center gap-0.5">
                        <Check className="w-3 h-3" />
                        Actif
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Annotation scientifique élégante (Image 1) */}
          <div className="flex items-center justify-between text-[10px] text-[#A7A7A7] px-1 pt-0.5">
            <span className="flex items-center gap-1">
              <span className="text-[#EC4899] font-black text-xs">*</span>
              <span>Indice d'étalonnage clinique (concordance vs DEXA & modèle à 4 compartiments)</span>
            </span>
            <span className="text-[#00C6FF] font-semibold hidden sm:inline">
              Données de laboratoire
            </span>
          </div>

          {/* Bannière explicative dynamique de la formule choisie et de ses exigences (Images 7 & 8) */}
          <div className="p-3.5 rounded-xl bg-[#1A1A1A] border border-white/10 flex items-start gap-3 text-xs animate-in fade-in duration-200">
            <Zap className="w-4 h-4 text-[#00C6FF] shrink-0 mt-0.5" />
            <div className="space-y-1.5 w-full">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="font-black text-white uppercase text-xs tracking-wide">
                    {currentFormulaMeta.name}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#00C6FF]/15 text-[#00C6FF] font-black border border-[#00C6FF]/30">
                    {currentFormulaMeta.precisionPercent}% DE CONCORDANCE
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white font-bold">
                    {currentFormulaMeta.shortDesc}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#EC4899]/20 text-[#EC4899] font-black border border-[#EC4899]/30">
                    {currentFormulaMeta.toolRequirement}
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-[#A7A7A7] leading-relaxed">
                {currentFormulaMeta.explanation}
              </p>
            </div>
          </div>

          {/* Comparatif formules si activé */}
          {showFormulaDetails && (
            <div className="p-3.5 rounded-2xl bg-[#0E0E0E] border border-white/10 space-y-2.5 animate-in fade-in duration-200">
              <h4 className="text-xs font-black text-white uppercase flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-[#00C6FF]" />
                Comparatif instantané des méthodes sur tes mensurations
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                <div className="p-2 rounded-xl bg-[#181818] border border-white/5">
                  <span className="text-[10px] text-[#A7A7A7] block">US Navy (91%)</span>
                  <span className="font-black text-sm text-[#EC4899]">
                    {results.formulaBreakdown.usNavyFatPercent}%
                  </span>
                  <span className="text-[9px] text-[#A7A7A7] block mt-0.5">Mensurations</span>
                </div>
                <div className="p-2 rounded-xl bg-[#181818] border border-white/5">
                  <span className="text-[10px] text-[#A7A7A7] block">Deurenberg (82%)</span>
                  <span className="font-black text-sm text-[#00C6FF]">
                    {results.formulaBreakdown.deurenbergFatPercent}%
                  </span>
                  <span className="text-[9px] text-[#A7A7A7] block mt-0.5">IMC & Âge</span>
                </div>
                <div className="p-2 rounded-xl bg-[#181818] border border-white/5">
                  <span className="text-[10px] text-[#A7A7A7] block">Masse Sèche Boer (87%)</span>
                  <span className="font-black text-sm text-[#10B981]">
                    {results.formulaBreakdown.boerLeanMassKg} kg
                  </span>
                  <span className="text-[9px] text-[#A7A7A7] block mt-0.5">LBM direct</span>
                </div>
                <div className="p-2 rounded-xl bg-[#181818] border border-white/5">
                  <span className="text-[10px] text-[#A7A7A7] block">Masse Sèche James</span>
                  <span className="font-black text-sm text-[#F59E0B]">
                    {results.formulaBreakdown.jamesLeanMassKg} kg
                  </span>
                  <span className="text-[9px] text-[#A7A7A7] block mt-0.5">Stature/Poids</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 2. PANEL CONTRÔLE DE MESURES & MENSURATIONS DYNAMIQUE SELON LA FORMULE CHOISIE */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#121212] border border-white/[0.08] space-y-5">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <div className="space-y-0.5">
              <span className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                <Scale className="w-4 h-4 text-[#00C6FF]" />
                Panel de Mesures : {currentFormulaMeta.name}
              </span>
              <p className="text-[11px] text-[#A7A7A7]">
                {selectedFormula === 'deurenberg' && 'Champs nécessaires : Sexe, Âge, Poids et Taille.'}
                {selectedFormula === 'boer_derived' && 'Champs nécessaires : Sexe, Poids et Taille.'}
                {selectedFormula === 'us_navy' && `Champs nécessaires : Poids, Taille, Tour de taille et Tour de cou${gender === 'femme' ? ', Hanches' : ''}.`}
                {selectedFormula === 'average' && 'Champs nécessaires : Ensemble des mensurations (Synthèse croisée).'}
              </p>
            </div>
            <button
              type="button"
              onClick={handleReset}
              className="text-[11px] font-bold text-[#A7A7A7] hover:text-white flex items-center gap-1 transition-colors px-2 py-1 rounded-lg bg-white/5"
            >
              <RotateCcw className="w-3 h-3" />
              Réinitialiser
            </button>
          </div>

          {/* Sexe & Âge */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Sexe biologique */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-[10px] font-bold text-[#A7A7A7] uppercase flex items-center gap-1">
                  Sexe biologique
                  <span className="text-[#EC4899] font-black">*Requis</span>
                </label>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setGender('homme')}
                  className={`py-2 px-3 rounded-xl text-xs font-black uppercase flex items-center justify-center gap-1.5 transition-all ${
                    gender === 'homme'
                      ? 'bg-gradient-to-r from-[#7C3AED] to-[#EC4899] text-white shadow-md'
                      : 'bg-[#1C1C1C] text-[#A7A7A7] hover:text-white border border-white/5'
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  Homme
                </button>
                <button
                  type="button"
                  onClick={() => setGender('femme')}
                  className={`py-2 px-3 rounded-xl text-xs font-black uppercase flex items-center justify-center gap-1.5 transition-all ${
                    gender === 'femme'
                      ? 'bg-gradient-to-r from-[#EC4899] to-[#DD2476] text-white shadow-md'
                      : 'bg-[#1C1C1C] text-[#A7A7A7] hover:text-white border border-white/5'
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  Femme
                </button>
              </div>
            </div>

            {/* Âge (crucial pour Deurenberg, synthèse & hydratation) */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-[10px] font-bold text-[#A7A7A7] uppercase flex items-center gap-1">
                  Âge
                  {selectedFormula === 'deurenberg' ? (
                    <span className="text-[#EC4899] font-black">*Clé Deurenberg</span>
                  ) : (
                    <span className="text-[#A7A7A7] text-[9px]">(Métabolisme)</span>
                  )}
                </label>
                <span className="text-xs font-black text-white font-mono">{age} ans</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAge((prev) => Math.max(14, prev - 1))}
                  className="w-8 h-8 rounded-lg bg-[#202020] text-white font-bold hover:bg-white/10 active:scale-95 flex items-center justify-center shrink-0"
                >
                  -
                </button>
                <input
                  type="range"
                  min="15"
                  max="90"
                  value={age}
                  onChange={(e) => setAge(parseInt(e.target.value) || 25)}
                  style={getSliderTrack(age, 15, 90, '#EC4899')}
                  className="w-full accent-[#EC4899] h-2 rounded-lg cursor-pointer appearance-none transition-all shadow-inner"
                />
                <button
                  type="button"
                  onClick={() => setAge((prev) => Math.min(95, prev + 1))}
                  className="w-8 h-8 rounded-lg bg-[#202020] text-white font-bold hover:bg-white/10 active:scale-95 flex items-center justify-center shrink-0"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* Poids & Taille (Toujours requis) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Poids avec pavé de défilement fluide SANS colonne native */}
            <div className="p-3.5 rounded-xl bg-[#181818] border border-white/5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#A7A7A7] uppercase flex items-center gap-1">
                  Poids Corporel
                  <span className="text-[#EC4899] font-black">*Requis</span>
                </span>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black text-white font-mono">{weightKg}</span>
                  <span className="text-xs font-bold text-[#EC4899]">KG</span>
                </div>
              </div>

              {/* Pavé de défilement fluide sans ascenseur vertical encombrant */}
              <input
                type="range"
                min="40"
                max="150"
                step="0.5"
                value={weightKg}
                onChange={(e) => setWeightKg(parseFloat(e.target.value))}
                style={getSliderTrack(weightKg, 40, 150, '#EC4899')}
                className="w-full accent-[#EC4899] h-2 rounded-lg cursor-pointer appearance-none transition-all shadow-inner"
              />

              {/* Boutons pas-à-pas rapides */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex gap-1">
                  {[-1, -0.5].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setWeightKg((prev) => Math.max(35, Math.round((prev + d) * 10) / 10))}
                      className="px-2 py-0.5 rounded-md bg-[#242424] text-[10px] font-bold text-[#A7A7A7] hover:text-white"
                    >
                      {d} kg
                    </button>
                  ))}
                </div>
                <div className="flex gap-1">
                  {[+0.5, +1].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setWeightKg((prev) => Math.round((prev + d) * 10) / 10)}
                      className="px-2 py-0.5 rounded-md bg-[#242424] text-[10px] font-bold text-[#A7A7A7] hover:text-white"
                    >
                      +{d} kg
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Taille */}
            <div className="p-3.5 rounded-xl bg-[#181818] border border-white/5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#A7A7A7] uppercase flex items-center gap-1">
                  Taille
                  <span className="text-[#00C6FF] font-black">*Requis</span>
                </span>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black text-white font-mono">{heightCm}</span>
                  <span className="text-xs font-bold text-[#00C6FF]">CM</span>
                </div>
              </div>

              <input
                type="range"
                min="130"
                max="220"
                step="1"
                value={heightCm}
                onChange={(e) => setHeightCm(parseInt(e.target.value) || 175)}
                style={getSliderTrack(heightCm, 130, 220, '#00C6FF')}
                className="w-full accent-[#00C6FF] h-2 rounded-lg cursor-pointer appearance-none transition-all shadow-inner"
              />

              <div className="flex items-center justify-between pt-1 text-[10px] text-[#A7A7A7]">
                <span>130 cm</span>
                <span className="font-semibold text-white">IMC : {results.bmi} ({results.bmiCategory})</span>
                <span>220 cm</span>
              </div>
            </div>
          </div>

          {/* ZONE CONDITIONNELLE : CIRCONFÉRENCES (US Navy & Moyenne) vs SANS MÈTRE RUBAN (Deurenberg & Boer) */}
          {selectedFormula === 'deurenberg' ? (
            /* Cas Deurenberg : Aucune circonférence n'est requise */
            <div className="p-4 rounded-2xl bg-[#181818] border border-[#00C6FF]/20 space-y-3 animate-in fade-in duration-200">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#00C6FF]/15 text-[#00C6FF] flex items-center justify-center font-black shrink-0 text-sm">
                  ✓
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-black text-white uppercase">
                    Aucun mètre ruban nécessaire pour Deurenberg
                  </h4>
                  <p className="text-[11px] text-[#A7A7A7] leading-relaxed">
                    La formule de Deurenberg utilise exclusivement ton <span className="text-white font-semibold">Poids ({weightKg} kg)</span>, ta <span className="text-white font-semibold">Taille ({heightCm} cm)</span>, ton <span className="text-white font-semibold">Âge ({age} ans)</span> et ton <span className="text-white font-semibold">Sexe ({gender})</span>. Les mesures de cou et taille ne sont pas utilisées.
                  </p>
                </div>
              </div>

              {/* Bouton pour afficher optionnellement le poignet pour la masse osseuse */}
              <OptionalWristInput
                show={showOptionalBoneInputs}
                onToggle={() => setShowOptionalBoneInputs(!showOptionalBoneInputs)}
                wristCm={wristCm}
                onWristChange={setWristCm}
                sliderStyle={getSliderTrack(wristCm, 13, 22, '#F59E0B')}
              />
            </div>
          ) : selectedFormula === 'boer_derived' ? (
            /* Cas Boer & James : Aucune circonférence n'est requise */
            <div className="p-4 rounded-2xl bg-[#181818] border border-[#10B981]/20 space-y-3 animate-in fade-in duration-200">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#10B981]/15 text-[#10B981] flex items-center justify-center font-black shrink-0 text-sm">
                  <Zap className="w-4 h-4 text-[#10B981]" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-black text-white uppercase">
                    Modèle clinique direct (Poids & Taille uniquement)
                  </h4>
                  <p className="text-[11px] text-[#A7A7A7] leading-relaxed">
                    Les équations médicales de Boer et de James évaluent directement la masse maigre (LBM) par rapport à la taille et au poids. Aucune circonférence de cou ou de taille n&apos;est requise.
                  </p>
                </div>
              </div>

              <OptionalWristInput
                show={showOptionalBoneInputs}
                onToggle={() => setShowOptionalBoneInputs(!showOptionalBoneInputs)}
                wristCm={wristCm}
                onWristChange={setWristCm}
                sliderStyle={getSliderTrack(wristCm, 13, 22, '#F59E0B')}
              />
            </div>
          ) : (
            /* Cas US Navy & Synthèse : Circonférences au mètre ruban requises et interactives */
            <div className="space-y-3 pt-1 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black text-[#A7A7A7] uppercase tracking-wider flex items-center gap-1.5">
                  <HeartPulse className="w-3.5 h-3.5 text-[#EC4899]" />
                  Mensurations requises (Mètre ruban au repos)
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#EC4899]/15 text-[#EC4899] font-bold">
                  Actif pour {currentFormulaMeta.name}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Tour de taille */}
                <div className="p-3 rounded-xl bg-[#181818] border border-white/5 space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-[#D1D5DB]">
                      Tour de taille (au nombril) <span className="text-[#EC4899]">*Requis</span>
                    </span>
                    <span className="font-black text-white font-mono">{waistCm} cm</span>
                  </div>
                  <input
                    type="range"
                    min="55"
                    max="140"
                    step="0.5"
                    value={waistCm}
                    onChange={(e) => setWaistCm(parseFloat(e.target.value))}
                    style={getSliderTrack(waistCm, 55, 140, '#EC4899')}
                    className="w-full accent-[#EC4899] h-2 rounded-lg cursor-pointer appearance-none transition-all shadow-inner"
                  />
                </div>

                {/* Tour de cou */}
                <div className="p-3 rounded-xl bg-[#181818] border border-white/5 space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-[#D1D5DB]">
                      Tour de cou (sous la pomme d&apos;Adam) <span className="text-[#00C6FF]">*Requis</span>
                    </span>
                    <span className="font-black text-white font-mono">{neckCm} cm</span>
                  </div>
                  <input
                    type="range"
                    min="25"
                    max="55"
                    step="0.5"
                    value={neckCm}
                    onChange={(e) => setNeckCm(parseFloat(e.target.value))}
                    style={getSliderTrack(neckCm, 25, 55, '#00C6FF')}
                    className="w-full accent-[#00C6FF] h-2 rounded-lg cursor-pointer appearance-none transition-all shadow-inner"
                  />
                </div>

                {/* Tour de hanches (requis pour femme) */}
                {gender === 'femme' && (
                  <div className="p-3 rounded-xl bg-[#181818] border border-white/5 space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-[#D1D5DB]">
                        Tour de hanches (partie la plus large) <span className="text-[#DD2476]">*Requis</span>
                      </span>
                      <span className="font-black text-white font-mono">{hipCm} cm</span>
                    </div>
                    <input
                      type="range"
                      min="70"
                      max="140"
                      step="0.5"
                      value={hipCm}
                      onChange={(e) => setHipCm(parseFloat(e.target.value))}
                      style={getSliderTrack(hipCm, 70, 140, '#DD2476')}
                      className="w-full accent-[#DD2476] h-2 rounded-lg cursor-pointer appearance-none transition-all shadow-inner"
                    />
                  </div>
                )}

                {/* Tour de poignet (estimation masse osseuse / ossature Martin) */}
                <div className="p-3 rounded-xl bg-[#181818] border border-white/5 space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-[#D1D5DB]">Tour de poignet (Ossature)</span>
                    <span className="font-black text-[#F59E0B] font-mono">{wristCm} cm</span>
                  </div>
                  <input
                    type="range"
                    min="13"
                    max="22"
                    step="0.5"
                    value={wristCm}
                    onChange={(e) => setWristCm(parseFloat(e.target.value))}
                    style={getSliderTrack(wristCm, 13, 22, '#F59E0B')}
                    className="w-full accent-[#F59E0B] h-2 rounded-lg cursor-pointer appearance-none transition-all shadow-inner"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 3. RÉSULTATS VISUELS & RÉPARTITION DE LA COMPOSITION DU CORPS */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-[#EC4899]" />
              Résultats de Composition Corporelle ({currentFormulaMeta.name})
            </h3>
            <span className="text-xs font-black text-white px-2 py-0.5 rounded-full bg-white/5 border border-white/10">
              Poids total : {weightKg} kg
            </span>
          </div>

          {/* Barre segmentée visuelle de composition corporelle */}
          <div className="space-y-2">
            <div className="h-4 w-full rounded-full overflow-hidden flex bg-[#202020] border border-white/10">
              <div 
                style={{ width: `${Math.max(5, results.fatPercent)}%` }} 
                className="bg-gradient-to-r from-[#FF512F] to-[#EC4899] transition-all duration-300"
                title={`Masse Grasse : ${results.fatPercent}%`}
              />
              <div 
                style={{ width: `${Math.max(5, results.muscleMassPercent)}%` }} 
                className="bg-gradient-to-r from-[#00C6FF] to-[#0072FF] transition-all duration-300"
                title={`Masse Musculaire : ${results.muscleMassPercent}%`}
              />
              <div 
                style={{ width: `${Math.max(3, results.boneMassPercent)}%` }} 
                className="bg-gradient-to-r from-[#F59E0B] to-[#D97706] transition-all duration-300"
                title={`Masse Osseuse : ${results.boneMassPercent}%`}
              />
              <div 
                style={{ width: `${Math.max(5, 100 - results.fatPercent - results.muscleMassPercent - results.boneMassPercent)}%` }} 
                className="bg-[#3B82F6]/60 transition-all duration-300"
                title="Eau & organes vitaux"
              />
            </div>

            {/* Légende de la barre */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#A7A7A7] px-1">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#EC4899]" />
                <span>Masse Grasse ({results.fatPercent}%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#00C6FF]" />
                <span>Muscles ({results.muscleMassPercent}%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" />
                <span>Os ({results.boneMassPercent}%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#3B82F6]" />
                <span>Eau & Organes</span>
              </div>
            </div>
          </div>

          {/* Différenciation explicite : Masse Sèche (Lean Mass) vs Masse Musculaire (SMM) (Image 2) */}
          <div className="p-3.5 rounded-2xl bg-[#141414] border border-[#00C6FF]/20 space-y-1.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#00C6FF]" />
                <span className="text-xs font-black uppercase text-white tracking-wide">
                  Masse Sèche Totale (Maigre) :
                </span>
                <span className="text-sm font-black text-[#00C6FF] font-mono">
                  {results.leanMassKg} kg ({results.leanMassPercent}%)
                </span>
              </div>
              <span className="text-[10px] text-[#A7A7A7] bg-white/5 px-2 py-0.5 rounded-full border border-white/5 self-start sm:self-auto">
                Tout ce qui n'est pas graisse
              </span>
            </div>
            <p className="text-[11px] text-[#A7A7A7] leading-relaxed">
              Décomposée en 3 piliers : <span className="text-[#00C6FF] font-bold">Masse Musculaire ({results.muscleMassKg} kg)</span> + <span className="text-[#F59E0B] font-bold">Masse Osseuse ({results.boneMassKg} kg)</span> + <span className="text-[#3B82F6] font-bold">Organes & Fluides vitaux ({results.organMassKg} kg)</span>.
            </p>
          </div>

          {/* 4 Cartes distinctes : Masse Grasse, Masse Musculaire, Masse Osseuse, Masse des Organes (Image 2) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* 1. MASSE GRASSE */}
            <div className="p-4 rounded-2xl bg-gradient-to-b from-[#1C1318] to-[#121212] border border-[#EC4899]/30 space-y-2.5 relative overflow-hidden flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#EC4899] flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5" />
                    Masse Grasse
                  </span>
                  <div className="flex items-center">
                    <span 
                      className="text-[10px] px-2 py-0.5 rounded-full font-black uppercase text-white"
                      style={{ backgroundColor: results.fatCategoryColor }}
                    >
                      {results.fatCategory}
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveLadderCompartment('fat')}
                      className="w-5 h-5 rounded-full bg-white/10 hover:bg-[#EC4899]/30 text-white/80 hover:text-white flex items-center justify-center transition-all ml-1.5 cursor-pointer shadow-sm"
                      title="Voir les paliers & infographie Masse Grasse"
                    >
                      <Info className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                <div className="space-y-0.5">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl font-black text-white font-mono">{results.fatPercent}%</span>
                    <span className="text-xs font-bold text-[#EC4899]">({results.fatKg} kg)</span>
                  </div>
                  <p className="text-[10.5px] text-[#A7A7A7] leading-tight">
                    Tissu adipeux sous-cutané et viscéral.
                  </p>
                </div>
              </div>

              {/* Jauge graduée avec curseur lumineux style Image 5 (Image 4 & 5) */}
              <div className="space-y-1.5 pt-1 border-t border-white/5">
                <GraduatedGauge
                  currentVal={results.fatPercent}
                  minVal={gender === 'homme' ? 6 : 12}
                  maxVal={gender === 'homme' ? 32 : 40}
                  unit="%"
                  color="#EC4899"
                  tierLabel={results.fatCategory}
                  isLight={isLight}
                  ticks={gender === 'homme' 
                    ? [{ value: 10 }, { value: 17 }, { value: 24 }, { value: 30 }]
                    : [{ value: 16 }, { value: 24 }, { value: 31 }, { value: 38 }]
                  }
                />
                <div className="text-[10px] text-[#A7A7A7] flex justify-between pt-0.5">
                  <span>Norme {gender} :</span>
                  <span className="font-semibold text-white">
                    {gender === 'homme' ? '12 - 20%' : '18 - 28%'}
                  </span>
                </div>
              </div>
            </div>

            {/* 2. MASSE MUSCULAIRE (Squelettique contractile SMM) */}
            <div className="p-4 rounded-2xl bg-gradient-to-b from-[#101824] to-[#121212] border border-[#00C6FF]/30 space-y-2.5 relative overflow-hidden flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#00C6FF] flex items-center gap-1">
                    <Dumbbell className="w-3.5 h-3.5" />
                    Masse Musculaire
                  </span>
                  <div className="flex items-center">
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-black uppercase bg-[#00C6FF]/20 text-[#00C6FF] border border-[#00C6FF]/30">
                      {results.muscleCategory}
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveLadderCompartment('muscle')}
                      className="w-5 h-5 rounded-full bg-white/10 hover:bg-[#00C6FF]/30 text-white/80 hover:text-white flex items-center justify-center transition-all ml-1.5 cursor-pointer shadow-sm"
                      title="Voir les paliers & infographie Masse Musculaire"
                    >
                      <Info className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                <div className="space-y-0.5">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl font-black text-white font-mono">{results.muscleMassKg}</span>
                    <span className="text-xs font-bold text-[#00C6FF]">KG</span>
                    <span className="text-[11px] text-[#A7A7A7]">({results.muscleMassPercent}%)</span>
                  </div>
                  <p className="text-[10.5px] text-[#A7A7A7] leading-tight">
                    Muscles striés squelettiques actifs (SMM).
                  </p>
                </div>
              </div>

              {/* Jauge graduée avec curseur lumineux style Image 5 (Image 4 & 5) */}
              <div className="space-y-1.5 pt-1 border-t border-white/5">
                <GraduatedGauge
                  currentVal={results.muscleMassPercent}
                  minVal={gender === 'homme' ? 35 : 28}
                  maxVal={gender === 'homme' ? 65 : 55}
                  unit="%"
                  color="#00C6FF"
                  tierLabel={results.muscleCategory}
                  isLight={isLight}
                  ticks={gender === 'homme'
                    ? [{ value: 45 }, { value: 52 }, { value: 58 }]
                    : [{ value: 35 }, { value: 42 }, { value: 48 }]
                  }
                />
                <div className="text-[10px] text-[#A7A7A7] flex justify-between pt-0.5">
                  <span>Norme {gender} :</span>
                  <span className="font-semibold text-white">
                    {gender === 'homme' ? '45 - 56%' : '35 - 46%'}
                  </span>
                </div>
              </div>
            </div>

            {/* 3. MASSE OSSEUSE */}
            <div className="p-4 rounded-2xl bg-gradient-to-b from-[#1C1810] to-[#121212] border border-[#F59E0B]/30 space-y-2.5 relative overflow-hidden flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#F59E0B] flex items-center gap-1">
                    <Scale className="w-3.5 h-3.5" />
                    Masse Osseuse
                  </span>
                  <div className="flex items-center">
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-black uppercase bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/30">
                      {results.boneMassCategory}
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveLadderCompartment('bone')}
                      className="w-5 h-5 rounded-full bg-white/10 hover:bg-[#F59E0B]/30 text-white/80 hover:text-white flex items-center justify-center transition-all ml-1.5 cursor-pointer shadow-sm"
                      title="Voir les paliers & infographie Masse Osseuse"
                    >
                      <Info className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                <div className="space-y-0.5">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl font-black text-white font-mono">{results.boneMassKg}</span>
                    <span className="text-xs font-bold text-[#F59E0B]">KG</span>
                    <span className="text-[11px] text-[#A7A7A7]">({results.boneMassPercent}%)</span>
                  </div>
                  <p className="text-[10.5px] text-[#A7A7A7] leading-tight">
                    Minéraux du squelette sec (Martin/BMC).
                  </p>
                </div>
              </div>

              {/* Jauge graduée avec curseur lumineux style Image 5 (Image 4 & 5) */}
              <div className="space-y-1.5 pt-1 border-t border-white/5">
                <GraduatedGauge
                  currentVal={results.boneMassKg}
                  minVal={gender === 'homme' ? 2.0 : 1.5}
                  maxVal={gender === 'homme' ? 4.8 : 4.0}
                  unit="kg"
                  color="#F59E0B"
                  tierLabel={results.boneMassCategory}
                  isLight={isLight}
                  ticks={gender === 'homme'
                    ? [{ value: 3.0 }, { value: 3.8 }]
                    : [{ value: 2.2 }, { value: 3.1 }]
                  }
                />
                <div className="text-[10px] text-[#A7A7A7] flex justify-between pt-0.5">
                  <span>Norme {gender} :</span>
                  <span className="font-semibold text-white">
                    {gender === 'homme' ? '3.0 - 4.2 kg' : '2.2 - 3.4 kg'}
                  </span>
                </div>
              </div>
            </div>

            {/* 4. MASSE DES ORGANES & FLUIDES VITAUX */}
            <div className="p-4 rounded-2xl bg-gradient-to-b from-[#101420] to-[#121212] border border-[#3B82F6]/30 space-y-2.5 relative overflow-hidden flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#3B82F6] flex items-center gap-1">
                    <HeartPulse className="w-3.5 h-3.5" />
                    Masse des Organes
                  </span>
                  <div className="flex items-center">
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-black uppercase bg-[#3B82F6]/20 text-[#3B82F6] border border-[#3B82F6]/30">
                      Vitale
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveLadderCompartment('organ')}
                      className="w-5 h-5 rounded-full bg-white/10 hover:bg-[#3B82F6]/30 text-white/80 hover:text-white flex items-center justify-center transition-all ml-1.5 cursor-pointer shadow-sm"
                      title="Voir les paliers & infographie Masse des Organes"
                    >
                      <Info className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                <div className="space-y-0.5">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl font-black text-white font-mono">{results.organMassKg}</span>
                    <span className="text-xs font-bold text-[#3B82F6]">KG</span>
                    <span className="text-[11px] text-[#A7A7A7]">({results.organMassPercent}%)</span>
                  </div>
                  <p className="text-[10.5px] text-[#A7A7A7] leading-tight">
                    Viscères vitaux, cœur, cerveau, sang & lymphe.
                  </p>
                </div>
              </div>

              {/* Jauge graduée avec curseur lumineux style Image 5 (Image 4 & 5) */}
              <div className="space-y-1.5 pt-1 border-t border-white/5">
                <GraduatedGauge
                  currentVal={results.organMassPercent}
                  minVal={12}
                  maxVal={32}
                  unit="%"
                  color="#3B82F6"
                  tierLabel="Vitale"
                  isLight={isLight}
                  ticks={[{ value: 18 }, { value: 23 }, { value: 28 }]}
                />
                <div className="text-[10px] text-[#A7A7A7] flex justify-between pt-0.5">
                  <span>Dépense au repos :</span>
                  <span className="font-semibold text-white">~60 - 70% BMR</span>
                </div>
              </div>
            </div>
          </div>

          {/* Eau corporelle */}
          <div className="p-3.5 rounded-xl bg-[#121212] border border-white/5 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#0072FF]/20 text-[#00C6FF] flex items-center justify-center font-bold">
                <Activity className="w-4 h-4 text-[#00C6FF]" />
              </div>
              <div>
                <span className="font-bold text-white block">Eau corporelle totale (Watson)</span>
                <span className="text-[11px] text-[#A7A7A7]">Hydratation essentielle des tissus</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-base font-black text-white font-mono">{results.waterLiters} L</span>
              <span className="text-[10px] text-[#A7A7A7] block">~{results.waterPercent}% du poids total</span>
            </div>
          </div>
        </div>

        {/* 4. STRATÉGIE & OBJECTIF : RECOMMANDATION SCIENTIFIQUE (SÈCHE / PRISE DE MASSE) OU OBJECTIF MANUEL AU CHOIX */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#161616] border border-white/10 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30 text-[10px] font-black uppercase">
                  COACHING STRATÉGIQUE
                </span>
                <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-tight flex items-center gap-1.5">
                  <Target className="w-4 h-4 text-[#EC4899]" />
                  Objectif Corporel : Sèche ou Prise de Masse ?
                </h3>
              </div>
              <p className="text-[11px] text-[#A7A7A7] mt-0.5">
                Laisse l&apos;application te guider avec son analyse ou définis ton propre cap.
              </p>
            </div>

            {/* Toggle de mode : Recommandation vs Choix Utilisateur */}
            <div className="flex p-1 rounded-xl bg-[#0D0D0D] border border-white/10 shrink-0 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => {
                  setGoalMode('recommendation');
                  setSelectedGoalChoice('recommendation');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  goalMode === 'recommendation'
                    ? 'bg-gradient-to-r from-[#7C3AED] to-[#EC4899] text-white shadow-md'
                    : 'text-[#A7A7A7] hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                Recommandation App
              </button>
              <button
                type="button"
                onClick={() => {
                  setGoalMode('custom');
                  setSelectedGoalChoice('custom');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  goalMode === 'custom'
                    ? 'bg-gradient-to-r from-[#00C6FF] to-[#0072FF] text-white shadow-md'
                    : 'text-[#A7A7A7] hover:text-white'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                Mon Choix Libre
              </button>
            </div>
          </div>

          {/* ONGLET 1 : RECOMMANDATION AUTOMATIQUE DE L'APPLICATION */}
          {goalMode === 'recommendation' ? (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="p-4 rounded-2xl bg-gradient-to-b from-[#1C1824] to-[#121212] border border-[#7C3AED]/40 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider ${
                      recommendation.type === 'seche'
                        ? 'bg-[#FF512F]/20 text-[#FF512F] border border-[#FF512F]/30'
                        : recommendation.type === 'prise_de_masse'
                          ? 'bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/30'
                          : 'bg-[#00C6FF]/20 text-[#00C6FF] border border-[#00C6FF]/30'
                    }`}>
                      {recommendation.title}
                    </span>
                    <span className="text-[10px] text-[#A7A7A7] font-semibold">
                      Calculé d&apos;après ton {results.fatPercent}% de MG
                    </span>
                  </div>

                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white font-bold flex items-center gap-1">
                    <Zap className="w-3 h-3 text-[#F59E0B]" />
                    Durée conseillée : {recommendation.estimatedDurationWeeks}
                  </span>
                </div>

                <div className="space-y-1">
                  <h4 className="text-base font-black text-white">
                    {recommendation.headline}
                  </h4>
                  <p className="text-xs text-[#D1D5DB] leading-relaxed">
                    {recommendation.rationale}
                  </p>
                </div>

                {/* Chiffres clés de la recommandation */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-white/5">
                  <div className="p-2.5 rounded-xl bg-[#0D0D0D] border border-white/5 text-center">
                    <span className="text-[10px] text-[#A7A7A7] uppercase block">Poids cible</span>
                    <span className="text-lg font-black text-white font-mono">
                      {recommendation.targetWeightKg} kg
                    </span>
                    <span className={`text-[10px] font-bold block ${
                      recommendation.fatDeltaKg < 0 ? 'text-[#10B981]' : 'text-[#00C6FF]'
                    }`}>
                      {recommendation.fatDeltaKg > 0 ? `+${recommendation.fatDeltaKg}` : recommendation.fatDeltaKg} kg
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-[#0D0D0D] border border-white/5 text-center">
                    <span className="text-[10px] text-[#A7A7A7] uppercase block">Taux MG visé</span>
                    <span className="text-lg font-black text-[#EC4899] font-mono">
                      {recommendation.targetFatPercent}%
                    </span>
                    <span className="text-[10px] text-[#A7A7A7] block">
                      vs {results.fatPercent}% actuel
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-[#0D0D0D] border border-white/5 text-center">
                    <span className="text-[10px] text-[#A7A7A7] uppercase block">Ajustement calorique</span>
                    <span className="text-xs font-black text-[#F59E0B] block mt-1">
                      {recommendation.dailyCalorieDelta}
                    </span>
                    <span className="text-[10px] text-[#A7A7A7] block">
                      Métabolisme stable
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-[#0D0D0D] border border-white/5 text-center">
                    <span className="text-[10px] text-[#A7A7A7] uppercase block">Protéines cibles</span>
                    <span className="text-lg font-black text-[#00C6FF] font-mono">
                      ~{recommendation.proteinTargetGrams} g/j
                    </span>
                    <span className="text-[10px] text-[#A7A7A7] block">
                      ~2.0 g / kg
                    </span>
                  </div>
                </div>

                {/* Choix utilisateur : Adopter la recommandation */}
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="text-[11px] text-[#A7A7A7] flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-[#10B981]" />
                    {selectedGoalChoice === 'recommendation' ? (
                      <span className="text-[#10B981] font-bold">
                        Cette recommandation sera appliquée comme objectif principal de ton profil
                      </span>
                    ) : (
                      <span>Clique ci-contre pour synchroniser cette recommandation</span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedGoalChoice('recommendation')}
                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                      selectedGoalChoice === 'recommendation'
                        ? 'bg-[#10B981] text-white shadow-md'
                        : 'bg-white/10 hover:bg-white/15 text-white border border-white/10'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5" />
                    {selectedGoalChoice === 'recommendation' ? 'Recommandation Sélectionnée' : 'Suivre la Recommandation'}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* ONGLET 2 : OBJECTIF LIBRE PERSONNALISÉ PAR L'UTILISATEUR */
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Choix du type d'objectif : Sèche vs Prise de Masse vs Recomposition */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-[#A7A7A7] uppercase tracking-wider block">
                  Quel est ton objectif prioritaire ?
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCustomGoalType('seche');
                      setCustomTargetWeight(Math.max(40, Math.round((weightKg - 3.5) * 10) / 10));
                    }}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      customGoalType === 'seche'
                        ? 'bg-gradient-to-b from-[#241416] to-[#141414] border-[#FF512F] shadow-md shadow-[#FF512F]/10'
                        : 'bg-[#121212] border-white/5 text-[#A7A7A7] hover:border-white/15'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-black uppercase ${
                        customGoalType === 'seche' ? 'text-white' : 'text-[#D1D5DB]'
                      }`}>
                        Sèche (Perte de gras)
                      </span>
                      <Flame className={`w-3.5 h-3.5 ${
                        customGoalType === 'seche' ? 'text-[#FF512F]' : 'text-[#A7A7A7]'
                      }`} />
                    </div>
                    <p className="text-[10px] text-[#A7A7A7] mt-1">
                      Dessiner les abdos et éliminer le gras sous-cutané.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setCustomGoalType('prise_de_masse');
                      setCustomTargetWeight(Math.round((weightKg + 3.5) * 10) / 10);
                    }}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      customGoalType === 'prise_de_masse'
                        ? 'bg-gradient-to-b from-[#132219] to-[#141414] border-[#10B981] shadow-md shadow-[#10B981]/10'
                        : 'bg-[#121212] border-white/5 text-[#A7A7A7] hover:border-white/15'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-black uppercase ${
                        customGoalType === 'prise_de_masse' ? 'text-white' : 'text-[#D1D5DB]'
                      }`}>
                        Prise de Masse
                      </span>
                      <Dumbbell className={`w-3.5 h-3.5 ${
                        customGoalType === 'prise_de_masse' ? 'text-[#10B981]' : 'text-[#A7A7A7]'
                      }`} />
                    </div>
                    <p className="text-[10px] text-[#A7A7A7] mt-1">
                      Prendre du volume musculaire et de la force.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setCustomGoalType('recomposition');
                      setCustomTargetWeight(weightKg);
                    }}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      customGoalType === 'recomposition'
                        ? 'bg-gradient-to-b from-[#131B26] to-[#141414] border-[#00C6FF] shadow-md shadow-[#00C6FF]/10'
                        : 'bg-[#121212] border-white/5 text-[#A7A7A7] hover:border-white/15'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-black uppercase ${
                        customGoalType === 'recomposition' ? 'text-white' : 'text-[#D1D5DB]'
                      }`}>
                        Recomposition
                      </span>
                      <Activity className={`w-3.5 h-3.5 ${
                        customGoalType === 'recomposition' ? 'text-[#00C6FF]' : 'text-[#A7A7A7]'
                      }`} />
                    </div>
                    <p className="text-[10px] text-[#A7A7A7] mt-1">
                      Maintien du poids avec gain de tonicité.
                    </p>
                  </button>
                </div>
              </div>

              {/* Slider Poids Cible Choisi */}
              <div className="p-3.5 rounded-xl bg-[#121212] border border-white/5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#A7A7A7] uppercase">
                    Ton Poids Cible Visé
                  </span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-white font-mono">
                      {customTargetWeight}
                    </span>
                    <span className="text-xs font-bold text-[#00C6FF]">KG</span>
                    <span className={`text-xs font-bold px-1.5 py-0.2 rounded ${
                      customGoalStats.weightDelta < 0
                        ? 'bg-[#10B981]/20 text-[#10B981]'
                        : customGoalStats.weightDelta > 0
                          ? 'bg-[#00C6FF]/20 text-[#00C6FF]'
                          : 'bg-white/10 text-white'
                    }`}>
                      {customGoalStats.weightDelta > 0 ? `+${customGoalStats.weightDelta}` : customGoalStats.weightDelta} kg
                    </span>
                  </div>
                </div>

                <input
                  type="range"
                  min={Math.max(40, weightKg - 20)}
                  max={weightKg + 20}
                  step="0.5"
                  value={customTargetWeight}
                  onChange={(e) => setCustomTargetWeight(parseFloat(e.target.value))}
                  style={getSliderTrack(
                    customTargetWeight,
                    Math.max(40, weightKg - 20),
                    weightKg + 20,
                    customGoalType === 'seche' ? '#FF512F' : customGoalType === 'prise_de_masse' ? '#10B981' : '#00C6FF'
                  )}
                  className="w-full accent-[#00C6FF] h-2 rounded-lg cursor-pointer appearance-none transition-all shadow-inner"
                />

                <div className="flex items-center justify-between pt-1">
                  <div className="flex gap-1">
                    {[-1, -0.5].map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setCustomTargetWeight((prev) => Math.max(40, Math.round((prev + d) * 10) / 10))}
                        className="px-2 py-0.5 rounded-md bg-[#202020] text-[10px] font-bold text-[#A7A7A7] hover:text-white"
                      >
                        {d} kg
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-1">
                    {[+0.5, +1].map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setCustomTargetWeight((prev) => Math.round((prev + d) * 10) / 10)}
                        className="px-2 py-0.5 rounded-md bg-[#202020] text-[10px] font-bold text-[#A7A7A7] hover:text-white"
                      >
                        +{d} kg
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Rendu dynamique des métriques pour ce choix personnalisé */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="p-2.5 rounded-xl bg-[#121212] border border-white/5 text-center">
                  <span className="text-[10px] text-[#A7A7A7] uppercase block">Taux MG estimé</span>
                  <span className="text-base font-black text-[#EC4899] font-mono">
                    ~{customGoalStats.estimatedTargetFatPercent}%
                  </span>
                  <span className="text-[9px] text-[#A7A7A7] block">à l&apos;atteinte du poids</span>
                </div>

                <div className="p-2.5 rounded-xl bg-[#121212] border border-white/5 text-center">
                  <span className="text-[10px] text-[#A7A7A7] uppercase block">Gras à éliminer</span>
                  <span className="text-base font-black text-[#FF512F] font-mono">
                    {customGoalStats.fatDeltaKg > 0 ? `+${customGoalStats.fatDeltaKg}` : customGoalStats.fatDeltaKg} kg
                  </span>
                  <span className="text-[9px] text-[#A7A7A7] block">Tissu adipeux</span>
                </div>

                <div className="p-2.5 rounded-xl bg-[#121212] border border-white/5 text-center">
                  <span className="text-[10px] text-[#A7A7A7] uppercase block">Gain musculaire</span>
                  <span className="text-base font-black text-[#10B981] font-mono">
                    +{customGoalStats.muscleDeltaKg} kg
                  </span>
                  <span className="text-[9px] text-[#A7A7A7] block">Tissu contractile</span>
                </div>

                <div className="p-2.5 rounded-xl bg-[#121212] border border-white/5 text-center">
                  <span className="text-[10px] text-[#A7A7A7] uppercase block">Plan calorique</span>
                  <span className="text-xs font-black text-[#F59E0B] block mt-0.5">
                    {customGoalStats.calorieAdvice}
                  </span>
                  <span className="text-[9px] text-[#A7A7A7] block">
                    ~{customGoalStats.proteinTargetGrams}g protéines
                  </span>
                </div>
              </div>

              {/* Bouton d'adoption de l'objectif personnalisé */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-[11px] text-[#A7A7A7] flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-[#00C6FF]" />
                  {selectedGoalChoice === 'custom' ? (
                    <span className="text-[#00C6FF] font-bold">
                      Ton objectif personnalisé ({customTargetWeight} kg) est sélectionné
                    </span>
                  ) : (
                    <span>Clique pour appliquer cet objectif personnalisé à ton profil</span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedGoalChoice('custom')}
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                    selectedGoalChoice === 'custom'
                      ? 'bg-[#00C6FF] text-black font-extrabold shadow-md'
                      : 'bg-white/10 hover:bg-white/15 text-white border border-white/10'
                  }`}
                >
                  <Check className="w-3.5 h-3.5" />
                  {selectedGoalChoice === 'custom' ? 'Objectif Personnalisé Actif' : 'Choisir cet Objectif'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 5. AVERTISSEMENT SCIENTIFIQUE SUR LES BALANCES & FORMULES */}
        <div className="p-3.5 rounded-2xl bg-[#161208] border border-[#F59E0B]/25 flex items-start gap-3 text-xs">
          <ShieldAlert className="w-5 h-5 text-[#F59E0B] shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-bold text-[#F59E0B]">
              Note scientifique & balance spécialisée
            </h4>
            <p className="text-[11px] text-[#D1D5DB] leading-relaxed">
              Ces pourcentages sont calculés à partir de formules anthropométriques reconnues (US Navy 91%, Deurenberg 82%, Boer 87%). Bien qu&apos;extrêmement fiables pour suivre ta tendance de progression et adapter ta diète (sèche ou prise de masse), une <span className="text-white font-semibold">balance spécialisée à impédancemétrie médicale multi-fréquence</span> ou un <span className="text-white font-semibold">scanner DEXA</span> reste le gold standard absolu.
            </p>
          </div>
        </div>

        {/* 6. ACTIONS FOOTER */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-white/[0.08] pt-4">
          <div className="text-xs text-[#A7A7A7] text-center sm:text-left">
            <span className="text-white font-bold">Objectif sélectionné : </span>
            {selectedGoalChoice === 'recommendation' ? (
              <span className="text-[#10B981] font-black">
                Recommandation App ({recommendation.title} • {recommendation.targetWeightKg} kg)
              </span>
            ) : (
              <span className="text-[#00C6FF] font-black">
                Personnalisé ({customGoalType.toUpperCase()} • {customTargetWeight} kg)
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-[#202020] text-xs font-black uppercase text-[#A7A7A7] hover:text-white transition-all border border-white/5"
            >
              Fermer
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={savedFeedback}
              className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider text-white shadow-lg transition-all flex items-center gap-2 ${
                savedFeedback
                  ? 'bg-[#10B981]'
                  : 'bg-gradient-to-r from-[#7C3AED] via-[#EC4899] to-[#DD2476] hover:brightness-110 active:scale-95'
              }`}
            >
              {savedFeedback ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Enregistré avec succès !</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Enregistrer dans mon profil</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 5. MODAL LADDER / TABLEAU D'INFORMATION INFOGRAPHIQUE CLIQUÉ SUR LE PETIT (i) (Image 3) */}
      {activeLadderCompartment && (
        <div 
          className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
          onClick={() => setActiveLadderCompartment(null)}
        >
          <div 
            className="w-full max-w-xl bg-[#141414] border border-white/15 rounded-3xl shadow-2xl p-4 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header du Ladder Modal */}
            <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-[#EC4899]/15 text-[#EC4899] border border-[#EC4899]/30 text-[10px] font-black uppercase">
                    RÉFÉRENCE ANTHROPOMÉTRIQUE
                  </span>
                  <span className="text-xs text-[#A7A7A7]">Norme Internationale</span>
                </div>
                <h3 className="text-lg font-black text-white mt-1 flex items-center gap-2">
                  {COMPARTMENT_LADDERS[activeLadderCompartment].title}
                </h3>
                <p className="text-xs text-[#A7A7A7] mt-0.5">
                  {COMPARTMENT_LADDERS[activeLadderCompartment].definition}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setActiveLadderCompartment(null)}
                className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-[#A7A7A7] hover:text-white transition-colors"
                title="Fermer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Onglets rapides pour switcher entre les 4 compartiments */}
            <div className="grid grid-cols-4 gap-1.5 p-1 bg-[#1A1A1A] rounded-xl border border-white/5 text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setActiveLadderCompartment('fat')}
                className={`py-1.5 px-2 rounded-lg transition-all text-center ${
                  activeLadderCompartment === 'fat'
                    ? 'bg-[#EC4899] text-white shadow-sm'
                    : 'text-[#A7A7A7] hover:text-white'
                }`}
              >
                Gras
              </button>
              <button
                type="button"
                onClick={() => setActiveLadderCompartment('muscle')}
                className={`py-1.5 px-2 rounded-lg transition-all text-center ${
                  activeLadderCompartment === 'muscle'
                    ? 'bg-[#00C6FF] text-black font-black shadow-sm'
                    : 'text-[#A7A7A7] hover:text-white'
                }`}
              >
                Muscle
              </button>
              <button
                type="button"
                onClick={() => setActiveLadderCompartment('bone')}
                className={`py-1.5 px-2 rounded-lg transition-all text-center ${
                  activeLadderCompartment === 'bone'
                    ? 'bg-[#F59E0B] text-black font-black shadow-sm'
                    : 'text-[#A7A7A7] hover:text-white'
                }`}
              >
                Os
              </button>
              <button
                type="button"
                onClick={() => setActiveLadderCompartment('organ')}
                className={`py-1.5 px-2 rounded-lg transition-all text-center ${
                  activeLadderCompartment === 'organ'
                    ? 'bg-[#3B82F6] text-white shadow-sm'
                    : 'text-[#A7A7A7] hover:text-white'
                }`}
              >
                Organes
              </button>
            </div>

            {/* Résumé de la mesure actuelle de l'utilisateur */}
            <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
              <span className="text-xs text-[#A7A7A7]">Ta mesure actuelle ({gender}) :</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-white font-mono">
                  {activeLadderCompartment === 'fat' && `${results.fatPercent}% (${results.fatKg} kg)`}
                  {activeLadderCompartment === 'muscle' && `${results.muscleMassKg} kg (${results.muscleMassPercent}%)`}
                  {activeLadderCompartment === 'bone' && `${results.boneMassKg} kg (${results.boneMassPercent}%)`}
                  {activeLadderCompartment === 'organ' && `${results.organMassKg} kg (${results.organMassPercent}%)`}
                </span>
                <span 
                  className="text-[10px] px-2 py-0.5 rounded-full font-black uppercase text-white shadow-sm"
                  style={{ 
                    backgroundColor: activeLadderCompartment === 'fat' 
                      ? results.fatCategoryColor 
                      : activeLadderCompartment === 'muscle' 
                        ? '#00C6FF' 
                        : activeLadderCompartment === 'bone' 
                          ? '#F59E0B' 
                          : '#3B82F6' 
                  }}
                >
                  {activeLadderCompartment === 'fat' && results.fatCategory}
                  {activeLadderCompartment === 'muscle' && results.muscleCategory}
                  {activeLadderCompartment === 'bone' && results.boneMassCategory}
                  {activeLadderCompartment === 'organ' && 'Vitale'}
                </span>
              </div>
            </div>

            {/* Ladder / Tableau des niveaux et paliers (Image 3) */}
            <div className="space-y-2.5">
              {COMPARTMENT_LADDERS[activeLadderCompartment].tiers.map((tier) => {
                const userVal = activeLadderCompartment === 'fat'
                  ? results.fatPercent
                  : activeLadderCompartment === 'muscle'
                    ? results.muscleMassPercent
                    : activeLadderCompartment === 'bone'
                      ? results.boneMassKg
                      : results.organMassPercent;

                const minLimit = gender === 'homme' ? tier.minPercentMale : tier.minPercentFemale;
                const maxLimit = gender === 'homme' ? tier.maxPercentMale : tier.maxPercentFemale;
                const isCurrent = userVal >= minLimit && userVal <= maxLimit;

                // Calcul de l'objectif de poids à viser en dessous du pourcentage (Images 4, 5, 6)
                let targetWeightText = '';
                if (activeLadderCompartment === 'fat') {
                  const targetLow = Math.round((results.leanMassKg / (1 - minLimit / 100)) * 10) / 10;
                  const targetHigh = Math.round((results.leanMassKg / (1 - maxLimit / 100)) * 10) / 10;
                  const avgTarget = Math.round(((targetLow + targetHigh) / 2) * 10) / 10;
                  const delta = Math.round((weightKg - avgTarget) * 10) / 10;
                  if (delta > 0.3) {
                    targetWeightText = `Poids cible : ${targetLow} - ${targetHigh} kg (-${delta} kg)`;
                  } else if (delta < -0.3) {
                    targetWeightText = `Poids cible : ${targetLow} - ${targetHigh} kg (+${Math.abs(delta)} kg)`;
                  } else {
                    targetWeightText = `Poids cible : ${targetLow} - ${targetHigh} kg (créneau actuel)`;
                  }
                } else if (activeLadderCompartment === 'muscle') {
                  const targetMuscleLow = Math.round((weightKg * (minLimit / 100)) * 10) / 10;
                  const targetMuscleHigh = Math.round((weightKg * (maxLimit / 100)) * 10) / 10;
                  const deltaM = Math.round((targetMuscleLow - results.muscleMassKg) * 10) / 10;
                  if (deltaM > 0) {
                    targetWeightText = `Muscle cible : ${targetMuscleLow} - ${targetMuscleHigh} kg (+${deltaM} kg)`;
                  } else {
                    targetWeightText = `Muscle cible : ${targetMuscleLow} - ${targetMuscleHigh} kg (acquis)`;
                  }
                } else if (activeLadderCompartment === 'bone') {
                  targetWeightText = `Squelette cible : ${minLimit} - ${maxLimit} kg`;
                } else if (activeLadderCompartment === 'organ') {
                  const oLow = Math.round((weightKg * (minLimit / 100)) * 10) / 10;
                  const oHigh = Math.round((weightKg * (maxLimit / 100)) * 10) / 10;
                  targetWeightText = `Masse vitale cible : ${oLow} - ${oHigh} kg`;
                }

                return (
                  <div
                    key={tier.id}
                    className={`p-3 rounded-2xl border transition-all relative ${
                      isCurrent
                        ? 'bg-gradient-to-r from-white/[0.08] to-white/[0.03] border-[#00C6FF] shadow-lg shadow-[#00C6FF]/10'
                        : 'bg-[#181818] border-white/5 opacity-80 hover:opacity-100'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full mt-1 shrink-0"
                          style={{ backgroundColor: tier.badgeColor }}
                        />
                        <div>
                          <span className="text-xs font-black uppercase text-white block">
                            {tier.name}
                          </span>
                          <span className="text-[10px] text-[#A7A7A7]">
                            {tier.rangeLabel}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-mono font-bold text-white bg-black/40 px-2 py-0.5 rounded-md border border-white/10">
                            {minLimit} - {maxLimit} {COMPARTMENT_LADDERS[activeLadderCompartment].unit === '% du poids corporel' ? '%' : 'kg'}
                          </span>
                          {isCurrent && (
                            <span className="px-2 py-0.5 rounded-full bg-[#00C6FF] text-black font-black text-[9px] uppercase tracking-wider shadow-sm">
                              Tu es ici
                            </span>
                          )}
                        </div>
                        {/* Objectifs de poids à viser en dessous des pourcentages (Images 4, 5, 6) */}
                        {targetWeightText && (
                          <span className="text-[10px] font-bold text-[#00C6FF] bg-[#00C6FF]/10 px-2 py-0.5 rounded-md border border-[#00C6FF]/20 text-right">
                            {targetWeightText}
                          </span>
                        )}
                      </div>
                    </div>

                    <p className="text-[11px] text-[#D1D5DB] mt-1.5 leading-snug">
                      {tier.description}
                    </p>
                    <p className="text-[10px] text-[#A7A7A7] mt-0.5">
                      <span className="font-bold text-[#00C6FF]">Conseil :</span> {tier.advice}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Bouton de fermeture en bas */}
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveLadderCompartment(null)}
                className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-black uppercase text-white transition-all"
              >
                Compris
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
