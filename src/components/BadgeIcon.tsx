import React from 'react';
import {
  Sunrise,
  Moon,
  ShieldAlert,
  Flame,
  Timer,
  Dumbbell,
  Wind,
  Crosshair,
  AlertTriangle,
  Camera,
  Zap,
  Layers,
  Smartphone,
  Clock,
  Sparkles,
  Ghost,
  CupSoda,
  Calendar,
  Trophy,
  Activity,
  Headphones,
  Swords,
  Compass,
  Crown,
  Award,
  LucideIcon
} from 'lucide-react';

export const BADGE_ICONS: Record<string, { icon: LucideIcon; color: string; bg: string }> = {
  'b-early-bird': { icon: Sunrise, color: 'text-amber-400', bg: 'bg-amber-500/15 border-amber-500/30' },
  'b-tarpin-tard': { icon: Moon, color: 'text-indigo-400', bg: 'bg-indigo-500/15 border-indigo-500/30' },
  'b-gotham': { icon: ShieldAlert, color: 'text-purple-400', bg: 'bg-purple-500/15 border-purple-500/30' },
  'b-routine-salopard': { icon: Flame, color: 'text-orange-400', bg: 'bg-orange-500/15 border-orange-500/30' },
  'b-sportif-suisse': { icon: Timer, color: 'text-red-400', bg: 'bg-red-500/15 border-red-500/30' },
  'b-bench-150': { icon: Dumbbell, color: 'text-cyan-400', bg: 'bg-cyan-500/15 border-cyan-500/30' },
  'b-cardio-god': { icon: Wind, color: 'text-emerald-400', bg: 'bg-emerald-500/15 border-emerald-500/30' },
  'b-leg-skip': { icon: Crosshair, color: 'text-pink-400', bg: 'bg-pink-500/15 border-pink-500/30' },
  'b-ego-lifter': { icon: AlertTriangle, color: 'text-yellow-400', bg: 'bg-yellow-500/15 border-yellow-500/30' },
  'b-narcisse': { icon: Camera, color: 'text-fuchsia-400', bg: 'bg-fuchsia-500/15 border-fuchsia-500/30' },
  'b-preworkout-overdose': { icon: Zap, color: 'text-amber-300', bg: 'bg-amber-400/15 border-amber-400/30' },
  'b-disc-hoarder': { icon: Layers, color: 'text-sky-400', bg: 'bg-sky-500/15 border-sky-500/30' },
  'b-bench-camper': { icon: Smartphone, color: 'text-slate-400', bg: 'bg-slate-500/15 border-slate-500/30' },
  'b-repos-10min': { icon: Clock, color: 'text-blue-400', bg: 'bg-blue-500/15 border-blue-500/30' },
  'b-boulanger-magnesie': { icon: Sparkles, color: 'text-amber-200', bg: 'bg-amber-200/15 border-amber-200/30' },
  'b-fantome-app': { icon: Ghost, color: 'text-violet-400', bg: 'bg-violet-500/15 border-violet-500/30' },
  'b-alchimiste-whey': { icon: CupSoda, color: 'text-teal-400', bg: 'bg-teal-500/15 border-teal-500/30' },
  'b-dimanche-soir': { icon: Calendar, color: 'text-orange-400', bg: 'bg-orange-500/15 border-orange-500/30' },
  'b-double-poids-corps': { icon: Trophy, color: 'text-yellow-400', bg: 'bg-yellow-500/15 border-yellow-500/30' },
  'b-canard-boiteux': { icon: Activity, color: 'text-lime-400', bg: 'bg-lime-500/15 border-lime-500/30' },
  'b-ermite-asocial': { icon: Headphones, color: 'text-zinc-400', bg: 'bg-zinc-500/15 border-zinc-500/30' },
  'b-machine-guerre': { icon: Swords, color: 'text-rose-400', bg: 'bg-rose-500/15 border-rose-500/30' },
  'b-sels-ammoniaque': { icon: Wind, color: 'text-teal-300', bg: 'bg-teal-400/15 border-teal-400/30' },
  'b-incline-geometre': { icon: Compass, color: 'text-cyan-300', bg: 'bg-cyan-400/15 border-cyan-400/30' },
  'b-titan-squat': { icon: Crown, color: 'text-amber-400', bg: 'bg-amber-500/15 border-amber-500/30' },
  'b-furnace': { icon: Flame, color: 'text-rose-500', bg: 'bg-rose-500/15 border-rose-500/30' },
};

/**
 * Returns how to unlock a badge when it is locked.
 */
export function getBadgeUnlockRequirement(badgeId: string, progressTarget?: number, progressUnit?: string): string {
  switch (badgeId) {
    case 'b-early-bird':
      return "S'entraîner et valider une séance avant 7h00 du matin.";
    case 'b-tarpin-tard':
      return "Compléter et enregistrer une séance après 23h00.";
    case 'b-gotham':
      return `Valider ${progressTarget || 5} séances tardives nocturnes entre 2h et 4h du matin.`;
    case 'b-routine-salopard':
      return `Enchaîner ${progressTarget || 5} séances à l'aube consécutives sans relâcher.`;
    case 'b-sportif-suisse':
      return "Démarrer et conclure ses séances à la minute exacte prévue.";
    case 'b-bench-150':
      return `Passer une barre de ${progressTarget || 150} kg au développé couché.`;
    case 'b-cardio-god':
      return "Enchaîner les entraînements avec une intensité cardio exceptionnelle.";
    case 'b-leg-skip':
      return `Effectuer ${progressTarget || 4} séances jambes complètes sans esquiver le squat.`;
    case 'b-ego-lifter':
      return `Valider ${progressTarget || 3} séances lourdes en amplitude maximale contrôlée.`;
    case 'b-narcisse':
      return "Enregistrer des photographies de progression physique dans l'app.";
    case 'b-preworkout-overdose':
      return "Valider une séance avec une intensité déclarée maximale.";
    case 'b-disc-hoarder':
      return `Mobiliser ${progressTarget || 10} disques de 20 kg sur un mouvement lourd.`;
    case 'b-bench-camper':
      return "Respecter scrupuleusement le chronomètre de repos entre chaque série.";
    case 'b-repos-10min':
      return "Valider des séances axées sur la force avec pauses contrôlées.";
    case 'b-boulanger-magnesie':
      return `Compléter ${progressTarget || 5} séances lourdes de force athlétique.`;
    case 'b-fantome-app':
      return "Ne pas ouvrir l'application ni s'entraîner pendant 7 jours consécutifs.";
    case 'b-alchimiste-whey':
      return "Enregistrer la prise d'un shaker de protéines après sa séance.";
    case 'b-dimanche-soir':
      return "Valider une séance complète le dimanche soir après 21h00.";
    case 'b-double-poids-corps':
      return `Tirer 2x son poids de corps au soulevé de terre (${progressTarget || 170} kg visés).`;
    case 'b-canard-boiteux':
      return "Valider un Leg Day éprouvant avec plus de 10 000 kg de volume total.";
    case 'b-ermite-asocial':
      return "Valider 10 séances consécutives en concentration absolue.";
    case 'b-machine-guerre':
      return `Enchaîner ${progressTarget || 6} séances d'entraînement dans une même semaine.`;
    case 'b-sels-ammoniaque':
      return "Battre un record personnel avec un niveau d'effort maximal (RPE 10).";
    case 'b-incline-geometre':
      return `Réaliser ${progressTarget || 4} séances au banc incliné avec exécution laser.`;
    case 'b-titan-squat':
      return `Atteindre ${progressTarget || 150} kg au squat complet.`;
    case 'b-furnace':
      return `Brûler un cumul de ${progressTarget?.toLocaleString() || '10 000'} kcal au fil de tes entraînements.`;
    default:
      if (progressTarget) {
        return `Atteindre l'objectif requis de ${progressTarget} ${progressUnit || ''}.`;
      }
      return "Accomplir les exigences spécifiques lors de tes prochaines séances.";
  }
}

interface BadgeIconProps {
  badgeId: string;
  className?: string;
}

export const BadgeIcon: React.FC<BadgeIconProps> = ({ badgeId, className = 'w-6 h-6' }) => {
  const item = BADGE_ICONS[badgeId];
  if (!item) {
    return <Award className={`${className} text-[#EC4899]`} />;
  }
  const IconComp = item.icon;
  return <IconComp className={`${className} ${item.color}`} />;
};
