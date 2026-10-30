import React, { useEffect, useState } from 'react';
import { X, Trophy, TrendingUp, Calendar, Plus, Trash2, Edit3, Check, AlertCircle, RotateCcw } from 'lucide-react';
import { useVoltData } from '../data/VoltDataContext';
import { ISODate, LIMITS, PREntry, TrackedExercise, formatShortDate, sanitizeNumber, todayISO } from '../data/model';
import { currentPR, prGain, prProgressPct, sortedHistory, startPR } from '../data/selectors';

interface PRProgressionModalProps {
  /** Exercise (TrackedExercise.id) opened first */
  exerciseId: string;
  onClose: () => void;
  theme?: 'dark' | 'warm-light';
}

// --- Input validation (strings from inputs → validated numbers, never NaN) ---
const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;
const parseLoad = (s: string): number | null => {
  const n = sanitizeNumber(s, LIMITS.loadKg[0], LIMITS.loadKg[1]);
  return n !== null && n > 0 ? n : null;
};
/** undefined = empty (optional), null = invalid */
const parseReps = (s: string): number | undefined | null => {
  if (!s.trim()) return undefined;
  const n = sanitizeNumber(s, 1, LIMITS.reps[1]);
  return n === null ? null : Math.round(n);
};
const validDate = (s: string): s is ISODate => ISO_RE.test(s) && !Number.isNaN(new Date(s).getTime()) && s <= todayISO();

const fmtKg = (n: number | null) => (n === null ? '—' : `${n}`);
const signed = (n: number) => (n > 0 ? `+${n}` : `${n}`);

/** Date of the entry holding the current record (latest one if reached several times) */
const recordEntry = (ex: TrackedExercise): PREntry | null => {
  const cur = currentPR(ex);
  if (cur === null) return null;
  const hits = sortedHistory(ex).filter((h) => h.weightKg === cur);
  return hits[hits.length - 1] ?? null;
};

// One editable history entry (Modifier PR tab)
const EntryEditor: React.FC<{
  entry: PREntry;
  isRecord: boolean;
  otherDates: string[];
  onSave: (patch: Partial<Omit<PREntry, 'id'>>) => boolean;
  onDelete: () => void;
}> = ({ entry, isRecord, otherDates, onSave, onDelete }) => {
  const [date, setDate] = useState(entry.date);
  const [weight, setWeight] = useState(String(entry.weightKg));
  const [reps, setReps] = useState(entry.reps === undefined ? '' : String(entry.reps));
  const [notes, setNotes] = useState(entry.notes ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setDate(entry.date);
    setWeight(String(entry.weightKg));
    setReps(entry.reps === undefined ? '' : String(entry.reps));
    setNotes(entry.notes ?? '');
  }, [entry.date, entry.weightKg, entry.reps, entry.notes]);

  const dirty =
    date !== entry.date ||
    weight !== String(entry.weightKg) ||
    reps !== (entry.reps === undefined ? '' : String(entry.reps)) ||
    notes !== (entry.notes ?? '');

  const handleSave = () => {
    const w = parseLoad(weight);
    const r = parseReps(reps);
    if (!validDate(date)) return setError('Date invalide (pas dans le futur).');
    if (otherDates.includes(date)) return setError('Une autre entrée existe déjà à cette date.');
    if (w === null) return setError(`Charge invalide (entre 0 et ${LIMITS.loadKg[1]} kg).`);
    if (r === null) return setError(`Répétitions invalides (1 à ${LIMITS.reps[1]}).`);
    const ok = onSave({ date, weightKg: w, reps: r, notes: notes.trim() || undefined });
    if (!ok) return setError('Valeur refusée : vérifie la saisie.');
    setError(null);
    setSaved(true);
    setTimeout(() => setSaved(false), 1200);
  };

  return (
    <div className={`p-3 rounded-control bg-[#1A1A1A] border space-y-2 ${isRecord ? 'border-[#EC4899]/40' : 'border-white/5'}`}>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="text-2xs text-[#A7A7A7] block font-bold mb-1">Date</label>
          <input
            type="date"
            value={date}
            max={todayISO()}
            onChange={(e) => setDate(e.target.value)}
            className="w-full bg-[#121212] border border-white/15 rounded-control px-2 py-1.5 text-caption text-white font-bold"
          />
        </div>
        <div>
          <label className="text-2xs text-[#A7A7A7] block font-bold mb-1">Charge (KG)</label>
          <input
            type="number"
            inputMode="decimal"
            step="0.5"
            min="0"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className="w-full bg-[#121212] border border-white/15 rounded-control px-2.5 py-1.5 text-xs text-white font-black font-mono num"
          />
        </div>
        <div>
          <label className="text-2xs text-[#A7A7A7] block font-bold mb-1">Reps</label>
          <input
            type="number"
            inputMode="numeric"
            min="1"
            value={reps}
            onChange={(e) => setReps(e.target.value)}
            placeholder="—"
            className="w-full bg-[#121212] border border-white/15 rounded-control px-2.5 py-1.5 text-xs text-white font-black font-mono num placeholder:text-[#666666]"
          />
        </div>
      </div>
      <input
        type="text"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Note optionnelle"
        maxLength={120}
        className="w-full bg-[#121212] border border-white/15 rounded-control px-2.5 py-1.5 text-xs text-white placeholder:text-[#666666]"
      />
      {error && <p className="text-caption font-bold text-rose-400">{error}</p>}
      <div className="flex items-center justify-between">
        {isRecord ? (
          <span className="text-3xs px-1.5 py-0.5 rounded-full bg-[#EC4899]/20 text-[#EC4899] font-black uppercase flex items-center gap-1">
            <Trophy className="w-2.5 h-2.5" />
            <span>Record</span>
          </span>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              if (window.confirm(`Supprimer l'entrée du ${formatShortDate(entry.date)} (${entry.weightKg} kg) ?`)) onDelete();
            }}
            className="p-1.5 text-[#A7A7A7] hover:text-rose-400 hover:bg-white/5 rounded-chip transition-colors"
            title="Supprimer cette entrée"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            disabled={!dirty}
            onClick={handleSave}
            className="px-2.5 py-1 rounded-chip text-caption font-black uppercase flex items-center gap-1 bg-[#0088FF] hover:bg-[#0070DD] text-white disabled:opacity-40 transition-all cursor-pointer disabled:cursor-default"
          >
            <Check className="w-3 h-3" />
            <span>{saved ? 'Enregistré' : 'Enregistrer'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// Add a dated level (used by the graph and the edit tabs)
const AddEntryForm: React.FC<{
  exerciseName: string;
  defaultWeight: number | null;
  existingDates: string[];
  onAdd: (entry: { date: ISODate; weightKg: number; reps?: number; notes?: string }) => boolean;
  onCancel: () => void;
}> = ({ exerciseName, defaultWeight, existingDates, onAdd, onCancel }) => {
  const [date, setDate] = useState<string>(todayISO());
  const [weight, setWeight] = useState(defaultWeight === null ? '' : String(defaultWeight));
  const [reps, setReps] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const w = parseLoad(weight);
    const r = parseReps(reps);
    if (!validDate(date)) return setError('Date invalide (pas dans le futur).');
    if (w === null) return setError(`Charge invalide (entre 0 et ${LIMITS.loadKg[1]} kg).`);
    if (r === null) return setError(`Répétitions invalides (1 à ${LIMITS.reps[1]}).`);
    const ok = onAdd({ date, weightKg: w, reps: r, notes: notes.trim() || undefined });
    if (!ok) return setError('Valeur refusée : vérifie la saisie.');
    onCancel();
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 rounded-card bg-[#1A1A1A] border border-white/15 space-y-3">
      <div className="flex items-center justify-between text-xs font-bold text-white">
        <span>Nouveau palier pour {exerciseName}</span>
        <button type="button" onClick={onCancel} className="text-[#A7A7A7] hover:text-white">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="text-2xs text-[#A7A7A7] block font-bold mb-1">Date</label>
          <input
            type="date"
            value={date}
            max={todayISO()}
            onChange={(e) => setDate(e.target.value)}
            className="w-full bg-[#121212] border border-white/15 rounded-control px-2 py-1.5 text-caption text-white font-bold"
          />
        </div>
        <div>
          <label className="text-2xs text-[#A7A7A7] block font-bold mb-1">Charge (KG)</label>
          <input
            type="number"
            inputMode="decimal"
            step="0.5"
            min="0"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className="w-full bg-[#121212] border border-white/15 rounded-control px-2.5 py-1.5 text-xs text-white font-black font-mono num"
          />
        </div>
        <div>
          <label className="text-2xs text-[#A7A7A7] block font-bold mb-1">Répétitions</label>
          <input
            type="number"
            inputMode="numeric"
            min="1"
            value={reps}
            onChange={(e) => setReps(e.target.value)}
            placeholder="—"
            className="w-full bg-[#121212] border border-white/15 rounded-control px-2.5 py-1.5 text-xs text-white font-black font-mono num placeholder:text-[#666666]"
          />
        </div>
      </div>

      <input
        type="text"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        maxLength={120}
        placeholder="Note optionnelle (ex: Barre nette, spotter, RPE 9)"
        className="w-full bg-[#121212] border border-white/15 rounded-control px-2.5 py-1.5 text-xs text-white placeholder:text-[#666666]"
      />

      {existingDates.includes(date) && !error && (
        <p className="text-caption text-amber-300">Une entrée existe déjà ce jour-là : elle sera remplacée.</p>
      )}
      {error && <p className="text-caption font-bold text-rose-400">{error}</p>}

      <div className="flex gap-2 pt-1">
        <button type="submit" className="flex-1 py-2 rounded-control bg-gradient-to-r from-[#7C3AED] to-[#EC4899] text-white text-xs font-black uppercase">
          Enregistrer le palier
        </button>
        <button type="button" onClick={onCancel} className="px-3 py-2 rounded-control bg-[#252525] text-xs text-[#A7A7A7]">
          Annuler
        </button>
      </div>
    </form>
  );
};

export const PRProgressionModal: React.FC<PRProgressionModalProps> = ({ exerciseId, onClose, theme }) => {
  const isLight = theme === 'warm-light';
  const { data, updateExercise, deleteExercise, logRecord, updateRecordEntry, deleteRecordEntry } = useVoltData();

  const [selectedId, setSelectedId] = useState(exerciseId);
  const [activeTab, setActiveTab] = useState<'graph' | 'edit_pr' | 'history'>('graph');
  const [showAddPointForm, setShowAddPointForm] = useState(false);
  const [activePointIndex, setActivePointIndex] = useState<number | null>(null);

  const ex = data.exercises.find((e) => e.id === selectedId) ?? null;
  const switchable = data.exercises.filter((e) => e.history.length > 0 || typeof e.startKg === 'number');

  // Edit-tab fields (exercise level)
  const [name, setName] = useState(ex?.name ?? '');
  const [category, setCategory] = useState(ex?.category ?? '');
  const [startInput, setStartInput] = useState(typeof ex?.startKg === 'number' ? String(ex.startKg) : '');
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  useEffect(() => {
    setName(ex?.name ?? '');
    setCategory(ex?.category ?? '');
    setStartInput(typeof ex?.startKg === 'number' ? String(ex.startKg) : '');
    setActivePointIndex(null);
    setShowAddPointForm(false);
    setMessage(null);
    // Only when switching exercise
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  // Exercise deleted (or unknown id): close
  useEffect(() => {
    if (!ex) onClose();
  }, [ex, onClose]);

  if (!ex) return null;

  const history = sortedHistory(ex);
  const cur = currentPR(ex);
  const start = startPR(ex);
  const gain = prGain(ex);
  const pct = prProgressPct(ex);
  const record = recordEntry(ex);
  const existingDates = history.map((h) => h.date);

  const flash = (kind: 'ok' | 'error', text: string) => {
    setMessage({ kind, text });
    if (kind === 'ok') setTimeout(() => setMessage((m) => (m?.text === text ? null : m)), 1800);
  };

  const handleAddEntry = (entry: { date: ISODate; weightKg: number; reps?: number; notes?: string }) => logRecord(ex.id, entry);

  const handleSaveInfo = () => {
    if (!name.trim()) return flash('error', "Le nom de l'exercice ne peut pas être vide.");
    updateExercise(ex.id, { name: name.trim().slice(0, 60), category: category.trim().slice(0, 40) || undefined });
    flash('ok', 'Exercice mis à jour.');
  };

  const handleSaveStart = () => {
    const v = parseLoad(startInput);
    if (v === null) return flash('error', `Poids de départ invalide (entre 0 et ${LIMITS.loadKg[1]} kg).`);
    updateExercise(ex.id, { startKg: v });
    flash('ok', 'Poids de départ enregistré.');
  };

  const handleResetStart = () => {
    updateExercise(ex.id, { startKg: undefined });
    setStartInput('');
    flash('ok', 'Départ = première entrée de l’historique.');
  };

  const handleDeleteExercise = () => {
    if (window.confirm(`Supprimer l'exercice "${ex.name}" et tout son historique (${history.length} entrée(s)) ? Action irréversible.`)) {
      deleteExercise(ex.id);
      onClose();
    }
  };

  // --- SVG chart (real dated points only) ---
  const weights = history.map((h) => h.weightKg);
  const minW = weights.length ? Math.max(0, Math.min(...weights) - 5) : 0;
  const maxW = weights.length ? Math.max(...weights) + 5 : 1;
  const rangeW = maxW - minW || 1;
  const svgWidth = 360;
  const svgHeight = 160;
  const paddingX = 35;
  const paddingY = 25;
  const chartW = svgWidth - paddingX * 2;
  const chartH = svgHeight - paddingY * 2;
  const coords = history.map((pt, idx) => ({
    x: paddingX + (idx / Math.max(1, history.length - 1)) * chartW,
    y: paddingY + chartH - ((pt.weightKg - minW) / rangeW) * chartH,
    pt,
    idx,
  }));
  let linePath = '';
  if (coords.length > 1) {
    linePath = `M ${coords[0].x} ${coords[0].y}`;
    for (let i = 0; i < coords.length - 1; i++) {
      const c = coords[i];
      const n = coords[i + 1];
      const mx = (c.x + n.x) / 2;
      linePath += ` C ${mx} ${c.y}, ${mx} ${n.y}, ${n.x} ${n.y}`;
    }
  }
  const areaPath = coords.length > 1 ? `${linePath} L ${coords[coords.length - 1].x} ${svgHeight - 10} L ${coords[0].x} ${svgHeight - 10} Z` : '';
  // Avoid overlapping date labels when there are many points
  const labelEvery = Math.max(1, Math.ceil(coords.length / 6));
  const activePoint = activePointIndex !== null ? coords[activePointIndex] : undefined;

  const tabBtn = (id: typeof activeTab) =>
    `py-2 rounded-control transition-all flex items-center justify-center gap-1.5 ${
      activeTab === id ? 'bg-gradient-to-r from-[#7C3AED] to-[#EC4899] text-white shadow' : 'text-[#A7A7A7] hover:text-white'
    }`;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in zoom-in-95 duration-150 ${
        isLight ? 'bg-[#3d2317]/65 backdrop-blur-xl' : 'bg-black/85 backdrop-blur-md'
      }`}
    >
      <div
        className={`w-full max-w-lg rounded-sheet p-5 sm:p-6 space-y-5 shadow-2xl relative my-auto border transition-colors ${
          isLight ? 'bg-[#faebe0] border-[#7d5a47]/20 text-[#3d2317]' : 'bg-[#141414] border-white/10 text-white'
        }`}
      >
        {/* Header */}
        <div className={`flex items-center justify-between pb-3 border-b ${isLight ? 'border-[#7d5a47]/15' : 'border-white/[0.08]'}`}>
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-control bg-gradient-to-tr from-[#7C3AED] via-[#EC4899] to-[#FF512F] flex items-center justify-center text-white shrink-0 shadow-lg glow-main">
              <Trophy className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-2xs font-black uppercase tracking-widest text-[#EC4899] block">ANALYSE DU RECORD PERSONNEL</span>
              <h3 className={`text-lg font-black uppercase tracking-tight truncate ${isLight ? 'text-[#3d2317]' : 'text-white'}`}>{ex.name}</h3>
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

        {/* Exercise switcher */}
        {switchable.length > 1 && (
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 -mx-1 px-1">
            {switchable.map((e) => (
              <button
                key={e.id}
                type="button"
                onClick={() => setSelectedId(e.id)}
                className={`px-3 py-1.5 rounded-control text-xs font-bold uppercase transition-all shrink-0 flex items-center gap-1.5 ${
                  e.id === selectedId ? 'bg-[#EC4899] text-white shadow-md' : 'bg-[#1C1C1C] text-[#A7A7A7] hover:text-white border border-white/5'
                }`}
              >
                <span>{e.name}</span>
                <span className="font-mono num text-caption opacity-80">({fmtKg(currentPR(e) ?? startPR(e))}kg)</span>
              </button>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#1A1A1A] rounded-card border border-white/5 text-xs font-bold text-center">
          <button type="button" onClick={() => setActiveTab('graph')} className={tabBtn('graph')}>
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Progression</span>
          </button>
          <button type="button" onClick={() => setActiveTab('edit_pr')} className={tabBtn('edit_pr')}>
            <Edit3 className="w-3.5 h-3.5" />
            <span>Modifier PR</span>
          </button>
          <button type="button" onClick={() => setActiveTab('history')} className={tabBtn('history')}>
            <Calendar className="w-3.5 h-3.5" />
            <span className="num">Séries ({history.length})</span>
          </button>
        </div>

        {message && (
          <p className={`text-xs font-bold ${message.kind === 'ok' ? 'text-emerald-400' : 'text-rose-400'}`}>{message.text}</p>
        )}

        {/* TAB 1: GRAPH */}
        {activeTab === 'graph' && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-3 rounded-card bg-[#1C1C1C] border border-white/5 space-y-0.5">
                <span className="text-2xs font-bold text-[#A7A7A7] uppercase block">Départ</span>
                <span className="text-base font-black text-white font-mono num">{fmtKg(start)} KG</span>
                <span className="text-3xs text-[#737373] block">
                  {typeof ex.startKg === 'number' ? 'Saisi' : history[0] ? formatShortDate(history[0].date) : '—'}
                </span>
              </div>

              <div className="p-3 rounded-card bg-[#1C1C1C] border border-[#EC4899]/30 space-y-0.5 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-10 h-10 bg-[#EC4899]/10 rounded-bl-full pointer-events-none" />
                <span className="text-2xs font-bold text-[#EC4899] uppercase block">Record Actuel</span>
                <span className="text-base font-black text-white font-mono num">{fmtKg(cur)} KG</span>
                <span className="text-3xs text-[#737373] block num">{record ? formatShortDate(record.date) : 'Aucune entrée'}</span>
              </div>

              <div className="p-3 rounded-card bg-[#1C1C1C] border border-white/5 space-y-0.5">
                <span className="text-2xs font-bold text-[#00C6FF] uppercase block">Gain Total</span>
                <span className={`text-base font-black font-mono num ${gain !== null && gain < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {gain === null ? '—' : `${signed(gain)} KG`}
                </span>
                <span className="text-3xs text-[#737373] block num">{pct === null ? '—' : `${signed(pct)}%`}</span>
              </div>
            </div>

            <div className="p-4 rounded-card bg-[#101010] border border-white/[0.08] relative overflow-hidden">
              <div className="flex items-center justify-between pb-2 text-caption font-bold text-[#A7A7A7]">
                <span className="uppercase flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-[#EC4899]" />
                  Courbe des charges (kg)
                </span>
                <span className="text-xs text-white font-mono num">{history.length} palier{history.length > 1 ? 's' : ''}</span>
              </div>

              {history.length < 2 ? (
                <div className="h-44 flex flex-col items-center justify-center text-center gap-2 px-4">
                  <TrendingUp className="w-6 h-6 text-[#555555]" />
                  <p className="text-xs font-bold text-white">Pas encore de courbe</p>
                  <p className="text-caption text-[#A7A7A7]">
                    {history.length === 0
                      ? 'Aucune entrée datée pour cet exercice. Ajoute un premier palier.'
                      : 'Une seule entrée datée : ajoute au moins un 2e palier pour tracer la courbe.'}
                  </p>
                </div>
              ) : (
                <div className="w-full overflow-hidden flex justify-center py-1">
                  <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-44 select-none touch-none">
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

                    {[0.25, 0.5, 0.75].map((ratio) => {
                      const lineY = paddingY + chartH * ratio;
                      return (
                        <g key={ratio}>
                          <line x1={paddingX} y1={lineY} x2={svgWidth - paddingX} y2={lineY} stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                          <text x={paddingX - 4} y={lineY + 3} fontSize="9" fill="#666666" textAnchor="end" fontFamily="monospace">
                            {Math.round(maxW - ratio * rangeW)}
                          </text>
                        </g>
                      );
                    })}

                    {areaPath && <path d={areaPath} fill="url(#areaGradient)" />}
                    {linePath && (
                      <path d={linePath} fill="none" stroke="url(#curveGradient)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
                    )}

                    {coords.map(({ x, y, pt, idx }) => {
                      const isHighest = pt.weightKg === cur;
                      const isSelected = activePointIndex === idx;
                      const showLabel = idx % labelEvery === 0 || idx === coords.length - 1;
                      return (
                        <g key={pt.id} className="cursor-pointer" onClick={() => setActivePointIndex(idx === activePointIndex ? null : idx)}>
                          {isHighest && <circle cx={x} cy={y} r="9" fill="#EC4899" fillOpacity="0.2" />}
                          <circle
                            cx={x}
                            cy={y}
                            r={isSelected ? '6' : isHighest ? '5' : '4'}
                            fill={isHighest ? '#EC4899' : '#ffffff'}
                            stroke={isHighest ? '#ffffff' : '#7C3AED'}
                            strokeWidth={isHighest ? '2' : '1.5'}
                          />
                          {showLabel && (
                            <text x={x} y={svgHeight - 2} fontSize="8" fill="#737373" textAnchor="middle" fontFamily="sans-serif">
                              {formatShortDate(pt.date)}
                            </text>
                          )}
                        </g>
                      );
                    })}
                  </svg>
                </div>
              )}

              {activePoint && (
                <div className="mt-2 p-3 rounded-control bg-[#1C1C1C] border border-white/10 flex items-center justify-between text-xs animate-in fade-in duration-150">
                  <div className="space-y-0.5">
                    <span className="text-2xs text-[#A7A7A7] uppercase">Palier du {formatShortDate(activePoint.pt.date)}</span>
                    <p className="font-bold text-white">
                      Charge : <span className="text-[#EC4899] font-black font-mono num">{activePoint.pt.weightKg} kg</span>
                      {activePoint.pt.reps ? ` • ${activePoint.pt.reps} reps` : ''}
                    </p>
                    {activePoint.pt.notes && <p className="text-2xs text-[#A7A7A7] italic">"{activePoint.pt.notes}"</p>}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`Supprimer le palier du ${formatShortDate(activePoint.pt.date)} ?`)) {
                        deleteRecordEntry(ex.id, activePoint.pt.id);
                        setActivePointIndex(null);
                      }
                    }}
                    className="p-1 text-rose-400 hover:bg-rose-500/20 rounded-chip transition-colors"
                    title="Supprimer ce point"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {!showAddPointForm ? (
              <button
                type="button"
                onClick={() => setShowAddPointForm(true)}
                className="w-full py-2.5 rounded-control bg-[#1C1C1C] hover:bg-[#252525] border border-white/10 text-xs font-bold text-white flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-[#00C6FF]" />
                <span>Ajouter un palier daté</span>
              </button>
            ) : (
              <AddEntryForm
                exerciseName={ex.name}
                defaultWeight={cur}
                existingDates={existingDates}
                onAdd={handleAddEntry}
                onCancel={() => setShowAddPointForm(false)}
              />
            )}
          </div>
        )}

        {/* TAB 2: EDIT */}
        {activeTab === 'edit_pr' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-caption font-black uppercase text-[#A7A7A7] tracking-wider">Nom de l'exercice</label>
                <input
                  type="text"
                  value={name}
                  maxLength={60}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#1C1C1C] border border-white/15 rounded-control px-3 py-2 text-sm font-bold text-white focus:outline-none focus:border-[#EC4899]"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-caption font-black uppercase text-[#A7A7A7] tracking-wider">Catégorie</label>
                <input
                  type="text"
                  value={category}
                  maxLength={40}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Ex: Poitrine, Jambes"
                  className="w-full bg-[#1C1C1C] border border-white/15 rounded-control px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-white/30 placeholder:text-[#666666]"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={handleSaveInfo}
              disabled={name === ex.name && category === (ex.category ?? '')}
              className="w-full py-2 rounded-control bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-white flex items-center justify-center gap-1.5 disabled:opacity-40 transition-all cursor-pointer disabled:cursor-default"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Enregistrer nom et catégorie</span>
            </button>

            {/* Starting load */}
            <div className="p-3 rounded-card bg-[#1C1C1C] border border-white/5 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-caption font-black uppercase text-[#A7A7A7] tracking-wider">Poids de départ (KG)</label>
                <span className="text-2xs text-[#737373]">
                  {typeof ex.startKg === 'number' ? 'Saisi à part' : history[0] ? `= 1re entrée (${history[0].weightKg} kg)` : 'Non défini'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.5"
                  min="0"
                  value={startInput}
                  onChange={(e) => setStartInput(e.target.value)}
                  placeholder={history[0] ? String(history[0].weightKg) : 'ex: 60'}
                  className="flex-1 bg-[#121212] border border-white/15 rounded-control px-3 py-2 text-base font-black text-white font-mono num focus:outline-none focus:border-[#0088FF] placeholder:text-[#555555]"
                />
                <button
                  type="button"
                  onClick={handleSaveStart}
                  className="px-3 py-2 rounded-control bg-[#0088FF] hover:bg-[#0070DD] text-white text-xs font-black uppercase cursor-pointer"
                >
                  OK
                </button>
                {typeof ex.startKg === 'number' && history.length > 0 && (
                  <button
                    type="button"
                    onClick={handleResetStart}
                    className="p-2 rounded-control bg-white/5 hover:bg-white/10 text-[#A7A7A7] hover:text-white cursor-pointer"
                    title="Utiliser la première entrée comme départ"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* History entries */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-caption font-black uppercase text-[#A7A7A7] tracking-wider">
                <span className="num">Paliers datés ({history.length})</span>
                {!showAddPointForm && (
                  <button
                    type="button"
                    onClick={() => setShowAddPointForm(true)}
                    className="text-[#00C6FF] hover:underline flex items-center gap-1 normal-case font-bold cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Ajouter</span>
                  </button>
                )}
              </div>
              {showAddPointForm && (
                <AddEntryForm
                  exerciseName={ex.name}
                  defaultWeight={cur}
                  existingDates={existingDates}
                  onAdd={handleAddEntry}
                  onCancel={() => setShowAddPointForm(false)}
                />
              )}
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1 no-scrollbar">
                {[...history].reverse().map((h) => (
                  <EntryEditor
                    key={h.id}
                    entry={h}
                    isRecord={record?.id === h.id}
                    otherDates={existingDates.filter((d) => d !== h.date)}
                    onSave={(patch) => updateRecordEntry(ex.id, h.id, patch)}
                    onDelete={() => deleteRecordEntry(ex.id, h.id)}
                  />
                ))}
                {history.length === 0 && <p className="text-xs text-[#A7A7A7] text-center py-3">Aucune entrée pour l’instant.</p>}
              </div>
            </div>

            <div className="p-3 rounded-control bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>Le record actuel est toujours la charge la plus lourde de l’historique. Chaque modification est enregistrée immédiatement.</span>
            </div>
          </div>
        )}

        {/* TAB 3: SERIES (read-only list) */}
        {activeTab === 'history' && (
          <div className="space-y-3 max-h-64 overflow-y-auto pr-1 no-scrollbar">
            <div className="flex items-center justify-between text-xs text-[#A7A7A7]">
              <span>Historique chronologique des performances</span>
              <span className="font-bold text-white num">{history.length} entrées</span>
            </div>
            {history.length === 0 && <p className="text-xs text-[#A7A7A7] text-center py-4">Aucune entrée datée.</p>}
            {[...history].reverse().map((pt) => (
              <div key={pt.id} className="p-3 rounded-control bg-[#1A1A1A] border border-white/5 flex items-center justify-between gap-3">
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-white font-mono num">{pt.weightKg} KG</span>
                    {pt.reps ? <span className="text-2xs px-1.5 py-0.5 rounded bg-white/10 text-white font-bold num">{pt.reps} reps</span> : null}
                    {record?.id === pt.id && (
                      <span className="text-3xs px-1.5 py-0.5 rounded-full bg-[#EC4899]/20 text-[#EC4899] font-black uppercase flex items-center gap-1">
                        <Trophy className="w-2.5 h-2.5" />
                        <span>Record</span>
                      </span>
                    )}
                  </div>
                  <p className="text-caption text-[#A7A7A7]">
                    {formatShortDate(pt.date)} {parseInt(pt.date, 10) !== new Date().getFullYear() ? pt.date.slice(0, 4) : ''}
                    {pt.notes ? ` • ${pt.notes}` : ''}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="pt-2 border-t border-white/10 flex items-center justify-between">
          <button
            type="button"
            onClick={handleDeleteExercise}
            className="text-xs font-bold text-rose-400 hover:text-rose-300 transition-colors flex items-center gap-1 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Supprimer l'exercice</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-control bg-gradient-to-r from-[#7C3AED] to-[#EC4899] text-white font-black text-xs uppercase tracking-wider cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
