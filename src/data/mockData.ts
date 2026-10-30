import { Workout, UserStats, ScheduledDay, AchievementBadge, PersonalRecord, MeasurementEntry } from '../types';

export const initialUserStats: UserStats = {
  name: "Alexandre",
  role: "ATHLÈTE ÉLITE",
  email: "alexandre@volt.gym",
  avatarUrl: `${import.meta.env.BASE_URL}img/photo-1534528741775-53994a69daeb-300.jpg`,
  currentWeightKg: 82,
  targetWeightKg: 85,
  streakDays: 12,
  totalWorkouts: 38,
  totalCaloriesBurned: 4280,
  weeklyHours: 5.4,
  voltScore: 94,
  weeklyGoalWorkouts: 5,
  weeklyCompletedWorkouts: 4,
  nextGoal: {
    title: "Objectif Masse & Puissance",
    current: 82,
    target: 85,
    unit: "KG",
    description: "+3 kg de masse musculaire sèche d'ici la fin du trimestre"
  },
  membership: {
    type: "VOLT BLACK PASS",
    tier: "ACCÈS ILLIMITÉ 24/7",
    validUntil: "31 DÉC 2026",
    qrCodeId: "VOLT-8829-ATHL"
  }
};

export const sampleWorkouts: Workout[] = [
  {
    id: "chest-triceps",
    title: "CHEST & TRICEPS",
    subtitle: "EXPLOSION PECTORAUX & TRICEPS",
    category: "hypertrophie",
    durationMin: 52,
    exerciseCount: 8,
    difficulty: "INTERMÉDIAIRE",
    estimatedCalories: 580,
    intensity: "ÉLEVÉE",
    gradientType: "main",
    imageUrl: `${import.meta.env.BASE_URL}img/photo-1581009146145-b5ef050c2e1e-1200.jpg`,
    description: "Concentration maximale sur les fibres pectorales et la chaîne de poussée tricipitale pour stimuler une hypertrophie dense.",
    targetAreas: ["Pectoraux", "Triceps", "Deltoïdes antérieurs"],
    exercises: [
      {
        id: "ex-1",
        name: "Développé couché à la barre",
        sets: 4,
        reps: 0,
        targetWeightKg: 0,
        restSeconds: 90,
        targetMuscles: ["Pectoraux majeurs", "Triceps"],
        notes: "Descente contrôlée en 3s, poussée explosive"
      },
      {
        id: "ex-2",
        name: "Développé incliné aux haltères",
        sets: 3,
        reps: 0,
        targetWeightKg: 0,
        restSeconds: 75,
        targetMuscles: ["Haut de poitrine", "Épaules"],
        notes: "Banc incliné à 30°, cage thoracique bombée"
      },
      {
        id: "ex-3",
        name: "Écarté à la poulie vis-à-vis",
        sets: 3,
        reps: 0,
        targetWeightKg: 0,
        restSeconds: 60,
        targetMuscles: ["Pectoraux médians", "Finition"],
        notes: "Garder une légère flexion des coudes constante"
      },
      {
        id: "ex-4",
        name: "Dips aux barres parallèles (lestés)",
        sets: 3,
        reps: 0,
        targetWeightKg: 0,
        restSeconds: 90,
        targetMuscles: ["Bas de poitrine", "Triceps"],
        notes: "Corps penché vers l'avant pour engager la poitrine"
      },
      {
        id: "ex-5",
        name: "Extensions triceps poulie haute corde",
        sets: 4,
        reps: 0,
        targetWeightKg: 0,
        restSeconds: 60,
        targetMuscles: ["Triceps longue portion"],
        notes: "Écarter la corde en fin de trajectoire"
      },
      {
        id: "ex-6",
        name: "Barre au front (Skull Crushers)",
        sets: 3,
        reps: 0,
        targetWeightKg: 0,
        restSeconds: 60,
        targetMuscles: ["Triceps vaste externe"],
        notes: "Coudes serrés et immobiles"
      }
    ]
  },
  {
    id: "full-body-beast",
    title: "FULL BODY INTENSIVE",
    subtitle: "PUISSANCE ATHLÉTIQUE COMPLÈTE",
    category: "fullbody",
    durationMin: 45,
    exerciseCount: 6,
    difficulty: "AVANCÉ",
    estimatedCalories: 620,
    intensity: "ÉLEVÉE",
    gradientType: "energy",
    imageUrl: `${import.meta.env.BASE_URL}img/photo-1534438327276-14e5300c3a48-1200.jpg`,
    description: "Séance totale haut voltage sollicitant tous les groupes musculaires majeurs avec une dépense métabolique extrême.",
    targetAreas: ["Quadriceps", "Pectoraux", "Dorsaux", "Sangle abdominale"],
    exercises: [
      {
        id: "fb-1",
        name: "Trap Bar Deadlift",
        sets: 4,
        reps: 0,
        targetWeightKg: 0,
        restSeconds: 120,
        targetMuscles: ["Chaîne postérieure", "Trapèzes"]
      },
      {
        id: "fb-2",
        name: "Overhead Press à la barre",
        sets: 4,
        reps: 0,
        targetWeightKg: 0,
        restSeconds: 90,
        targetMuscles: ["Épaules", "Gainage"]
      },
      {
        id: "fb-3",
        name: "Tractions pronation lestées",
        sets: 4,
        reps: 0,
        targetWeightKg: 0,
        restSeconds: 90,
        targetMuscles: ["Grand dorsal", "Biceps"]
      },
      {
        id: "fb-4",
        name: "Fentes marchées avec haltères",
        sets: 3,
        reps: 0,
        targetWeightKg: 0,
        restSeconds: 60,
        targetMuscles: ["Fessiers", "Ischios"]
      }
    ]
  },
  {
    id: "legs-glutes-forge",
    title: "LOWER BODY EXPLOSION",
    subtitle: "SQUAT & CHARGES LOURDES",
    category: "force",
    durationMin: 55,
    exerciseCount: 7,
    difficulty: "ÉLITE",
    estimatedCalories: 690,
    intensity: "MAXIMALE",
    gradientType: "premium",
    imageUrl: `${import.meta.env.BASE_URL}img/photo-1574680096145-d05b474e2155-1200.jpg`,
    description: "Développe une force brute du bas du corps. Session axée sur le Back Squat lourd et le soulevé roumain.",
    targetAreas: ["Quadriceps", "Fessiers", "Ischio-jambiers", "Mollets"],
    exercises: [
      {
        id: "leg-1",
        name: "Back Squat Olympic",
        sets: 5,
        reps: 0,
        targetWeightKg: 0,
        restSeconds: 150,
        targetMuscles: ["Quadriceps", "Grand fessier"]
      },
      {
        id: "leg-2",
        name: "Romanian Deadlift aux haltères",
        sets: 4,
        reps: 0,
        targetWeightKg: 0,
        restSeconds: 90,
        targetMuscles: ["Ischios", "Bas du dos"]
      },
      {
        id: "leg-3",
        name: "Presse à cuisses 45°",
        sets: 4,
        reps: 0,
        targetWeightKg: 0,
        restSeconds: 90,
        targetMuscles: ["Quadriceps"]
      },
      {
        id: "leg-4",
        name: "Leg Curl couché",
        sets: 3,
        reps: 0,
        targetWeightKg: 0,
        restSeconds: 60,
        targetMuscles: ["Ischio-jambiers"]
      }
    ]
  },
  {
    id: "back-biceps-iron",
    title: "BACK & BICEPS FORGE",
    subtitle: "LARGEUR ET DENSITÉ DU DOS",
    category: "hypertrophie",
    durationMin: 50,
    exerciseCount: 6,
    difficulty: "INTERMÉDIAIRE",
    estimatedCalories: 510,
    intensity: "ÉLEVÉE",
    gradientType: "performance",
    imageUrl: `${import.meta.env.BASE_URL}img/photo-1605296867304-46d5465a13f1-1200.jpg`,
    description: "Construction d'un dos en V ultra dense et travail isolé des fléchisseurs de l'avant-bras et biceps.",
    targetAreas: ["Grand dorsal", "Trapèzes", "Rhomboïdes", "Biceps"],
    exercises: [
      {
        id: "bk-1",
        name: "Rowing barre T-Bar lourd",
        sets: 4,
        reps: 0,
        targetWeightKg: 0,
        restSeconds: 90,
        targetMuscles: ["Épaisseur dos", "Trapèzes"]
      },
      {
        id: "bk-2",
        name: "Tirage vertical prise neutre",
        sets: 4,
        reps: 0,
        targetWeightKg: 0,
        restSeconds: 75,
        targetMuscles: ["Grand dorsal"]
      },
      {
        id: "bk-3",
        name: "Curl incliné aux haltères",
        sets: 3,
        reps: 0,
        targetWeightKg: 0,
        restSeconds: 60,
        targetMuscles: ["Biceps longue portion"]
      }
    ]
  },
  {
    id: "hiit-burn-protocol",
    title: "METABOLIC FIRE HIIT",
    subtitle: "DÉPENSE CALORIQUE MAX",
    category: "cardio",
    durationMin: 32,
    exerciseCount: 6,
    difficulty: "AVANCÉ",
    estimatedCalories: 540,
    intensity: "MAXIMALE",
    gradientType: "energy",
    imageUrl: `${import.meta.env.BASE_URL}img/photo-1517838277536-f5f99be501cd-1200.jpg`,
    description: "Intervalles haute intensité avec rameur Concept2, Assault Bike et kettlebells pour pulvériser le cardio.",
    targetAreas: ["Cardio-respiratoire", "Full Body", "VMA"],
    exercises: [
      {
        id: "hiit-1",
        name: "Assault Bike - Sprints",
        sets: 6,
        reps: 0,
        targetWeightKg: 0,
        restSeconds: 30,
        targetMuscles: ["Conditioning"]
      },
      {
        id: "hiit-2",
        name: "Kettlebell Swing",
        sets: 4,
        reps: 0,
        targetWeightKg: 0,
        restSeconds: 45,
        targetMuscles: ["Explosivité hanches"]
      }
    ]
  },
  {
    id: "mobility-recovery",
    title: "MOBILITY & FLOW",
    subtitle: "RÉCUPÉRATION ACTIVE",
    category: "mobilite",
    durationMin: 28,
    exerciseCount: 5,
    difficulty: "DÉBUTANT",
    estimatedCalories: 160,
    intensity: "MODÉRÉE",
    gradientType: "performance",
    imageUrl: `${import.meta.env.BASE_URL}img/photo-1518611012118-696072aa579a-1200.jpg`,
    description: "Décompression articulaire, étirements myofasciaux et ouverture des hanches pour accélérer la régénération.",
    targetAreas: ["Mobilité thoracique", "Hanches", "Chevilles"],
    exercises: [
      {
        id: "mob-1",
        name: "World's Greatest Stretch",
        sets: 3,
        reps: 0,
        targetWeightKg: 0,
        restSeconds: 30,
        targetMuscles: ["Hanches", "Thoracique"]
      },
      {
        id: "mob-2",
        name: "Pigeon Pose dynamique",
        sets: 3,
        reps: 0,
        targetWeightKg: 0,
        restSeconds: 30,
        targetMuscles: ["Fessiers", "Rotateurs"]
      }
    ]
  }
];

export const samplePersonalRecords: PersonalRecord[] = [
  {
    id: "pr-1",
    exercise: "Développé couché",
    weightKg: 105,
    previousWeightKg: 100,
    date: "Il y a 3 jours",
    category: "Poitrine",
    history: [
      { id: "h-1-1", date: "15 Jan", weightKg: 85, reps: 5, notes: "Reprise d'entraînement" },
      { id: "h-1-2", date: "02 Fév", weightKg: 90, reps: 5, notes: "Bonne forme" },
      { id: "h-1-3", date: "24 Fév", weightKg: 95, reps: 3, notes: "Transition 3RM" },
      { id: "h-1-4", date: "18 Mar", weightKg: 97.5, reps: 3, notes: "Charge stable" },
      { id: "h-1-5", date: "10 Avr", weightKg: 100, reps: 2, notes: "Club des 100 kg !" },
      { id: "h-1-6", date: "08 Mai", weightKg: 102.5, reps: 1, notes: "Nouveau record test" },
      { id: "h-1-7", date: "11 Sep", weightKg: 105, reps: 1, notes: "PR validé avec barre nette" }
    ]
  },
  {
    id: "pr-2",
    exercise: "Squat",
    weightKg: 140,
    previousWeightKg: 135,
    date: "Il y a 10 jours",
    category: "Jambes",
    history: [
      { id: "h-2-1", date: "10 Jan", weightKg: 110, reps: 5, notes: "Début du cycle de force" },
      { id: "h-2-2", date: "28 Jan", weightKg: 117.5, reps: 5, notes: "Profondeur contrôlée" },
      { id: "h-2-3", date: "16 Fév", weightKg: 125, reps: 3, notes: "Excellente poussée" },
      { id: "h-2-4", date: "12 Mar", weightKg: 130, reps: 3, notes: "Ceinture lombaire" },
      { id: "h-2-5", date: "05 Avr", weightKg: 135, reps: 2, notes: "Presque au palier 140" },
      { id: "h-2-6", date: "04 Sep", weightKg: 140, reps: 1, notes: "Record historique explosé !" }
    ]
  },
  {
    id: "pr-3",
    exercise: "Soulevé de terre",
    weightKg: 170,
    previousWeightKg: 162.5,
    date: "Il y a 2 semaines",
    category: "Chaîne postérieure",
    history: [
      { id: "h-3-1", date: "12 Jan", weightKg: 130, reps: 5, notes: "Reprise technique" },
      { id: "h-3-2", date: "05 Fév", weightKg: 142.5, reps: 4, notes: "Prise mixte" },
      { id: "h-3-3", date: "26 Fév", weightKg: 150, reps: 3, notes: "Solide au verrouillage" },
      { id: "h-3-4", date: "20 Mar", weightKg: 157.5, reps: 2, notes: "Bonne vitesse d'arraché" },
      { id: "h-3-5", date: "18 Avr", weightKg: 162.5, reps: 1, notes: "Charge lourde validée" },
      { id: "h-3-6", date: "31 Aoû", weightKg: 170, reps: 1, notes: "Barre des 170 kg franchie !" }
    ]
  },
  {
    id: "pr-4",
    exercise: "Overhead Press",
    weightKg: 65,
    previousWeightKg: 62.5,
    date: "Le mois dernier",
    category: "Épaules",
    history: [
      { id: "h-4-1", date: "18 Jan", weightKg: 50, reps: 6, notes: "Focus verrouillage haut" },
      { id: "h-4-2", date: "10 Fév", weightKg: 55, reps: 5, notes: "Gainage strict" },
      { id: "h-4-3", date: "08 Mar", weightKg: 57.5, reps: 4, notes: "Très propre" },
      { id: "h-4-4", date: "02 Avr", weightKg: 60, reps: 3, notes: "Palier clé" },
      { id: "h-4-5", date: "25 Avr", weightKg: 62.5, reps: 2, notes: "Belle stabilité" },
      { id: "h-4-6", date: "15 Aoû", weightKg: 65, reps: 1, notes: "PR strict validé !" }
    ]
  }
];

export const sampleBadges: AchievementBadge[] = [
  // 1. EARLY BIRD (User requested)
  {
    id: "b-early-bird",
    emoji: "🌅",
    title: "Early Bird",
    description: "Tu te réveilles avant le soleil, excuse-nous. Qui t'a brisé le cœur pour être à la salle à 5h30 du mat' ?",
    unlockedAt: "Débloqué",
    isLocked: false,
    rarity: "RARE",
    rewardXp: 150,
    category: "consistency"
  },
  // 2. IL EST TARPIN TARD (User requested)
  {
    id: "b-tarpin-tard",
    emoji: "🦉",
    title: "Il est tarpin tard",
    description: "Tu vas te coucher quand frérot ? Même les videurs de boîte de nuit sont déjà au lit, rentre chez toi.",
    unlockedAt: "Débloqué",
    isLocked: false,
    rarity: "COMMUN",
    rewardXp: 100,
    category: "streak"
  },
  // 3. TU DOIS SAUVER GOTHAM ? (User requested)
  {
    id: "b-gotham",
    emoji: "🦇",
    title: "Tu dois sauver Gotham ?",
    description: "Plusieurs séances tard dans la nuit. Batman du pauvre, va dormir au lieu de traumatiser les haltères à 2h du matin.",
    isLocked: true,
    progressCurrent: 2,
    progressTarget: 5,
    progressUnit: "séances nocturnes",
    rarity: "ÉPIQUE",
    rewardXp: 250,
    category: "streak"
  },
  // 4. ROUTINE DE SALOPARD (User requested)
  {
    id: "b-routine-salopard",
    emoji: "🐺",
    title: "Routine de Salopard",
    description: "Enchaîner 5 séances à l'aube d'affilée sans broncher. Tu fais peur au soleil, comportement de psychopathe intouchable.",
    isLocked: true,
    progressCurrent: 3,
    progressTarget: 5,
    progressUnit: "matinées",
    rarity: "LÉGENDAIRE",
    rewardXp: 400,
    category: "consistency"
  },
  // 5. UN SPORTIF SUISSE (User requested)
  {
    id: "b-sportif-suisse",
    emoji: "⌚",
    title: "Un Sportif Suisse",
    description: "Séance toujours pile à la même heure à la seconde près. Tu mets autant d'intensité que de précision helvète à être à l'heure.",
    unlockedAt: "Débloqué",
    isLocked: false,
    rarity: "RARE",
    rewardXp: 180,
    category: "consistency"
  },
  // 6. CLUB DES 100... MAINTENANT 150 (User requested)
  {
    id: "b-bench-150",
    emoji: "🏋️‍♂️",
    title: "Club des 100... Maintenant 150",
    description: "100 kg au bench validé, c'est mignon. Maintenant 150 au lieu de fêter ça pendant 3 mois devant le miroir.",
    isLocked: true,
    progressCurrent: 105,
    progressTarget: 150,
    progressUnit: "kg",
    rarity: "ÉPIQUE",
    rewardXp: 350,
    category: "record"
  },
  // 7. GROS BAISEUR (User requested)
  {
    id: "b-cardio-god",
    emoji: "🏃‍♂️💨",
    title: "Gros Baiseur",
    description: "Personne veut que tu connaisses sa sœur avec un cardio pareil. Le mec a plus de souffle qu'une éolienne en pleine tempête.",
    unlockedAt: "Débloqué",
    isLocked: false,
    rarity: "LÉGENDAIRE",
    rewardXp: 500,
    category: "volume"
  },
  // 8. CUISSES DE FLAMANT ROSE (Skip Leg Day)
  {
    id: "b-leg-skip",
    emoji: "🍗",
    title: "Cuisses de Flamant Rose",
    description: "Buste de super-héros Marvel posé sur deux allumettes de barbecue. Faut descendre sous la parallèle un jour frérot.",
    isLocked: true,
    progressCurrent: 1,
    progressTarget: 4,
    progressUnit: "leg days",
    rarity: "COMMUN",
    rewardXp: 100,
    category: "volume"
  },
  // 9. L'EGO LIFTER DU DIMANCHE
  {
    id: "b-ego-lifter",
    emoji: "🤡",
    title: "L'Ego Lifter du Dimanche",
    description: "Charger 240 kg sur la presse pour faire 2 millimètres d'amplitude les mains sur les genoux. Tes ménisques viennent de poser leur préavis.",
    isLocked: true,
    progressCurrent: 1,
    progressTarget: 3,
    progressUnit: "sessions ego",
    rarity: "COMMUN",
    rewardXp: 90,
    category: "record"
  },
  // 10. NARCISSE DU VESTIAIRE
  {
    id: "b-narcisse",
    emoji: "🪞",
    title: "Narcisse du Vestiaire",
    description: "Plus de temps passé torse nu à chercher la bonne lumière qu'à charger la barre. Le miroir va finir par te demander des droits d'auteur.",
    unlockedAt: "Débloqué",
    isLocked: false,
    rarity: "COMMUN",
    rewardXp: 80,
    category: "consistency"
  },
  // 11. BÛCHERON SOUS CAFÉINE
  {
    id: "b-preworkout-overdose",
    emoji: "☕",
    title: "Bûcheron Sous Caféine",
    description: "3 scoops de pré-workout dans le gosier, le cœur qui pulse à 220 bpm assis sur le banc. Calme-toi, t'es là pour pousser pas pour décoller sur Mars.",
    unlockedAt: "Débloqué",
    isLocked: false,
    rarity: "RARE",
    rewardXp: 160,
    category: "streak"
  },
  // 12. MONOPOLE DES DISQUES DE 20
  {
    id: "b-disc-hoarder",
    emoji: "🧲",
    title: "Monopole des Disques de 20",
    description: "Avoir confisqué tous les poids de 20 kg de la salle pour faire 3 demi-répétitions à la presse. Tout le club te déteste cordialement.",
    isLocked: true,
    progressCurrent: 6,
    progressTarget: 10,
    progressUnit: "disques réquisitionnés",
    rarity: "ÉPIQUE",
    rewardXp: 300,
    category: "record"
  },
  // 13. LE SQUATTEUR DE BANC
  {
    id: "b-bench-camper",
    emoji: "📱",
    title: "Le Squatteur de Banc",
    description: "25 minutes entre chaque série les yeux rivés sur TikTok. Les mecs qui attendent derrière toi sont prêts à commettre un crime.",
    unlockedAt: "Débloqué",
    isLocked: false,
    rarity: "COMMUN",
    rewardXp: 75,
    category: "consistency"
  },
  // 14. LE MAÎTRE DE LA SIESTE
  {
    id: "b-repos-10min",
    emoji: "🦥",
    title: "Le Maître de la Sieste",
    description: "10 minutes de pause entre deux séries d'élévations latérales. Tu t'es assoupi sur le banc ou t'attendais la fin du quinquennat ?",
    unlockedAt: "Débloqué",
    isLocked: false,
    rarity: "COMMUN",
    rewardXp: 85,
    category: "consistency"
  },
  // 15. LE BOULANGER TRADITION
  {
    id: "b-boulanger-magnesie",
    emoji: "🥐",
    title: "Le Boulanger Tradition",
    description: "Tellement de magnésie sur les mains qu'on dirait que tu pétris des baguettes. T'as enfumé 4 personnes sur 15 mètres à la ronde.",
    isLocked: true,
    progressCurrent: 2,
    progressTarget: 5,
    progressUnit: "nuages de craie",
    rarity: "RARE",
    rewardXp: 170,
    category: "record"
  },
  // 16. LE FANTÔME PORTÉ DISPARU
  {
    id: "b-fantome-app",
    emoji: "👻",
    title: "Le Fantôme Porté Disparu",
    description: "Une semaine entière sans ouvrir l'application ni toucher un haltère. Tu faisais quoi ? Une cure de chips ?",
    isLocked: true,
    progressCurrent: 0,
    progressTarget: 7,
    progressUnit: "jours sans salle",
    rarity: "COMMUN",
    rewardXp: 50,
    category: "streak"
  },
  // 17. L'ALCHIMISTE DU SHAKER
  {
    id: "b-alchimiste-whey",
    emoji: "🥤",
    title: "L'Alchimiste du Shaker",
    description: "Boire son shaker de whey 2 secondes après la dernière rep de peur de 'cataboliser'. La fenêtre anabolique c'est pas la porte des étoiles, respire.",
    unlockedAt: "Débloqué",
    isLocked: false,
    rarity: "COMMUN",
    rewardXp: 95,
    category: "consistency"
  },
  // 18. ANTI-DÉPRESSION DU DIMANCHE SOIR
  {
    id: "b-dimanche-soir",
    emoji: "🕯️",
    title: "Anti-Dépression du Dimanche Soir",
    description: "Faire du soulevé de terre un dimanche à 21h45 pendant que les gens normaux regardent un film sous un plaid. Quel grand malade.",
    unlockedAt: "Débloqué",
    isLocked: false,
    rarity: "RARE",
    rewardXp: 210,
    category: "streak"
  },
  // 19. DOUBLE POIDS DE CORPS
  {
    id: "b-double-poids-corps",
    emoji: "🦍",
    title: "Double Poids de Corps",
    description: "Soulever deux fois ton propre poids au soulevé de terre. Bon, là respect... mais commence pas à marcher les bras écartés comme un crabe.",
    isLocked: true,
    progressCurrent: 145,
    progressTarget: 170,
    progressUnit: "kg au terre",
    rarity: "LÉGENDAIRE",
    rewardXp: 550,
    category: "record"
  },
  // 20. CANARD BOITEUX (LEG DAY VALIDÉ)
  {
    id: "b-canard-boiteux",
    emoji: "🦆",
    title: "Canard Boiteux (Leg Day)",
    description: "Marcher comme un robot Playmobil rouillé pendant 72h après une vraie séance jambes. Descendre 3 marches d'escalier devient ta finale de Koh-Lanta.",
    unlockedAt: "Débloqué",
    isLocked: false,
    rarity: "RARE",
    rewardXp: 190,
    category: "volume"
  },
  // 21. L'ERMITE ASOCIAL
  {
    id: "b-ermite-asocial",
    emoji: "🎧",
    title: "L'Ermite Asocial",
    description: "Casque à réduction de bruit vissé sur le crâne, casquette baissée, regard noir dans le vide. Personne n'ose même te demander l'heure.",
    unlockedAt: "Débloqué",
    isLocked: false,
    rarity: "COMMUN",
    rewardXp: 110,
    category: "consistency"
  },
  // 22. MACHINE DE GUERRE (6/7J)
  {
    id: "b-machine-guerre",
    emoji: "⚔️",
    title: "Machine de Guerre (6/7j)",
    description: "6 entraînements dans la semaine sans faiblir. Ton proprio va finir par sous-louer ta chambre vu que tu vis à la salle.",
    isLocked: true,
    progressCurrent: 4,
    progressTarget: 6,
    progressUnit: "séances cette semaine",
    rarity: "LÉGENDAIRE",
    rewardXp: 600,
    category: "streak"
  },
  // 23. LE TOXICO DES SELS
  {
    id: "b-sels-ammoniaque",
    emoji: "👃",
    title: "Le Toxico des Sels",
    description: "Sniffer des sels d'ammoniaque avant de pousser 60 kg au développé couché. Calme ta crise d'hystérie, c'est pas les championnats du monde.",
    unlockedAt: "Débloqué",
    isLocked: false,
    rarity: "COMMUN",
    rewardXp: 70,
    category: "record"
  },
  // 24. LE GÉOMÈTRE DU 30°
  {
    id: "b-incline-geometre",
    emoji: "📐",
    title: "Le Géomètre du 30°",
    description: "Banc incliné à 30° au rapporteur, trajectoire laser sans cambrer comme un pont de chemin de fer. L'artillerie lourde avec distinction.",
    isLocked: true,
    progressCurrent: 2,
    progressTarget: 4,
    progressUnit: "séances parfaites",
    rarity: "RARE",
    rewardXp: 180,
    category: "record"
  },
  // 25. TITAN DU SQUAT (150 KG)
  {
    id: "b-titan-squat",
    emoji: "🏋️",
    title: "Titan du Squat (150 KG)",
    description: "Valider une vraie barre à 150 kg avec les fesses qui effleurent le gazon. Là, tout le monde se tait et respecte.",
    isLocked: true,
    progressCurrent: 140,
    progressTarget: 150,
    progressUnit: "kg",
    rarity: "LÉGENDAIRE",
    rewardXp: 500,
    category: "record"
  },
  // 26. FOURNAISE 10 000 KCAL
  {
    id: "b-furnace",
    emoji: "🌋",
    title: "Fournaise 10 000 KCAL",
    description: "10 000 calories brûlées au combat. Tu carbures au kérosène pur, même ton métabolisme a peur de toi.",
    isLocked: true,
    progressCurrent: 4280,
    progressTarget: 10000,
    progressUnit: "kcal",
    rarity: "ÉPIQUE",
    rewardXp: 350,
    category: "volume"
  }
];

export const sampleWeekSchedule: ScheduledDay[] = [
  {
    dayKey: "LUN",
    dateStr: "15 Sep",
    dayNumber: 15,
    month: "SEP",
    isToday: false,
    sessions: [
      {
        id: "s-1",
        time: "07:30",
        workoutId: "chest-triceps",
        workoutTitle: "Chest & Triceps Explosion",
        durationMin: 52,
        type: "Hypertrophie",
        status: "completed",
        gradientType: "main",
        calories: 580
      }
    ]
  },
  {
    dayKey: "MAR",
    dateStr: "16 Sep",
    dayNumber: 16,
    month: "SEP",
    isToday: false,
    sessions: [
      {
        id: "s-2",
        time: "18:00",
        workoutId: "legs-glutes-forge",
        workoutTitle: "Lower Body Squat Heavy",
        durationMin: 55,
        type: "Force",
        status: "completed",
        gradientType: "premium",
        calories: 690
      }
    ]
  },
  {
    dayKey: "MER",
    dateStr: "17 Sep",
    dayNumber: 17,
    month: "SEP",
    isToday: false,
    sessions: [
      {
        id: "s-3",
        time: "12:15",
        workoutId: "hiit-burn-protocol",
        workoutTitle: "Metabolic Fire HIIT",
        durationMin: 32,
        type: "Cardio",
        status: "completed",
        gradientType: "energy",
        calories: 540
      }
    ]
  },
  {
    dayKey: "JEU",
    dateStr: "18 Sep",
    dayNumber: 18,
    month: "SEP",
    isToday: true, // Today!
    sessions: [
      {
        id: "s-4",
        time: "17:45",
        workoutId: "full-body-beast",
        workoutTitle: "Full Body Intensive Power",
        durationMin: 45,
        type: "Full Body",
        status: "upcoming",
        gradientType: "energy",
        calories: 620
      }
    ]
  },
  {
    dayKey: "VEN",
    dateStr: "19 Sep",
    dayNumber: 19,
    month: "SEP",
    isToday: false,
    sessions: [
      {
        id: "s-5",
        time: "08:00",
        workoutId: "back-biceps-iron",
        workoutTitle: "Back & Biceps Forge",
        durationMin: 50,
        type: "Hypertrophie",
        status: "upcoming",
        gradientType: "performance",
        calories: 510
      }
    ]
  },
  {
    dayKey: "SAM",
    dateStr: "20 Sep",
    dayNumber: 20,
    month: "SEP",
    isToday: false,
    sessions: [
      {
        id: "s-6",
        time: "10:30",
        workoutId: "mobility-recovery",
        workoutTitle: "Active Recovery & Mobility",
        durationMin: 28,
        type: "Mobilité",
        status: "upcoming",
        gradientType: "performance",
        calories: 160
      }
    ]
  },
  {
    dayKey: "DIM",
    dateStr: "21 Sep",
    dayNumber: 21,
    month: "SEP",
    isToday: false,
    sessions: [] // Rest day
  }
];

export const sampleMeasurements: MeasurementEntry[] = [
  {
    id: 'm-1',
    metricType: 'poids',
    value: 85.1,
    unit: 'KG',
    dateStr: '12-07-2026 20:00',
    timestamp: 1783886400000,
    monthIndex: 6, // Juillet
    year: 2026,
    notes: 'Pesée après séance dos'
  },
  {
    id: 'm-2',
    metricType: 'poids',
    value: 85.2,
    unit: 'KG',
    dateStr: '30-06-2026 16:29',
    timestamp: 1782836940000,
    monthIndex: 5, // Juin
    year: 2026,
    notes: 'Pesée à jeun'
  },
  {
    id: 'm-3',
    metricType: 'poids',
    value: 86.4,
    unit: 'KG',
    dateStr: '15-05-2026 08:30',
    timestamp: 1778833800000,
    monthIndex: 4, // Mai
    year: 2026
  },
  {
    id: 'm-4',
    metricType: 'poids',
    value: 87.0,
    unit: 'KG',
    dateStr: '10-04-2026 19:15',
    timestamp: 1775841300000,
    monthIndex: 3, // Avril
    year: 2026
  },
  {
    id: 'm-5',
    metricType: 'poids',
    value: 86.8,
    unit: 'KG',
    dateStr: '22-03-2026 09:00',
    timestamp: 1774170000000,
    monthIndex: 2, // Mars
    year: 2026
  },
  {
    id: 'm-6',
    metricType: 'poids',
    value: 87.5,
    unit: 'KG',
    dateStr: '14-02-2026 18:45',
    timestamp: 1771091100000,
    monthIndex: 1, // Février
    year: 2026
  },
  {
    id: 'm-7',
    metricType: 'poids',
    value: 88.0,
    unit: 'KG',
    dateStr: '05-01-2026 08:15',
    timestamp: 1767600900000,
    monthIndex: 0, // Janvier
    year: 2026
  }
];
