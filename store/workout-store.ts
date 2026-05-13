import AsyncStorage from '@react-native-async-storage/async-storage'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

// ─── Types ────────────────────────────────────────────────────────────────────

export type WeightUnit = 'kg' | 'lbs'

export type WorkoutSet = {
    id: string
    /** Name of the exercise performed in this set (denormalised for display) */
    name: string
    reps: string
    weight: string
    isCompleted: boolean
}

export type WorkoutExercise = {
    id: string
    /** Sanity document _id — used as reference when saving */
    sanityId: string
    name: string
    target: string | null
    sets: WorkoutSet[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uid() {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
}

function defaultSet(name: string, overrides?: Partial<WorkoutSet>): WorkoutSet {
    return { id: uid(), name, reps: '5', weight: '0', isCompleted: false, ...overrides }
}

// ─── Store interface ──────────────────────────────────────────────────────────

interface WorkoutStore {
    /** Persisted — survives app restarts */
    weightUnit: WeightUnit

    /** In-memory only — cleared on resetWorkout */
    workoutExercises: WorkoutExercise[]

    // Unit
    setWeightUnit: (unit: WeightUnit) => void

    // Exercises
    addExercise: (sanityId: string, name: string, target: string | null) => void
    removeExercise: (id: string) => void

    // Sets
    addSet: (exerciseId: string) => void
    removeSet: (exerciseId: string, setId: string) => void
    updateSet: (exerciseId: string, setId: string, field: 'reps' | 'weight', value: string) => void
    toggleSetCompleted: (exerciseId: string, setId: string) => void

    /** Clears exercises only — unit preference is kept */
    resetWorkout: () => void
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useWorkoutStore = create<WorkoutStore>()(
    persist(
        (set) => ({
            weightUnit: 'kg',
            workoutExercises: [],

            setWeightUnit: (unit) => set({ weightUnit: unit }),

            addExercise: (sanityId, name, target) =>
                set((state) => ({
                    workoutExercises: [
                        ...state.workoutExercises,
                        {
                            id: uid(),
                            sanityId,
                            name,
                            target,
                            sets: [defaultSet(name)],
                        },
                    ],
                })),

            removeExercise: (id) =>
                set((state) => ({
                    workoutExercises: state.workoutExercises.filter((ex) => ex.id !== id),
                })),

            addSet: (exerciseId) =>
                set((state) => ({
                    workoutExercises: state.workoutExercises.map((ex) => {
                        if (ex.id !== exerciseId) return ex
                        const last = ex.sets[ex.sets.length - 1]
                        return {
                            ...ex,
                            sets: [
                                ...ex.sets,
                                defaultSet(ex.name, {
                                    reps: last?.reps ?? '5',
                                    weight: last?.weight ?? '0',
                                }),
                            ],
                        }
                    }),
                })),

            removeSet: (exerciseId, setId) =>
                set((state) => ({
                    workoutExercises: state.workoutExercises.map((ex) => {
                        if (ex.id !== exerciseId) return ex
                        return { ...ex, sets: ex.sets.filter((s) => s.id !== setId) }
                    }),
                })),

            updateSet: (exerciseId, setId, field, value) =>
                set((state) => ({
                    workoutExercises: state.workoutExercises.map((ex) => {
                        if (ex.id !== exerciseId) return ex
                        return {
                            ...ex,
                            sets: ex.sets.map((s) =>
                                s.id !== setId ? s : { ...s, [field]: value }
                            ),
                        }
                    }),
                })),

            toggleSetCompleted: (exerciseId, setId) =>
                set((state) => ({
                    workoutExercises: state.workoutExercises.map((ex) => {
                        if (ex.id !== exerciseId) return ex
                        return {
                            ...ex,
                            sets: ex.sets.map((s) =>
                                s.id !== setId ? s : { ...s, isCompleted: !s.isCompleted }
                            ),
                        }
                    }),
                })),

            resetWorkout: () => set({ workoutExercises: [] }),
        }),
        {
            name: 'workout-store',
            storage: createJSONStorage(() => AsyncStorage),
            // Only persist the unit preference — exercises are always session-only
            partialize: (state) => ({ weightUnit: state.weightUnit }),
        }
    )
)