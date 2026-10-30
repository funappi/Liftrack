// Workouts created by the user get an id with this prefix (library samples don't)
export const CUSTOM_WORKOUT_PREFIX = 'custom-workout-';

export const isCustomWorkout = (workout: { id: string }) => workout.id.startsWith(CUSTOM_WORKOUT_PREFIX);
