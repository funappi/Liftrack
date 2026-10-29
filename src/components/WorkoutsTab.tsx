import React, { useState } from 'react';
import { Search, Flame, Clock, Dumbbell, Zap, Filter, Plus, Trash2, Sparkles, Edit3 } from 'lucide-react';
import { Workout, WorkoutCategory } from '../types';
import { CreateWorkoutModal } from './CreateWorkoutModal';

interface WorkoutsTabProps {
  workouts: Workout[];
  onSelectWorkout: (workout: Workout) => void;
  onStartWorkout: (workout: Workout) => void;
  onSaveCustomWorkout?: (workout: Workout, launchImmediately?: boolean) => void;
  onDeleteCustomWorkout?: (workoutId: string) => void;
  theme?: 'dark' | 'warm-light';
}

export const WorkoutsTab: React.FC<WorkoutsTabProps> = ({
  workouts,
  onSelectWorkout,
  onStartWorkout,
  onSaveCustomWorkout,
  onDeleteCustomWorkout,
  theme,
}) => {
  const isLight = theme === 'warm-light';
  const [selectedCategory, setSelectedCategory] = useState<WorkoutCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const categories: { id: WorkoutCategory; label: string }[] = [
    { id: 'all', label: 'Tout' },
    { id: 'force', label: 'Force' },
    { id: 'hypertrophie', label: 'Hypertrophie' },
    { id: 'cardio', label: 'Cardio & HIIT' },
    { id: 'fullbody', label: 'Full Body' },
    { id: 'perte_poids', label: 'Perte de poids' },
    { id: 'mobilite', label: 'Mobilité' },
  ];

  // Separate custom workouts created by the user
  const customWorkouts = workouts.filter((w) => w.id.startsWith('custom-workout-'));

  const filteredWorkouts = workouts.filter((workout) => {
    const matchesCategory = selectedCategory === 'all' || workout.category === selectedCategory;
    const matchesSearch =
      workout.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      workout.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      workout.targetAreas.some((a) => a.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const handleSaveCreatedWorkout = (workout: Workout, launchImmediately = false) => {
    setShowCreateModal(false);
    if (onSaveCustomWorkout) {
      onSaveCustomWorkout(workout, launchImmediately);
    } else {
      if (launchImmediately) {
        onStartWorkout(workout);
      }
    }
  };

  return (
    <div className="pb-36 pt-2 px-4 space-y-5 max-w-lg mx-auto">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <span className={`text-xs font-black uppercase tracking-widest ${isLight ? 'text-[#7d5a47]' : 'text-[#A7A7A7]'}`}>
            BIBLIOTHÈQUE VOLT
          </span>
          <h2 className={`text-2xl font-black tracking-tight uppercase ${isLight ? 'text-[#3d2317]' : 'text-white'}`}>
            Programmes & Entraînements
          </h2>
        </div>

        <button
          id="btn-create-workout-top"
          onClick={() => setShowCreateModal(true)}
          className={`px-3.5 py-2 rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer ${
            isLight
              ? 'bg-gradient-to-r from-[#c05a3e] to-[#d97706] hover:brightness-105 text-white shadow-[#c05a3e]/20'
              : 'bg-gradient-to-r from-[#7C3AED] to-[#EC4899] hover:brightness-110 text-white shadow-[#EC4899]/20'
          }`}
        >
          <Plus className="w-3.5 h-3.5 stroke-[3]" />
          <span>Créer séance</span>
        </button>
      </div>

      {/* 🛠 DEDICATED SECTION: CRÉER MA PROPRE SÉANCE DE A À Z (Image 2 - Replaced pink haze with warm terracotta & amber leather nuance in light mode) */}
      <div className={`p-4 sm:p-5 rounded-3xl transition-all space-y-3 relative overflow-hidden shadow-2xl border ${
        isLight
          ? 'bg-gradient-to-br from-[#fff7f0] via-[#faebe0] to-[#f4dfce] border-[#c05a3e]/30 shadow-[#c05a3e]/10'
          : 'bg-gradient-to-br from-[#7C3AED]/20 via-[#181818] to-[#121212] border-[#EC4899]/40'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${isLight ? 'bg-[#c05a3e]' : 'bg-[#EC4899]'}`} />
            <span className={`text-[11px] font-black uppercase tracking-wider ${isLight ? 'text-[#b85d38]' : 'text-[#EC4899]'}`}>
              ENTRAÎNEMENT SUR-MESURE
            </span>
          </div>
          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
            isLight
              ? 'bg-[#c05a3e]/10 border-[#c05a3e]/30 text-[#b85d38]'
              : 'bg-[#EC4899]/20 border-[#EC4899]/40 text-[#EC4899]'
          }`}>
            CRÉATION LIBRE
          </span>
        </div>

        <div>
          <h3 className={`text-lg font-black uppercase tracking-tight ${isLight ? 'text-[#3d2317]' : 'text-white'}`}>
            Créer ma séance de A à Z
          </h3>
          <p className={`text-xs mt-0.5 ${isLight ? 'text-[#7d5a47]' : 'text-[#A7A7A7]'}`}>
            Ajoute les exercices de ton choix, configure tes séries, règle le temps de repos et démarre ton entraînement personnalisé.
          </p>
        </div>

        <button
          id="btn-open-create-workout-modal"
          onClick={() => setShowCreateModal(true)}
          className={`w-full py-3.5 px-4 rounded-2xl font-black text-sm uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${
            isLight
              ? 'bg-gradient-to-r from-[#c05a3e] to-[#d97706] hover:brightness-105 active:scale-[0.98] text-white shadow-[#c05a3e]/30'
              : 'bg-gradient-to-r from-[#7C3AED] to-[#EC4899] hover:brightness-110 active:scale-[0.98] text-white shadow-[#EC4899]/25'
          }`}
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>CRÉER MA PROPRE SÉANCE (DE A À Z) →</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${isLight ? 'text-[#7d5a47]' : 'text-[#A7A7A7]'}`} />
        <input
          id="input-search-workouts"
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Rechercher pectoraux, squat, HIIT, force..."
          className={`w-full rounded-xl pl-10 pr-4 py-3 text-sm transition-all focus:outline-none border ${
            isLight
              ? 'bg-[#fff7f0] border-[#7d5a47]/20 text-[#3d2317] placeholder:text-[#a3826e] focus:border-[#c05a3e]'
              : 'bg-[#181818] border-white/10 text-white placeholder:text-[#A7A7A7] focus:border-[#EC4899]'
          }`}
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs px-1.5 py-0.5 ${
              isLight ? 'text-[#7d5a47] hover:text-[#3d2317]' : 'text-[#A7A7A7] hover:text-white'
            }`}
          >
            Effacer
          </button>
        )}
      </div>

      {/* Category Pills (Spotify style) */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 -mx-4 px-4">
        {categories.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              id={`cat-pill-${cat.id}`}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-full text-xs font-black tracking-wide uppercase whitespace-nowrap transition-all duration-200 ${
                isSelected
                  ? isLight
                    ? 'bg-gradient-to-r from-[#c05a3e] to-[#d97706] text-white shadow-md shadow-[#c05a3e]/20'
                    : 'bg-gradient-to-r from-[#7C3AED] to-[#EC4899] text-white shadow-md glow-main'
                  : isLight
                  ? 'bg-[#faebe0] text-[#7d5a47] hover:text-[#3d2317] border border-[#7d5a47]/20'
                  : 'bg-[#181818] text-[#A7A7A7] hover:text-white border border-white/[0.08]'
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Mes Séances Créées (if any exist) */}
      {customWorkouts.length > 0 && selectedCategory === 'all' && !searchQuery && (
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-[#EC4899]">
              MES SÉANCES CRÉÉES ({customWorkouts.length})
            </span>
            <span className="text-[10px] text-[#A7A7A7]">Programmes personnalisés</span>
          </div>

          <div className="space-y-3">
            {customWorkouts.map((workout) => (
              <div
                key={workout.id}
                className="p-4 rounded-2xl bg-[#181818] border border-[#EC4899]/30 space-y-3 shadow-lg relative"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full bg-[#EC4899]/20 text-[#EC4899] text-[9px] font-black uppercase tracking-wider border border-[#EC4899]/40">
                        CRÉÉE PAR TOI
                      </span>
                      <span className="text-[10px] text-[#A7A7A7] uppercase font-bold">
                        {workout.category}
                      </span>
                    </div>
                    <h4 className="text-base font-black text-white uppercase mt-1">
                      {workout.title}
                    </h4>
                    <p className="text-xs text-[#A7A7A7] line-clamp-1">
                      {workout.description}
                    </p>
                  </div>

                  {onDeleteCustomWorkout && (
                    <button
                      type="button"
                      onClick={() => onDeleteCustomWorkout(workout.id)}
                      className="p-1.5 rounded-lg text-[#777] hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      title="Supprimer cette séance personnalisée"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3 text-xs font-bold text-[#A7A7A7] pt-1 border-t border-white/5">
                  <span className="text-white flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-[#EC4899]" />
                    {workout.durationMin} MIN
                  </span>
                  <span>•</span>
                  <span className="text-[#00C6FF] flex items-center gap-1">
                    <Dumbbell className="w-3.5 h-3.5" />
                    {workout.exercises.length} EXERCICES
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={() => onSelectWorkout(workout)}
                    className="py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs uppercase transition-all"
                  >
                    Détails du plan
                  </button>
                  <button
                    onClick={() => onStartWorkout(workout)}
                    className="py-2 rounded-xl bg-[#0088FF] hover:bg-[#0070DD] text-white font-bold text-xs uppercase flex items-center justify-center gap-1.5 transition-all shadow-md shadow-[#0088FF]/20"
                  >
                    <Dumbbell className="w-3.5 h-3.5" />
                    <span>Lancer la séance</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Workouts List */}
      <div className="space-y-4">
        {filteredWorkouts.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-[#181818] border border-white/10 space-y-2">
            <p className="text-sm font-bold text-white">Aucun entraînement trouvé</p>
            <p className="text-xs text-[#A7A7A7]">Essaie un autre terme ou réinitialise les filtres.</p>
            <button
              onClick={() => {
                setSelectedCategory('all');
                setSearchQuery('');
              }}
              className="mt-3 text-xs font-black text-[#EC4899] uppercase tracking-wider"
            >
              Réinitialiser
            </button>
          </div>
        ) : (
          filteredWorkouts.map((workout) => (
            <div
              key={workout.id}
              id={`workout-card-${workout.id}`}
              onClick={() => onSelectWorkout(workout)}
              className="group relative rounded-2xl overflow-hidden bg-[#181818] border border-white/[0.08] cursor-pointer hover:border-white/20 transition-all duration-300 shadow-xl"
            >
              {/* Image banner with dark athletic contrast */}
              <div className="relative h-48 w-full overflow-hidden">
                <img
                  src={workout.imageUrl}
                  alt={workout.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 brightness-[0.7]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#181818] via-[#181818]/60 to-transparent" />

                {/* Difficulty & Gradient Category Tag */}
                <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                  <span className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-[10px] font-black uppercase tracking-wider text-white border border-white/20">
                    {workout.category}
                  </span>
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      workout.difficulty === 'ÉLITE'
                        ? 'bg-[#8E2DE2] text-white'
                        : workout.difficulty === 'AVANCÉ'
                        ? 'bg-[#FF512F] text-white'
                        : 'bg-[#00C6FF] text-black'
                    }`}
                  >
                    {workout.difficulty}
                  </span>
                </div>
              </div>

              {/* Workout Details */}
              <div className="p-4 pt-1 space-y-3">
                <div>
                  <h3 className="text-xl font-black text-white tracking-tight uppercase leading-tight group-hover:text-gradient-main transition-colors">
                    {workout.title}
                  </h3>
                  <p className="text-xs text-[#A7A7A7] line-clamp-2 mt-1">
                    {workout.description}
                  </p>
                </div>

                {/* Quick stats pills */}
                <div className="flex items-center gap-3 text-xs font-bold text-[#A7A7A7] uppercase tracking-wider pt-1 border-t border-white/[0.06]">
                  <span className="flex items-center gap-1 text-white">
                    <Clock className="w-3.5 h-3.5 text-[#EC4899]" />
                    {workout.durationMin} MIN
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-[#FF512F]">
                    <Flame className="w-3.5 h-3.5 fill-[#FF512F]" />
                    {workout.estimatedCalories} KCAL
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-[#00C6FF]">
                    <Dumbbell className="w-3.5 h-3.5" />
                    {workout.exerciseCount} EXERCICES
                  </span>
                </div>

                {/* Targeted muscle tags */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {workout.targetAreas.map((area, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded-md bg-[#202020] text-[10px] font-bold text-[#A7A7A7]"
                    >
                      {area}
                    </span>
                  ))}
                </div>

                {/* Bottom Start Quick CTA */}
                <div className="pt-2 flex items-center gap-2">
                  <button
                    id={`btn-start-${workout.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onStartWorkout(workout);
                    }}
                    className="w-full py-2.5 rounded-xl bg-[#202020] hover:bg-gradient-to-r hover:from-[#7C3AED] hover:to-[#EC4899] text-white font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 group-hover:border group-hover:border-white/20 cursor-pointer"
                  >
                    <Zap className="w-3.5 h-3.5 text-[#EC4899] group-hover:text-white group-hover:fill-white" />
                    <span>Lancer la séance</span>
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal: Create Workout From Scratch */}
      {showCreateModal && (
        <CreateWorkoutModal
          onSaveWorkout={handleSaveCreatedWorkout}
          onClose={() => setShowCreateModal(false)}
          theme={theme}
        />
      )}
    </div>
  );
};
