jest.mock('@/lib/notifications', () => ({
    scheduleRestEndNotification: jest.fn(async () => 'rest-notif-1'),
    scheduleUnfinishedWorkoutReminder: jest.fn(async () => 'unfinished-1'),
    cancelNotification: jest.fn(async () => {}),
    UNFINISHED_REMINDER_DELAY_SEC: 900,
}))

import { cancelNotification, scheduleUnfinishedWorkoutReminder } from '@/lib/notifications'
import { useNotificationStore } from '../store/notification-store'
import { useWorkoutStore } from '../store/workout-store'

describe('unfinished-workout reminder', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        useWorkoutStore.getState().clearSession()
        useNotificationStore.getState().setPausedWorkoutReminderEnabled(true)
    })

    test('backgrounding with a running workout schedules the reminder', async () => {
        useWorkoutStore.getState().startSession()
        await useWorkoutStore.getState().syncUnfinishedWorkoutReminder('background')
        expect(scheduleUnfinishedWorkoutReminder).toHaveBeenCalledTimes(1)
        expect(useWorkoutStore.getState().unfinishedReminderNotificationId).toBe('unfinished-1')
    })

    test('backgrounding with an idle session schedules nothing', async () => {
        await useWorkoutStore.getState().syncUnfinishedWorkoutReminder('background')
        expect(scheduleUnfinishedWorkoutReminder).not.toHaveBeenCalled()
    })

    test('backgrounding with the setting disabled schedules nothing', async () => {
        useNotificationStore.getState().setPausedWorkoutReminderEnabled(false)
        useWorkoutStore.getState().startSession()
        await useWorkoutStore.getState().syncUnfinishedWorkoutReminder('background')
        expect(scheduleUnfinishedWorkoutReminder).not.toHaveBeenCalled()
    })

    test('foregrounding cancels a pending reminder', async () => {
        useWorkoutStore.getState().startSession()
        await useWorkoutStore.getState().syncUnfinishedWorkoutReminder('background')
        await useWorkoutStore.getState().syncUnfinishedWorkoutReminder('active')
        expect(cancelNotification).toHaveBeenCalledWith('unfinished-1')
        expect(useWorkoutStore.getState().unfinishedReminderNotificationId).toBeNull()
    })

    test('clearSession cancels a pending reminder', async () => {
        useWorkoutStore.getState().startSession()
        await useWorkoutStore.getState().syncUnfinishedWorkoutReminder('background')
        useWorkoutStore.getState().clearSession()
        await new Promise((r) => setTimeout(r, 0))
        expect(cancelNotification).toHaveBeenCalledWith('unfinished-1')
    })
})
