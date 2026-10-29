export type TabType = 'home' | 'workouts' | 'planning' | 'progress' | 'profile';

export type WorkoutCategory = 
  | 'all' 
  | 'force' 
  | 'hypertrophie' 
  | 'cardio' 
  | 'fullbody' 
  | 'perte_poids' 
  | 'mobilite';

export interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: number | string;
  targetWeightKg: number;
  restSeconds: number;
  targetMuscles: string[];
  notes?: string;
  videoThumb?: string;
}

export interface Workout {
  id: string;
  title: string;
  subtitle?: string;
  category: WorkoutCategory;
  durationMin: number;
  exerciseCount: number;
  difficulty: 'DÉBUTANT' | 'INTERMÉDIAIRE' | 'AVANCÉ' | 'ÉLITE';
  estimatedCalories: number;
  intensity: 'MODÉRÉE' | 'ÉLEVÉE' | 'MAXIMALE';
  gradientType: 'main' | 'energy' | 'performance' | 'premium';
  imageUrl: string;
  description: string;
  exercises: Exercise[];
  targetAreas: string[];
}

export interface PRHistoryPoint {
  id: string;
  date: string;
  weightKg: number;
  reps?: number;
  notes?: string;
}

export interface PersonalRecord {
  id: string;
  exercise: string;
  weightKg: number;
  previousWeightKg: number;
  date: string;
  category: string;
  history?: PRHistoryPoint[];
}

export interface AchievementBadge {
  id: string;
  emoji: string;
  title: string;
  description: string;
  unlockedAt?: string;
  isNew?: boolean;
  isLocked?: boolean;
  progressCurrent?: number;
  progressTarget?: number;
  progressUnit?: string;
  rarity?: 'COMMUN' | 'RARE' | 'ÉPIQUE' | 'LÉGENDAIRE';
  rewardXp?: number;
  category: 'streak' | 'volume' | 'record' | 'consistency';
}

export interface UserStats {
  name: string;
  role: string;
  email?: string;
  avatarUrl?: string;
  currentWeightKg: number;
  targetWeightKg: number;
  streakDays: number;
  totalWorkouts: number;
  totalCaloriesBurned: number;
  weeklyHours: number;
  voltScore: number;
  weeklyGoalWorkouts: number;
  weeklyCompletedWorkouts: number;
  nextGoal: {
    title: string;
    current: number;
    target: number;
    unit: string;
    description: string;
    startValue?: number;
    goalType?: 'perte_poids' | 'prise_masse' | 'autre';
  };
  membership: {
    type: string;
    tier: string;
    validUntil: string;
    qrCodeId: string;
  };
  bodyComposition?: {
    fatPercent: number;
    fatKg: number;
    leanMassKg: number;
    boneMassKg: number;
    muscleMassKg: number;
    organMassKg?: number;
    waterLiters: number;
    formula: string;
    date: string;
    recommendation?: {
      type: 'seche' | 'prise_de_masse' | 'recomposition';
      title: string;
      targetWeightKg: number;
      targetFatPercent: number;
      fatDeltaKg: number;
      muscleDeltaKg: number;
      dailyCalorieDelta: string;
    };
    chosenGoal?: {
      source: 'app_recommendation' | 'user_custom';
      type: 'seche' | 'prise_de_masse' | 'recomposition';
      targetWeightKg: number;
      targetFatPercent: number;
      fatDeltaKg: number;
      muscleDeltaKg: number;
    };
  };
}

export interface ScheduledDay {
  dayKey: 'LUN' | 'MAR' | 'MER' | 'JEU' | 'VEN' | 'SAM' | 'DIM';
  dateStr: string;
  dayNumber: number;
  month: string;
  isToday: boolean;
  sessions: {
    id: string;
    time: string;
    workoutId: string;
    workoutTitle: string;
    durationMin: number;
    type: string;
    status: 'completed' | 'upcoming' | 'rest';
    gradientType: 'main' | 'energy' | 'performance' | 'premium';
    calories: number;
  }[];
}

export interface AudioTrack {
  id: string;
  title: string;
  artist: string;
  bpm: number;
  durationStr: string;
  type: 'synthwave' | 'phonk' | 'industrial' | 'ambient';
}

export interface MeasurementEntry {
  id: string;
  metricType: string; // 'poids' | 'bench' | 'squat' | 'deadlift' | 'volume' | or custom favorite exercise
  value: number;
  unit: string;
  dateStr: string; // e.g. "12-07-2026 20:00"
  timestamp: number;
  monthIndex: number; // 0 for Jan, 11 for Dec
  year: number;
  notes?: string;
  exerciseName?: string;
}

export interface WorkoutSetSession {
  id: string;
  setNumber: number;
  previous: string;
  weightKg: number;
  reps: number;
  completed: boolean;
}

export interface WorkoutExerciseSession {
  id: string;
  name: string;
  targetMuscles: string[];
  notes: string;
  restSeconds: number | null; // null = DÉSACTIVÉ
  sets: WorkoutSetSession[];
}
