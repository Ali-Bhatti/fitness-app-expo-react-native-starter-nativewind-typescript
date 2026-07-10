import { useNotificationStore, DEFAULT_NOTIFICATION_PREFS, REST_DURATION_PRESETS } from '../store/notification-store'

describe('notification-store', () => {
    test('has the spec defaults', () => {
        const s = useNotificationStore.getState()
        expect(s.workoutRemindersEnabled).toBe(false)
        expect(s.reminderDays).toEqual([])
        expect(s.reminderTime).toEqual({ hour: 18, minute: 0 })
        expect(s.restTimerAlertEnabled).toBe(true)
        expect(s.restDurationSec).toBe(90)
        expect(s.pausedWorkoutReminderEnabled).toBe(true)
        expect(s.hasHydrated).toBe(false)
        expect(REST_DURATION_PRESETS).toEqual([60, 90, 120, 180])
    })

    test('hydrate applies prefs and flips hasHydrated', () => {
        useNotificationStore.getState().hydrate({ restDurationSec: 180 })
        const s = useNotificationStore.getState()
        expect(s.restDurationSec).toBe(180)
        expect(s.hasHydrated).toBe(true)
    })

    test('markHydrated flips hasHydrated without touching prefs', () => {
        useNotificationStore.setState({ hasHydrated: false, restDurationSec: 60 })
        useNotificationStore.getState().markHydrated()
        const s = useNotificationStore.getState()
        expect(s.hasHydrated).toBe(true)
        expect(s.restDurationSec).toBe(60)
    })

    test('reset returns prefs to defaults with hasHydrated false', () => {
        // Simulate a previous user's hydrated prefs
        useNotificationStore.getState().hydrate({
            workoutRemindersEnabled: true,
            reminderDays: [2, 4],
            reminderTime: { hour: 6, minute: 15 },
            restTimerAlertEnabled: false,
            restDurationSec: 180,
            pausedWorkoutReminderEnabled: false,
        })
        expect(useNotificationStore.getState().hasHydrated).toBe(true)

        useNotificationStore.getState().reset()
        const s = useNotificationStore.getState()
        expect(s.hasHydrated).toBe(false)
        expect(s.workoutRemindersEnabled).toBe(DEFAULT_NOTIFICATION_PREFS.workoutRemindersEnabled)
        expect(s.reminderDays).toEqual(DEFAULT_NOTIFICATION_PREFS.reminderDays)
        expect(s.reminderTime).toEqual(DEFAULT_NOTIFICATION_PREFS.reminderTime)
        expect(s.restTimerAlertEnabled).toBe(DEFAULT_NOTIFICATION_PREFS.restTimerAlertEnabled)
        expect(s.restDurationSec).toBe(DEFAULT_NOTIFICATION_PREFS.restDurationSec)
        expect(s.pausedWorkoutReminderEnabled).toBe(DEFAULT_NOTIFICATION_PREFS.pausedWorkoutReminderEnabled)
    })

    test('reset then hydrate models an account switch cleanly', () => {
        // User A's prefs in memory
        useNotificationStore.getState().hydrate({ restDurationSec: 180, reminderDays: [2] })
        // Identity change: reset, then hydrate user B's partial prefs
        useNotificationStore.getState().reset()
        useNotificationStore.getState().hydrate({ restDurationSec: 60 })
        const s = useNotificationStore.getState()
        expect(s.hasHydrated).toBe(true)
        expect(s.restDurationSec).toBe(60)
        // A's reminderDays must not leak through the partial hydrate
        expect(s.reminderDays).toEqual(DEFAULT_NOTIFICATION_PREFS.reminderDays)
    })

    test('toggleReminderDay adds then removes a day, kept sorted', () => {
        const { toggleReminderDay } = useNotificationStore.getState()
        toggleReminderDay(6) // Friday
        toggleReminderDay(2) // Monday
        expect(useNotificationStore.getState().reminderDays).toEqual([2, 6])
        toggleReminderDay(6)
        expect(useNotificationStore.getState().reminderDays).toEqual([2])
    })

    test('setters update their fields', () => {
        const s = useNotificationStore.getState()
        s.setWorkoutRemindersEnabled(true)
        s.setReminderTime({ hour: 7, minute: 30 })
        s.setRestTimerAlertEnabled(false)
        s.setRestDurationSec(120)
        s.setPausedWorkoutReminderEnabled(false)
        const after = useNotificationStore.getState()
        expect(after.workoutRemindersEnabled).toBe(true)
        expect(after.reminderTime).toEqual({ hour: 7, minute: 30 })
        expect(after.restTimerAlertEnabled).toBe(false)
        expect(after.restDurationSec).toBe(120)
        expect(after.pausedWorkoutReminderEnabled).toBe(false)
    })
})
