import React, { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, RotateCcw } from 'lucide-react';
import {
  BlockWidth,
  LAYOUT_BLOCKS,
  LAYOUT_TAB_LABELS,
  LayoutItem,
  LayoutTab,
  loadLayout,
  resetLayout,
  saveLayout,
} from '../../utils/layout';

interface LayoutSectionProps {
  theme: 'dark' | 'warm-light';
}

const WIDTHS: { id: BlockWidth; label: string }[] = [
  { id: 'left', label: 'Gauche' },
  { id: 'wide', label: 'Large' },
  { id: 'right', label: 'Droite' },
];

// Settings > Disposition: order and width of the blocks of each screen (applied immediately)
export const LayoutSection: React.FC<LayoutSectionProps> = ({ theme }) => {
  const isLight = theme === 'warm-light';
  const [tab, setTab] = useState<LayoutTab>('home');
  const [items, setItems] = useState<LayoutItem[]>(() => loadLayout('home'));

  useEffect(() => setItems(loadLayout(tab)), [tab]);

  const update = (next: LayoutItem[]) => {
    setItems(next);
    saveLayout(tab, next);
  };

  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    update(next);
  };

  const setWidth = (id: string, width: BlockWidth) => update(items.map((it) => (it.id === id ? { ...it, width } : it)));

  const labelOf = (id: string) => LAYOUT_BLOCKS[tab].find((b) => b.id === id)?.label ?? id;

  const card = `rounded-card border p-4 space-y-4 ${isLight ? 'bg-[#fff7f0] border-[#7d5a47]/20' : 'bg-[#181818] border-white/[0.08]'}`;
  const muted = isLight ? 'text-[#7d5a47]' : 'text-[#A7A7A7]';
  const strong = isLight ? 'text-[#3d2317]' : 'text-white';
  const chip = (active: boolean) =>
    `flex-1 py-1.5 rounded-chip text-2xs font-black uppercase tracking-wide transition-all cursor-pointer ${
      active
        ? 'bg-gradient-to-r from-[#7C3AED] to-[#EC4899] text-white shadow-md'
        : isLight
        ? 'bg-[#faebe0] text-[#7d5a47] border border-[#7d5a47]/20'
        : 'bg-[#121212] text-[#A7A7A7] border border-white/[0.08]'
    }`;

  return (
    <div className="space-y-4">
      <div className={card}>
        <div>
          <h2 className={`text-base font-black uppercase tracking-tight ${strong}`}>Disposition des écrans</h2>
          <p className={`text-xs mt-1 ${muted}`}>
            Monte ou descends tes blocs préférés, et choisis leur place : à gauche, à droite (demi-largeur) ou en large.
          </p>
        </div>

        <div className="flex gap-2">
          {(Object.keys(LAYOUT_TAB_LABELS) as LayoutTab[]).map((t) => (
            <button key={t} type="button" onClick={() => setTab(t)} className={chip(tab === t)}>
              {LAYOUT_TAB_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      <ol className="space-y-3">
        {items.map((item, i) => (
          <li key={item.id} className={card}>
            <div className="flex items-center gap-3">
              <span className="w-6 h-6 rounded-chip bg-black/60 border border-white/10 flex items-center justify-center text-xs font-black text-[#EC4899] shrink-0 num">
                {i + 1}
              </span>
              <span className={`flex-1 min-w-0 text-sm font-black truncate ${strong}`}>{labelOf(item.id)}</span>
              <button
                type="button"
                onClick={() => move(i, -1)}
                disabled={i === 0}
                aria-label="Monter"
                className={`w-control-sm h-control-sm rounded-full flex items-center justify-center border disabled:opacity-30 cursor-pointer ${
                  isLight ? 'border-[#7d5a47]/20 text-[#3d2317]' : 'border-white/10 text-white hover:bg-white/10'
                }`}
              >
                <ArrowUp className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => move(i, 1)}
                disabled={i === items.length - 1}
                aria-label="Descendre"
                className={`w-control-sm h-control-sm rounded-full flex items-center justify-center border disabled:opacity-30 cursor-pointer ${
                  isLight ? 'border-[#7d5a47]/20 text-[#3d2317]' : 'border-white/10 text-white hover:bg-white/10'
                }`}
              >
                <ArrowDown className="w-4 h-4" />
              </button>
            </div>
            <div className="flex gap-2">
              {WIDTHS.map((w) => (
                <button key={w.id} type="button" onClick={() => setWidth(item.id, w.id)} className={chip(item.width === w.id)}>
                  {w.label}
                </button>
              ))}
            </div>
          </li>
        ))}
      </ol>

      <button
        type="button"
        onClick={() => {
          resetLayout(tab);
          setItems(loadLayout(tab));
        }}
        className={`w-full py-2.5 rounded-control border text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer ${
          isLight ? 'border-[#7d5a47]/20 text-[#7d5a47]' : 'border-white/10 text-[#A7A7A7] hover:text-white'
        }`}
      >
        <RotateCcw className="w-3.5 h-3.5" />
        Disposition par défaut ({LAYOUT_TAB_LABELS[tab]})
      </button>
    </div>
  );
};
