import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Trash2, Plus, Calendar, Scale, ArrowLeft, Check, Star } from 'lucide-react';
import { MeasurementEntry } from '../types';
import { useVoltData } from '../data/VoltDataContext';
import { sortedHistory as sortedExerciseHistory, weightSeries } from '../data/selectors';
import { ISODate, LIMITS, parseISODate, todayISO } from '../data/model';

interface PerformanceTrackerViewProps {
  /** @deprecated Ignored: data now comes from useVoltData() (volt_data_v2) */
  measurements?: MeasurementEntry[];
  /** @deprecated Ignored */
  onAddMeasurement?: (entry: Omit<MeasurementEntry, 'id'>) => void;
  /** @deprecated Ignored */
  onDeleteMeasurement?: (id: string) => void;
  /** @deprecated Ignored: the current weight is derived from the weigh-ins */
  currentWeightKg?: number;
  onClose?: () => void;
  theme?: 'dark' | 'warm-light';
}

const WEIGHT_METRIC = 'poids';

/** One point of the selected metric, whatever its source (weigh-in or record entry) */
interface MetricPoint {
  id: string;
  date: ISODate;
  value: number;
  reps?: number;
  notes?: string;
}

const formatLongDate = (iso: ISODate) =>
  parseISODate(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

const isValidISODate = (iso: string) => /^\d{4}-\d{2}-\d{2}$/.test(iso) && !Number.isNaN(parseISODate(iso).getTime());

export const PerformanceTrackerView: React.FC<PerformanceTrackerViewProps> = ({
  onClose,
  theme,
}) => {
  const isLight = theme === 'warm-light';
  const { data, logBodyMetrics, clearBodyWeight, logRecord, deleteRecordEntry, addExercise, deleteExercise } = useVoltData();

  const [selectedMetric, setSelectedMetric] = useState<string>(WEIGHT_METRIC);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddFavoriteModal, setShowAddFavoriteModal] = useState(false);
  const [hoveredPoint, setHoveredPoint] = useState<MetricPoint | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Form states for adding a favorite exercise
  const [newFavoriteTitle, setNewFavoriteTitle] = useState('');
  const [newFavoriteStartingWeight, setNewFavoriteStartingWeight] = useState(80);
  const [newFavoriteCategory, setNewFavoriteCategory] = useState('Force');

  // Form states for adding a measurement
  const [newVal, setNewVal] = useState<number>(0);
  const [newDate, setNewDate] = useState<string>(todayISO);
  const [newNotes, setNewNotes] = useState<string>('');

  const strengthExercises = data.exercises.filter((e) => e.showInMaxCharges);
  const favoriteExercises = data.exercises.filter((e) => !e.showInMaxCharges);
  const activeExercise = selectedMetric === WEIGHT_METRIC ? null : data.exercises.find((e) => e.id === selectedMetric) ?? null;
  // A deleted exercise falls back to body weight
  const isWeight = activeExercise === null;
  const metricTitle = activeExercise ? activeExercise.name : 'Poids de corps';

  // All points of the selected metric, oldest first
  const points: MetricPoint[] = useMemo(() => {
    if (!activeExercise) {
      const ids = new Map(data.bodyMetrics.map((m) => [m.date, m.id]));
      return weightSeries(data).map((p) => ({ id: ids.get(p.date) ?? p.date, date: p.date, value: p.weightKg }));
    }
    return sortedExerciseHistory(activeExercise).map((h) => ({ id: h.id, date: h.date, value: h.weightKg, reps: h.reps, notes: h.notes }));
  }, [data, activeExercise]);

  const latestEntry = points.length ? points[points.length - 1] : null;
  const historyDesc = [...points].reverse();

  // Year shown by the chart: the year of the latest point by default (real dates, no hard-coded year)
  const latestYear = latestEntry ? parseISODate(latestEntry.date).getFullYear() : new Date().getFullYear();
  const [yearOverride, setYearOverride] = useState<{ metric: string; year: number } | null>(null);
  const selectedYear = yearOverride && yearOverride.metric === selectedMetric ? yearOverride.year : latestYear;
  const setSelectedYear = (fn: (y: number) => number) => setYearOverride({ metric: selectedMetric, year: fn(selectedYear) });

  // Month labels matching Image 2 ("j f m a m j j a s o n d")
  const monthLabels = ['j', 'f', 'm', 'a', 'm', 'j', 'j', 'a', 's', 'o', 'n', 'd'];

  const yearPoints = points.filter((p) => parseISODate(p.date).getFullYear() === selectedYear);
  const monthsWithData = new Set(yearPoints.map((p) => parseISODate(p.date).getMonth()));

  // Dynamic chart scaling based on the year's values
  const baseVals = yearPoints.length > 0 ? yearPoints.map((p) => p.value) : latestEntry ? [latestEntry.value] : [isWeight ? 75 : 50];
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

  // X position from the real day in the year (tick "j" = 1 Jan, tick "d" = 1 Dec)
  const xOfDate = (iso: ISODate) => {
    const d = parseISODate(iso);
    const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    const monthPos = d.getMonth() + (d.getDate() - 1) / daysInMonth;
    return padLeft + (Math.min(11, monthPos) / 11) * plotWidth;
  };

  const validPoints = yearPoints.map((entry) => {
    const clampedVal = Math.max(minY, Math.min(maxY, entry.value));
    return {
      x: xOfDate(entry.date),
      y: padTop + plotHeight - ((clampedVal - minY) / (maxY - minY)) * plotHeight,
      entry,
    };
  });

  // Build SVG polyline path
  const polylinePoints = validPoints.map((p) => `${p.x},${p.y}`).join(' ');

  const selectMetric = (id: string) => {
    setSelectedMetric(id);
    setHoveredPoint(null);
  };

  const openAddModal = () => {
    const fallback = isWeight ? 75 : activeExercise?.startKg ?? 20;
    setNewVal(latestEntry ? latestEntry.value : fallback);
    setNewDate(todayISO());
    setNewNotes('');
    setFormError(null);
    setShowAddModal(true);
  };

  const openFavoriteModal = () => {
    setFormError(null);
    setShowAddFavoriteModal(true);
  };

  const handleSaveMeasurement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidISODate(newDate)) {
      setFormError('Date invalide.');
      return;
    }
    if (newDate > todayISO()) {
      setFormError('La date ne peut pas être dans le futur.');
      return;
    }

    let ok: boolean;
    if (!activeExercise) {
      ok = Number.isFinite(newVal) && logBodyMetrics({ weightKg: newVal }, newDate);
      if (!ok) setFormError(`Poids invalide : entre ${LIMITS.bodyWeightKg[0]} et ${LIMITS.bodyWeightKg[1]} kg.`);
    } else {
      ok = Number.isFinite(newVal) && logRecord(activeExercise.id, { weightKg: newVal, date: newDate, notes: newNotes.trim() || undefined });
      if (!ok) setFormError(`Charge invalide : plus de 0 et au maximum ${LIMITS.loadKg[1]} kg.`);
    }
    if (!ok) return;

    setYearOverride({ metric: selectedMetric, year: parseISODate(newDate).getFullYear() });
    setShowAddModal(false);
    setNewNotes('');
    setFormError(null);
  };

  const handleCreateFavoriteExercise = (e: React.FormEvent) => {
    e.preventDefault();
    const title = newFavoriteTitle.trim();
    if (!title) {
      setFormError("Donne un nom à l'exercice.");
      return;
    }
    if (data.exercises.some((ex) => ex.name.trim().toLowerCase() === title.toLowerCase())) {
      setFormError('Cet exercice est déjà suivi.');
      return;
    }
    if (!Number.isFinite(newFavoriteStartingWeight) || newFavoriteStartingWeight <= 0 || newFavoriteStartingWeight > LIMITS.loadKg[1]) {
      setFormError(`Charge de départ invalide : plus de 0 et au maximum ${LIMITS.loadKg[1]} kg.`);
      return;
    }

    const id = addExercise(title, { category: newFavoriteCategory, startKg: newFavoriteStartingWeight, showInMaxCharges: false });
    if (!id) {
      setFormError("Impossible de créer l'exercice.");
      return;
    }
    // First entry = starting load, dated today
    logRecord(id, { weightKg: newFavoriteStartingWeight, notes: 'Charge de départ' });

    selectMetric(id);
    setShowAddFavoriteModal(false);
    setNewFavoriteTitle('');
    setFormError(null);
  };

  const handleDeleteFavoriteExercise = (idToDelete: string) => {
    if (!window.confirm('Retirer cet exercice de tes favoris suivis ? Tout son historique sera supprimé.')) return;
    deleteExercise(idToDelete);
    selectMetric(WEIGHT_METRIC);
  };

  const handleDeletePoint = (item: MetricPoint) => {
    const label = `${item.value} KG du ${formatLongDate(item.date)}`;
    if (!activeExercise) {
      const entry = data.bodyMetrics.find((m) => m.id === item.id);
      const hasComposition = Boolean(entry && typeof entry.fatPercent === 'number');
      const msg = hasComposition
        ? `Supprimer la pesée de ${label} ? La composition corporelle de ce jour-là est conservée.`
        : `Supprimer la pesée de ${label} ?`;
      // Removes only the weight; the entry disappears if nothing else was recorded that day
      if (window.confirm(msg)) clearBodyWeight(item.id);
    } else if (window.confirm(`Supprimer la mesure de ${label} ?`)) {
      deleteRecordEntry(activeExercise.id, item.id);
    }
    setHoveredPoint(null);
  };

  return (
    <div className="num space-y-6">
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
            <span className={`text-2xs font-black uppercase tracking-wider block ${
              isLight ? 'text-[#7d5a47]' : 'text-[#A7A7A7]'
            }`}>
              SUIVI DE PROGRESSION
            </span>
            <h2 className={`text-xl sm:text-2xl font-black tracking-tight uppercase flex items-center gap-2 ${
              isLight ? 'text-[#3d2317]' : 'text-white'
            }`}>
              {metricTitle}
            </h2>
          </div>
        </div>

        {/* Quick Metric Switcher & + Ajouter un exercice favori */}
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={activeExercise ? activeExercise.id : WEIGHT_METRIC}
            onChange={(e) => {
              if (e.target.value === '__add_favorite__') {
                openFavoriteModal();
              } else {
                selectMetric(e.target.value);
              }
            }}
            className={`text-xs font-bold px-3 py-2 rounded-xl border focus:outline-none focus:border-[#F97316] transition-colors cursor-pointer ${
              isLight
                ? 'bg-[#fff7f0] text-[#3d2317] border-[#7d5a47]/20 shadow-sm'
                : 'bg-[#181818] text-white border-white/10'
            }`}
          >
            <optgroup label="Métriques Standard">
              <option value={WEIGHT_METRIC}>Poids de corps</option>
              {strengthExercises.map((m) => (
                <option key={m.id} value={m.id}>
                  1RM {m.name}
                </option>
              ))}
            </optgroup>
            {favoriteExercises.length > 0 && (
              <optgroup label="Mes Exercices Favoris">
                {favoriteExercises.map((m) => (
                  <option key={m.id} value={m.id}>
                    ⭐ {m.name}
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
            onClick={openFavoriteModal}
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
                    className={`text-3xs font-mono num font-medium ${
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
              const hasData = monthsWithData.has(idx);
              return (
                <text
                  key={idx}
                  x={x}
                  y={svgHeight - 6}
                  textAnchor="middle"
                  className={`text-2xs font-mono num ${
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
            {validPoints.map((pt) => (
              <g
                key={pt.entry.id}
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

          {/* Empty state: a curve needs at least 2 dated points in the year */}
          {yearPoints.length < 2 && (
            <div className="absolute inset-0 flex items-center justify-center p-6 pointer-events-none">
              <p className={`text-center text-xs font-bold rounded-xl px-3 py-2 ${
                isLight ? 'bg-[#fff7f0]/90 text-[#7d5a47]' : 'bg-[#141414]/90 text-[#A7A7A7]'
              }`}>
                {yearPoints.length === 0
                  ? `Aucune mesure en ${selectedYear}.`
                  : `Une seule mesure en ${selectedYear}.`}
                <br />
                Ajoute au moins 2 mesures datées pour voir la courbe.
              </p>
            </div>
          )}

          {/* Interactive Tooltip on hover/click */}
          {hoveredPoint && (
            <div className={`absolute top-2 right-2 border rounded-xl px-2.5 py-1.5 shadow-xl text-xs flex items-center gap-2 animate-in fade-in duration-150 ${
              isLight
                ? 'bg-[#fff7f0] border-[#F97316] text-[#3d2317]'
                : 'bg-[#1C1C1C] border-[#F97316]/50 text-white'
            }`}>
              <div>
                <span className={`text-2xs block ${isLight ? 'text-[#7d5a47]' : 'text-[#A7A7A7]'}`}>
                  {formatLongDate(hoveredPoint.date)}
                </span>
                <span className={`text-xs font-black font-mono num ${isLight ? 'text-[#3d2317]' : 'text-white'}`}>
                  {hoveredPoint.value} KG{hoveredPoint.reps ? ` × ${hoveredPoint.reps}` : ''}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setHoveredPoint(null)}
                className={`text-2xs ${isLight ? 'text-[#7d5a47] hover:text-[#3d2317]' : 'text-[#A7A7A7] hover:text-white'}`}
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
              {latestEntry ? `Dernière mesure : ${formatLongDate(latestEntry.date)}` : 'Aucune mesure enregistrée'}
            </span>
            <div className={`text-3xl sm:text-4xl font-black font-mono num tracking-tight ${
              isLight ? 'text-[#3d2317]' : 'text-white'
            }`}>
              {latestEntry ? latestEntry.value : '—'}
              <span className={`text-lg font-bold ml-1 ${isLight ? 'text-[#7d5a47]' : 'text-[#A7A7A7]'}`}>
                KG
              </span>
            </div>
          </div>

          {/* Primary Action Button (DÉFINIR / ENREGISTRER) */}
          <button
            type="button"
            onClick={openAddModal}
            className="w-full py-3.5 px-4 rounded-2xl bg-[#6366F1] hover:bg-[#4F46E5] active:scale-[0.99] text-white text-xs sm:text-sm font-black uppercase tracking-wider shadow-lg shadow-[#6366F1]/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Scale className="w-4 h-4" />
            <span>DÉFINIR MON {metricTitle.toUpperCase()} ACTUEL</span>
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
              MON HISTORIQUE ({points.length})
            </span>
            {activeExercise && !activeExercise.showInMaxCharges && (
              <button
                type="button"
                onClick={() => handleDeleteFavoriteExercise(activeExercise.id)}
                className="text-2xs text-rose-500 hover:underline font-bold"
              >
                (Supprimer exo favori)
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={openAddModal}
            className="text-xs font-bold text-[#6366F1] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Ajouter une entrée</span>
          </button>
        </div>

        {historyDesc.length === 0 ? (
          <div className={`p-6 rounded-2xl border text-center space-y-2 transition-colors ${
            isLight
              ? 'bg-[#fff7f0] border-[#7d5a47]/15'
              : 'bg-[#141414] border-white/5'
          }`}>
            <p className={`text-xs ${isLight ? 'text-[#7d5a47]' : 'text-[#A7A7A7]'}`}>
              {isWeight ? 'Aucune pesée enregistrée.' : 'Aucune mesure enregistrée pour cet exercice.'}
            </p>
            <button
              onClick={openAddModal}
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
            {historyDesc.map((item) => (
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
                    {formatLongDate(item.date)}
                  </span>
                  <div className={`text-base sm:text-lg font-black font-mono num flex items-center gap-2 ${
                    isLight ? 'text-[#3d2317]' : 'text-white'
                  }`}>
                    <span>{item.value} KG{item.reps ? ` × ${item.reps}` : ''}</span>
                    {item.notes && (
                      <span className={`text-2xs font-normal italic ${
                        isLight ? 'text-[#7d5a47]' : 'text-[#A7A7A7]'
                      }`}>
                        — {item.notes}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleDeletePoint(item)}
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
                <label className={`text-2xs font-bold uppercase block mb-1 ${
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
                  <label className={`text-2xs font-bold uppercase block mb-1 ${
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
                  <label className={`text-2xs font-bold uppercase block mb-1 ${
                    isLight ? 'text-[#7d5a47]' : 'text-[#A7A7A7]'
                  }`}>
                    Charge de départ (KG)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={newFavoriteStartingWeight}
                    onChange={(e) => setNewFavoriteStartingWeight(parseFloat(e.target.value) || 0)}
                    className={`w-full rounded-xl px-3 py-2 text-xs font-mono num font-bold border focus:outline-none focus:border-[#F97316] ${
                      isLight
                        ? 'bg-[#fff7f0] border-[#7d5a47]/20 text-[#3d2317]'
                        : 'bg-[#121212] border-white/10 text-white'
                    }`}
                  />
                </div>
              </div>

              {formError && (
                <p role="alert" className="text-xs font-bold text-rose-500">{formError}</p>
              )}

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
                <span>Enregistrer {metricTitle}</span>
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
                <label className={`text-caption font-bold uppercase block ${
                  isLight ? 'text-[#7d5a47]' : 'text-[#A7A7A7]'
                }`}>
                  Valeur en KG
                </label>
                <div className="flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setNewVal((v) => Math.max(isWeight ? LIMITS.bodyWeightKg[0] : 0.5, parseFloat((v - 0.5).toFixed(1))))}
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
                    className={`w-28 text-center text-3xl font-black font-mono num rounded-xl py-1 border focus:outline-none focus:border-[#6366F1] ${
                      isLight
                        ? 'bg-[#fff7f0] border-[#7d5a47]/20 text-[#3d2317]'
                        : 'bg-black/40 border-white/20 text-white'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setNewVal((v) => Math.min(isWeight ? LIMITS.bodyWeightKg[1] : LIMITS.loadKg[1], parseFloat((v + 0.5).toFixed(1))))}
                    className={`w-9 h-9 rounded-xl font-black text-lg flex items-center justify-center cursor-pointer ${
                      isLight ? 'bg-black/10 hover:bg-black/15 text-[#3d2317]' : 'bg-white/10 hover:bg-white/20 text-white'
                    }`}
                  >
                    +
                  </button>
                </div>
              </div>


              {/* Date (one measure per day: a new entry replaces the one of the same day) */}
              <div className="space-y-1">
                <label className={`text-2xs font-bold uppercase flex items-center gap-1 ${
                  isLight ? 'text-[#7d5a47]' : 'text-[#A7A7A7]'
                }`}>
                  <Calendar className="w-3 h-3" />
                  Date
                </label>
                <input
                  type="date"
                  value={newDate}
                  max={todayISO()}
                  onChange={(e) => setNewDate(e.target.value)}
                  className={`w-full rounded-xl px-2.5 py-1.5 text-xs border focus:outline-none focus:border-[#6366F1] ${
                    isLight
                      ? 'bg-[#fff7f0] border-[#7d5a47]/20 text-[#3d2317]'
                      : 'bg-[#121212] border-white/10 text-white'
                  }`}
                />
                <p className={`text-2xs ${isLight ? 'text-[#7d5a47]' : 'text-[#A7A7A7]'}`}>
                  Une seule mesure par jour : elle remplace celle déjà saisie à cette date.
                </p>
              </div>

              {/* Notes (record entries only: weigh-ins have no note field) */}
              {!isWeight && (
                <div className="space-y-1">
                  <label className={`text-2xs font-bold uppercase ${
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
              )}

              {formError && (
                <p role="alert" className="text-xs font-bold text-rose-500">{formError}</p>
              )}

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
