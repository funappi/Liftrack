import { UserStats } from '../types';
import { ISODate, VoltData, parseISODate, toISODate } from '../data/model';
import { sortedHistory, weekDates, weightSeries } from '../data/selectors';
import { GoalProgress, computeGoalProgress } from './goalProgress';
import { loadJSON, saveJSON } from './storage';

// Home screen mascot: reads the real stats (day, week, month) and builds a sentence from
// several interchangeable pieces (greeting + message + sign-off), each with many variants,
// so the same sentence rarely comes back twice.

export type MascotId = 'coq' | 'chat' | 'singe';
export type CoachPeriod = 'day' | 'week' | 'month';
export type CoachMood = 'proud' | 'push' | 'soft';

export const MASCOTS: Record<MascotId, { name: string; animal: string; image: string }> = {
  coq: { name: 'Coco', animal: 'le coq', image: 'img/mascots/coq.webp' },
  chat: { name: 'Mina', animal: 'le chat', image: 'img/mascots/chat.webp' },
  singe: { name: 'Kiki', animal: 'le singe', image: 'img/mascots/singe.webp' },
};

export const MASCOT_ORDER: MascotId[] = ['coq', 'chat', 'singe'];

const MASCOT_KEY = 'volt_mascot';
const RECENT_KEY = 'volt_mascot_recent';

export const loadMascot = (): MascotId => {
  const saved = loadJSON<string>(MASCOT_KEY, 'coq');
  return (MASCOT_ORDER as string[]).includes(saved) ? (saved as MascotId) : 'coq';
};
export const saveMascot = (id: MascotId) => saveJSON(MASCOT_KEY, id);

// --- Facts ---

interface PRHit {
  exercise: string;
  kg: number;
  gainKg: number;
  date: ISODate;
}

export interface CoachFacts {
  name: string;
  hour: number;
  /** 0 = Monday … 6 = Sunday */
  weekday: number;
  today: { sessions: number; volumeKg: number; kcal: number; durationMin: number; title: string | null };
  trainedYesterday: boolean;
  /** Days since the latest session (0 = today), null when nothing was ever logged */
  daysSinceLast: number | null;
  /** Consecutive days with a session, ending today or yesterday */
  dayStreak: number;
  /** Consecutive weeks with at least one session (current week counted if already trained) */
  weekStreak: number;
  week: { sessions: number; goal: number; volumeKg: number; prevVolumeKg: number; volumeTargetKg: number; kcal: number; daysLeft: number };
  month: { sessions: number; prevSamePoint: number; kcal: number; day: number; daysInMonth: number; label: string };
  prs: { today: PRHit[]; week: PRHit[]; month: PRHit[] };
  weight: { monthDelta: number | null; goal: GoalProgress | null };
  totalSessions: number;
  hasAnySession: boolean;
}

const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const dayDiff = (a: ISODate, b: ISODate) => Math.round((parseISODate(b).getTime() - parseISODate(a).getTime()) / 86400000);

export const computeCoachFacts = (data: VoltData, userStats: UserStats, ref: Date = new Date()): CoachFacts => {
  const today = toISODate(ref);
  const yesterday = toISODate(addDays(ref, -1));
  const sessions = data.sessions;
  const dates = new Set(sessions.map((s) => s.date));

  const todays = sessions.filter((s) => s.date === today);
  const latest = sessions.reduce<ISODate | null>((max, s) => (max === null || s.date > max ? s.date : max), null);

  let dayStreak = 0;
  for (let d = dates.has(today) ? ref : addDays(ref, -1); dates.has(toISODate(d)); d = addDays(d, -1)) dayStreak++;

  const week = weekDates(ref);
  const prevWeek = weekDates(addDays(ref, -7));
  const inWeek = (w: ISODate[]) => sessions.filter((s) => s.date >= w[0] && s.date <= w[6]);
  const thisWeek = inWeek(week);

  let weekStreak = 0;
  for (let i = thisWeek.length ? 0 : 1; i < 520; i++) {
    const w = weekDates(addDays(ref, -7 * i));
    if (!sessions.some((s) => s.date >= w[0] && s.date <= w[6])) break;
    weekStreak++;
  }

  const monthPrefix = today.slice(0, 7);
  const prevMonthRef = new Date(ref.getFullYear(), ref.getMonth() - 1, 1);
  const prevPrefix = toISODate(prevMonthRef).slice(0, 7);
  const day = ref.getDate();
  const thisMonth = sessions.filter((s) => s.date.startsWith(monthPrefix));
  const prevSamePoint = sessions.filter((s) => s.date.startsWith(prevPrefix) && parseISODate(s.date).getDate() <= day).length;

  // Records: an entry beats every earlier entry of the same exercise
  const hits: PRHit[] = [];
  for (const ex of data.exercises) {
    let best: number | null = null;
    for (const h of sortedHistory(ex)) {
      if (best !== null && h.weightKg > best) hits.push({ exercise: ex.name, kg: h.weightKg, gainKg: Math.round((h.weightKg - best) * 10) / 10, date: h.date });
      best = best === null ? h.weightKg : Math.max(best, h.weightKg);
    }
  }

  const weights = weightSeries(data);
  let monthDelta: number | null = null;
  const last = weights[weights.length - 1];
  if (last && last.date.startsWith(monthPrefix)) {
    const before = [...weights].reverse().find((w) => w.date < `${monthPrefix}-01`) ?? weights.find((w) => w.date.startsWith(monthPrefix));
    if (before && before !== last) monthDelta = Math.round((last.weightKg - before.weightKg) * 10) / 10;
  }
  const current = userStats.currentWeightKg;
  const target = userStats.targetWeightKg;
  const goal =
    current > 0 && target > 0 ? computeGoalProgress(userStats.nextGoal.startValue ?? weights[0]?.weightKg ?? current, current, target) : null;

  const sum = <K extends 'volumeKg' | 'kcal' | 'durationSec'>(list: typeof sessions, k: K) => list.reduce((t, s) => t + (s[k] || 0), 0);

  return {
    name: (userStats.name || '').trim().split(' ')[0] || 'champion',
    hour: ref.getHours(),
    weekday: (ref.getDay() + 6) % 7,
    today: {
      sessions: todays.length,
      volumeKg: sum(todays, 'volumeKg'),
      kcal: sum(todays, 'kcal'),
      durationMin: Math.round(sum(todays, 'durationSec') / 60),
      title: todays.find((s) => s.title)?.title ?? null,
    },
    trainedYesterday: dates.has(yesterday),
    daysSinceLast: latest ? dayDiff(latest, today) : null,
    dayStreak,
    weekStreak,
    week: {
      sessions: new Set(thisWeek.map((s) => s.date)).size,
      goal: Math.max(1, userStats.weeklyGoalWorkouts || 3),
      volumeKg: sum(thisWeek, 'volumeKg'),
      prevVolumeKg: sum(inWeek(prevWeek), 'volumeKg'),
      volumeTargetKg: userStats.weeklyVolumeTargetKg || 0,
      kcal: sum(thisWeek, 'kcal'),
      daysLeft: 6 - ((ref.getDay() + 6) % 7),
    },
    month: {
      sessions: thisMonth.length,
      prevSamePoint,
      kcal: sum(thisMonth, 'kcal'),
      day,
      daysInMonth: new Date(ref.getFullYear(), ref.getMonth() + 1, 0).getDate(),
      label: ref.toLocaleDateString('fr-FR', { month: 'long' }),
    },
    prs: {
      today: hits.filter((h) => h.date === today),
      week: hits.filter((h) => h.date >= week[0] && h.date <= week[6]),
      month: hits.filter((h) => h.date.startsWith(monthPrefix)),
    },
    weight: { monthDelta, goal },
    totalSessions: data.baseline.sessions + sessions.length,
    hasAnySession: sessions.length > 0,
  };
};

// --- Formatting helpers ---

const num = (v: number, digits = 0) => v.toLocaleString('fr-FR', { maximumFractionDigits: digits });
const plural = (n: number, word: string, many = `${word}s`) => `${num(n)} ${n > 1 ? many : word}`;
const load = (kg: number) => (kg >= 1000 ? `${num(kg / 1000, 1)} tonne${kg >= 2000 ? 's' : ''}` : `${num(Math.round(kg))} kg`);
const pct = (a: number, b: number) => Math.round(((a - b) / b) * 100);
const weekdayNames = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
const pick = <T,>(list: T[], rnd: () => number): T => list[Math.floor(rnd() * list.length)];

// Fun equivalents so volumes feel concrete
const volumeImage = (kg: number): string | null => {
  if (kg >= 12000) return `l'équivalent d'un bus à impériale`;
  if (kg >= 5000) return `le poids d'un éléphant d'Afrique`;
  if (kg >= 3000) return `à peu près deux voitures citadines`;
  if (kg >= 1500) return `le poids d'une berline`;
  if (kg >= 600) return `le poids d'un piano à queue`;
  if (kg >= 250) return `le poids d'un ours brun`;
  return null;
};

// --- Message bank ---

type Line = (f: CoachFacts, rnd: () => number) => string | null;

interface Template {
  id: string;
  period: CoachPeriod;
  mood: CoachMood;
  /** Higher = more likely when its condition matches */
  weight: number;
  when: (f: CoachFacts) => boolean;
  lines: Line[];
}

const T: Template[] = [
  // ======== DAY ========
  {
    id: 'day-done', period: 'day', mood: 'proud', weight: 5,
    when: (f) => f.today.sessions > 0,
    lines: [
      (f) => `Séance validée aujourd'hui${f.today.title ? ` (${f.today.title})` : ''}. C'est exactement ce genre de journée qui fait la différence.`,
      (f) => (f.today.volumeKg > 0 ? `Tu as soulevé ${load(f.today.volumeKg)} aujourd'hui. Tes muscles s'en souviendront demain, et toi aussi.` : null),
      (f) => (f.today.kcal > 0 ? `${num(f.today.kcal)} kcal brûlées aujourd'hui. Le canapé peut attendre, il a l'habitude.` : null),
      (f) => (f.today.durationMin >= 10 ? `${plural(f.today.durationMin, 'minute')} d'effort aujourd'hui. Pas une de perdue.` : null),
      (f) => { const img = volumeImage(f.today.volumeKg); return img ? `Aujourd'hui tu as déplacé ${load(f.today.volumeKg)}, soit ${img}. Rien que ça.` : null; },
      () => `Le plus dur, c'était de commencer. C'est fait, et bien fait.`,
      (f) => (f.today.volumeKg > 0 && f.today.kcal > 0 ? `${load(f.today.volumeKg)} de volume et ${num(f.today.kcal)} kcal : la journée est rentabilisée.` : null),
      () => `Tu es venu, tu as bossé, tu as gagné ta journée. Maintenant : eau, protéines et sommeil.`,
    ],
  },
  {
    id: 'day-double', period: 'day', mood: 'proud', weight: 8,
    when: (f) => f.today.sessions >= 2,
    lines: [
      (f) => `${plural(f.today.sessions, 'séance')} dans la même journée ? Respect total. Pense à bien récupérer ce soir.`,
      () => `Double séance aujourd'hui. Ton corps mérite un bon repas et une vraie nuit.`,
    ],
  },
  {
    id: 'day-pr', period: 'day', mood: 'proud', weight: 12,
    when: (f) => f.prs.today.length > 0,
    lines: [
      (f) => { const p = f.prs.today[0]; return `Nouveau record sur ${p.exercise} : ${num(p.kg, 1)} kg (+${num(p.gainKg, 1)} kg) ! Ce jour-là, on va s'en souvenir.`; },
      (f) => { const p = f.prs.today[0]; return `${num(p.kg, 1)} kg sur ${p.exercise}, jamais fait mieux. Note bien la date.`; },
      (f) => (f.prs.today.length > 1 ? `${plural(f.prs.today.length, 'record')} battus aujourd'hui. Tu es en feu.` : null),
    ],
  },
  {
    id: 'day-rest-after', period: 'day', mood: 'soft', weight: 4,
    when: (f) => f.today.sessions === 0 && f.trainedYesterday,
    lines: [
      () => `Tu t'es entraîné hier : aujourd'hui, repos ou séance légère, les deux se défendent. Les muscles grandissent pendant la récup.`,
      () => `Après la séance d'hier, une marche ou des étirements, c'est déjà du sport. Écoute tes sensations.`,
      (f) => (f.dayStreak >= 2 ? `${plural(f.dayStreak, 'jour')} d'affilée jusqu'à hier. Tu enchaînes encore ou tu t'accordes une pause ? Les deux sont malins.` : null),
      () => `Les courbatures d'hier, c'est la preuve que ça travaille. Hydrate-toi bien aujourd'hui.`,
    ],
  },
  {
    id: 'day-nudge', period: 'day', mood: 'push', weight: 5,
    when: (f) => f.today.sessions === 0 && f.daysSinceLast !== null && f.daysSinceLast >= 2 && f.daysSinceLast <= 4,
    lines: [
      (f) => `Ta dernière séance date d'il y a ${plural(f.daysSinceLast!, 'jour')}. Et si c'était aujourd'hui, la prochaine ?`,
      (f) => `${plural(f.daysSinceLast!, 'jour')} sans entraînement. Même 20 minutes suffisent à garder le rythme.`,
      () => `Pas besoin d'une séance parfaite aujourd'hui, juste d'une séance. Le reste suivra.`,
      () => `Ton futur toi te remerciera pour la séance d'aujourd'hui. Promis.`,
    ],
  },
  {
    id: 'day-comeback', period: 'day', mood: 'soft', weight: 6,
    when: (f) => f.today.sessions === 0 && f.daysSinceLast !== null && f.daysSinceLast > 4,
    lines: [
      (f) => `Ça fait ${plural(f.daysSinceLast!, 'jour')} qu'on ne s'est pas vus à la salle. Aucun jugement : on reprend doucement aujourd'hui ?`,
      () => `Une pause, ça arrive à tout le monde. Le plus important, c'est la séance de reprise, pas celle qu'on a ratée.`,
      () => `Reprendre, c'est le vrai super-pouvoir. Une petite séance tranquille pour relancer la machine ?`,
    ],
  },
  {
    id: 'day-first', period: 'day', mood: 'push', weight: 10,
    when: (f) => !f.hasAnySession,
    lines: [
      () => `Aucune séance enregistrée pour l'instant. La première, c'est celle qui compte le plus : on se lance ?`,
      () => `Je suis prêt, l'app est prête… il ne manque plus que toi pour la toute première séance !`,
    ],
  },
  {
    id: 'day-morning', period: 'day', mood: 'push', weight: 2,
    when: (f) => f.today.sessions === 0 && f.hour >= 5 && f.hour < 11,
    lines: [
      () => `Une séance le matin, et la journée commence avec une victoire. Ça te tente ?`,
      (f) => `On est ${weekdayNames[f.weekday]} matin : le moment parfait pour cocher une séance avant que la journée t'avale.`,
    ],
  },
  {
    id: 'day-evening', period: 'day', mood: 'push', weight: 2,
    when: (f) => f.today.sessions === 0 && f.hour >= 17 && f.hour < 22,
    lines: [
      () => `La journée n'est pas finie : une séance ce soir, et tu iras te coucher fier de toi.`,
      () => `Soirée libre ? Une petite séance pour évacuer la journée, c'est le meilleur antistress.`,
    ],
  },
  {
    id: 'day-night', period: 'day', mood: 'soft', weight: 3,
    when: (f) => f.today.sessions === 0 && (f.hour >= 22 || f.hour < 5),
    lines: [
      () => `Il est tard : le meilleur entraînement maintenant, c'est une bonne nuit. On remet ça demain.`,
      () => `Le sommeil, c'est là que les progrès se construisent. File dormir, champion.`,
    ],
  },
  {
    id: 'day-streak', period: 'day', mood: 'proud', weight: 7,
    when: (f) => f.dayStreak >= 3,
    lines: [
      (f) => `${plural(f.dayStreak, 'jour')} d'affilée avec une séance. Cette régularité, c'est rare.`,
      (f) => `Série en cours : ${plural(f.dayStreak, 'jour')}. Garde quand même un jour de repos dans la semaine.`,
    ],
  },
  {
    id: 'day-weekend', period: 'day', mood: 'push', weight: 2,
    when: (f) => f.today.sessions === 0 && f.weekday >= 5,
    lines: [
      () => `Le week-end, la salle est plus calme : idéal pour une séance sans attendre les machines.`,
      (f) => (f.week.sessions < f.week.goal ? `C'est le week-end et il te manque ${plural(f.week.goal - f.week.sessions, 'séance')} pour l'objectif de la semaine. Jouable !` : null),
    ],
  },
  {
    id: 'day-fallback', period: 'day', mood: 'push', weight: 1,
    when: () => true,
    lines: [
      () => `Chaque séance compte, même les petites. Surtout les petites, en fait.`,
      () => `La motivation va et vient, l'habitude reste. Construis l'habitude.`,
      () => `Une séance de faite, c'est toujours mieux qu'une séance parfaite jamais faite.`,
      (f) => `${f.totalSessions > 0 ? `${plural(f.totalSessions, 'séance')} au compteur. ` : ''}La prochaine sera la meilleure ?`,
    ],
  },

  // ======== WEEK ========
  {
    id: 'week-goal-hit', period: 'week', mood: 'proud', weight: 10,
    when: (f) => f.week.sessions >= f.week.goal,
    lines: [
      (f) => `Objectif de la semaine atteint : ${f.week.sessions}/${f.week.goal} séances. Tout ce qui vient en plus, c'est du bonus.`,
      (f) => (f.week.sessions > f.week.goal ? `${f.week.sessions} séances pour un objectif de ${f.week.goal}. Tu dépasses le contrat, bravo.` : null),
      (f) => (f.week.daysLeft > 0 ? `Contrat rempli avec ${plural(f.week.daysLeft, 'jour')} d'avance. Tu peux savourer.` : null),
    ],
  },
  {
    id: 'week-one-left', period: 'week', mood: 'push', weight: 9,
    when: (f) => f.week.goal - f.week.sessions === 1,
    lines: [
      (f) => `Plus qu'une séance pour boucler ta semaine (${f.week.sessions}/${f.week.goal}). Tu la places quand ?`,
      (f) => `${f.week.sessions} séances sur ${f.week.goal}, il en reste une seule. ${f.week.daysLeft > 0 ? `Il te reste ${plural(f.week.daysLeft + 1, 'jour')}, large.` : `C'est aujourd'hui ou jamais !`}`,
    ],
  },
  {
    id: 'week-progress', period: 'week', mood: 'push', weight: 5,
    when: (f) => f.week.sessions > 0 && f.week.goal - f.week.sessions >= 2,
    lines: [
      (f) => `${f.week.sessions}/${f.week.goal} séances cette semaine. Bon départ, on continue sur cette lancée.`,
      (f) => `Il reste ${plural(f.week.goal - f.week.sessions, 'séance')} pour ton objectif, et ${plural(f.week.daysLeft + 1, 'jour')} pour les caser.`,
    ],
  },
  {
    id: 'week-empty-early', period: 'week', mood: 'push', weight: 6,
    when: (f) => f.week.sessions === 0 && f.weekday <= 2,
    lines: [
      () => `Nouvelle semaine, compteur à zéro. La première séance donne le ton pour la suite.`,
      (f) => `On est ${weekdayNames[f.weekday]}, la semaine est encore toute neuve. Objectif : ${plural(f.week.goal, 'séance')}.`,
    ],
  },
  {
    id: 'week-empty-late', period: 'week', mood: 'soft', weight: 6,
    when: (f) => f.week.sessions === 0 && f.weekday > 2,
    lines: [
      () => `Pas encore de séance cette semaine, mais rien n'est perdu. Une seule séance change déjà le bilan.`,
      (f) => `Semaine chargée ? Il reste ${plural(f.week.daysLeft + 1, 'jour')} : même une séance courte compte.`,
    ],
  },
  {
    id: 'week-volume-up', period: 'week', mood: 'proud', weight: 8,
    when: (f) => f.week.prevVolumeKg > 0 && f.week.volumeKg > f.week.prevVolumeKg,
    lines: [
      (f) => `Volume en hausse de ${pct(f.week.volumeKg, f.week.prevVolumeKg)} % par rapport à la semaine dernière (${load(f.week.volumeKg)}). Ça progresse.`,
      (f) => `${load(f.week.volumeKg)} cette semaine contre ${load(f.week.prevVolumeKg)} la précédente. La surcharge progressive, c'est toi.`,
    ],
  },
  {
    id: 'week-volume-chase', period: 'week', mood: 'push', weight: 5,
    when: (f) => f.week.prevVolumeKg > 0 && f.week.volumeKg < f.week.prevVolumeKg && f.week.volumeKg > 0,
    lines: [
      (f) => `Encore ${load(f.week.prevVolumeKg - f.week.volumeKg)} pour égaler le volume de la semaine dernière. Ça se rattrape en une séance.`,
      (f) => `Tu es à ${Math.round((f.week.volumeKg / f.week.prevVolumeKg) * 100)} % du volume de la semaine dernière. On va le chercher ?`,
    ],
  },
  {
    id: 'week-volume-target', period: 'week', mood: 'push', weight: 6,
    when: (f) => f.week.volumeTargetKg > 0 && f.week.volumeKg > 0,
    lines: [
      (f) => (f.week.volumeKg >= f.week.volumeTargetKg
        ? `Objectif de volume atteint : ${load(f.week.volumeKg)} sur ${load(f.week.volumeTargetKg)}. Machine.`
        : `${Math.round((f.week.volumeKg / f.week.volumeTargetKg) * 100)} % de ton objectif de volume (${load(f.week.volumeTargetKg)}). Il manque ${load(f.week.volumeTargetKg - f.week.volumeKg)}.`),
    ],
  },
  {
    id: 'week-pr', period: 'week', mood: 'proud', weight: 9,
    when: (f) => f.prs.week.length > 0,
    lines: [
      (f) => { const p = f.prs.week[f.prs.week.length - 1]; return f.prs.week.length > 1 ? `${f.prs.week.length} records cette semaine, dont ${p.exercise} à ${num(p.kg, 1)} kg. Superbe semaine.` : `Record de la semaine : ${p.exercise} à ${num(p.kg, 1)} kg. Superbe semaine.`; },
      (f) => `Cette semaine, ${f.prs.week[0].exercise} a pris +${num(f.prs.week[0].gainKg, 1)} kg. Ta force monte, et ça se voit.`,
    ],
  },
  {
    id: 'week-streak', period: 'week', mood: 'proud', weight: 6,
    when: (f) => f.weekStreak >= 3,
    lines: [
      (f) => `${plural(f.weekStreak, 'semaine')} d'affilée avec au moins une séance. La régularité, c'est ton point fort.`,
      (f) => `Ça fait ${plural(f.weekStreak, 'semaine')} que tu ne lâches rien. On ne casse pas une série pareille !`,
    ],
  },
  {
    id: 'week-kcal', period: 'week', mood: 'proud', weight: 3,
    when: (f) => f.week.kcal >= 300,
    lines: [
      (f) => `${num(f.week.kcal)} kcal brûlées cette semaine à l'entraînement. Joli moteur.`,
      (f) => `Déjà ${num(f.week.kcal)} kcal depuis lundi. Ton cardio te dit merci.`,
    ],
  },
  {
    id: 'week-fallback', period: 'week', mood: 'push', weight: 1,
    when: () => true,
    lines: [
      (f) => `Ton objectif : ${plural(f.week.goal, 'séance')} par semaine. Un pas après l'autre.`,
      () => `Une bonne semaine, ce n'est pas sept séances : c'est ton plan, tenu jusqu'au bout.`,
    ],
  },

  // ======== MONTH ========
  {
    id: 'month-ahead', period: 'month', mood: 'proud', weight: 8,
    when: (f) => f.month.sessions > f.month.prevSamePoint && f.month.prevSamePoint > 0,
    lines: [
      (f) => `${plural(f.month.sessions, 'séance')} en ${f.month.label}, contre ${f.month.prevSamePoint} à la même date le mois dernier. Tu es en avance.`,
      (f) => `+${f.month.sessions - f.month.prevSamePoint} séance${f.month.sessions - f.month.prevSamePoint > 1 ? 's' : ''} par rapport au mois dernier à la même date. La courbe monte.`,
    ],
  },
  {
    id: 'month-behind', period: 'month', mood: 'push', weight: 6,
    when: (f) => f.month.sessions < f.month.prevSamePoint,
    lines: [
      (f) => `Le mois dernier, à la même date, tu en étais à ${plural(f.month.prevSamePoint, 'séance')} (là : ${f.month.sessions}). Il reste ${plural(f.month.daysInMonth - f.month.day, 'jour')} pour repasser devant.`,
      (f) => `Petit retard sur le mois dernier : ${f.month.prevSamePoint - f.month.sessions} séance${f.month.prevSamePoint - f.month.sessions > 1 ? 's' : ''}. Rien d'insurmontable.`,
    ],
  },
  {
    id: 'month-count', period: 'month', mood: 'proud', weight: 4,
    when: (f) => f.month.sessions > 0,
    lines: [
      (f) => `${plural(f.month.sessions, 'séance')} depuis le début du mois de ${f.month.label}. Chacune compte.`,
      (f) => (f.month.kcal > 0 ? `${num(f.month.kcal)} kcal brûlées en ${f.month.label}. Ça commence à faire un sacré total.` : null),
    ],
  },
  {
    id: 'month-start', period: 'month', mood: 'push', weight: 5,
    when: (f) => f.month.day <= 3,
    lines: [
      (f) => `Début ${f.month.label === 'avril' || f.month.label === 'août' || f.month.label === 'octobre' ? "d'" : 'de '}${f.month.label} : page blanche. Quel bilan tu veux voir dans 30 jours ?`,
      () => `Nouveau mois, nouveaux records à aller chercher. On commence fort ?`,
    ],
  },
  {
    id: 'month-end', period: 'month', mood: 'push', weight: 5,
    when: (f) => f.month.daysInMonth - f.month.day <= 4,
    lines: [
      (f) => `Plus que ${plural(f.month.daysInMonth - f.month.day + 1, 'jour')} en ${f.month.label}. Un dernier sprint pour finir le mois en beauté ?`,
      (f) => `Fin de mois : ${plural(f.month.sessions, 'séance')} au compteur. Tu peux encore en ajouter avant le bilan.`,
    ],
  },
  {
    id: 'month-pr', period: 'month', mood: 'proud', weight: 8,
    when: (f) => f.prs.month.length > 0,
    lines: [
      (f) => `${plural(f.prs.month.length, 'record')} battu${f.prs.month.length > 1 ? 's' : ''} en ${f.month.label}. Ta progression est bien réelle.`,
      (f) => { const best = [...f.prs.month].sort((a, b) => b.gainKg - a.gainKg)[0]; return `Plus belle progression du mois : ${best.exercise}, +${num(best.gainKg, 1)} kg. Chapeau.`; },
    ],
  },
  {
    id: 'month-weight-good', period: 'month', mood: 'proud', weight: 9,
    when: (f) => f.weight.monthDelta !== null && f.weight.goal !== null && !f.weight.goal.reached &&
      ((f.weight.goal.isPertePoids && f.weight.monthDelta < 0) || (!f.weight.goal.isPertePoids && f.weight.monthDelta > 0)),
    lines: [
      (f) => `${f.weight.monthDelta! > 0 ? '+' : ''}${num(f.weight.monthDelta!, 1)} kg ce mois-ci, dans le bon sens. ${f.weight.goal!.isPertePoids ? 'La sèche avance.' : 'La prise de masse avance.'}`,
      (f) => `Ce mois-ci, la balance va dans ton sens : ${f.weight.monthDelta! > 0 ? '+' : ''}${num(f.weight.monthDelta!, 1)} kg. Plus que ${num(f.weight.goal!.remainingKg, 1)} kg.`,
    ],
  },
  {
    id: 'month-weight-off', period: 'month', mood: 'soft', weight: 6,
    when: (f) => f.weight.monthDelta !== null && f.weight.monthDelta !== 0 && f.weight.goal !== null && !f.weight.goal.reached &&
      ((f.weight.goal.isPertePoids && f.weight.monthDelta > 0) || (!f.weight.goal.isPertePoids && f.weight.monthDelta < 0)),
    lines: [
      (f) => `La balance a bougé de ${f.weight.monthDelta! > 0 ? '+' : ''}${num(f.weight.monthDelta!, 1)} kg ce mois-ci. Pas de panique : eau, sel et sommeil font varier le poids. Regarde la tendance.`,
      () => `Le poids fait le yoyo ce mois-ci ? C'est normal. La régularité finit toujours par payer.`,
    ],
  },
  {
    id: 'month-goal', period: 'month', mood: 'proud', weight: 5,
    when: (f) => f.weight.goal !== null && !f.weight.goal.reached && f.weight.goal.percent >= 25,
    lines: [
      (f) => `Ton objectif de poids est à ${f.weight.goal!.percent} %. ${f.weight.goal!.percent >= 75 ? 'La ligne d’arrivée est en vue !' : 'Le plus dur est derrière toi.'}`,
      (f) => `${num(f.weight.goal!.remainingKg, 1)} kg avant ${num(f.weight.goal!.target, 1)} kg. Tu as déjà fait ${f.weight.goal!.percent} % du chemin.`,
    ],
  },
  {
    id: 'month-goal-reached', period: 'month', mood: 'proud', weight: 10,
    when: (f) => f.weight.goal !== null && f.weight.goal.reached,
    lines: [
      (f) => `Objectif de poids atteint : ${num(f.weight.goal!.target, 1)} kg ! Prochaine étape : le garder, ou viser plus loin ?`,
    ],
  },
  {
    id: 'month-milestone', period: 'month', mood: 'proud', weight: 7,
    when: (f) => f.totalSessions >= 10 && f.totalSessions % 10 <= 1,
    lines: [
      (f) => `${plural(f.totalSessions, 'séance')} au total. Il y a quelques mois, ce chiffre aurait paru énorme, non ?`,
      (f) => `Cap des ${Math.floor(f.totalSessions / 10) * 10} séances franchi. On vise le suivant ?`,
    ],
  },
  {
    id: 'month-fallback', period: 'month', mood: 'push', weight: 1,
    when: () => true,
    lines: [
      (f) => `Un mois, c'est assez pour sentir la différence. Fais en sorte que ${f.month.label} compte.`,
      () => `Les résultats d'un mois se construisent séance après séance. Tu as déjà commencé.`,
    ],
  },
];

// --- Mascot voices: greetings and sign-offs ---

const timeSlot = (h: number) => (h >= 5 && h < 12 ? 'morning' : h >= 12 && h < 18 ? 'afternoon' : 'evening');

const GREETINGS: Record<MascotId, Record<'morning' | 'afternoon' | 'evening' | 'any', ((n: string) => string)[]>> = {
  coq: {
    morning: [(n) => `Cocorico, ${n} !`, (n) => `Debout ${n}, le soleil est levé !`, () => `Cocoricooo ! Bien dormi ?`],
    afternoon: [(n) => `Hé ${n} !`, () => `Coco au rapport !`],
    evening: [(n) => `Bonsoir ${n} !`, () => `Même le soir, je reste sur le pont !`],
    any: [(n) => `Écoute-moi bien, ${n} :`, () => `Allez allez !`, () => `Petit point d'équipe :`, (n) => `${n}, regarde un peu ça :`],
  },
  chat: {
    morning: [(n) => `Bonjour ${n}…`, () => `Miaou, déjà réveillé ?`],
    afternoon: [(n) => `Coucou ${n}.`, () => `Entre deux siestes, un petit mot :`],
    evening: [(n) => `Bonsoir ${n}.`, () => `Ronron du soir :`],
    any: [() => `Miaou.`, (n) => `Psst, ${n}.`, () => `J'ai jeté un œil à tes stats :`, () => `Entre nous :`],
  },
  singe: {
    morning: [(n) => `Ouh ouh, salut ${n} !`, () => `Debout, la banane du matin t'attend !`],
    afternoon: [(n) => `Yo ${n} !`, () => `Ouh ouh ah ah !`],
    evening: [(n) => `Hé ${n}, t'es encore là ?`, () => `Soirée banane et bilan :`],
    any: [() => `Ouh ouh !`, (n) => `Check ça, ${n} :`, () => `Kiki a des news :`, () => `Accroche-toi à ta liane :`],
  },
};

const SIGNOFFS: Record<MascotId, Record<CoachMood, string[]>> = {
  coq: {
    proud: ['Je chante ça sur tous les toits !', 'Fier comme un coq, et pour une fois c’est toi.', 'Plumes hérissées de fierté !', 'Champion de la basse-cour !'],
    push: ['Allez, on y va !', 'Pas de poule mouillée ici !', 'Je compte sur toi.', 'Hop hop hop, en piste !'],
    soft: ['Je veille au grain.', 'On reprend le rythme ensemble.', 'Courage, je suis là.'],
  },
  chat: {
    proud: ['Ronronnement approuvé.', 'Félin pour l’autre, comme on dit.', 'Je suis presque impressionnée.', 'Belle patte.'],
    push: ['Avec la grâce d’un félin, évidemment.', 'Retombe sur tes pattes.', 'En douceur, mais avec constance.', 'Allez, griffes dehors.'],
    soft: ['Prends soin de toi, c’est ça aussi le sport.', 'Doucement, mais sûrement.', 'Je reste à côté.'],
  },
  singe: {
    proud: ['Tu mérites un régime de bananes !', 'Je fais des saltos de joie !', 'Roi de la jungle, rien que ça !', 'Ouh ouh, trop fort !'],
    push: ['On grimpe ensemble ?', 'Allez, de liane en liane !', 'Pas de singeries, on y va !', 'Je t’attends à la salle !'],
    soft: ['Même les singes font des pauses banane.', 'On repart quand tu veux.', 'Tranquille, on avance à ton rythme.'],
  },
};

// --- Random & selection ---

const mulberry32 = (seed: number) => () => {
  let t = (seed += 0x6d2b79f5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

export interface CoachMessage {
  text: string;
  mood: CoachMood;
  key: string;
}

/** Builds one message for the period; `seed` changes the draw, recent lines are avoided */
export const buildCoachMessage = (f: CoachFacts, period: CoachPeriod, mascot: MascotId, seed: number): CoachMessage => {
  const rnd = mulberry32(seed);
  const recent = loadJSON<string[]>(RECENT_KEY, []);

  // Every usable line of the period, weighted by its template
  const options: { key: string; text: string; mood: CoachMood; weight: number }[] = [];
  for (const t of T) {
    if (t.period !== period || !t.when(f)) continue;
    t.lines.forEach((line, i) => {
      const text = line(f, rnd);
      if (text) options.push({ key: `${t.id}#${i}`, text, mood: t.mood, weight: t.weight });
    });
  }
  // Fallbacks only when nothing more specific exists
  const specific = options.filter((o) => !o.key.includes('-fallback'));
  const pool0 = specific.length >= 2 ? specific : options;
  const fresh = pool0.filter((o) => !recent.includes(o.key));
  const pool = fresh.length ? fresh : pool0;

  const total = pool.reduce((s, o) => s + o.weight, 0);
  let r = rnd() * total;
  const chosen = pool.find((o) => (r -= o.weight) < 0) ?? pool[pool.length - 1];

  saveJSON(RECENT_KEY, [chosen.key, ...recent.filter((k) => k !== chosen.key)].slice(0, 20));

  const voice = GREETINGS[mascot];
  // Never two colons in a row: a message that already has one gets a greeting without
  const greetings = [...voice[timeSlot(f.hour)], ...voice.any].map((g) => g(f.name)).filter((g) => !(chosen.text.includes(' : ') && g.endsWith(':')));
  const greet = rnd() < 0.7 && greetings.length ? pick(greetings, rnd) : '';
  const sign = rnd() < 0.55 ? pick(SIGNOFFS[mascot][chosen.mood], rnd) : '';

  // After "…:" the message continues the sentence, so it starts in lower case
  const core = greet.endsWith(':') ? chosen.text.charAt(0).toLowerCase() + chosen.text.slice(1) : chosen.text;
  return { text: [greet, core, sign].filter(Boolean).join(' '), mood: chosen.mood, key: chosen.key };
};

/** Period to open on: today's session first, otherwise the week, the month at its edges */
export const defaultCoachPeriod = (f: CoachFacts): CoachPeriod => {
  if (f.today.sessions > 0 || !f.hasAnySession) return 'day';
  if (f.month.day <= 2 || f.month.daysInMonth - f.month.day <= 2) return 'month';
  return f.weekday >= 3 ? 'week' : 'day';
};
