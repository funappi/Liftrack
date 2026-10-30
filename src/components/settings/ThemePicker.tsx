import React, { useEffect, useRef, useState } from 'react';
import { Check, X } from 'lucide-react';
import { THEMES, ThemeDef, applyThemeToDocument, getTheme } from '../../themes';

interface ThemePickerProps {
  currentThemeId: string;
  /** Appelé sur « Valider ». Le parent persiste (saveThemeId) et met à jour son état de thème. */
  onApply: (id: string) => void;
  theme: 'dark' | 'warm-light';
}

// Mini maquette : couleurs en style inline uniquement (aucune classe de couleur, sinon
// themes.css / index.css la remapperaient vers le thème actif).
const ThemePreviewMock: React.FC<{ def: ThemeDef }> = ({ def }) => {
  const { bg, card, text, accent1, accent2 } = def.preview;
  return (
    <div className="rounded-xl p-2 space-y-1.5" style={{ backgroundColor: bg }} aria-hidden="true">
      <div className="flex items-center justify-between">
        <span className="h-1.5 w-8 rounded-full" style={{ backgroundColor: text, opacity: 0.9 }} />
        <span className="h-3 w-3 rounded-full" style={{ backgroundImage: `linear-gradient(135deg, ${accent1}, ${accent2})` }} />
      </div>
      <div className="rounded-lg p-1.5 space-y-1" style={{ backgroundColor: card, boxShadow: `inset 0 0 0 1px ${text}1A` }}>
        <span className="block h-1.5 w-3/4 rounded-full" style={{ backgroundColor: text, opacity: 0.85 }} />
        <span className="block h-1 w-1/2 rounded-full" style={{ backgroundColor: text, opacity: 0.45 }} />
        <div className="flex gap-1 pt-0.5">
          <span className="h-2.5 flex-1 rounded-md" style={{ backgroundImage: `linear-gradient(90deg, ${accent1}, ${accent2})` }} />
          <span className="h-2.5 w-2.5 rounded-md" style={{ backgroundColor: accent2 }} />
        </div>
      </div>
      <div className="flex gap-1">
        <span className="h-3 flex-1 rounded-md" style={{ backgroundColor: card }} />
        <span className="h-3 flex-1 rounded-md" style={{ backgroundColor: card }} />
        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: accent1 }} />
      </div>
    </div>
  );
};

export const ThemePicker: React.FC<ThemePickerProps> = ({ currentThemeId, onApply, theme }) => {
  const isLight = theme === 'warm-light';
  const currentId = getTheme(currentThemeId).id;
  const [previewId, setPreviewId] = useState<string>(currentId);

  // Refs lues au démontage : on revient au thème courant si l'aperçu n'a pas été validé
  const previewRef = useRef(previewId);
  const currentRef = useRef(currentId);
  const appliedRef = useRef<string | null>(null);
  previewRef.current = previewId;
  currentRef.current = currentId;

  // Si le thème courant change de l'extérieur (validation, autre réglage), on s'y aligne
  useEffect(() => {
    setPreviewId(currentId);
  }, [currentId]);

  useEffect(
    () => () => {
      const preview = previewRef.current;
      if (preview !== currentRef.current && preview !== appliedRef.current) {
        applyThemeToDocument(currentRef.current);
      }
    },
    [],
  );

  const handleSelect = (id: string) => {
    setPreviewId(id);
    appliedRef.current = null;
    applyThemeToDocument(id);
  };

  const handleCancel = () => {
    setPreviewId(currentId);
    applyThemeToDocument(currentId);
  };

  const handleValidate = () => {
    appliedRef.current = previewId;
    onApply(previewId);
  };

  const dirty = previewId !== currentId;
  const previewDef = getTheme(previewId);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {THEMES.map((def) => {
          const selected = def.id === previewId;
          const isCurrent = def.id === currentId;
          return (
            <button
              key={def.id}
              id={`theme-card-${def.id}`}
              type="button"
              onClick={() => handleSelect(def.id)}
              aria-pressed={selected}
              className={`relative text-left p-2 rounded-2xl border-2 transition-all active:scale-[0.97] cursor-pointer ${
                selected
                  ? isLight
                    ? 'border-[#b85d38] bg-[#fff7f0]'
                    : 'border-[#EC4899] bg-white/10'
                  : isLight
                    ? 'border-[#7d5a47]/15 bg-[#faebe0] hover:border-[#7d5a47]/30'
                    : 'border-white/10 bg-white/5 hover:border-white/20'
              }`}
            >
              <ThemePreviewMock def={def} />
              <div className="mt-2 px-0.5 space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <span className={`text-caption font-black uppercase tracking-wider truncate ${isLight ? 'text-[#3d2317]' : 'text-white'}`}>
                    {def.label}
                  </span>
                  {isCurrent && (
                    <span
                      className={`shrink-0 px-1.5 py-px rounded-full text-3xs font-extrabold uppercase tracking-wider border ${
                        isLight ? 'border-[#b85d38]/40 text-[#b85d38]' : 'border-[#EC4899]/40 text-[#EC4899]'
                      }`}
                    >
                      Actuel
                    </span>
                  )}
                </div>
                <p className={`text-2xs leading-snug line-clamp-2 ${isLight ? 'text-[#7d5a47]' : 'text-[#A7A7A7]'}`}>
                  {def.description}
                </p>
              </div>
              {selected && (
                <span
                  className={`absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center ${
                    isLight ? 'bg-[#b85d38] text-white' : 'bg-[#EC4899] text-white'
                  }`}
                >
                  <Check className="w-3 h-3 stroke-[3]" />
                </span>
              )}
            </button>
          );
        })}
      </div>

      {dirty && (
        <div
          className={`sticky bottom-4 z-20 flex items-center gap-2 p-3 rounded-2xl border shadow-2xl ${
            isLight ? 'bg-[#faebe0] border-[#7d5a47]/20' : 'bg-[#181818] border-white/10'
          }`}
        >
          <div className="flex-1 min-w-0 px-1">
            <p className={`text-3xs font-extrabold uppercase tracking-wider ${isLight ? 'text-[#7d5a47]' : 'text-[#A7A7A7]'}`}>
              Aperçu
            </p>
            <p className={`text-xs font-black uppercase truncate ${isLight ? 'text-[#3d2317]' : 'text-white'}`}>
              {previewDef.label}
            </p>
          </div>
          <button
            id="btn-theme-cancel"
            type="button"
            onClick={handleCancel}
            className={`px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1 active:scale-95 transition-all cursor-pointer border ${
              isLight ? 'bg-[#f0ded0] text-[#7d5a47] border-[#7d5a47]/20' : 'bg-[#202020] text-[#A7A7A7] border-white/10'
            }`}
          >
            <X className="w-3.5 h-3.5" />
            Annuler
          </button>
          <button
            id="btn-theme-apply"
            type="button"
            onClick={handleValidate}
            className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1 active:scale-95 transition-all cursor-pointer text-white bg-gradient-to-r ${
              isLight ? 'from-[#c05a3e] to-[#d97706]' : 'from-[#7C3AED] to-[#EC4899]'
            }`}
          >
            <Check className="w-3.5 h-3.5 stroke-[3]" />
            Valider
          </button>
        </div>
      )}
    </div>
  );
};
