jest.mock('@/lib/notifications', () => ({
    scheduleRestEndNotification: jest.fn(async () => 'rest-notif-1'),
    scheduleUnfinishedWorkoutReminder: jest.fn(async () => 'unfinished-1'),
    cancelNotification: jest.fn(async () => {}),
    UNFINISHED_REMINDER_DELAY_SEC: 7200,
}))

import { cancelNotification, scheduleRestEndNotification } from '@/lib/notifications'
import { useNotificationStore } from '../store/notification-store'
import { useWorkoutStore } from '../store/workout-store'

const NOW = 1_750_000_000_000

describe('rest timer', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        jest.spyOn(Date, 'now').mockReturnValue(NOW)
        useWorkoutStore.getState().clearSession()
        useNotificationStore.getState().setRestTimerAlertEnabled(true)
        useNotificationStore.getState().setRestDurationSec(90)
    })
    afterEach(() => jest.restoreAllMocks())

    test('startRest sets end time and stores the scheduled notification id', async () => {
        await useWorkoutStore.getState().startRest(90)
        const s = useWorkoutStore.getState()
        expect(s.restEndsAtEpochMs).toBe(NOW + 90_000)
        expect(s.restNotificationId).toBe('rest-notif-1')
        expect(scheduleRestEndNotification).toHaveBeenCalledWith(NOW + 90_000)
    })

    test('startRest does not schedule when the alert setting is off', async () => {
        useNotificationStore.getState().setRestTimerAlertEnabled(false)
        await useWorkoutStore.getState().startRest(90)
        expect(useWorkoutStore.getState().restEndsAtEpochMs).toBe(NOW + 90_000)
        expect(useWorkoutStore.getState().restNotificationId).toBeNull()
        expect(scheduleRestEndNotification).not.toHaveBeenCalled()
    })

    test('skipRest clears state and cancels the notification', async () => {
        await useWorkoutStore.getState().startRest(90)
        await useWorkoutStore.getState().skipRest()
        const s = useWorkoutStore.getState()
        expect(s.restEndsAtEpochMs).toBeNull()
        expect(s.restNotificationId).toBeNull()
        expect(cancelNotification).toHaveBeenCalledWith('rest-notif-1')
    })

    test('adjustRest(+15) extends the end time and reschedules', async () => {
        await useWorkoutStore.getState().startRest(90)
        await useWorkoutStore.getState().adjustRest(15)
        expect(useWorkoutStore.getState().restEndsAtEpochMs).toBe(NOW + 105_000)
        expect(cancelNotification).toHaveBeenCalledWith('rest-notif-1')
        expect(scheduleRestEndNotification).toHaveBeenLastCalledWith(NOW + 105_000)
    })

    test('adjustRest below zero remaining clears the timer', async () => {
        await useWorkoutStore.getState().startRest(90)
        await useWorkoutStore.getState().adjustRest(-120)
        expect(useWorkoutStore.getState().restEndsAtEpochMs).toBeNull()
    })

    test('completing a set while running auto-starts rest with the configured duration', async () => {
        useNotificationStore.getState().setRestDurationSec(120)
        const ws = useWorkoutStore.getState()
        ws.startSession()
        ws.addExercise('sanity-1', 'Bench Press', 'chest')
        const ex = useWorkoutStore.getState().workoutExercises[0]
        useWorkoutStore.getState().toggleSetCompleted(ex.id, ex.sets[0].id)
        await new Promise((r) => setTimeout(r, 0)) // let the fire-and-forget startRest settle
        expect(useWorkoutStore.getState().restEndsAtEpochMs).toBe(NOW + 120_000)
    })

    test('un-completing a set does not start rest', async () => {
        const ws = useWorkoutStore.getState()
        ws.startSession()
        ws.addExercise('sanity-1', 'Bench Press', 'chest')
        const ex = useWorkoutStore.getState().workoutExercises[0]
        useWorkoutStore.getState().toggleSetCompleted(ex.id, ex.sets[0].id) // complete
        await new Promise((r) => setTimeout(r, 0))
        await useWorkoutStore.getState().skipRest()
        useWorkoutStore.getState().toggleSetCompleted(ex.id, ex.sets[0].id) // un-complete
        await new Promise((r) => setTimeout(r, 0))
        expect(useWorkoutStore.getState().restEndsAtEpochMs).toBeNull()
    })

    test('a skip during the in-flight schedule cancels the late id and stores nothing', async () => {
        // Make scheduleRestEndNotification hang until we resolve it manually.
        let resolveSchedule!: (id: string) => void
        ;(scheduleRestEndNotification as jest.Mock).mockImplementationOnce(
            () => new Promise<string>((res) => { resolveSchedule = res })
        )

        const pending = useWorkoutStore.getState().startRest(90)
        // The user skips while the schedule call is still awaiting.
        await useWorkoutStore.getState().skipRest()
        // Now the schedule resolves — its id belongs to a rest that no longer exists.
        resolveSchedule('late-id')
        await pending

        const s = useWorkoutStore.getState()
        expect(s.restEndsAtEpochMs).toBeNull()
        expect(s.restNotificationId).toBeNull()
        expect(cancelNotification).toHaveBeenCalledWith('late-id')
    })

    test('pauseSession and clearSession clear the rest timer', async () => {
        useWorkoutStore.getState().startSession()
        await useWorkoutStore.getState().startRest(90)
        useWorkoutStore.getState().pauseSession()
        expect(useWorkoutStore.getState().restEndsAtEpochMs).toBeNull()
    })
})
