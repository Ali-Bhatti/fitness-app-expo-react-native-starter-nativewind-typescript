import AsyncStorage from '@react-native-async-storage/async-storage'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

// ─── Types ────────────────────────────────────────────────────────────────────

export type ReminderTime = { hour: number; minute: number }

/** Rest-duration preset options shown in the settings screen, in seconds */
export const REST_DURATION_PRESETS = [60, 90, 120, 180] as const

interface NotificationStore {
    // ── Workout reminders ──────────────────────────────────────────────────────
    workoutRemindersEnabled: boolean
    /** expo-notifications weekday numbers: 1 = Sunday … 7 = Saturday */
    reminderDays: number[]
    reminderTime: ReminderTime

    // ── Rest timer ─────────────────────────────────────────────────────────────
    /** Whether the "rest over" notification fires when the app is backgrounded */
    restTimerAlertEnabled: boolean
    restDurationSec: number

    // ── Unfinished workout ─────────────────────────────────────────────────────
    pausedWorkoutReminderEnabled: boolean

    setWorkoutRemindersEnabled: (v: boolean) => void
    toggleReminderDay: (weekday: number) => void
    setReminderTime: (t: ReminderTime) => void
    setRestTimerAlertEnabled: (v: boolean) => void
    setRestDurationSec: (sec: number) => void
    setPausedWorkoutReminderEnabled: (v: boolean) => void
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useNotificationStore = create<NotificationStore>()(
    persist(
        (set) => ({
            workoutRemindersEnabled: false,
            reminderDays: [],
            reminderTime: { hour: 18, minute: 0 },
            restTimerAlertEnabled: true,
            restDurationSec: 90,
            pausedWorkoutReminderEnabled: true,

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
        }),
        {
            name: 'notification-store',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
)
