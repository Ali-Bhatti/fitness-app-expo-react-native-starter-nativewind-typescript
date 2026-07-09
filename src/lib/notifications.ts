import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'

// ─── Constants ────────────────────────────────────────────────────────────────

/** How long after backgrounding an unfinished workout before we nudge (2 h) */
export const UNFINISHED_REMINDER_DELAY_SEC = 2 * 60 * 60

const WORKOUT_REMINDER_TYPE = 'workout-reminder'

export type ReminderSettings = {
    enabled: boolean
    /** expo-notifications weekday numbers: 1 = Sunday … 7 = Saturday */
    days: number[]
    hour: number
    minute: number
}

// expo-notifications has no web implementation — every entry point no-ops there
const unsupported = Platform.OS === 'web'

// ─── Setup ────────────────────────────────────────────────────────────────────

export function initNotifications(): void {
    if (unsupported) return
    Notifications.setNotificationHandler({
        handleNotification: async (notification) => {
            // Rest-end is suppressed while foregrounded: the in-app countdown already shows it
            const isRestEnd = notification.request.content.data?.type === 'rest-end'
            return {
                shouldShowBanner: !isRestEnd,
                shouldShowList: !isRestEnd,
                shouldPlaySound: !isRestEnd,
                shouldSetBadge: false,
            }
        },
    })
    if (Platform.OS === 'android') {
        void Notifications.setNotificationChannelAsync('default', {
            name: 'General',
            importance: Notifications.AndroidImportance.HIGH,
        })
    }
}

// ─── Permissions ──────────────────────────────────────────────────────────────

export async function getPermissionGranted(): Promise<boolean> {
    if (unsupported) return false
    const { granted } = await Notifications.getPermissionsAsync()
    return granted
}

export async function ensurePermission(): Promise<boolean> {
    if (unsupported) return false
    const current = await Notifications.getPermissionsAsync()
    if (current.granted) return true
    if (!current.canAskAgain) return false
    const requested = await Notifications.requestPermissionsAsync()
    return requested.granted
}

// ─── Workout reminders (weekly repeating) ─────────────────────────────────────

export async function rescheduleWorkoutReminders(settings: ReminderSettings): Promise<void> {
    if (unsupported) return
    // Cancel every existing reminder, then schedule fresh — simpler than diffing
    const scheduled = await Notifications.getAllScheduledNotificationsAsync()
    await Promise.all(
        scheduled
            .filter((n) => n.content.data?.type === WORKOUT_REMINDER_TYPE)
            .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier))
    )
    if (!settings.enabled || settings.days.length === 0) return
    if (!(await getPermissionGranted())) return
    await Promise.all(
        settings.days.map((weekday) =>
            Notifications.scheduleNotificationAsync({
                content: {
                    title: 'Time to train 💪',
                    body: 'Your scheduled workout is waiting.',
                    data: { type: WORKOUT_REMINDER_TYPE, url: '/(app)/(tabs)/workout' },
                },
                trigger: {
                    type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
                    weekday,
                    hour: settings.hour,
                    minute: settings.minute,
                },
            })
        )
    )
}

// ─── One-off notifications ────────────────────────────────────────────────────

export async function scheduleRestEndNotification(endsAtEpochMs: number): Promise<string | null> {
    if (unsupported || !(await getPermissionGranted())) return null
    return Notifications.scheduleNotificationAsync({
        content: {
            title: 'Rest over — next set! 💪',
            data: { type: 'rest-end', url: '/(app)/(tabs)/active-workout' },
        },
        trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: new Date(endsAtEpochMs),
        },
    })
}

export async function scheduleUnfinishedWorkoutReminder(): Promise<string | null> {
    if (unsupported || !(await getPermissionGranted())) return null
    return Notifications.scheduleNotificationAsync({
        content: {
            title: 'You have an unfinished workout',
            body: 'Resume or finish it before it goes stale.',
            data: { type: 'unfinished-workout', url: '/(app)/(tabs)/active-workout' },
        },
        trigger: {
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds: UNFINISHED_REMINDER_DELAY_SEC,
            repeats: false,
        },
    })
}

export async function cancelNotification(id: string | null): Promise<void> {
    if (unsupported || !id) return
    try {
        await Notifications.cancelScheduledNotificationAsync(id)
    } catch {
        // Already fired or already cancelled — nothing to do
    }
}
