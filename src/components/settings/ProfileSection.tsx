import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Camera, Check, Image as ImageIcon, Minus, Plus, Trash2, User, X } from 'lucide-react';
import { UserStats } from '../../types';
import {
  ACTIVITY_LABELS,
  ActivityLevel,
  GOAL_LABELS,
  MetabolicGoal,
  computeMetabolism,
} from '../../utils/metabolism';

type Profile = NonNullable<UserStats['profile']>;

export interface ProfileSectionProps {
  userStats: UserStats;
  onUpdateUserStats: (p: Partial<UserStats>) => void;
  theme: 'dark' | 'warm-light';
}

const DEFAULT_PROFILE: Profile = {
  gender: 'homme',
  age: 26,
  heightCm: 180,
  activityLevel: 'modere',
  goal: 'maintien',
};

const AVATAR_SIZE = 256;
const AVATAR_QUALITY = 0.85;
const CROP_VIEW = 240; // on-screen diameter of the crop circle, in px
const MAX_ZOOM = 4;

// ---------------------------------------------------------------------------
// Number field with -/+ steppers; commits only valid values, restores on blur
// ---------------------------------------------------------------------------
function NumberField({
  label,
  unit,
  value,
  min,
  max,
  onCommit,
  isLight,
}: {
  label: string;
  unit: string;
  value: number;
  min: number;
  max: number;
  onCommit: (v: number) => void;
  isLight: boolean;
}) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);

  const commit = (v: number) => {
    const c = Math.min(max, Math.max(min, Math.round(v)));
    setDraft(String(c));
    if (c !== value) onCommit(c);
  };

  const btn = `w-9 h-9 shrink-0 rounded-xl flex items-center justify-center border transition-colors ${
    isLight
      ? 'bg-[#faebe0] border-[#7d5a47]/20 text-[#3d2317] active:bg-[#f4dfce]'
      : 'bg-white/[0.04] border-white/[0.08] text-white active:bg-white/[0.1]'
  }`;

  return (
    <div className="space-y-1.5">
      <span className={`block text-caption font-black uppercase tracking-wider ${isLight ? 'text-[#7d5a47]' : 'text-[#A7A7A7]'}`}>
        {label}
      </span>
      <div className="flex items-center gap-2">
        <button type="button" aria-label={`Diminuer ${label}`} className={btn} onClick={() => commit(value - 1)}>
          <Minus className="w-4 h-4" />
        </button>
        <div
          className={`flex-1 min-w-0 h-9 rounded-xl border flex items-center justify-center gap-1 px-2 ${
            isLight ? 'bg-white/60 border-[#7d5a47]/20' : 'bg-[#101010] border-white/[0.08]'
          }`}
        >
          <input
            type="number"
            inputMode="numeric"
            aria-label={label}
            min={min}
            max={max}
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              const n = parseInt(e.target.value, 10);
              if (!Number.isNaN(n) && n >= min && n <= max && n !== value) onCommit(n);
            }}
            onBlur={() => {
              const n = parseInt(draft, 10);
              if (Number.isNaN(n)) setDraft(String(value));
              else commit(n);
            }}
            className={`w-full min-w-0 bg-transparent text-center text-sm font-black font-mono num outline-none ${
              isLight ? 'text-[#3d2317]' : 'text-white'
            }`}
          />
          <span className={`text-caption font-bold ${isLight ? 'text-[#7d5a47]' : 'text-[#A7A7A7]'}`}>{unit}</span>
        </div>
        <button type="button" aria-label={`Augmenter ${label}`} className={btn} onClick={() => commit(value + 1)}>
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Round cropper: zoom slider + drag, exports a JPEG data URL
// ---------------------------------------------------------------------------
function AvatarCropper({
  src,
  onCancel,
  onConfirm,
  isLight,
}: {
  src: string;
  onCancel: () => void;
  onConfirm: (dataUrl: string) => void;
  isLight: boolean;
}) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [error, setError] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const drag = useRef<{ id: number; startX: number; startY: number; ox: number; oy: number } | null>(null);

  useEffect(() => {
    const image = new Image();
    image.onload = () => setImg(image);
    image.onerror = () => setError(true);
    image.src = src;
  }, [src]);

  // Scale at which the image just covers the circle
  const baseScale = img ? CROP_VIEW / Math.min(img.naturalWidth, img.naturalHeight) : 1;
  const scale = baseScale * zoom;
  const dispW = img ? img.naturalWidth * scale : CROP_VIEW;
  const dispH = img ? img.naturalHeight * scale : CROP_VIEW;

  const clamp = (o: { x: number; y: number }, w = dispW, h = dispH) => {
    const mx = Math.max(0, (w - CROP_VIEW) / 2);
    const my = Math.max(0, (h - CROP_VIEW) / 2);
    return { x: Math.min(mx, Math.max(-mx, o.x)), y: Math.min(my, Math.max(-my, o.y)) };
  };

  const handleZoom = (z: number) => {
    setZoom(z);
    if (img) {
      const s = baseScale * z;
      setOffset((o) => clamp(o, img.naturalWidth * s, img.naturalHeight * s));
    }
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { id: e.pointerId, startX: e.clientX, startY: e.clientY, ox: offset.x, oy: offset.y };
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    setOffset(clamp({ x: d.ox + e.clientX - d.startX, y: d.oy + e.clientY - d.startY }));
  };
  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (drag.current?.id === e.pointerId) drag.current = null;
  };

  const handleConfirm = () => {
    if (!img) return;
    const canvas = document.createElement('canvas');
    canvas.width = AVATAR_SIZE;
    canvas.height = AVATAR_SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const ratio = AVATAR_SIZE / CROP_VIEW;
    const w = dispW * ratio;
    const h = dispH * ratio;
    const cx = AVATAR_SIZE / 2 + offset.x * ratio;
    const cy = AVATAR_SIZE / 2 + offset.y * ratio;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, AVATAR_SIZE, AVATAR_SIZE);
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, cx - w / 2, cy - h / 2, w, h);
    onConfirm(canvas.toDataURL('image/jpeg', AVATAR_QUALITY));
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Recadrer la photo"
        className={`w-full max-w-sm rounded-2xl border p-5 space-y-5 ${
          isLight ? 'bg-[#fff7f0] border-[#7d5a47]/20' : 'bg-[#181818] border-white/[0.08]'
        }`}
      >
        <div className="flex items-center justify-between">
          <h3 className={`text-lg font-black uppercase tracking-tight ${isLight ? 'text-[#3d2317]' : 'text-white'}`}>
            Recadrer
          </h3>
          <button
            type="button"
            aria-label="Annuler"
            onClick={onCancel}
            className={`w-9 h-9 relative after:absolute after:-inset-1 rounded-xl flex items-center justify-center ${isLight ? 'text-[#7d5a47]' : 'text-[#A7A7A7]'}`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error ? (
          <p className={`text-sm text-center py-10 ${isLight ? 'text-[#7d5a47]' : 'text-[#A7A7A7]'}`}>
            Impossible de lire cette image.
          </p>
        ) : (
          <div
            className="relative mx-auto rounded-full overflow-hidden cursor-grab active:cursor-grabbing select-none ring-2 ring-[#EC4899]/70"
            style={{ width: CROP_VIEW, height: CROP_VIEW, touchAction: 'none', background: isLight ? '#f4dfce' : '#101010' }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            {img && (
              <img
                src={src}
                alt=""
                draggable={false}
                className="absolute max-w-none pointer-events-none"
                style={{
                  width: dispW,
                  height: dispH,
                  left: CROP_VIEW / 2 - dispW / 2 + offset.x,
                  top: CROP_VIEW / 2 - dispH / 2 + offset.y,
                }}
              />
            )}
          </div>
        )}

        <div className="space-y-1.5">
          <div className={`flex justify-between text-caption font-black uppercase tracking-wider ${isLight ? 'text-[#7d5a47]' : 'text-[#A7A7A7]'}`}>
            <span>Zoom</span>
            <span className="font-mono num">{zoom.toFixed(1)}×</span>
          </div>
          <input
            type="range"
            aria-label="Zoom"
            min={1}
            max={MAX_ZOOM}
            step={0.01}
            value={zoom}
            disabled={!img}
            onChange={(e) => handleZoom(parseFloat(e.target.value))}
            className="w-full accent-[#EC4899]"
          />
          <p className={`text-caption ${isLight ? 'text-[#7d5a47]' : 'text-[#A7A7A7]'}`}>Fais glisser la photo pour la centrer.</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onCancel}
            className={`h-11 rounded-xl border text-sm font-black uppercase tracking-tight ${
              isLight ? 'border-[#7d5a47]/30 text-[#3d2317]' : 'border-white/[0.12] text-white'
            }`}
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!img}
            className="h-11 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#EC4899] text-white text-sm font-black uppercase tracking-tight disabled:opacity-40 flex items-center justify-center gap-1.5"
          >
            <Check className="w-4 h-4" /> Valider
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main section
// ---------------------------------------------------------------------------
export function ProfileSection({ userStats, onUpdateUserStats, theme }: ProfileSectionProps) {
  const isLight = theme === 'warm-light';
  const profile: Profile = { ...DEFAULT_PROFILE, ...userStats.profile };
  const weightKg = userStats.currentWeightKg;
  const leanMassKg = userStats.bodyComposition?.leanMassKg;

  // Name
  const [nameDraft, setNameDraft] = useState(userStats.name);
  const [nameSaved, setNameSaved] = useState(false);
  useEffect(() => setNameDraft(userStats.name), [userStats.name]);
  const trimmedName = nameDraft.trim();
  const nameDirty = trimmedName.length > 0 && trimmedName !== userStats.name;
  const saveName = () => {
    if (!nameDirty) return;
    onUpdateUserStats({ name: trimmedName });
    setNameSaved(true);
    window.setTimeout(() => setNameSaved(false), 1500);
  };

  // Photo
  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  useEffect(() => () => { if (cropSrc) URL.revokeObjectURL(cropSrc); }, [cropSrc]);
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !file.type.startsWith('image/')) return;
    setCropSrc(URL.createObjectURL(file));
  };

  // Metabolism
  const updateProfile = (patch: Partial<Profile>) => onUpdateUserStats({ profile: { ...profile, ...patch } });
  const result = useMemo(
    () =>
      computeMetabolism({
        gender: profile.gender,
        age: profile.age,
        heightCm: profile.heightCm,
        weightKg,
        activityLevel: profile.activityLevel,
        goal: profile.goal,
        leanMassKg,
      }),
    [profile.gender, profile.age, profile.heightCm, profile.activityLevel, profile.goal, weightKg, leanMassKg],
  );

  // Style tokens
  const card = `rounded-2xl border p-4 sm:p-5 ${isLight ? 'bg-[#fff7f0] border-[#7d5a47]/20' : 'bg-[#181818] border-white/[0.08]'}`;
  const title = `text-base font-black uppercase tracking-tight ${isLight ? 'text-[#3d2317]' : 'text-white'}`;
  const muted = isLight ? 'text-[#7d5a47]' : 'text-[#A7A7A7]';
  const strong = isLight ? 'text-[#3d2317]' : 'text-white';
  const label = `block text-caption font-black uppercase tracking-wider ${muted}`;
  const chip = (active: boolean) =>
    `min-h-9 px-3 py-2 rounded-xl border text-xs font-black uppercase tracking-tight transition-colors ${
      active
        ? 'bg-gradient-to-r from-[#7C3AED] to-[#EC4899] border-transparent text-white'
        : isLight
          ? 'bg-white/60 border-[#7d5a47]/20 text-[#3d2317]'
          : 'bg-white/[0.04] border-white/[0.08] text-white'
    }`;
  const secondaryBtn = `h-10 px-3 rounded-xl border text-xs font-black uppercase tracking-tight flex items-center justify-center gap-1.5 ${
    isLight ? 'bg-white/60 border-[#7d5a47]/20 text-[#3d2317]' : 'bg-white/[0.04] border-white/[0.08] text-white'
  }`;

  const fmt = (n: number) => n.toLocaleString('fr-FR');
  const range = (r: { min: number; max: number }) => (r.min === r.max ? fmt(r.min) : `${fmt(r.min)}–${fmt(r.max)}`);

  return (
    <div className="space-y-4">
      {/* Identity */}
      <section className={card}>
        <h3 className={title}>Profil</h3>
        <div className="mt-4 flex items-center gap-4">
          <div
            className={`w-20 h-20 shrink-0 rounded-full overflow-hidden flex items-center justify-center p-[2px] bg-gradient-to-br from-[#7C3AED] to-[#EC4899]`}
          >
            <div className={`w-full h-full rounded-full overflow-hidden flex items-center justify-center ${isLight ? 'bg-[#faebe0]' : 'bg-[#101010]'}`}>
              {userStats.avatarUrl ? (
                <img src={userStats.avatarUrl} alt="Photo de profil" className="w-full h-full object-cover" />
              ) : (
                <User className={`w-9 h-9 ${muted}`} />
              )}
            </div>
          </div>
          <div className="flex-1 min-w-0 grid grid-cols-2 gap-2">
            <button type="button" className={secondaryBtn} onClick={() => galleryRef.current?.click()}>
              <ImageIcon className="w-4 h-4" /> Galerie
            </button>
            <button type="button" className={secondaryBtn} onClick={() => cameraRef.current?.click()}>
              <Camera className="w-4 h-4" /> Photo
            </button>
            {userStats.avatarUrl && (
              <button
                type="button"
                className={`${secondaryBtn} col-span-2 ${isLight ? '!text-[#b8432b]' : '!text-[#F87171]'}`}
                onClick={() => onUpdateUserStats({ avatarUrl: undefined })}
              >
                <Trash2 className="w-4 h-4" /> Retirer la photo
              </button>
            )}
          </div>
          <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
          <input ref={cameraRef} type="file" accept="image/*" capture="user" className="hidden" onChange={handleFile} />
        </div>

        <div className="mt-4 space-y-1.5">
          <label htmlFor="profile-name" className={label}>Prénom</label>
          <div className="flex gap-2">
            <input
              id="profile-name"
              type="text"
              autoComplete="given-name"
              maxLength={40}
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') saveName(); }}
              className={`flex-1 min-w-0 h-10 px-3 rounded-xl border text-sm font-bold outline-none focus:border-[#EC4899] ${
                isLight ? 'bg-white/60 border-[#7d5a47]/20 text-[#3d2317]' : 'bg-[#101010] border-white/[0.08] text-white'
              }`}
            />
            <button
              type="button"
              onClick={saveName}
              disabled={!nameDirty}
              className="h-10 px-4 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#EC4899] text-white text-xs font-black uppercase tracking-tight disabled:opacity-40 flex items-center gap-1"
            >
              {nameSaved ? <><Check className="w-4 h-4" /> OK</> : 'Enregistrer'}
            </button>
          </div>
        </div>
      </section>

      {/* Calculation inputs */}
      <section className={card}>
        <h3 className={title}>Métabolisme</h3>
        <p className={`text-xs mt-0.5 ${muted}`}>
          Poids utilisé : <span className={`font-bold ${strong}`}>{fmt(weightKg)} kg</span>
          {leanMassKg ? <> · masse maigre <span className={`font-bold ${strong}`}>{fmt(Math.round(leanMassKg * 10) / 10)} kg</span></> : null}
        </p>

        <div className="mt-4 space-y-4">
          <div className="space-y-1.5">
            <span className={label}>Sexe</span>
            <div className="grid grid-cols-2 gap-2">
              {(['homme', 'femme'] as const).map((g) => (
                <button key={g} type="button" aria-pressed={profile.gender === g} className={chip(profile.gender === g)} onClick={() => updateProfile({ gender: g })}>
                  {g === 'homme' ? 'Homme' : 'Femme'}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 min-[360px]:grid-cols-2 gap-3">
            <NumberField label="Âge" unit="ans" value={profile.age} min={14} max={95} isLight={isLight} onCommit={(age) => updateProfile({ age })} />
            <NumberField label="Taille" unit="cm" value={profile.heightCm} min={120} max={230} isLight={isLight} onCommit={(heightCm) => updateProfile({ heightCm })} />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="profile-activity" className={label}>Niveau d'activité</label>
            <select
              id="profile-activity"
              value={profile.activityLevel}
              onChange={(e) => updateProfile({ activityLevel: e.target.value as ActivityLevel })}
              className={`w-full h-10 px-3 rounded-xl border text-sm font-bold outline-none focus:border-[#EC4899] ${
                isLight ? 'bg-white/60 border-[#7d5a47]/20 text-[#3d2317]' : 'bg-[#101010] border-white/[0.08] text-white'
              }`}
            >
              {(Object.keys(ACTIVITY_LABELS) as ActivityLevel[]).map((k) => (
                <option key={k} value={k}>{ACTIVITY_LABELS[k]}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <span className={label}>Objectif</span>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(GOAL_LABELS) as MetabolicGoal[]).map((g) => (
                <button key={g} type="button" aria-pressed={profile.goal === g} className={`${chip(profile.goal === g)} !px-1.5 text-caption`} onClick={() => updateProfile({ goal: g })}>
                  {GOAL_LABELS[g]}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Results */}
      <section className={card}>
        <h3 className={title}>Tes besoins</h3>

        <div className="mt-4 grid grid-cols-2 gap-2">
          {[
            { k: 'BMR', v: fmt(result.bmr), u: 'kcal', sub: result.bmrFormula === 'katch' ? 'Katch-McArdle' : 'Mifflin-St Jeor' },
            { k: 'TDEE', v: fmt(result.tdee), u: 'kcal', sub: `BMR × ${String(result.activityFactor).replace('.', ',')}` },
          ].map((c) => (
            <div key={c.k} className={`rounded-xl border p-3 ${isLight ? 'bg-white/60 border-[#7d5a47]/15' : 'bg-white/[0.03] border-white/[0.06]'}`}>
              <span className={label}>{c.k}</span>
              <p className={`mt-1 text-xl font-black font-mono num ${strong}`}>
                {c.v} <span className={`text-xs font-bold ${muted}`}>{c.u}</span>
              </p>
              <p className={`text-2xs ${muted}`}>{c.sub}</p>
            </div>
          ))}
        </div>

        <div className="mt-2 rounded-xl p-[1px] bg-gradient-to-r from-[#7C3AED] to-[#EC4899]">
          <div className={`rounded-[11px] p-3 ${isLight ? 'bg-[#fff7f0]' : 'bg-[#181818]'}`}>
            <span className={label}>Calories / jour · {GOAL_LABELS[profile.goal]}</span>
            <p className={`mt-1 text-2xl font-black font-mono num ${strong}`}>
              {range(result.calories)} <span className={`text-xs font-bold ${muted}`}>kcal</span>
            </p>
          </div>
        </div>

        <div className="mt-2 grid grid-cols-3 gap-2">
          {[
            { k: 'Protéines', r: result.proteinG, c: '#EC4899' },
            { k: 'Glucides', r: result.carbsG, c: '#00C6FF' },
            { k: 'Lipides', r: result.fatG, c: '#F59E0B' },
          ].map((m) => (
            <div key={m.k} className={`flex flex-col rounded-xl border p-3 min-w-0 ${isLight ? 'bg-white/60 border-[#7d5a47]/15' : 'bg-white/[0.03] border-white/[0.06]'}`}>
              <span className="block w-6 h-1 rounded-full mb-2" style={{ background: m.c }} />
              <span className={`block text-2xs font-black uppercase tracking-tight ${muted}`}>{m.k}</span>
              <p className={`mt-0.5 text-sm font-black font-mono num leading-tight break-words ${strong}`}>{range(m.r)}</p>
              <span className={`mt-auto text-2xs font-bold ${muted}`}>g / jour</span>
            </div>
          ))}
        </div>

        <ul className={`mt-4 space-y-1 text-2xs leading-snug ${muted}`}>
          {result.bmrKatch !== null && (
            <li>BMR Mifflin-St Jeor : {fmt(result.bmrMifflin)} kcal · Katch-McArdle : {fmt(result.bmrKatch)} kcal (retenue)</li>
          )}
          {result.formulas.map((f) => (
            <li key={f}>{f}</li>
          ))}
          <li>Estimations indicatives : ajuste selon l'évolution de ton poids sur 2 à 3 semaines.</li>
        </ul>
      </section>

      {cropSrc && (
        <AvatarCropper
          src={cropSrc}
          isLight={isLight}
          onCancel={() => setCropSrc(null)}
          onConfirm={(dataUrl) => {
            onUpdateUserStats({ avatarUrl: dataUrl });
            setCropSrc(null);
          }}
        />
      )}
    </div>
  );
}

