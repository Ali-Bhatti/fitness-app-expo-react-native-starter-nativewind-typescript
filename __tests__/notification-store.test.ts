import { useNotificationStore, REST_DURATION_PRESETS } from '../store/notification-store'

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
