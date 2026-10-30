import React, { useState } from 'react';
import { 
  X, Trophy, TrendingUp, Calendar, Plus, Trash2, 
  Edit3, Check, AlertCircle 
} from 'lucide-react';
import { PersonalRecord, PRHistoryPoint } from '../types';

interface PRProgressionModalProps {
  initialPr: PersonalRecord;
  allPrs: PersonalRecord[];
  onUpdatePR: (updated: PersonalRecord) => void;
  onDeletePR: (id: string) => void;
  onClose: () => void;
  theme?: 'dark' | 'warm-light';
}

export const PRProgressionModal: React.FC<PRProgressionModalProps> = ({
  initialPr,
  allPrs,
  onUpdatePR,
  onDeletePR,
  onClose,
  theme,
}) => {
  const isLight = theme === 'warm-light';
  // Selected PR ID (can switch between PRs)
  const [selectedPrId, setSelectedPrId] = useState<string>(initialPr.id);

  // Find active PR
  const currentPr = allPrs.find((p) => p.id === selectedPrId) || initialPr;

  // Form states for modifying this PR
  const [exercise, setExercise] = useState(currentPr.exercise);
  const [weightKg, setWeightKg] = useState(currentPr.weightKg);
  const [previousWeightKg, setPreviousWeightKg] = useState(currentPr.previousWeightKg);
  const [category, setCategory] = useState(currentPr.category);
  const [date, setDate] = useState(currentPr.date);

  // History entries list
  const [history, setHistory] = useState<PRHistoryPoint[]>(() => {
    if (currentPr.history && currentPr.history.length > 0) {
      return [...currentPr.history];
    }
    // Default fallback history from previous to current
    return [
      { id: 'h-init-1', date: 'Mois -2', weightKg: Math.max(20, currentPr.weightKg - 15), reps: 5 },
      { id: 'h-init-2', date: 'Mois -1', weightKg: currentPr.previousWeightKg, reps: 3 },
      { id: 'h-init-3', date: currentPr.date, weightKg: currentPr.weightKg, reps: 1, notes: 'Record Actuel' },
    ];
  });

  // Toggle active view: 'graph' | 'edit_pr' | 'history_list'
  const [activeTab, setActiveTab] = useState<'graph' | 'edit_pr' | 'history'>('graph');

  // Form to add a new point to the graph
  const [showAddPointForm, setShowAddPointForm] = useState(false);
  const [newPointDate, setNewPointDate] = useState("Aujourd'hui");
  const [newPointWeight, setNewPointWeight] = useState(currentPr.weightKg);
  const [newPointReps, setNewPointReps] = useState(1);
  const [newPointNotes, setNewPointNotes] = useState('');

  // Hovered or active point on the graph
  const [activePointIndex, setActivePointIndex] = useState<number | null>(null);

  // When selected PR changes, sync state
  const handleSelectPr = (pr: PersonalRecord) => {
    setSelectedPrId(pr.id);
    setExercise(pr.exercise);
    setWeightKg(pr.weightKg);
    setPreviousWeightKg(pr.previousWeightKg);
    setCategory(pr.category);
    setDate(pr.date);
    if (pr.history && pr.history.length > 0) {
      setHistory([...pr.history]);
    } else {
      setHistory([
        { id: 'h-1', date: 'Mois -2', weightKg: Math.max(20, pr.weightKg - 15), reps: 5 },
        { id: 'h-2', date: 'Mois -1', weightKg: pr.previousWeightKg, reps: 3 },
        { id: 'h-3', date: pr.date, weightKg: pr.weightKg, reps: 1, notes: 'Record Actuel' },
      ]);
    }
  };

  // Add a new point to history
  const handleAddPoint = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPointDate || newPointWeight <= 0) return;

    const newPt: PRHistoryPoint = {
      id: `pt-${Date.now()}`,
      date: newPointDate,
      weightKg: Number(newPointWeight),
      reps: Number(newPointReps),
      notes: newPointNotes.trim() || undefined,
    };

    const nextHistory = [...history, newPt];
    setHistory(nextHistory);

    // If new point weight is higher than current PR, automatically update PR!
    const highestWeight = Math.max(...nextHistory.map((h) => h.weightKg));
    if (highestWeight > weightKg) {
      setPreviousWeightKg(weightKg);
      setWeightKg(highestWeight);
      setDate(newPointDate);
    }

    setShowAddPointForm(false);
    setNewPointNotes('');
  };

  // Delete a point from history
  const handleDeletePoint = (ptId: string) => {
    const nextHistory = history.filter((h) => h.id !== ptId);
    setHistory(nextHistory);
    if (nextHistory.length > 0) {
      const maxW = Math.max(...nextHistory.map((h) => h.weightKg));
      setWeightKg(maxW);
    }
  };

  // Save all changes to current PR
  const handleSaveChanges = () => {
    const updatedPr: PersonalRecord = {
      id: currentPr.id,
      exercise: exercise.trim() || currentPr.exercise,
      weightKg: Number(weightKg) || currentPr.weightKg,
      previousWeightKg: Number(previousWeightKg) || 0,
      category: category.trim() || currentPr.category,
      date: date.trim() || currentPr.date,
      history,
    };
    onUpdatePR(updatedPr);
    onClose();
  };

  // SVG Chart Computations
  const sortedHistory = [...history];
  const weights = sortedHistory.map((h) => h.weightKg);
  const minW = Math.max(0, Math.min(...weights) - 5);
  const maxW = Math.max(...weights) + 5;
  const rangeW = maxW - minW || 1;

  // Chart Dimensions
  const svgWidth = 360;
  const svgHeight = 160;
  const paddingX = 35;
  const paddingY = 25;
  const chartW = svgWidth - paddingX * 2;
  const chartH = svgHeight - paddingY * 2;

  // Compute (x, y) coordinates for each point
  const coords = sortedHistory.map((pt, idx) => {
    const x = sortedHistory.length === 1
      ? svgWidth / 2
      : paddingX + (idx / (sortedHistory.length - 1)) * chartW;
    const y = paddingY + chartH - ((pt.weightKg - minW) / rangeW) * chartH;
    return { x, y, pt, idx };
  });

  // SVG Path generator (smooth curved line)
  const generatePath = () => {
    if (coords.length === 0) return '';
    if (coords.length === 1) return `M ${coords[0].x} ${coords[0].y}`;

    let path = `M ${coords[0].x} ${coords[0].y}`;
    for (let i = 0; i < coords.length - 1; i++) {
      const curr = coords[i];
      const next = coords[i + 1];
      const mx = (curr.x + next.x) / 2;
      path += ` C ${mx} ${curr.y}, ${mx} ${next.y}, ${next.x} ${next.y}`;
    }
    return path;
  };

  const linePath = generatePath();
  const areaPath = coords.length > 1
    ? `${linePath} L ${coords[coords.length - 1].x} ${svgHeight - 10} L ${coords[0].x} ${svgHeight - 10} Z`
    : '';

  const firstWeight = sortedHistory[0]?.weightKg || weightKg;
  const totalGain = weightKg - firstWeight;
  const percentGain = firstWeight > 0 ? ((totalGain / firstWeight) * 100).toFixed(1) : '0';

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in zoom-in-95 duration-150 ${
      isLight ? 'bg-[#3d2317]/65 backdrop-blur-xl' : 'bg-black/85 backdrop-blur-md'
    }`}>
      <div className={`w-full max-w-lg rounded-3xl p-5 sm:p-6 space-y-5 shadow-2xl relative my-auto border transition-colors ${
        isLight ? 'bg-[#faebe0] border-[#7d5a47]/20 text-[#3d2317]' : 'bg-[#141414] border-white/10 text-white'
      }`}>
        {/* Top Header */}
        <div className={`flex items-center justify-between pb-3 border-b ${
          isLight ? 'border-[#7d5a47]/15' : 'border-white/[0.08]'
        }`}>
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#7C3AED] via-[#EC4899] to-[#FF512F] flex items-center justify-center text-white shrink-0 shadow-lg glow-main">
              <Trophy className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#EC4899] block">
                ANALYSE DU RECORD PERSONNEL
              </span>
              <h3 className={`text-lg font-black uppercase tracking-tight truncate ${isLight ? 'text-[#3d2317]' : 'text-white'}`}>
                {exercise}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className={`p-1.5 rounded-full transition-colors cursor-pointer border ${
              isLight
                ? 'bg-[#f3dfcb] hover:bg-[#fff3ea] text-[#7d5a47] hover:text-[#3d2317] border-[#7d5a47]/20'
                : 'bg-white/5 hover:bg-white/15 text-[#A7A7A7] hover:text-white border-transparent'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Exercise Quick Switcher (if multiple PRs exist) */}
        {allPrs.length > 1 && (
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 -mx-1 px-1">
            {allPrs.map((pr) => (
              <button
                key={pr.id}
                type="button"
                onClick={() => handleSelectPr(pr)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase transition-all shrink-0 flex items-center gap-1.5 ${
                  pr.id === selectedPrId
                    ? 'bg-[#EC4899] text-white shadow-md'
                    : 'bg-[#1C1C1C] text-[#A7A7A7] hover:text-white border border-white/5'
                }`}
              >
                <span>{pr.exercise}</span>
                <span className="font-mono text-[11px] opacity-80">({pr.weightKg}kg)</span>
              </button>
            ))}
          </div>
        )}

        {/* View Tabs: Graphique / Modifier le PR / Historique */}
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#1A1A1A] rounded-2xl border border-white/5 text-xs font-bold text-center">
          <button
            type="button"
            onClick={() => setActiveTab('graph')}
            className={`py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'graph'
                ? 'bg-gradient-to-r from-[#7C3AED] to-[#EC4899] text-white shadow'
                : 'text-[#A7A7A7] hover:text-white'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Progression</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('edit_pr')}
            className={`py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'edit_pr'
                ? 'bg-gradient-to-r from-[#7C3AED] to-[#EC4899] text-white shadow'
                : 'text-[#A7A7A7] hover:text-white'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Modifier PR</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'history'
                ? 'bg-gradient-to-r from-[#7C3AED] to-[#EC4899] text-white shadow'
                : 'text-[#A7A7A7] hover:text-white'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Séries ({history.length})</span>
          </button>
        </div>

        {/* TAB 1: GRAPHIQUE DE PROGRESSION */}
        {activeTab === 'graph' && (
          <div className="space-y-4">
            {/* Metric KPI Banner */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-3 rounded-2xl bg-[#1C1C1C] border border-white/5 space-y-0.5">
                <span className="text-[10px] font-bold text-[#A7A7A7] uppercase block">
                  Départ
                </span>
                <span className="text-base font-black text-white font-mono">
                  {firstWeight} KG
                </span>
                <span className="text-[9px] text-[#737373] block">{sortedHistory[0]?.date || 'Initial'}</span>
              </div>

              <div className="p-3 rounded-2xl bg-[#1C1C1C] border border-[#EC4899]/30 space-y-0.5 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-10 h-10 bg-[#EC4899]/10 rounded-bl-full pointer-events-none" />
                <span className="text-[10px] font-bold text-[#EC4899] uppercase block">
                  Record Actuel
                </span>
                <span className="text-base font-black text-white font-mono">
                  {weightKg} KG
                </span>
                <span className="text-[9px] text-emerald-400 block font-bold">
                  +{weightKg - previousWeightKg} kg récents
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-[#1C1C1C] border border-white/5 space-y-0.5">
                <span className="text-[10px] font-bold text-[#00C6FF] uppercase block">
                  Gain Total
                </span>
                <span className="text-base font-black text-emerald-400 font-mono">
                  +{totalGain} KG
                </span>
                <span className="text-[9px] text-[#737373] block">+{percentGain}%</span>
              </div>
            </div>

            {/* Interactive SVG Progression Curve Chart */}
            <div className="p-4 rounded-2xl bg-[#101010] border border-white/[0.08] relative overflow-hidden">
              <div className="flex items-center justify-between pb-2 text-[11px] font-bold text-[#A7A7A7]">
                <span className="uppercase flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-[#EC4899]" />
                  Courbe des charges (kg)
                </span>
                <span className="text-xs text-white font-mono">{sortedHistory.length} paliers</span>
              </div>

              <div className="w-full overflow-hidden flex justify-center py-1">
                <svg
                  viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                  className="w-full h-44 select-none touch-none"
                >
                  <defs>
                    <linearGradient id="curveGradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#7C3AED" />
                      <stop offset="50%" stopColor="#EC4899" />
                      <stop offset="100%" stopColor="#00C6FF" />
                    </linearGradient>
                    <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#EC4899" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="#7C3AED" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Grid lines */}
                  {[0.25, 0.5, 0.75].map((ratio, rIdx) => {
                    const lineY = paddingY + chartH * ratio;
                    const val = Math.round(maxW - ratio * rangeW);
                    return (
                      <g key={rIdx}>
                        <line
                          x1={paddingX}
                          y1={lineY}
                          x2={svgWidth - paddingX}
                          y2={lineY}
                          stroke="rgba(255,255,255,0.06)"
                          strokeDasharray="3 3"
                        />
                        <text
                          x={paddingX - 4}
                          y={lineY + 3}
                          fontSize="9"
                          fill="#666666"
                          textAnchor="end"
                          fontFamily="monospace"
                        >
                          {val}
                        </text>
                      </g>
                    );
                  })}

                  {/* Shaded Area under Curve */}
                  {areaPath && (
                    <path d={areaPath} fill="url(#areaGradient)" />
                  )}

                  {/* Main Curve */}
                  {linePath && (
                    <path
                      d={linePath}
                      fill="none"
                      stroke="url(#curveGradient)"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}

                  {/* Data Points on Curve */}
                  {coords.map(({ x, y, pt, idx }) => {
                    const isHighest = pt.weightKg === weightKg;
                    const isSelected = activePointIndex === idx;

                    return (
                      <g
                        key={pt.id || idx}
                        className="cursor-pointer"
                        onClick={() => setActivePointIndex(idx === activePointIndex ? null : idx)}
                      >
                        {/* Outer pulse circle for peak PR point */}
                        {isHighest && (
                          <circle
                            cx={x}
                            cy={y}
                            r="9"
                            fill="#EC4899"
                            fillOpacity="0.2"
                          />
                        )}

                        <circle
                          cx={x}
                          cy={y}
                          r={isSelected ? "6" : isHighest ? "5" : "4"}
                          fill={isHighest ? "#EC4899" : "#ffffff"}
                          stroke={isHighest ? "#ffffff" : "#7C3AED"}
                          strokeWidth={isHighest ? "2" : "1.5"}
                        />

                        {/* Date label at bottom */}
                        <text
                          x={x}
                          y={svgHeight - 2}
                          fontSize="8"
                          fill="#737373"
                          textAnchor="middle"
                          fontFamily="sans-serif"
                        >
                          {pt.date}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>

              {/* Active Point Detail Preview */}
              {activePointIndex !== null && coords[activePointIndex] && (
                <div className="mt-2 p-2.5 rounded-xl bg-[#1C1C1C] border border-white/10 flex items-center justify-between text-xs animate-in fade-in duration-150">
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-[#A7A7A7] uppercase">
                      Palier du {coords[activePointIndex].pt.date}
                    </span>
                    <p className="font-bold text-white">
                      Charge : <span className="text-[#EC4899] font-black font-mono">{coords[activePointIndex].pt.weightKg} kg</span>
                      {coords[activePointIndex].pt.reps && ` • ${coords[activePointIndex].pt.reps} reps`}
                    </p>
                    {coords[activePointIndex].pt.notes && (
                      <p className="text-[10px] text-[#A7A7A7] italic">
                        "{coords[activePointIndex].pt.notes}"
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeletePoint(coords[activePointIndex].pt.id)}
                    className="p-1 text-rose-400 hover:bg-rose-500/20 rounded-lg transition-colors"
                    title="Supprimer ce point"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Button to Add a New Measurement Point */}
            {!showAddPointForm ? (
              <button
                type="button"
                onClick={() => setShowAddPointForm(true)}
                className="w-full py-2.5 rounded-xl bg-[#1C1C1C] hover:bg-[#252525] border border-white/10 text-xs font-bold text-white flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-[#00C6FF]" />
                <span>Ajouter un palier de progression sur ce graphe</span>
              </button>
            ) : (
              <form onSubmit={handleAddPoint} className="p-3.5 rounded-2xl bg-[#1A1A1A] border border-white/15 space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-white">
                  <span>Nouveau Palier pour {exercise}</span>
                  <button
                    type="button"
                    onClick={() => setShowAddPointForm(false)}
                    className="text-[#A7A7A7] hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] text-[#A7A7A7] block font-bold mb-1">Date</label>
                    <input
                      type="text"
                      value={newPointDate}
                      onChange={(e) => setNewPointDate(e.target.value)}
                      placeholder="Ex: 14 Sep"
                      className="w-full bg-[#121212] border border-white/15 rounded-xl px-2.5 py-1.5 text-xs text-white font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-[#A7A7A7] block font-bold mb-1">Charge (KG)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={newPointWeight}
                      onChange={(e) => setNewPointWeight(parseFloat(e.target.value) || 0)}
                      className="w-full bg-[#121212] border border-white/15 rounded-xl px-2.5 py-1.5 text-xs text-white font-black font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-[#A7A7A7] block font-bold mb-1">Répétitions</label>
                    <input
                      type="number"
                      min="1"
                      value={newPointReps}
                      onChange={(e) => setNewPointReps(parseInt(e.target.value, 10) || 1)}
                      className="w-full bg-[#121212] border border-white/15 rounded-xl px-2.5 py-1.5 text-xs text-white font-black font-mono"
                    />
                  </div>
                </div>

                <div>
                  <input
                    type="text"
                    value={newPointNotes}
                    onChange={(e) => setNewPointNotes(e.target.value)}
                    placeholder="Note optionnelle (ex: Barre nette, spotter, RPE 9)"
                    className="w-full bg-[#121212] border border-white/15 rounded-xl px-2.5 py-1.5 text-xs text-white placeholder:text-[#666666]"
                  />
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="submit"
                    className="flex-1 py-2 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#EC4899] text-white text-xs font-black uppercase"
                  >
                    Enregistrer le point
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddPointForm(false)}
                    className="px-3 py-2 rounded-xl bg-[#252525] text-xs text-[#A7A7A7]"
                  >
                    Annuler
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* TAB 2: MODIFIER LE PR DIRECTEMENT */}
        {activeTab === 'edit_pr' && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-black uppercase text-[#A7A7A7] tracking-wider">
                Nom de l'exercice
              </label>
              <input
                type="text"
                value={exercise}
                onChange={(e) => setExercise(e.target.value)}
                className="w-full bg-[#1C1C1C] border border-white/15 rounded-xl px-3.5 py-2.5 text-sm font-bold text-white focus:outline-none focus:border-[#EC4899]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase text-[#A7A7A7] tracking-wider">
                  Record Actuel (KG)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={weightKg}
                    onChange={(e) => setWeightKg(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#1C1C1C] border border-white/15 rounded-xl px-3 py-2 text-base font-black text-white font-mono focus:outline-none focus:border-[#EC4899]"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-[#EC4899] font-bold">
                    KG
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase text-[#A7A7A7] tracking-wider">
                  Précédente Charge (KG)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={previousWeightKg}
                    onChange={(e) => setPreviousWeightKg(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#1C1C1C] border border-white/15 rounded-xl px-3 py-2 text-base font-black text-white font-mono focus:outline-none focus:border-white/30"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-[#A7A7A7] font-bold">
                    KG
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase text-[#A7A7A7] tracking-wider">
                  Catégorie
                </label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Ex: Poitrine, Jambes, Force"
                  className="w-full bg-[#1C1C1C] border border-white/15 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-white/30"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase text-[#A7A7A7] tracking-wider">
                  Date de réalisation
                </label>
                <input
                  type="text"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  placeholder="Ex: Il y a 3 jours"
                  className="w-full bg-[#1C1C1C] border border-white/15 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-white/30"
                />
              </div>
            </div>

            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                La modification de ce record met à jour votre indice de puissance VOLT et sera immédiatement répercutée dans l'application.
              </span>
            </div>
          </div>
        )}

        {/* TAB 3: LISTE DE L'HISTORIQUE DES PALIERS */}
        {activeTab === 'history' && (
          <div className="space-y-3 max-h-64 overflow-y-auto pr-1 no-scrollbar">
            <div className="flex items-center justify-between text-xs text-[#A7A7A7]">
              <span>Historique chronologique des performances</span>
              <span className="font-bold text-white">{history.length} entrées</span>
            </div>

            {history.map((pt, idx) => (
              <div
                key={pt.id || idx}
                className="p-3 rounded-xl bg-[#1A1A1A] border border-white/5 flex items-center justify-between gap-3 hover:border-white/15 transition-all"
              >
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-white font-mono">
                      {pt.weightKg} KG
                    </span>
                    {pt.reps && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-white font-bold">
                        {pt.reps} reps
                      </span>
                    )}
                    {pt.weightKg === weightKg && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-[#EC4899]/20 text-[#EC4899] font-black uppercase flex items-center gap-1">
                        <Trophy className="w-2.5 h-2.5" />
                        <span>Record</span>
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#A7A7A7]">
                    {pt.date} {pt.notes && `• ${pt.notes}`}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleDeletePoint(pt.id)}
                  className="p-1.5 text-[#A7A7A7] hover:text-rose-400 hover:bg-white/5 rounded-lg transition-colors shrink-0"
                  title="Supprimer cette entrée"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Bottom Actions: Save & Delete PR */}
        <div className="pt-2 border-t border-white/10 space-y-2">
          <button
            type="button"
            onClick={handleSaveChanges}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#7C3AED] to-[#EC4899] text-white font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl glow-main hover:brightness-110 active:scale-98 transition-all cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Enregistrer les modifications du PR</span>
          </button>

          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={() => {
                if (window.confirm(`Supprimer le record "${exercise}" ?`)) {
                  onDeletePR(currentPr.id);
                  onClose();
                }
              }}
              className="text-xs font-bold text-rose-400 hover:text-rose-300 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Supprimer ce record</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="text-xs font-bold text-[#A7A7A7] hover:text-white transition-colors"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
