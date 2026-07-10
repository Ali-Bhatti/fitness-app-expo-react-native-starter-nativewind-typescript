import { create } from 'zustand'

// ─── Types ────────────────────────────────────────────────────────────────────

export type ReminderTime = { hour: number; minute: number }

/** Rest-duration preset options shown in the settings screen, in seconds */
export const REST_DURATION_PRESETS = [60, 90, 120, 180] as const

export interface NotificationPrefs {
    workoutRemindersEnabled: boolean
    /** expo-notifications weekday numbers: 1 = Sunday … 7 = Saturday */
    reminderDays: number[]
    reminderTime: ReminderTime
    restTimerAlertEnabled: boolean
    restDurationSec: number
    pausedWorkoutReminderEnabled: boolean
}

interface NotificationStore extends NotificationPrefs {
    /** True once prefs have been hydrated from Clerk (or confirmed absent) at app startup */
    hasHydrated: boolean
    hydrate: (prefs: Partial<NotificationPrefs>) => void
    /** Mark hydration complete without changing prefs — used on the "nothing to hydrate" path */
    markHydrated: () => void
    setWorkoutRemindersEnabled: (v: boolean) => void
    toggleReminderDay: (weekday: number) => void
    setReminderTime: (t: ReminderTime) => void
    setRestTimerAlertEnabled: (v: boolean) => void
    setRestDurationSec: (sec: number) => void
    setPausedWorkoutReminderEnabled: (v: boolean) => void
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useNotificationStore = create<NotificationStore>()((set) => ({
    workoutRemindersEnabled: false,
    reminderDays: [],
    reminderTime: { hour: 18, minute: 0 },
    restTimerAlertEnabled: true,
    restDurationSec: 90,
    pausedWorkoutReminderEnabled: true,
    hasHydrated: false,

    hydrate: (prefs) => set({ ...prefs, hasHydrated: true }),
    markHydrated: () => set({ hasHydrated: true }),
    setWorkoutRemindersEnabled: (v) => set({ workoutRemindersEnabled: v }),
    toggleReminderDay: (weekday) =>
        set((s) => ({
            reminderDays: s.reminderDays.includes(weekday)
                ? s.reminderDays.filter((d) => d !== weekday)
                : [...s.reminderDays, weekday].sort((a, b) => a - b),
        })),
    setReminderTime: (t) => set({ reminderTime: t }),
    setRestTimerAlertEnabled: (v) => set({ restTimerAlertEnabled: v }),
    setRestDurationSec: (sec) => set({ restDurationSec: sec }),
    setPausedWorkoutReminderEnabled: (v) => set({ pausedWorkoutReminderEnabled: v }),
}))
