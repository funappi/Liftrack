import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Trash2, Plus, Calendar, Clock, Scale, ArrowLeft, Check, Star } from 'lucide-react';
import { MeasurementEntry } from '../types';
import { saveJSON } from '../utils/storage';

interface PerformanceTrackerViewProps {
  measurements: MeasurementEntry[];
  onAddMeasurement: (entry: Omit<MeasurementEntry, 'id'>) => void;
  onDeleteMeasurement: (id: string) => void;
  currentWeightKg: number;
  onClose?: () => void;
  theme?: 'dark' | 'warm-light';
}

interface TrackedMetric {
  id: string;
  title: string;
  category?: string;
  isCustom?: boolean;
}

const DEFAULT_METRICS: TrackedMetric[] = [
  { id: 'poids', title: 'Poids de corps' },
  { id: 'bench', title: '1RM Développé Couché' },
  { id: 'squat', title: '1RM Squat' },
  { id: 'deadlift', title: '1RM Deadlift' },
  { id: 'volume', title: 'Volume d\'entraînement' },
];

export const PerformanceTrackerView: React.FC<PerformanceTrackerViewProps> = ({
  measurements,
  onAddMeasurement,
  onDeleteMeasurement,
  currentWeightKg,
  onClose,
  theme,
}) => {
  const isLight = theme === 'warm-light';

  // Custom favorite exercises persisted in localStorage
  const [favoriteExercises, setFavoriteExercises] = useState<TrackedMetric[]>(() => {
    try {
      const saved = localStorage.getItem('volt_favorite_exercises');
      if (saved) {
        const parsed: TrackedMetric[] = JSON.parse(saved);
        // Combine with default metrics, avoiding duplicates
        const combined = [...DEFAULT_METRICS];
        parsed.forEach((custom) => {
          if (!combined.some((m) => m.id === custom.id)) {
            combined.push(custom);
          }
        });
        return combined;
      }
    } catch {
      // ignore
    }
    return DEFAULT_METRICS;
  });

  const [selectedMetric, setSelectedMetric] = useState<string>('poids');
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddFavoriteModal, setShowAddFavoriteModal] = useState(false);
  const [hoveredPoint, setHoveredPoint] = useState<MeasurementEntry | null>(null);

  // Form states for adding a favorite exercise
  const [newFavoriteTitle, setNewFavoriteTitle] = useState('');
  const [newFavoriteStartingWeight, setNewFavoriteStartingWeight] = useState(80);
  const [newFavoriteCategory, setNewFavoriteCategory] = useState('Force');

  // Form states for adding a measurement
  const [newVal, setNewVal] = useState<number>(currentWeightKg || 85.1);
  const [newDate, setNewDate] = useState<string>(() => {
    const now = new Date();
    return now.toISOString().slice(0, 10);
  });
  const [newTime, setNewTime] = useState<string>('20:00');
  const [newNotes, setNewNotes] = useState<string>('');

  // Active metric item info
  const activeMetricObj = favoriteExercises.find((m) => m.id === selectedMetric) || {
    id: selectedMetric,
    title: selectedMetric.toUpperCase(),
  };

  // Filter measurements by metric
  const filtered = measurements.filter((m) => m.metricType === selectedMetric);

  // Sort descending for history list
  const sortedHistory = [...filtered].sort((a, b) => b.timestamp - a.timestamp);

  // Latest measure
  const latestEntry = sortedHistory[0] || {
    id: 'fallback',
    metricType: selectedMetric,
    value: selectedMetric === 'poids' ? currentWeightKg : 100,
    unit: selectedMetric === 'volume' ? 'KG' : 'KG',
    dateStr: '12-07-2026 20:00',
    timestamp: Date.now(),
    monthIndex: 6,
    year: selectedYear,
  };

  // Month labels matching Image 2 ("j f m a m j j a s o n d")
  const monthLabels = ['j', 'f', 'm', 'a', 'm', 'j', 'j', 'a', 's', 'o', 'n', 'd'];

  // Map 12 months data points for the selected year
  const yearMeasurements = filtered.filter((m) => m.year === selectedYear);

  // Get average or latest per month for line graph
  const monthlyData: (MeasurementEntry | null)[] = Array.from({ length: 12 }, (_, mIdx) => {
    const forMonth = yearMeasurements.filter((m) => m.monthIndex === mIdx);
    if (forMonth.length === 0) return null;
    return forMonth.sort((a, b) => b.timestamp - a.timestamp)[0];
  });

  // Dynamic Chart scaling based on values
  const validVals = filtered.map((m) => m.value);
  const baseVals = validVals.length > 0 ? validVals : [latestEntry.value];
  const dataMin = Math.min(...baseVals);
  const dataMax = Math.max(...baseVals);

  const rangeMin = Math.max(0, Math.floor((dataMin - 10) / 10) * 10);
  const rangeMax = Math.max(rangeMin + 20, Math.ceil((dataMax + 10) / 10) * 10);
  const step = Math.max(5, Math.round((rangeMax - rangeMin) / 4 / 5) * 5);
  const yTicks: number[] = [];
  for (let t = rangeMin; t <= rangeMax; t += step) {
    yTicks.push(t);
  }
  if (yTicks.length < 3) {
    yTicks.push(rangeMin + step * 2);
  }

  const minY = yTicks[0];
  const maxY = yTicks[yTicks.length - 1];

  // Calculate SVG line coordinates
  const svgWidth = 320;
  const svgHeight = 180;
  const padLeft = 32;
  const padRight = 16;
  const padTop = 16;
  const padBottom = 28;
  const plotWidth = svgWidth - padLeft - padRight;
  const plotHeight = svgHeight - padTop - padBottom;

  const validPoints: { x: number; y: number; entry: MeasurementEntry }[] = [];

  monthlyData.forEach((entry, idx) => {
    if (entry) {
      const x = padLeft + (idx / 11) * plotWidth;
      const clampedVal = Math.max(minY, Math.min(maxY, entry.value));
      const y = padTop + plotHeight - ((clampedVal - minY) / (maxY - minY)) * plotHeight;
      validPoints.push({ x, y, entry });
    }
  });

  // Build SVG polyline path
  const polylinePoints = validPoints.map((p) => `${p.x},${p.y}`).join(' ');

  const handleSaveMeasurement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVal || newVal <= 0) return;

    const [yearStr, monthStr, dayStr] = newDate.split('-');
    const year = parseInt(yearStr, 10) || selectedYear;
    const monthIndex = (parseInt(monthStr, 10) || 1) - 1;
    const dateStr = `${dayStr}-${monthStr}-${yearStr} ${newTime}`;
    const timestamp = new Date(`${newDate}T${newTime}`).getTime() || Date.now();

    onAddMeasurement({
      metricType: selectedMetric,
      value: parseFloat(newVal.toFixed(1)),
      unit: 'KG',
      dateStr,
      timestamp,
      monthIndex,
      year,
      notes: newNotes.trim() || undefined,
      exerciseName: activeMetricObj.title,
    });

    setShowAddModal(false);
    setNewNotes('');
  };

  const handleCreateFavoriteExercise = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFavoriteTitle.trim()) return;

    const customId = `custom-exo-${Date.now()}`;
    const newExo: TrackedMetric = {
      id: customId,
      title: newFavoriteTitle.trim(),
      category: newFavoriteCategory,
      isCustom: true,
    };

    const updated = [...favoriteExercises, newExo];
    setFavoriteExercises(updated);
    saveJSON('volt_favorite_exercises', updated.filter((e) => e.isCustom));

    // Add initial measurement for this exercise
    const now = new Date();
    const year = now.getFullYear();
    const monthIndex = now.getMonth();
    const dayStr = String(now.getDate()).padStart(2, '0');
    const monthStr = String(monthIndex + 1).padStart(2, '0');
    const dateStr = `${dayStr}-${monthStr}-${year} 18:00`;

    onAddMeasurement({
      metricType: customId,
      value: newFavoriteStartingWeight,
      unit: 'KG',
      dateStr,
      timestamp: now.getTime(),
      monthIndex,
      year,
      notes: 'Record initial enregistré',
      exerciseName: newExo.title,
    });

    setSelectedMetric(customId);
    setNewVal(newFavoriteStartingWeight);
    setShowAddFavoriteModal(false);
    setNewFavoriteTitle('');
  };

  const handleDeleteFavoriteExercise = (idToDelete: string) => {
    if (!window.confirm("Retirer cet exercice de tes favoris suivis ?")) return;
    const updated = favoriteExercises.filter((m) => m.id !== idToDelete);
    setFavoriteExercises(updated);
    saveJSON('volt_favorite_exercises', updated.filter((e) => e.isCustom));
    setSelectedMetric('poids');
  };

  return (
    <div className="space-y-6">
      {/* Top Header: Back Button, Title, and Metric Picker */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {onClose && (
            <button
              onClick={onClose}
              className={`p-1.5 rounded-full transition-colors ${
                isLight ? 'hover:bg-black/5 text-[#3d2317]' : 'hover:bg-white/10 text-white'
              }`}
              title="Retour"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <span className={`text-[10px] font-black uppercase tracking-wider block ${
              isLight ? 'text-[#7d5a47]' : 'text-[#A7A7A7]'
            }`}>
              SUIVI DE PROGRESSION
            </span>
            <h2 className={`text-xl sm:text-2xl font-black tracking-tight uppercase flex items-center gap-2 ${
              isLight ? 'text-[#3d2317]' : 'text-white'
            }`}>
              {activeMetricObj.title}
            </h2>
          </div>
        </div>

        {/* Quick Metric Switcher & + Ajouter un exercice favori */}
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={selectedMetric}
            onChange={(e) => {
              if (e.target.value === '__add_favorite__') {
                setShowAddFavoriteModal(true);
              } else {
                setSelectedMetric(e.target.value);
              }
            }}
            className={`text-xs font-bold px-3 py-2 rounded-xl border focus:outline-none focus:border-[#F97316] transition-colors cursor-pointer ${
              isLight
                ? 'bg-[#fff7f0] text-[#3d2317] border-[#7d5a47]/20 shadow-sm'
                : 'bg-[#181818] text-white border-white/10'
            }`}
          >
            <optgroup label="Métriques Standard">
              {DEFAULT_METRICS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title}
                </option>
              ))}
            </optgroup>
            {favoriteExercises.some((m) => m.isCustom) && (
              <optgroup label="Mes Exercices Favoris">
                {favoriteExercises.filter((m) => m.isCustom).map((m) => (
                  <option key={m.id} value={m.id}>
                    ⭐ {m.title}
                  </option>
                ))}
              </optgroup>
            )}
            <option value="__add_favorite__">
              + Ajouter un exercice favori...
            </option>
          </select>

          {/* Dedicated + Button to add favorite exercise */}
          <button
            type="button"
            onClick={() => setShowAddFavoriteModal(true)}
            className={`px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wide flex items-center gap-1.5 transition-all shadow-sm ${
              isLight
                ? 'bg-[#faebe0] hover:bg-[#fff7f0] text-[#b85d38] border border-[#b85d38]/30'
                : 'bg-[#1F1F1F] hover:bg-[#252525] text-[#F97316] border border-[#F97316]/30'
            }`}
            title="Ajouter un exercice favori à suivre"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span>Exo favori</span>
          </button>
        </div>
      </div>

      {/* Main Card (Image 2 replica, adapted for Dark & Light modes) */}
      <div className={`p-5 rounded-3xl border shadow-xl space-y-5 transition-colors ${
        isLight
          ? 'bg-[#fff7f0] border-[#7d5a47]/20 text-[#3d2317]'
          : 'bg-[#141414] border-white/10 text-white'
      }`}>
        {/* Period Navigator: < Jan 2026 - Dec 2026 > */}
        <div className="flex items-center justify-between px-2">
          <button
            type="button"
            onClick={() => setSelectedYear((y) => y - 1)}
            className={`p-1 transition-colors ${
              isLight ? 'text-[#7d5a47] hover:text-[#3d2317]' : 'text-[#A7A7A7] hover:text-white'
            }`}
            title="Année précédente"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className={`text-xs sm:text-sm font-bold tracking-wide ${
            isLight ? 'text-[#3d2317]' : 'text-[#E5E5E5]'
          }`}>
            Jan {selectedYear} - Dec {selectedYear}
          </span>
          <button
            type="button"
            onClick={() => setSelectedYear((y) => y + 1)}
            className={`p-1 transition-colors ${
              isLight ? 'text-[#7d5a47] hover:text-[#3d2317]' : 'text-[#A7A7A7] hover:text-white'
            }`}
            title="Année suivante"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* The Clean Line Chart (Exact replica of Image 2 with perfect Light/Dark contrast) */}
        <div className={`relative w-full rounded-2xl p-2 border transition-colors ${
          isLight
            ? 'bg-[#faebe0] border-[#7d5a47]/15'
            : 'bg-[#0D0D0D]/60 border-white/5'
        }`}>
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-auto overflow-visible select-none"
          >
            {/* Horizontal dotted gridlines & Y-axis labels */}
            {yTicks.map((tickVal) => {
              const y = padTop + plotHeight - ((tickVal - minY) / (maxY - minY)) * plotHeight;
              return (
                <g key={tickVal}>
                  <text
                    x={padLeft - 6}
                    y={y + 3.5}
                    textAnchor="end"
                    className={`text-[9px] font-mono font-medium ${
                      isLight ? 'fill-[#7d5a47]' : 'fill-[#737373]'
                    }`}
                  >
                    {tickVal}
                  </text>
                  <line
                    x1={padLeft}
                    y1={y}
                    x2={svgWidth - padRight}
                    y2={y}
                    stroke={isLight ? 'rgba(125, 90, 71, 0.18)' : 'rgba(255, 255, 255, 0.07)'}
                    strokeDasharray="3,3"
                    strokeWidth="1"
                  />
                </g>
              );
            })}

            {/* X-axis Month Ticks (j f m a m j j a s o n d) */}
            {monthLabels.map((lbl, idx) => {
              const x = padLeft + (idx / 11) * plotWidth;
              const hasData = !!monthlyData[idx];
              return (
                <text
                  key={idx}
                  x={x}
                  y={svgHeight - 6}
                  textAnchor="middle"
                  className={`text-[9.5px] font-mono ${
                    hasData
                      ? isLight ? 'fill-[#3d2317] font-black' : 'fill-[#E5E5E5] font-bold'
                      : isLight ? 'fill-[#a3826e]' : 'fill-[#525252]'
                  }`}
                >
                  {lbl}
                </text>
              );
            })}

            {/* Orange Line Path */}
            {validPoints.length > 1 && (
              <polyline
                fill="none"
                stroke="#F97316"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={polylinePoints}
              />
            )}

            {/* Orange Points with Inner Core */}
            {validPoints.map((pt, idx) => (
              <g
                key={idx}
                className="cursor-pointer group"
                onClick={() => setHoveredPoint(pt.entry)}
                onMouseEnter={() => setHoveredPoint(pt.entry)}
              >
                {/* Hit area */}
                <circle cx={pt.x} cy={pt.y} r="12" fill="transparent" />
                {/* Outer ring */}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r="4"
                  fill={isLight ? '#faebe0' : '#141414'}
                  stroke="#F97316"
                  strokeWidth="2"
                  className="transition-transform group-hover:scale-125"
                />
                {/* Center dot */}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r="1.8"
                  fill="#FFEDD5"
                />
              </g>
            ))}
          </svg>

          {/* Interactive Tooltip on hover/click */}
          {hoveredPoint && (
            <div className={`absolute top-2 right-2 border rounded-xl px-2.5 py-1.5 shadow-xl text-xs flex items-center gap-2 animate-in fade-in duration-150 ${
              isLight
                ? 'bg-[#fff7f0] border-[#F97316] text-[#3d2317]'
                : 'bg-[#1C1C1C] border-[#F97316]/50 text-white'
            }`}>
              <div>
                <span className={`text-[10px] block ${isLight ? 'text-[#7d5a47]' : 'text-[#A7A7A7]'}`}>
                  {hoveredPoint.dateStr}
                </span>
                <span className={`text-xs font-black font-mono ${isLight ? 'text-[#3d2317]' : 'text-white'}`}>
                  {hoveredPoint.value} {hoveredPoint.unit}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setHoveredPoint(null)}
                className={`text-[10px] ${isLight ? 'text-[#7d5a47] hover:text-[#3d2317]' : 'text-[#A7A7A7] hover:text-white'}`}
              >
                ✕
              </button>
            </div>
          )}
        </div>

        {/* Latest Measure display & Big Action Button (Image 2 style) */}
        <div className="space-y-4 pt-1">
          <div className="space-y-0.5">
            <span className={`text-xs block font-medium ${isLight ? 'text-[#7d5a47]' : 'text-[#A7A7A7]'}`}>
              Dernière mesure : {latestEntry.dateStr}
            </span>
            <div className={`text-3xl sm:text-4xl font-black font-mono tracking-tight ${
              isLight ? 'text-[#3d2317]' : 'text-white'
            }`}>
              {latestEntry.value}
              <span className={`text-lg font-bold ml-1 ${isLight ? 'text-[#7d5a47]' : 'text-[#A7A7A7]'}`}>
                {latestEntry.unit}
              </span>
            </div>
          </div>

          {/* Primary Action Button (DÉFINIR / ENREGISTRER) */}
          <button
            type="button"
            onClick={() => {
              setNewVal(latestEntry.value);
              setShowAddModal(true);
            }}
            className="w-full py-3.5 px-4 rounded-2xl bg-[#6366F1] hover:bg-[#4F46E5] active:scale-[0.99] text-white text-xs sm:text-sm font-black uppercase tracking-wider shadow-lg shadow-[#6366F1]/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Scale className="w-4 h-4" />
            <span>DÉFINIR MON {activeMetricObj.title.toUpperCase()} ACTUEL</span>
          </button>
        </div>
      </div>

      {/* MON HISTORIQUE Section (Image 2 replica with Light Mode Support) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`text-xs font-black uppercase tracking-wider ${
              isLight ? 'text-[#7d5a47]' : 'text-[#A7A7A7]'
            }`}>
              MON HISTORIQUE ({filtered.length})
            </span>
            {activeMetricObj.isCustom && (
              <button
                type="button"
                onClick={() => handleDeleteFavoriteExercise(activeMetricObj.id)}
                className="text-[10px] text-rose-500 hover:underline font-bold"
              >
                (Supprimer exo favori)
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="text-xs font-bold text-[#6366F1] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Ajouter une entrée</span>
          </button>
        </div>

        {sortedHistory.length === 0 ? (
          <div className={`p-6 rounded-2xl border text-center space-y-2 transition-colors ${
            isLight
              ? 'bg-[#fff7f0] border-[#7d5a47]/15'
              : 'bg-[#141414] border-white/5'
          }`}>
            <p className={`text-xs ${isLight ? 'text-[#7d5a47]' : 'text-[#A7A7A7]'}`}>
              Aucune mesure enregistrée pour cet exercice.
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                isLight
                  ? 'bg-[#faebe0] hover:bg-[#f0ded0] text-[#3d2317]'
                  : 'bg-white/10 hover:bg-white/15 text-white'
              }`}
            >
              Enregistrer ma première mesure
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {sortedHistory.map((item) => (
              <div
                key={item.id}
                className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 group ${
                  isLight
                    ? 'bg-[#fff7f0] border-[#7d5a47]/15 hover:border-[#7d5a47]/35 shadow-sm'
                    : 'bg-[#141414] border-white/5 hover:border-white/15'
                }`}
              >
                <div className="space-y-0.5">
                  <span className={`text-xs block font-medium ${isLight ? 'text-[#7d5a47]' : 'text-[#A7A7A7]'}`}>
                    {item.dateStr}
                  </span>
                  <div className={`text-base sm:text-lg font-black font-mono flex items-center gap-2 ${
                    isLight ? 'text-[#3d2317]' : 'text-white'
                  }`}>
                    <span>{item.value} {item.unit}</span>
                    {item.notes && (
                      <span className={`text-[10px] font-normal italic ${
                        isLight ? 'text-[#7d5a47]' : 'text-[#A7A7A7]'
                      }`}>
                        — {item.notes}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`Supprimer la mesure de ${item.value} ${item.unit} du ${item.dateStr} ?`)) {
                      onDeleteMeasurement(item.id);
                    }
                  }}
                  className="p-2 rounded-xl text-[#737373] hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                  title="Supprimer cette mesure"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal: Ajouter un exercice favori (Image 3 request: "pouvoir rajouter ses exo preferes pour voir leur progrès") */}
      {showAddFavoriteModal && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200 ${
            isLight ? 'bg-[#3d2317]/65 backdrop-blur-xl' : 'bg-black/80 backdrop-blur-sm'
          }`}
          onClick={() => setShowAddFavoriteModal(false)}
        >
          <div
            className={`w-full max-w-sm rounded-3xl p-5 space-y-4 shadow-2xl border transition-colors ${
              isLight ? 'bg-[#faebe0] border-[#7d5a47]/25 text-[#3d2317]' : 'bg-[#181818] border-white/15 text-white'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b pb-3 border-current/10">
              <h3 className="text-sm font-black uppercase flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                <span>Ajouter un exercice favori</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddFavoriteModal(false)}
                className="text-xs font-bold opacity-60 hover:opacity-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateFavoriteExercise} className="space-y-3.5">
              <div>
                <label className={`text-[10px] font-bold uppercase block mb-1 ${
                  isLight ? 'text-[#7d5a47]' : 'text-[#A7A7A7]'
                }`}>
                  Nom de l'exercice
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Tractions lestées, Curl incliné, Développé militaire..."
                  value={newFavoriteTitle}
                  onChange={(e) => setNewFavoriteTitle(e.target.value)}
                  className={`w-full rounded-xl px-3 py-2 text-xs border focus:outline-none focus:border-[#F97316] ${
                    isLight
                      ? 'bg-[#fff7f0] border-[#7d5a47]/20 text-[#3d2317] placeholder:text-[#a3826e]'
                      : 'bg-[#121212] border-white/10 text-white placeholder:text-[#555]'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={`text-[10px] font-bold uppercase block mb-1 ${
                    isLight ? 'text-[#7d5a47]' : 'text-[#A7A7A7]'
                  }`}>
                    Catégorie
                  </label>
                  <select
                    value={newFavoriteCategory}
                    onChange={(e) => setNewFavoriteCategory(e.target.value)}
                    className={`w-full rounded-xl px-2.5 py-2 text-xs border focus:outline-none focus:border-[#F97316] ${
                      isLight
                        ? 'bg-[#fff7f0] border-[#7d5a47]/20 text-[#3d2317]'
                        : 'bg-[#121212] border-white/10 text-white'
                    }`}
                  >
                    <option value="Force">Force / 1RM</option>
                    <option value="Pectoraux">Pectoraux</option>
                    <option value="Dos">Dos</option>
                    <option value="Épaules">Épaules</option>
                    <option value="Bras">Bras</option>
                    <option value="Jambes">Jambes</option>
                  </select>
                </div>

                <div>
                  <label className={`text-[10px] font-bold uppercase block mb-1 ${
                    isLight ? 'text-[#7d5a47]' : 'text-[#A7A7A7]'
                  }`}>
                    Charge de départ (KG)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={newFavoriteStartingWeight}
                    onChange={(e) => setNewFavoriteStartingWeight(parseFloat(e.target.value) || 0)}
                    className={`w-full rounded-xl px-3 py-2 text-xs font-mono font-bold border focus:outline-none focus:border-[#F97316] ${
                      isLight
                        ? 'bg-[#fff7f0] border-[#7d5a47]/20 text-[#3d2317]'
                        : 'bg-[#121212] border-white/10 text-white'
                    }`}
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddFavoriteModal(false)}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold uppercase transition-colors ${
                    isLight ? 'bg-[#f0ded0] text-[#7d5a47]' : 'bg-white/5 text-[#A7A7A7]'
                  }`}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-[#F97316] hover:brightness-110 text-xs font-black uppercase text-white shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>Suivre cet exo</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Enregistrer une mesure / Définir la charge actuelle */}
      {showAddModal && (
        <div 
          className={`fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200 ${
            isLight ? 'bg-[#3d2317]/65 backdrop-blur-xl' : 'bg-black/80 backdrop-blur-sm'
          }`}
          onClick={() => setShowAddModal(false)}
        >
          <div 
            className={`w-full max-w-sm rounded-3xl p-5 space-y-4 shadow-2xl border transition-colors ${
              isLight ? 'bg-[#faebe0] border-[#7d5a47]/25 text-[#3d2317]' : 'bg-[#181818] border-white/15 text-white'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b pb-3 border-current/10">
              <h3 className="text-sm font-black uppercase flex items-center gap-2">
                <Scale className="w-4 h-4 text-[#6366F1]" />
                <span>Enregistrer {activeMetricObj.title}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-xs font-bold opacity-60 hover:opacity-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveMeasurement} className="space-y-4">
              {/* Stepper value */}
              <div className="space-y-1.5 text-center">
                <label className={`text-[11px] font-bold uppercase block ${
                  isLight ? 'text-[#7d5a47]' : 'text-[#A7A7A7]'
                }`}>
                  Valeur en KG
                </label>
                <div className="flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setNewVal((v) => Math.max(10, parseFloat((v - 0.5).toFixed(1))))}
                    className={`w-9 h-9 rounded-xl font-black text-lg flex items-center justify-center cursor-pointer ${
                      isLight ? 'bg-black/10 hover:bg-black/15 text-[#3d2317]' : 'bg-white/10 hover:bg-white/20 text-white'
                    }`}
                  >
                    -
                  </button>
                  <input
                    type="number"
                    step="0.1"
                    value={newVal}
                    onChange={(e) => setNewVal(parseFloat(e.target.value) || 0)}
                    className={`w-28 text-center text-3xl font-black font-mono rounded-xl py-1 border focus:outline-none focus:border-[#6366F1] ${
                      isLight
                        ? 'bg-[#fff7f0] border-[#7d5a47]/20 text-[#3d2317]'
                        : 'bg-black/40 border-white/20 text-white'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setNewVal((v) => parseFloat((v + 0.5).toFixed(1)))}
                    className={`w-9 h-9 rounded-xl font-black text-lg flex items-center justify-center cursor-pointer ${
                      isLight ? 'bg-black/10 hover:bg-black/15 text-[#3d2317]' : 'bg-white/10 hover:bg-white/20 text-white'
                    }`}
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Date and Time */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className={`text-[10px] font-bold uppercase flex items-center gap-1 ${
                    isLight ? 'text-[#7d5a47]' : 'text-[#A7A7A7]'
                  }`}>
                    <Calendar className="w-3 h-3" />
                    Date
                  </label>
                  <input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className={`w-full rounded-xl px-2.5 py-1.5 text-xs border focus:outline-none focus:border-[#6366F1] ${
                      isLight
                        ? 'bg-[#fff7f0] border-[#7d5a47]/20 text-[#3d2317]'
                        : 'bg-[#121212] border-white/10 text-white'
                    }`}
                  />
                </div>
                <div className="space-y-1">
                  <label className={`text-[10px] font-bold uppercase flex items-center gap-1 ${
                    isLight ? 'text-[#7d5a47]' : 'text-[#A7A7A7]'
                  }`}>
                    <Clock className="w-3 h-3" />
                    Heure
                  </label>
                  <input
                    type="time"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className={`w-full rounded-xl px-2.5 py-1.5 text-xs border focus:outline-none focus:border-[#6366F1] ${
                      isLight
                        ? 'bg-[#fff7f0] border-[#7d5a47]/20 text-[#3d2317]'
                        : 'bg-[#121212] border-white/10 text-white'
                    }`}
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1">
                <label className={`text-[10px] font-bold uppercase ${
                  isLight ? 'text-[#7d5a47]' : 'text-[#A7A7A7]'
                }`}>
                  Note ou contexte (optionnel)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Forme olympique, séance lourde..."
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className={`w-full rounded-xl px-3 py-2 text-xs border focus:outline-none focus:border-[#6366F1] ${
                    isLight
                      ? 'bg-[#fff7f0] border-[#7d5a47]/20 text-[#3d2317] placeholder:text-[#a3826e]'
                      : 'bg-[#121212] border-white/10 text-white placeholder:text-[#555]'
                  }`}
                />
              </div>

              {/* Submit buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    isLight ? 'bg-[#f0ded0] text-[#7d5a47]' : 'bg-white/5 text-[#A7A7A7]'
                  }`}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[#6366F1] hover:bg-[#4F46E5] text-xs font-black uppercase text-white shadow-md shadow-[#6366F1]/20 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Enregistrer</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
