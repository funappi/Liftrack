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

