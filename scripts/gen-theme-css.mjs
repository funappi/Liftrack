// Génère src/themes.css : remappe les couleurs Tailwind codées en dur (bg-[#181818], text-white,
// border-white/10, from-[#7C3AED]...) vers les variables --t-* des thèmes "custom".
// Toutes les règles sont préfixées par body.theme-custom (ou body.theme-<id> pour les variables) :
// les thèmes historiques Velours / Crème ne sont jamais touchés.
//
// Usage : npm run gen:themes   (à relancer après ajout de nouvelles couleurs dans les composants)
// Nécessite Node >= 22.18 (import direct de src/themes.ts par effacement des types).

import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { THEMES } from '../src/themes.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'src');
const OUT = join(SRC, 'themes.css');
const P = 'body.theme-custom';
const PL = 'body.theme-custom.theme-warm-light';

// ---------------------------------------------------------------------------
// 1. Rôles des couleurs hex
// ---------------------------------------------------------------------------
const ROLE_HEX = {
  app: ['090909', '000000', '0A0A0A', '0B0B0B', '161311', '14110F', '120E0B', '1A1511', 'F3DFCB'],
  card: [
    '0D0D0D', '0E0E0E', '101010', '111111', '121212', '131313', '141414', '151515', '161616', '171717',
    '181818', '191919', '1A1A1A', '1B1B1B', '1C1C1C', '1D1D1D', '1E1E1E', '1F1F1F', '211B17', '222222',
    'FAEBE0', 'F5E3D4', 'F4DFCE',
  ],
  elev: [
    '202020', '242424', '252525', '262626', '282828', '2A2A2A', '2D251F', '29221D', '26201A',
    'F0DED0', 'F0DFD0', 'F5DFD0', 'FFF3EA', 'E5D2C1', 'E8D5C4',
  ],
  input: ['FFF7F0', 'FFFAF5'],
  text: ['FFFFFF', 'F7EEE4', '3D2317', 'E5E5E5'],
  text2: ['A7A7A7', 'AB9A8A', '7D5A47', '737373', '555555', '666666', '777777', 'D1D5DB', 'A3826E', '525252', '9E7A64'],
  border: ['3E342B'],
  accent1: ['7C3AED', '8E2DE2', '4A00E0', '6366F1', '4F46E5', 'C05A3E', 'B85D38', 'A04E2E', 'A84D33'],
  accent2: ['EC4899', 'DD2476', 'D63384', 'D97706', 'DF9B58', 'B45309', 'E0AB6E', 'D4A373'],
  accent3: ['00C6FF', '0088FF', '0070DD', '0072FF', '0055CC', '3B82F6', '38BDF8'],
  energy: ['FF512F', 'F97316', 'FF4D4D', 'FF6B4A', 'B8432B', 'F87171'],
  warn: ['F59E0B'],
  success: ['10B981', '556B2F', '2F7D4F', '34D399'],
};
// Fonds sombres légèrement teintés (cartes "compartiment") : carte + 10 % de l'accent correspondant
const TINT_HEX = {
  '1C1318': 'accent2', '221620': 'accent2',
  '101824': 'accent3', '131B26': 'accent3',
  '1C1810': 'warn', '161208': 'warn',
  '101420': 'accent1', '1C1824': 'accent1', '181520': 'accent1', '1C1422': 'accent1',
  '241416': 'energy',
  '132219': 'success', '1B231C': 'success', 'EEF8F2': 'success',
};

const HEX_ROLE = new Map();
for (const [role, list] of Object.entries(ROLE_HEX)) for (const h of list) HEX_ROLE.set(h, role);

const roleValue = (role) => `var(--t-${role})`;
const hexValue = (hex) => {
  if (TINT_HEX[hex]) return `color-mix(in oklab, var(--t-card) 90%, var(--t-${TINT_HEX[hex]}))`;
  const role = HEX_ROLE.get(hex);
  return role ? roleValue(role) : null;
};
const withAlpha = (value, pct) =>
  pct == null || pct >= 100 ? value : `color-mix(in oklab, ${value} ${pct}%, transparent)`;

// Fonds pour lesquels index.css force aussi color / border-color : on les remappe pareil
const BG_WITH_TEXT_AND_BORDER = new Set([
  '0A0A0A', '0B0B0B', '0D0D0D', '0E0E0E', '101010', '111111', '121212', '131313', '141414', '151515',
  '161208', '161616', '171717', '181818', '191919', '1A1A1A', '1B1B1B', '1C1C1C', '1D1D1D', '1E1E1E',
  '1F1F1F', '202020', '222222', '242424', '252525',
]);
const BG_WHITE_WITH_TEXT = new Set([5, 10, 15, 20]);
const ACCENT_ROLES = new Set(['accent1', 'accent2', 'accent3', 'energy', 'success']);

// ---------------------------------------------------------------------------
// 2. Scan des classes
// ---------------------------------------------------------------------------
const VARIANTS = ['hover', 'focus', 'focus-visible', 'focus-within', 'active', 'disabled', 'group-hover', 'placeholder', 'selection'];
const UTILS = ['bg', 'text', 'border', 'from', 'via', 'to', 'shadow', 'ring', 'fill', 'stroke', 'accent', 'outline', 'caret', 'decoration'];
const CLASS_RE = new RegExp(
  `(?<![\\w\\-\\[\\]:/#.])((?:(?:${VARIANTS.join('|')}):)*)(${UTILS.join('|')})-(\\[#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\\]|white|black)(?:\\/(\\d{1,3}|\\[0?\\.\\d+\\]))?(?![\\w\\-\\[\\]/#.])`,
  'g',
);

const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : /\.(tsx|ts)$/.test(name) ? [p] : [];
  });

const found = new Map(); // className -> parsed
for (const file of walk(SRC)) {
  if (file.endsWith('themes.ts')) continue;
  const code = readFileSync(file, 'utf8');
  for (const m of code.matchAll(CLASS_RE)) {
    const [cls, variantStr, util, colorTok, hexRaw, alphaRaw] = m;
    if (found.has(cls)) continue;
    let hex = null;
    if (hexRaw) hex = (hexRaw.length === 3 ? [...hexRaw].map((c) => c + c).join('') : hexRaw).toUpperCase();
    let alpha = null;
    if (alphaRaw) alpha = alphaRaw.startsWith('[') ? Math.round(parseFloat(alphaRaw.slice(1, -1)) * 1000) / 10 : Number(alphaRaw);
    found.set(cls, {
      cls,
      variants: variantStr ? variantStr.split(':').filter(Boolean) : [],
      util,
      color: hex ?? colorTok, // 'white' | 'black' | HEX
      alpha,
      file: relative(ROOT, file),
    });
  }
}

// ---------------------------------------------------------------------------
// 3. Valeur cible pour chaque classe
// ---------------------------------------------------------------------------
const unmapped = new Map();
const resolveColor = ({ util, color, alpha }) => {
  if (color === 'white') {
    if (util === 'text') return withAlpha(roleValue('text'), alpha);
    if (util === 'bg' || util === 'fill' || util === 'stroke') return alpha == null ? null : withAlpha(roleValue('text'), alpha);
    if (util === 'border') return alpha == null ? roleValue('text') : alpha <= 20 ? roleValue('border') : withAlpha(roleValue('text'), alpha);
    return withAlpha(roleValue('text'), alpha);
  }
  if (color === 'black') {
    if (util === 'text' || util === 'fill' || util === 'stroke') return null; // texte sur fond vif : on garde
    if (util === 'border') return roleValue('border');
    return alpha == null ? null : withAlpha(roleValue('shade'), alpha);
  }
  const v = hexValue(color);
  if (!v) return undefined;
  return withAlpha(v, alpha);
};

const esc = (s) => s.replace(/[^a-zA-Z0-9_-]/g, (c) => `\\${c}`);

const declsFor = (entry, value) => {
  const imp = ' !important';
  switch (entry.util) {
    case 'bg': {
      const d = [`background-color: ${value}${imp}`];
      if (!entry.variants.length) {
        if (entry.alpha == null && BG_WITH_TEXT_AND_BORDER.has(entry.color)) {
          d.push(`color: var(--t-text)${imp}`, `border-color: var(--t-border)${imp}`);
        }
        if (entry.color === 'white' && BG_WHITE_WITH_TEXT.has(entry.alpha)) d.push(`color: var(--t-text)${imp}`);
      }
      return d;
    }
    case 'text': return [`color: ${value}${imp}`];
    case 'border': return [`border-color: ${value}${imp}`];
    case 'from': return [
      `--tw-gradient-from: ${value}${imp}`,
      `--tw-gradient-stops: var(--tw-gradient-via-stops, var(--tw-gradient-position), var(--tw-gradient-from) var(--tw-gradient-from-position), var(--tw-gradient-to) var(--tw-gradient-to-position))${imp}`,
    ];
    case 'via': return [
      `--tw-gradient-via: ${value}${imp}`,
      `--tw-gradient-via-stops: var(--tw-gradient-position), var(--tw-gradient-from) var(--tw-gradient-from-position), var(--tw-gradient-via) var(--tw-gradient-via-position), var(--tw-gradient-to) var(--tw-gradient-to-position)${imp}`,
      `--tw-gradient-stops: var(--tw-gradient-via-stops)${imp}`,
    ];
    case 'to': return [
      `--tw-gradient-to: ${value}${imp}`,
      `--tw-gradient-stops: var(--tw-gradient-via-stops, var(--tw-gradient-position), var(--tw-gradient-from) var(--tw-gradient-from-position), var(--tw-gradient-to) var(--tw-gradient-to-position))${imp}`,
    ];
    case 'shadow': return [`--tw-shadow-color: ${value}${imp}`];
    case 'ring': return [`--tw-ring-color: ${value}${imp}`];
    case 'fill': return [`fill: ${value}${imp}`];
    case 'stroke': return [`stroke: ${value}${imp}`];
    case 'accent': return [`accent-color: ${value}${imp}`];
    case 'outline': return [`outline-color: ${value}${imp}`];
    case 'caret': return [`caret-color: ${value}${imp}`];
    case 'decoration': return [`text-decoration-color: ${value}${imp}`];
    default: return [];
  }
};

const selectorFor = ({ cls, variants }) => {
  const c = `.${esc(cls)}`;
  const v = new Set(variants);
  let pseudo = '';
  if (v.has('hover')) pseudo += ':hover';
  if (v.has('focus')) pseudo += ':focus';
  if (v.has('focus-visible')) pseudo += ':focus-visible';
  if (v.has('focus-within')) pseudo += ':focus-within';
  if (v.has('active')) pseudo += ':active';
  if (v.has('disabled')) pseudo += ':disabled';
  const group = v.has('group-hover') ? '.group:hover ' : '';
  if (v.has('placeholder')) return [`${P} ${group}${c}${pseudo}::placeholder`];
  if (v.has('selection')) return [`${P} ${group}${c}${pseudo} ::selection`, `${P} ${group}${c}${pseudo}::selection`];
  return [`${P} ${group}${c}${pseudo}`];
};

const needsHoverMedia = ({ variants }) => variants.includes('hover') || variants.includes('group-hover');

const GROUP_ORDER = { bg: 0, border: 1, from: 2, via: 3, to: 4, shadow: 5, ring: 5, fill: 5, stroke: 5, accent: 5, outline: 5, caret: 5, decoration: 5, text: 6 };
const entries = [...found.values()].sort(
  (a, b) => GROUP_ORDER[a.util] - GROUP_ORDER[b.util] || a.variants.length - b.variants.length || a.cls.localeCompare(b.cls),
);

const generated = [];
const onAccent = [];
for (const e of entries) {
  const value = resolveColor(e);
  if (value === undefined) {
    if (!unmapped.has(e.color)) unmapped.set(e.color, []);
    unmapped.get(e.color).push(e.cls);
    continue;
  }
  if (value === null) continue;
  const rule = `${selectorFor(e).join(',\n')} {\n  ${declsFor(e, value).join(';\n  ')};\n}`;
  generated.push(needsHoverMedia(e) ? `@media (hover: hover) {\n${rule}\n}` : rule);
  if ((e.util === 'bg' || e.util === 'from') && !e.variants.length && e.alpha == null && ACCENT_ROLES.has(HEX_ROLE.get(e.color))) {
    onAccent.push(`${P} .${esc(e.cls)}.text-white`);
  }
}

// ---------------------------------------------------------------------------
// 4. Règles écrites à la main (classes utilitaires d'index.css + règles Crème plus spécifiques)
// ---------------------------------------------------------------------------
const GRAD = 'linear-gradient(135deg, var(--t-accent1) 0%, var(--t-accent2) 100%)';
const base = `
${P},
${P} .theme-warm-light,
${P} .theme-velours-dark {
  --bg-app: var(--t-app);
  --bg-card: var(--t-card);
  --bg-card-hover: var(--t-elev);
  --bg-elevated: var(--t-elev);
  --bg-input: var(--t-input);
  --text-primary: var(--t-text);
  --text-secondary: var(--t-text2);
  --text-muted: var(--t-text2);
  --border-subtle: var(--t-border);
  --border-strong: color-mix(in oklab, var(--t-text) 22%, transparent);
  --accent-cognac: var(--t-accent1);
  --accent-amber: var(--t-accent2);
  --accent-gradient: ${GRAD};
  --modal-backdrop: color-mix(in oklab, var(--t-shade) 85%, transparent);
}

${P} {
  background-color: var(--t-app) !important;
  color: var(--t-text) !important;
}

${P} .gradient-main,
${P} .bg-gradient-to-r.from-\\[\\#7C3AED\\].to-\\[\\#EC4899\\] {
  background: ${GRAD} !important;
}
${P} .gradient-energy {
  background: linear-gradient(135deg, var(--t-energy) 0%, var(--t-accent2) 100%) !important;
}
${P} .gradient-performance {
  background: linear-gradient(135deg, var(--t-accent3) 0%, color-mix(in oklab, var(--t-accent3) 70%, #000) 100%) !important;
}
${P} .text-gradient-main,
${P} .text-gradient-energy,
${P} .text-gradient-performance {
  -webkit-background-clip: text !important;
  background-clip: text !important;
  -webkit-text-fill-color: transparent !important;
}
${P} .text-gradient-main { background-image: ${GRAD} !important; }
${P} .text-gradient-energy { background-image: linear-gradient(135deg, var(--t-energy) 0%, var(--t-accent2) 100%) !important; }
${P} .text-gradient-performance { background-image: linear-gradient(135deg, var(--t-accent3) 0%, color-mix(in oklab, var(--t-accent3) 70%, #000) 100%) !important; }
${P} .glow-main { box-shadow: 0 8px 32px -4px color-mix(in oklab, var(--t-accent1) 35%, transparent) !important; }
${P} .glow-energy { box-shadow: 0 8px 32px -4px color-mix(in oklab, var(--t-energy) 35%, transparent) !important; }
`;

const lightOverrides = `
/* Thèmes custom à base claire : surpasse les règles Crème plus spécifiques d'index.css */
${PL} [id^="modal-"],
${PL} #badge-detail-modal,
${PL} .fixed.inset-0 > div[class*="rounded-"],
${PL} .fixed.inset-0 > div[class*="max-w-"] {
  background-color: var(--t-card) !important;
  border-color: var(--t-border) !important;
  color: var(--t-text) !important;
  box-shadow: 0 25px 50px -12px color-mix(in oklab, var(--t-shade) 25%, transparent) !important;
}
${PL} .fixed.inset-0 .bg-\\[\\#121212\\],
${PL} .fixed.inset-0 .bg-\\[\\#141414\\],
${PL} .fixed.inset-0 .bg-\\[\\#161616\\],
${PL} .fixed.inset-0 .bg-\\[\\#181818\\],
${PL} .fixed.inset-0 .bg-\\[\\#1A1A1A\\],
${PL} .fixed.inset-0 .bg-\\[\\#0E0E0E\\],
${PL} .fixed.inset-0 .bg-\\[\\#0D0D0D\\] {
  background-color: var(--t-input) !important;
  border-color: var(--t-border) !important;
  color: var(--t-text) !important;
}
${PL} .fixed.inset-0 button:has(svg.lucide-x),
${PL} .fixed.inset-0 button[title*="Fermer"],
${PL} #btn-close-finished-workout,
${PL} #btn-close-detail {
  background-color: var(--t-app) !important;
  color: var(--t-text2) !important;
  border-color: var(--t-border) !important;
}
${PL} .fixed.inset-0 button:has(svg.lucide-x):hover,
${PL} .fixed.inset-0 button[title*="Fermer"]:hover,
${PL} #btn-close-finished-workout:hover,
${PL} #btn-close-detail:hover {
  background-color: var(--t-elev) !important;
  color: var(--t-text) !important;
}
${PL} .fixed.inset-0 button.bg-\\[\\#202020\\],
${PL} .bg-\\[\\#202020\\] {
  background-color: var(--t-elev) !important;
  color: var(--t-text2) !important;
  border-color: var(--t-border) !important;
}
${PL} .relative.h-2\\.5.bg-\\[\\#202020\\],
${PL} .w-full.h-2\\.5.bg-\\[\\#121212\\],
${PL} .bg-\\[\\#202020\\].rounded-full {
  background-color: color-mix(in oklab, var(--t-text) 12%, var(--t-card)) !important;
  border-color: var(--t-border) !important;
}
${PL} .bg-\\[\\#0D0D0D\\]\\/60,
${PL} .bg-\\[\\#121212\\]\\/95,
${PL} .bg-\\[\\#181818\\]\\/95,
${PL} .bg-neutral-900\\/40,
${PL} .bg-neutral-900\\/50,
${PL} .bg-neutral-900\\/30 {
  background-color: color-mix(in oklab, var(--t-text) 8%, transparent) !important;
}
${PL} svg text.fill-\\[\\#737373\\],
${PL} svg text.fill-\\[\\#525252\\] {
  fill: var(--t-text2) !important;
}
${PL} svg text.fill-\\[\\#E5E5E5\\] {
  fill: var(--t-text) !important;
}
${PL} .gradient-main,
${PL} .bg-gradient-to-r.from-\\[\\#7C3AED\\].to-\\[\\#EC4899\\] {
  background: ${GRAD} !important;
}
${PL} input,
${PL} textarea,
${PL} select {
  background-color: var(--t-input) !important;
  color: var(--t-text) !important;
  border-color: color-mix(in oklab, var(--t-text) 20%, transparent) !important;
}
${PL} input::placeholder,
${PL} textarea::placeholder {
  color: var(--t-text2) !important;
}
`;

const onAccentBlock = onAccent.length
  ? `/* Texte sur bouton plein d'accent : reste lisible quelle que soit la base */\n${onAccent.join(',\n')} {\n  color: var(--t-on-accent) !important;\n}\n`
  : '';

// ---------------------------------------------------------------------------
// 5. Variables par thème
// ---------------------------------------------------------------------------
const custom = THEMES.filter((t) => t.id !== 'velours' && t.id !== 'creme');
const REQUIRED = ['app', 'card', 'elev', 'input', 'text', 'text2', 'border', 'shade', 'accent1', 'accent2', 'accent3', 'energy', 'warn', 'success', 'on-accent'];
const errors = [];
const themeBlocks = custom.map((t) => {
  for (const r of REQUIRED) if (!t.vars[`--t-${r}`]) errors.push(`Thème ${t.id} : variable --t-${r} manquante`);
  const decls = Object.entries(t.vars).map(([k, v]) => `  ${k}: ${v};`).join('\n');
  return `body.theme-${t.id} {\n${decls}\n}`;
});

// ---------------------------------------------------------------------------
// 6. Écriture + vérifications
// ---------------------------------------------------------------------------
const css = `/* FICHIER GÉNÉRÉ par scripts/gen-theme-css.mjs — ne pas éditer à la main (npm run gen:themes). */
/* Actif uniquement quand <body> porte la classe theme-custom : Velours et Crème restent intacts. */

/* ===== Variables des thèmes ===== */
${themeBlocks.join('\n\n')}

/* ===== Base ===== */
${base.trim()}

/* ===== Classes de couleur des composants (${generated.length} règles) ===== */
${generated.join('\n\n')}

${onAccentBlock}
${lightOverrides.trim()}
`;

// Chaque sélecteur doit être scopé sur body.theme-custom (ou body.theme-<id custom> pour les variables)
const allowedVarSel = new Set(custom.map((t) => `body.theme-${t.id}`));
const stripped = css.replace(/\/\*[\s\S]*?\*\//g, '');
const selectorRe = /([^{}]+)\{/g;
let checked = 0;
for (const m of stripped.matchAll(selectorRe)) {
  const sel = m[1].trim();
  if (sel.startsWith('@media')) continue;
  for (const part of sel.split(/,(?![^(]*\))/).map((s) => s.trim()).filter(Boolean)) {
    checked++;
    if (!(part.startsWith(`${P} `) || part === P || part.startsWith(`${PL} `) || allowedVarSel.has(part))) {
      errors.push(`Sélecteur non scopé : ${part}`);
    }
  }
}

if (unmapped.size) {
  console.warn('Couleurs sans rôle (laissées telles quelles) :');
  for (const [hex, list] of unmapped) console.warn(`  #${hex}: ${list.join(' ')}`);
}
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
writeFileSync(OUT, css);
console.log(`themes.css : ${found.size} classes trouvées, ${generated.length} règles générées, ${checked} sélecteurs vérifiés (tous scopés sur ${P}).`);
