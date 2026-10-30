import { useEffect, useState } from 'react';
import { loadJSON, saveJSON } from './storage';

// User-defined order and width of the blocks of each main screen (Settings > Disposition)

export type LayoutTab = 'home' | 'workouts' | 'progress';
export type BlockWidth = 'wide' | 'left' | 'right';

export interface LayoutItem {
  id: string;
  width: BlockWidth;
}

/** Blocks of each screen, in their default order (all full width by default) */
export const LAYOUT_BLOCKS: Record<LayoutTab, { id: string; label: string }[]> = {
  home: [
    { id: 'quick-start', label: 'Séance en direct' },
    { id: 'stats', label: 'Statistiques' },
    { id: 'calories', label: 'Énergie dépensée' },
    { id: 'macros', label: 'Macros du jour' },
    { id: 'composition', label: 'Composition corporelle' },
    { id: 'goal', label: 'Prochain objectif' },
    { id: 'badges', label: 'Badges' },
    { id: 'workouts', label: 'Séances recommandées' },
  ],
  workouts: [
    { id: 'tracker', label: 'Suivi de la semaine' },
    { id: 'create', label: 'Créer ma séance' },
    { id: 'list', label: 'Mes séances' },
  ],
  progress: [
    { id: 'chart', label: 'Graphiques (1RM, poids, composition…)' },
    { id: 'composition', label: 'Composition & objectifs' },
    { id: 'records', label: 'Tes records' },
    { id: 'badges', label: 'Badges & succès' },
  ],
};

export const LAYOUT_TAB_LABELS: Record<LayoutTab, string> = {
  home: 'Accueil',
  workouts: 'Exercice',
  progress: 'Progression',
};

const KEY = 'volt_layout';
const EVENT = 'volt-layout-change';

const defaultLayout = (tab: LayoutTab): LayoutItem[] => LAYOUT_BLOCKS[tab].map((b) => ({ id: b.id, width: 'wide' }));

/** Saved layout merged with the registry: unknown blocks dropped, new blocks appended */
export const loadLayout = (tab: LayoutTab): LayoutItem[] => {
  const saved = loadJSON<Partial<Record<LayoutTab, LayoutItem[]>>>(KEY, {})[tab];
  if (!Array.isArray(saved)) return defaultLayout(tab);
  const known = new Set(LAYOUT_BLOCKS[tab].map((b) => b.id));
  const valid = saved.filter(
    (item, i, arr) =>
      item && known.has(item.id) && ['wide', 'left', 'right'].includes(item.width) && arr.findIndex((x) => x.id === item.id) === i
  );
  const missing = LAYOUT_BLOCKS[tab].filter((b) => !valid.some((v) => v.id === b.id)).map((b) => ({ id: b.id, width: 'wide' as const }));
  return [...valid, ...missing];
};

export const saveLayout = (tab: LayoutTab, items: LayoutItem[]) => {
  const all = loadJSON<Partial<Record<LayoutTab, LayoutItem[]>>>(KEY, {});
  saveJSON(KEY, { ...all, [tab]: items });
  window.dispatchEvent(new Event(EVENT));
};

export const resetLayout = (tab: LayoutTab) => saveLayout(tab, defaultLayout(tab));

/** Current layout of a screen, refreshed as soon as it is changed in Settings */
export const useBlockLayout = (tab: LayoutTab): LayoutItem[] => {
  const [items, setItems] = useState(() => loadLayout(tab));
  useEffect(() => {
    const refresh = () => setItems(loadLayout(tab));
    window.addEventListener(EVENT, refresh);
    return () => window.removeEventListener(EVENT, refresh);
  }, [tab]);
  return items;
};
