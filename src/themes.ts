// Moteur de thèmes VOLT Athlete.
// - 'velours' (sombre) et 'creme' (clair) sont les thèmes historiques, stylés par src/index.css.
// - Les autres thèmes ("custom") reposent sur une base (dark | warm-light) qui choisit les classes
//   rendues par les composants, puis src/themes.css (généré par scripts/gen-theme-css.mjs) remappe
//   toutes les couleurs codées en dur vers les variables --t-* définies ci-dessous.
// Ce fichier est aussi importé par le script Node : il ne doit contenir que de la syntaxe TS
// effaçable (pas d'enum, pas d'import) et n'accéder au DOM / localStorage que dans des fonctions.

export type ThemeBase = 'dark' | 'warm-light';

export type ThemeId =
  | 'velours'
  | 'creme'
  | 'noir-oled'
  | 'neon'
  | 'foret'
  | 'ocean'
  | 'coucher-soleil'
  | 'clair-minimal';

interface ThemePreview {
  bg: string;
  card: string;
  text: string;
  accent1: string;
  accent2: string;
}

export interface ThemeDef {
  id: ThemeId;
  label: string;
  description: string;
  base: ThemeBase;
  preview: ThemePreview;
  /** Variables CSS --t-* (vide pour les thèmes historiques). */
  vars: Record<string, string>;
}

/**
 * Rôles disponibles (voir scripts/gen-theme-css.mjs) :
 * --t-app (fond appli), --t-card (cartes), --t-elev (cartes surélevées / boutons neutres),
 * --t-input (champs, cartes internes des modales claires), --t-text, --t-text2, --t-border,
 * --t-shade (base des voiles de modale), --t-accent1 (violet / cognac), --t-accent2 (rose / ambre),
 * --t-accent3 (cyan / bleu), --t-energy (orange-rouge), --t-warn (ambre), --t-success (vert),
 * --t-on-accent (texte sur bouton plein d'accent).
 */
export const THEMES: ThemeDef[] = [
  {
    id: 'velours',
    label: 'Velours cuir',
    description: 'Sombre chaleureux, cuir espresso et cognac.',
    base: 'dark',
    preview: { bg: '#161311', card: '#211b17', text: '#f7eee4', accent1: '#c05a3e', accent2: '#EC4899' },
    vars: {},
  },
  {
    id: 'creme',
    label: 'Crème',
    description: 'Clair chaud, beige crème et terracotta.',
    base: 'warm-light',
    preview: { bg: '#f3dfcb', card: '#faebe0', text: '#3d2317', accent1: '#b85d38', accent2: '#df9b58' },
    vars: {},
  },
  {
    id: 'noir-oled',
    label: 'Noir OLED',
    description: 'Noir pur, économe sur écran OLED.',
    base: 'dark',
    preview: { bg: '#000000', card: '#0B0B0B', text: '#FFFFFF', accent1: '#8B5CF6', accent2: '#EC4899' },
    vars: {
      '--t-app': '#000000',
      '--t-card': '#0B0B0B',
      '--t-elev': '#171717',
      '--t-input': '#111111',
      '--t-text': '#FFFFFF',
      '--t-text2': '#9A9A9A',
      '--t-border': 'rgba(255, 255, 255, 0.10)',
      '--t-shade': '#000000',
      '--t-accent1': '#8B5CF6',
      '--t-accent2': '#EC4899',
      '--t-accent3': '#22D3EE',
      '--t-energy': '#FF5A36',
      '--t-warn': '#F59E0B',
      '--t-success': '#10B981',
      '--t-on-accent': '#FFFFFF',
    },
  },
  {
    id: 'neon',
    label: 'Néon',
    description: 'Cyberpunk nocturne, violet électrique et cyan.',
    base: 'dark',
    preview: { bg: '#07040F', card: '#140B28', text: '#F3EEFF', accent1: '#B026FF', accent2: '#00F0FF' },
    vars: {
      '--t-app': '#07040F',
      '--t-card': '#140B28',
      '--t-elev': '#1E1238',
      '--t-input': '#180E30',
      '--t-text': '#F3EEFF',
      '--t-text2': '#A193CC',
      '--t-border': 'rgba(176, 140, 255, 0.18)',
      '--t-shade': '#030108',
      '--t-accent1': '#B026FF',
      '--t-accent2': '#FF2BD6',
      '--t-accent3': '#00F0FF',
      '--t-energy': '#FF3864',
      '--t-warn': '#FFD300',
      '--t-success': '#39FF88',
      '--t-on-accent': '#FFFFFF',
    },
  },
  {
    id: 'foret',
    label: 'Forêt',
    description: 'Verts profonds, mousse et sous-bois.',
    base: 'dark',
    preview: { bg: '#0B1410', card: '#13221B', text: '#E8F1EA', accent1: '#2F9E68', accent2: '#A3D65C' },
    vars: {
      '--t-app': '#0B1410',
      '--t-card': '#13221B',
      '--t-elev': '#1B2E24',
      '--t-input': '#16271F',
      '--t-text': '#E8F1EA',
      '--t-text2': '#93AA9B',
      '--t-border': 'rgba(160, 210, 175, 0.14)',
      '--t-shade': '#050A07',
      '--t-accent1': '#2F9E68',
      '--t-accent2': '#A3D65C',
      '--t-accent3': '#4FB3A9',
      '--t-energy': '#E07A3F',
      '--t-warn': '#D9B44A',
      '--t-success': '#5BD08A',
      '--t-on-accent': '#FFFFFF',
    },
  },
  {
    id: 'ocean',
    label: 'Océan',
    description: 'Bleus abyssaux et turquoise lagon.',
    base: 'dark',
    preview: { bg: '#06121F', card: '#0D1D30', text: '#E6F1FB', accent1: '#2563EB', accent2: '#06B6D4' },
    vars: {
      '--t-app': '#06121F',
      '--t-card': '#0D1D30',
      '--t-elev': '#142A42',
      '--t-input': '#102338',
      '--t-text': '#E6F1FB',
      '--t-text2': '#8BA6C1',
      '--t-border': 'rgba(140, 190, 240, 0.15)',
      '--t-shade': '#020A13',
      '--t-accent1': '#2563EB',
      '--t-accent2': '#06B6D4',
      '--t-accent3': '#38BDF8',
      '--t-energy': '#FF7A59',
      '--t-warn': '#FBBF24',
      '--t-success': '#2DD4BF',
      '--t-on-accent': '#FFFFFF',
    },
  },
  {
    id: 'coucher-soleil',
    label: 'Coucher de soleil',
    description: 'Orange, rose et violet chauds du crépuscule.',
    base: 'dark',
    preview: { bg: '#1A0E14', card: '#27141E', text: '#FFEDE4', accent1: '#FF6B35', accent2: '#FF5E7E' },
    vars: {
      '--t-app': '#1A0E14',
      '--t-card': '#27141E',
      '--t-elev': '#331C29',
      '--t-input': '#2C1823',
      '--t-text': '#FFEDE4',
      '--t-text2': '#C99C9C',
      '--t-border': 'rgba(255, 170, 150, 0.16)',
      '--t-shade': '#0E0609',
      '--t-accent1': '#9B4DDB',
      '--t-accent2': '#FF5E7E',
      '--t-accent3': '#FF9F43',
      '--t-energy': '#FF6B35',
      '--t-warn': '#FFC145',
      '--t-success': '#4ADE80',
      '--t-on-accent': '#FFFFFF',
    },
  },
  {
    id: 'clair-minimal',
    label: 'Clair minimal',
    description: 'Blanc et gris neutres, accent bleu net.',
    base: 'warm-light',
    preview: { bg: '#F4F4F5', card: '#FFFFFF', text: '#18181B', accent1: '#1D4ED8', accent2: '#3B82F6' },
    vars: {
      '--t-app': '#F4F4F5',
      '--t-card': '#FFFFFF',
      '--t-elev': '#ECECEF',
      '--t-input': '#FAFAFA',
      '--t-text': '#18181B',
      '--t-text2': '#5F5F68',
      '--t-border': 'rgba(24, 24, 27, 0.12)',
      '--t-shade': '#18181B',
      '--t-accent1': '#1D4ED8',
      '--t-accent2': '#3B82F6',
      '--t-accent3': '#0284C7',
      '--t-energy': '#EA580C',
      '--t-warn': '#B45309',
      '--t-success': '#059669',
      '--t-on-accent': '#FFFFFF',
    },
  },
];

const DEFAULT_THEME_ID: ThemeId = 'velours';
const THEME_ID_KEY = 'volt_theme_id';
const LEGACY_THEME_KEY = 'volt_theme';

const isThemeId = (id: unknown): id is ThemeId =>
  typeof id === 'string' && THEMES.some((t) => t.id === id);

/** Thème par id ; repli sur 'velours' si l'id est inconnu. */
export const getTheme = (id: string): ThemeDef =>
  THEMES.find((t) => t.id === id) ?? THEMES[0];

/** Base (dark | warm-light) d'un thème : c'est ce que reçoivent les composants via le prop `theme`. */
export const getThemeBase = (id: string): ThemeBase => getTheme(id).base;

/** Un thème est "custom" s'il n'est pas l'un des deux thèmes historiques. */
const isCustomTheme = (id: string): boolean => getTheme(id).id !== 'velours' && getTheme(id).id !== 'creme';

/** Lit 'volt_theme_id' ; sinon migre l'ancienne clé 'volt_theme' ('dark' | 'warm-light') ; défaut 'velours'. */
export const loadThemeId = (): ThemeId => {
  try {
    const saved = localStorage.getItem(THEME_ID_KEY);
    if (isThemeId(saved)) return saved;
    const legacy = localStorage.getItem(LEGACY_THEME_KEY);
    if (legacy === 'warm-light') return 'creme';
    if (legacy === 'dark') return 'velours';
  } catch {
    // ignore
  }
  return DEFAULT_THEME_ID;
};

/** Écrit 'volt_theme_id' et, pour compatibilité, 'volt_theme' = base du thème. */
export const saveThemeId = (id: string): void => {
  const theme = getTheme(id);
  try {
    localStorage.setItem(THEME_ID_KEY, theme.id);
    localStorage.setItem(LEGACY_THEME_KEY, theme.base);
  } catch {
    // ignore
  }
};

/** Pose les classes du thème sur <body> et met à jour <meta name="theme-color">. */
export const applyThemeToDocument = (id: string): void => {
  if (typeof document === 'undefined') return;
  const theme = getTheme(id);
  const body = document.body;
  if (body) {
    body.classList.remove('theme-warm-light', 'theme-velours-dark', 'theme-custom');
    THEMES.forEach((t) => body.classList.remove(`theme-${t.id}`));
    body.classList.add(theme.base === 'warm-light' ? 'theme-warm-light' : 'theme-velours-dark');
    if (isCustomTheme(theme.id)) body.classList.add('theme-custom', `theme-${theme.id}`);
  }
  let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = 'theme-color';
    document.head.appendChild(meta);
  }
  meta.content = theme.preview.bg;
};
