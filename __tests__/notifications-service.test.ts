jest.mock('expo-notifications', () => ({
    setNotificationHandler: jest.fn(),
    setNotificationChannelAsync: jest.fn(async () => null),
    getPermissionsAsync: jest.fn(async () => ({ granted: true, canAskAgain: true })),
    requestPermissionsAsync: jest.fn(async () => ({ granted: true })),
    getAllScheduledNotificationsAsync: jest.fn(async () => []),
    scheduleNotificationAsync: jest.fn(async () => 'notif-id'),
    cancelScheduledNotificationAsync: jest.fn(async () => {}),
    SchedulableTriggerInputTypes: { WEEKLY: 'weekly', DATE: 'date', TIME_INTERVAL: 'timeInterval' },
    AndroidImportance: { HIGH: 4 },
}))

import * as Notifications from 'expo-notifications'
import {
    cancelNotification,
    rescheduleWorkoutReminders,
    scheduleRestEndNotification,
} from '@/lib/notifications'

const mocked = Notifications as jest.Mocked<typeof Notifications>

describe('notification service', () => {
    beforeEach(() => jest.clearAllMocks())

    test('rescheduleWorkoutReminders cancels old reminders and schedules one per day', async () => {
        mocked.getAllScheduledNotificationsAsync.mockResolvedValueOnce([
            { identifier: 'old-1', content: { data: { type: 'workout-reminder' } } },
            { identifier: 'other', content: { data: { type: 'rest-end' } } },
        ] as never)

        await rescheduleWorkoutReminders({ enabled: true, days: [2, 4, 6], hour: 18, minute: 0 })

        expect(mocked.cancelScheduledNotificationAsync).toHaveBeenCalledTimes(1)
        expect(mocked.cancelScheduledNotificationAsync).toHaveBeenCalledWith('old-1')
        expect(mocked.scheduleNotificationAsync).toHaveBeenCalledTimes(3)
        expect(mocked.scheduleNotificationAsync).toHaveBeenCalledWith(
            expect.objectContaining({
                trigger: expect.objectContaining({ type: 'weekly', weekday: 2, hour: 18, minute: 0 }),
            })
        )
    })

    test('rescheduleWorkoutReminders with enabled=false only cancels', async () => {
        await rescheduleWorkoutReminders({ enabled: false, days: [2], hour: 18, minute: 0 })
        expect(mocked.scheduleNotificationAsync).not.toHaveBeenCalled()
    })

    test('scheduleRestEndNotification returns null without permission', async () => {
        mocked.getPermissionsAsync.mockResolvedValueOnce({ granted: false, canAskAgain: false } as never)
        const id = await scheduleRestEndNotification(Date.now() + 90_000)
        expect(id).toBeNull()
        expect(mocked.scheduleNotificationAsync).not.toHaveBeenCalled()
    })

    test('scheduleRestEndNotification schedules a DATE trigger and returns the id', async () => {
        const endsAt = Date.now() + 90_000
        const id = await scheduleRestEndNotification(endsAt)
        expect(id).toBe('notif-id')
        expect(mocked.scheduleNotificationAsync).toHaveBeenCalledWith(
            expect.objectContaining({
                trigger: expect.objectContaining({ type: 'date', date: new Date(endsAt) }),
            })
        )
    })

    test('cancelNotification is null-safe and swallows errors', async () => {
        await cancelNotification(null)
        expect(mocked.cancelScheduledNotificationAsync).not.toHaveBeenCalled()
        mocked.cancelScheduledNotificationAsync.mockRejectedValueOnce(new Error('gone'))
        await expect(cancelNotification('already-fired')).resolves.toBeUndefined()
    })
})
