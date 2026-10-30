import React, { useRef, useState } from 'react';
import { AlertTriangle, Check, Download, Timer, Upload, Volume2, VolumeX } from 'lucide-react';
import { loadDefaultRestSeconds, loadSoundEnabled, saveDefaultRestSeconds, saveSoundEnabled } from '../../utils/preferences';
import { BackupFile, backupFileName, exportBackup, parseBackup, restoreBackup } from '../../utils/backup';

export interface OtherSettingsSectionProps {
  theme: 'dark' | 'warm-light';
}

const REST_PRESETS = [45, 60, 90, 120, 180];

const formatRest = (s: number) => {
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return r === 0 ? `${m} min` : `${m} min ${String(r).padStart(2, '0')}`;
};

type Status = { kind: 'ok' | 'error'; text: string } | null;

export function OtherSettingsSection({ theme }: OtherSettingsSectionProps) {
  const isLight = theme === 'warm-light';
  const muted = isLight ? 'text-[#7d5a47]' : 'text-[#A7A7A7]';
  const strong = isLight ? 'text-[#3d2317]' : 'text-white';
  const card = `rounded-2xl border p-4 sm:p-5 ${isLight ? 'bg-[#fff7f0] border-[#7d5a47]/20' : 'bg-[#181818] border-white/[0.08]'}`;
  const title = `text-base font-black uppercase tracking-tight ${strong}`;
  const label = `block text-[11px] font-black uppercase tracking-wider ${muted}`;
  const secondaryBtn = `h-11 px-3 rounded-xl border text-xs font-black uppercase tracking-tight flex items-center justify-center gap-1.5 ${
    isLight ? 'bg-white/60 border-[#7d5a47]/20 text-[#3d2317]' : 'bg-white/[0.04] border-white/[0.08] text-white'
  }`;

  // Default rest
  const [restSeconds, setRestSeconds] = useState<number>(() => loadDefaultRestSeconds());
  const chooseRest = (s: number) => {
    setRestSeconds(s);
    saveDefaultRestSeconds(s);
  };

  // Sounds
  const [soundOn, setSoundOn] = useState<boolean>(() => loadSoundEnabled());
  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    saveSoundEnabled(next);
  };

  // Backup
  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<Status>(null);
  const [pending, setPending] = useState<BackupFile | null>(null);

  const handleExport = () => {
    try {
      const backup = exportBackup();
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = backupFileName();
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      const n = Object.keys(backup.data).length;
      setStatus({ kind: 'ok', text: `Sauvegarde exportée (${n} élément${n > 1 ? 's' : ''}).` });
    } catch {
      setStatus({ kind: 'error', text: "L'export a échoué. Réessaie." });
    }
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setPending(null);
    let text: string;
    try {
      text = await file.text();
    } catch {
      setStatus({ kind: 'error', text: 'Impossible de lire ce fichier.' });
      return;
    }
    const result = parseBackup(text);
    if ('error' in result) {
      setStatus({ kind: 'error', text: result.error });
      return;
    }
    setStatus(null);
    setPending(result.backup);
  };

  const confirmImport = () => {
    if (!pending) return;
    try {
      restoreBackup(pending);
    } catch {
      setPending(null);
      setStatus({ kind: 'error', text: "L'import a échoué (stockage plein ou indisponible). Certaines données ont pu être remplacées." });
      return;
    }
    window.location.reload();
  };

  const exportedDate = (() => {
    if (!pending?.exportedAt) return null;
    const d = new Date(pending.exportedAt);
    return Number.isNaN(d.getTime())
      ? null
      : d.toLocaleString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  })();

  return (
    <div className="space-y-4">
      <section className={card}>
        <h3 className={title}>Autres paramètres</h3>

        {/* Default rest */}
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className={label}>Repos par défaut</span>
            <span className={`flex items-center gap-1 text-sm font-black font-mono ${strong}`}>
              <Timer className="w-4 h-4 text-[#EC4899]" /> {formatRest(restSeconds)}
            </span>
          </div>
          <div className="grid grid-cols-5 gap-1.5" role="group" aria-label="Repos par défaut">
            {REST_PRESETS.map((s) => {
              const active = s === restSeconds;
              return (
                <button
                  key={s}
                  type="button"
                  aria-pressed={active}
                  onClick={() => chooseRest(s)}
                  className={`h-10 rounded-xl border text-xs font-black whitespace-nowrap transition-colors ${
                    active
                      ? 'bg-gradient-to-r from-[#7C3AED] to-[#EC4899] border-transparent text-white'
                      : isLight
                        ? 'bg-white/60 border-[#7d5a47]/20 text-[#3d2317]'
                        : 'bg-white/[0.04] border-white/[0.08] text-white'
                  }`}
                >
                  {formatRest(s)}
                </button>
              );
            })}
          </div>
          <p className={`text-xs ${muted}`}>Appliqué aux nouveaux exercices que tu ajoutes à une séance.</p>
        </div>

        <div className={`my-4 h-px ${isLight ? 'bg-[#7d5a47]/15' : 'bg-white/[0.06]'}`} />

        {/* Sounds */}
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <span className={`flex items-center gap-1.5 text-sm font-black ${strong}`}>
              {soundOn ? <Volume2 className="w-4 h-4 text-[#EC4899]" /> : <VolumeX className={`w-4 h-4 ${muted}`} />}
              Sons pendant la séance
            </span>
            <p className={`text-xs mt-0.5 ${muted}`}>Signaux de fin de repos et de série.</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={soundOn}
            aria-label="Sons pendant la séance"
            onClick={toggleSound}
            className={`relative w-12 h-7 shrink-0 rounded-full transition-colors ${
              soundOn ? 'bg-gradient-to-r from-[#7C3AED] to-[#EC4899]' : isLight ? 'bg-[#e5d2c1]' : 'bg-[#2a2a2a]'
            }`}
          >
            <span
              className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${soundOn ? 'translate-x-5' : ''}`}
            />
          </button>
        </div>
      </section>

      {/* Backup */}
      <section className={card}>
        <h3 className={title}>Sauvegarde des données</h3>
        <p className={`text-xs mt-0.5 ${muted}`}>
          Tes données restent sur cet appareil. Exporte-les pour les garder ou les transférer.
        </p>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button type="button" className={secondaryBtn} onClick={handleExport}>
            <Download className="w-4 h-4" /> Exporter
          </button>
          <button type="button" className={secondaryBtn} onClick={() => fileRef.current?.click()}>
            <Upload className="w-4 h-4" /> Importer
          </button>
          <input ref={fileRef} type="file" accept=".json,application/json" className="hidden" onChange={handleFile} />
        </div>

        {pending && (
          <div
            role="alertdialog"
            aria-label="Confirmer l'import"
            className={`mt-3 rounded-xl border p-3 space-y-3 ${
              isLight ? 'bg-[#faebe0] border-[#c05a3e]/30' : 'bg-[#EC4899]/[0.06] border-[#EC4899]/30'
            }`}
          >
            <div className="flex gap-2">
              <AlertTriangle className={`w-5 h-5 shrink-0 ${isLight ? 'text-[#c05a3e]' : 'text-[#EC4899]'}`} />
              <div className="min-w-0">
                <p className={`text-sm font-black ${strong}`}>Remplacer mes données actuelles ?</p>
                <p className={`text-xs mt-0.5 ${muted}`}>
                  {Object.keys(pending.data).length} élément(s){exportedDate ? `, sauvegarde du ${exportedDate}` : ''}. L'appli
                  redémarrera ensuite.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPending(null)}
                className={`h-10 rounded-xl border text-xs font-black uppercase tracking-tight ${
                  isLight ? 'border-[#7d5a47]/30 text-[#3d2317]' : 'border-white/[0.12] text-white'
                }`}
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={confirmImport}
                className="h-10 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#EC4899] text-white text-xs font-black uppercase tracking-tight"
              >
                Remplacer
              </button>
            </div>
          </div>
        )}

        {status && (
          <p
            role={status.kind === 'error' ? 'alert' : 'status'}
            className={`mt-3 flex items-start gap-1.5 text-xs font-bold ${
              status.kind === 'ok'
                ? isLight ? 'text-[#2f7d4f]' : 'text-[#34D399]'
                : isLight ? 'text-[#b8432b]' : 'text-[#F87171]'
            }`}
          >
            {status.kind === 'ok' ? <Check className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
            {status.text}
          </p>
        )}
      </section>
    </div>
  );
}

