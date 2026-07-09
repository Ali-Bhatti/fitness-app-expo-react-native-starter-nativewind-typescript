import { initNotifications } from '@/lib/notifications'
import { useWorkoutStore } from '../../store/workout-store'
import * as Notifications from 'expo-notifications'
import { router } from 'expo-router'
import { useEffect } from 'react'
import { AppState, Platform } from 'react-native'

/**
 * Mounted once in the root layout. Renders nothing.
 * - Installs the foreground notification handler + Android channel
 * - Deep-links notification taps to the screen in `data.url`
 * - Schedules/cancels the unfinished-workout reminder on background/foreground
 */
export default function NotificationsBootstrap() {
    const syncUnfinishedWorkoutReminder = useWorkoutStore((s) => s.syncUnfinishedWorkoutReminder)

    useEffect(() => {
        if (Platform.OS === 'web') return

        initNotifications()

        const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
            const url = response.notification.request.content.data?.url
            if (typeof url === 'string') router.push(url as never)
        })

        const appStateSub = AppState.addEventListener('change', (next) => {
            if (next === 'background') void syncUnfinishedWorkoutReminder('background')
            else if (next === 'active') void syncUnfinishedWorkoutReminder('active')
        })

        return () => {
            responseSub.remove()
            appStateSub.remove()
        }
    }, [syncUnfinishedWorkoutReminder])

    return null
}
