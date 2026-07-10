jest.mock('@/lib/notifications', () => ({
    scheduleRestEndNotification: jest.fn(async () => 'rest-notif-1'),
    scheduleUnfinishedWorkoutReminder: jest.fn(async () => 'unfinished-1'),
    cancelNotification: jest.fn(async () => {}),
    UNFINISHED_REMINDER_DELAY_SEC: 7200,
}))

import { useWorkoutStore } from '../store/workout-store'

describe('workout-store session lifecycle', () => {
    beforeEach(() => {
        useWorkoutStore.getState().clearSession()
    })

    test('startSession puts the session in running state', () => {
        useWorkoutStore.getState().startSession()
        const s = useWorkoutStore.getState()
        expect(s.workoutStatus).toBe('running')
        expect(s.startedAtEpochMs).not.toBeNull()
        expect(s.workoutExercises).toEqual([])
    })

    test('pauseSession then clearSession returns to idle', () => {
        useWorkoutStore.getState().startSession()
        useWorkoutStore.getState().pauseSession()
        expect(useWorkoutStore.getState().workoutStatus).toBe('paused')
        useWorkoutStore.getState().clearSession()
        expect(useWorkoutStore.getState().workoutStatus).toBe('idle')
    })
})
