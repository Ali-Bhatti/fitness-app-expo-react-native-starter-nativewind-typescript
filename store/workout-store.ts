import { cancelNotification, scheduleRestEndNotification } from '@/lib/notifications'
import { useNotificationStore } from './notification-store'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

// ─── Types ────────────────────────────────────────────────────────────────────

export type WeightUnit = 'kg' | 'lbs'

export type WorkoutStatus = 'idle' | 'running' | 'paused'

export type WorkoutSet = {
    id: string
    /** Name of the exercise performed in this set (denormalized for display) */
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

function getDefaultSets(setCount: number = 2): WorkoutSet[] {
    return Array.from({ length: setCount }, (_, i) => defaultSet(`Set ${i + 1}`))
}

// ─── Store interface ──────────────────────────────────────────────────────────

interface WorkoutStore {
    /** Persisted — survives app restarts */
    weightUnit: WeightUnit

    // ── Session timing (epoch-based, persisted for kill-recovery) ──────────────
    /** idle | running | paused */
    workoutStatus: WorkoutStatus
    /** Epoch ms when the session first started */
    startedAtEpochMs: number | null
    /** Total ms that have been spent in the paused state so far */
    accumulatedPausedMs: number
    /** Epoch ms when the current pause began; null while running */
    pausedAtEpochMs: number | null

    // ── Rest timer (epoch-based, persisted like session timing) ────────────────
    /** Epoch ms when the current rest ends; null when not resting */
    restEndsAtEpochMs: number | null
    /** Scheduled "rest over" notification id, kept so we can cancel it */
    restNotificationId: string | null

    /** Exercises — persisted so in-progress workout survives app kill */
    workoutExercises: WorkoutExercise[]

    // Unit
    setWeightUnit: (unit: WeightUnit) => void

    // Session lifecycle
    startSession: () => void
    pauseSession: () => void
    resumeSession: () => void
    /** Clears exercises + timing; unit preference is kept */
    clearSession: () => void

    // Exercises
    addExercise: (sanityId: string, name: string, target: string | null) => void
    removeExercise: (id: string) => void

    // Sets
    addSet: (exerciseId: string) => void
    removeSet: (exerciseId: string, setId: string) => void
    updateSet: (exerciseId: string, setId: string, field: 'reps' | 'weight', value: string) => void
    toggleSetCompleted: (exerciseId: string, setId: string) => void

    // Rest timer
    startRest: (durationSec: number) => Promise<void>
    skipRest: () => Promise<void>
    /** +/− seconds on the running rest timer; clears it if remaining drops to 0 */
    adjustRest: (deltaSec: number) => Promise<void>

    /**
     * Returns elapsed milliseconds, correctly accounting for paused intervals.
     * Call this at render time (not in a selector) for an accurate value.
     */
    getElapsedMs: () => number

    /** @deprecated Use clearSession() */
    resetWorkout: () => void
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useWorkoutStore = create<WorkoutStore>()(
    persist(
        (set, get) => ({
            weightUnit: 'kg',

            workoutStatus: 'idle',
            startedAtEpochMs: null,
            accumulatedPausedMs: 0,
            pausedAtEpochMs: null,
            restEndsAtEpochMs: null,
            restNotificationId: null,

            workoutExercises: [],

            setWeightUnit: (unit) => set({ weightUnit: unit }),

            // ── Session lifecycle ───────────────────────────────────────────────

            startSession: () => set({
                workoutStatus: 'running',
                startedAtEpochMs: Date.now(),
                accumulatedPausedMs: 0,
                pausedAtEpochMs: null,
                workoutExercises: [],
            }),

            pauseSession: () => set((state) => {
                if (state.workoutStatus !== 'running') return state
                void get().skipRest()
                return { workoutStatus: 'paused', pausedAtEpochMs: Date.now() }
            }),

            resumeSession: () => set((state) => {
                if (state.workoutStatus !== 'paused' || state.pausedAtEpochMs === null) return state
                return {
                    workoutStatus: 'running',
                    accumulatedPausedMs: state.accumulatedPausedMs + (Date.now() - state.pausedAtEpochMs),
                    pausedAtEpochMs: null,
                }
            }),

            clearSession: () => {
                void get().skipRest()
                set({
                    workoutStatus: 'idle',
                    startedAtEpochMs: null,
                    accumulatedPausedMs: 0,
                    pausedAtEpochMs: null,
                    workoutExercises: [],
                })
            },

            getElapsedMs: () => {
                const { startedAtEpochMs, workoutStatus, accumulatedPausedMs, pausedAtEpochMs } = get()
                if (!startedAtEpochMs) return 0
                // When paused: freeze at the moment pause began
                const anchor = (workoutStatus === 'paused' && pausedAtEpochMs !== null)
                    ? pausedAtEpochMs
                    : Date.now()
                return Math.max(0, anchor - startedAtEpochMs - accumulatedPausedMs)
            },

            // ── Exercises ──────────────────────────────────────────────────────

            addExercise: (sanityId, name, target) =>
                set((state) => ({
                    workoutExercises: [
                        ...state.workoutExercises,
                        {
                            id: uid(),
                            sanityId,
                            name,
                            target,
                            sets: getDefaultSets(),
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

            toggleSetCompleted: (exerciseId, setId) => {
                let becameCompleted = false
                set((state) => ({
                    workoutExercises: state.workoutExercises.map((ex) => {
                        if (ex.id !== exerciseId) return ex
                        return {
                            ...ex,
                            sets: ex.sets.map((s) => {
                                if (s.id !== setId) return s
                                if (!s.isCompleted) becameCompleted = true
                                return { ...s, isCompleted: !s.isCompleted }
                            }),
                        }
                    }),
                }))
                if (becameCompleted && get().workoutStatus === 'running') {
                    void get().startRest(useNotificationStore.getState().restDurationSec)
                }
            },

            // ── Rest timer ─────────────────────────────────────────────────────

            startRest: async (durationSec) => {
                const prevId = get().restNotificationId
                const endsAt = Date.now() + durationSec * 1000
                set({ restEndsAtEpochMs: endsAt, restNotificationId: null })
                await cancelNotification(prevId)
                if (useNotificationStore.getState().restTimerAlertEnabled) {
                    const id = await scheduleRestEndNotification(endsAt)
                    set({ restNotificationId: id })
                }
            },

            skipRest: async () => {
                const prevId = get().restNotificationId
                set({ restEndsAtEpochMs: null, restNotificationId: null })
                await cancelNotification(prevId)
            },

            adjustRest: async (deltaSec) => {
                const current = get().restEndsAtEpochMs
                if (current === null) return
                const newEndsAt = current + deltaSec * 1000
                if (newEndsAt <= Date.now()) {
                    await get().skipRest()
                    return
                }
                const prevId = get().restNotificationId
                set({ restEndsAtEpochMs: newEndsAt, restNotificationId: null })
                await cancelNotification(prevId)
                if (useNotificationStore.getState().restTimerAlertEnabled) {
                    const id = await scheduleRestEndNotification(newEndsAt)
                    set({ restNotificationId: id })
                }
            },

            resetWorkout: () => get().clearSession(),
        }),
        {
            name: 'workout-store',
            storage: createJSONStorage(() => AsyncStorage),
            partialize: (state) => ({
                weightUnit: state.weightUnit,
                workoutStatus: state.workoutStatus,
                startedAtEpochMs: state.startedAtEpochMs,
                accumulatedPausedMs: state.accumulatedPausedMs,
                pausedAtEpochMs: state.pausedAtEpochMs,
                restEndsAtEpochMs: state.restEndsAtEpochMs,
                restNotificationId: state.restNotificationId,
                workoutExercises: state.workoutExercises,
            }),
        }
    )
)