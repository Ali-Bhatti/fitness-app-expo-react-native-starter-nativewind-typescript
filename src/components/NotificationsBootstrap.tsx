import { useNotificationPrefsHydration } from '@/hooks/useNotificationPrefsSync'
import { initNotifications } from '@/lib/notifications'
import { useWorkoutStore } from '../../store/workout-store'
import * as Notifications from 'expo-notifications'
import { router, useRootNavigationState } from 'expo-router'
import { useCallback, useEffect, useRef } from 'react'
import { AppState, Platform } from 'react-native'

/**
 * Mounted once in the root layout. Renders nothing.
 * - Hydrates notification prefs from Clerk at startup (all platforms)
 * - On native only (expo-notifications has no web implementation):
 *   - Installs the foreground notification handler + Android channel
 *   - Deep-links notification taps to the screen in `data.url` (cold start + foreground)
 *   - Schedules/cancels the unfinished-workout reminder on background/foreground
 */
export default function NotificationsBootstrap() {
    // Pull saved prefs into the store once Clerk is loaded (see hook for details).
    // Runs on web too — the store drives the in-app countdown, not just notifications.
    useNotificationPrefsHydration()

    // Hooks can't be conditional, but a child component can be: keep every
    // expo-notifications hook off the web render tree entirely.
    if (Platform.OS === 'web') return null
    return <NativeNotifications />
}

function NativeNotifications() {
    const syncUnfinishedWorkoutReminder = useWorkoutStore((s) => s.syncUnfinishedWorkoutReminder)

    // Router readiness signal — router.push is a no-op / crashes before this exists.
    const navigationState = useRootNavigationState()
    // The response that launched the app from a killed state (also returns foreground taps).
    const lastResponse = Notifications.useLastNotificationResponse()

    // Guard so a response is only navigated once, no matter which path delivers it.
    const handledResponseIds = useRef<Set<string>>(new Set())

    const handleResponse = useCallback((response: Notifications.NotificationResponse) => {
        const id = response.notification.request.identifier
        if (handledResponseIds.current.has(id)) return
        handledResponseIds.current.add(id)
        const url = response.notification.request.content.data?.url
        if (typeof url === 'string') router.push(url as never)
    }, [])

    // Foreground taps: listener exists while the app is running.
    useEffect(() => {
        initNotifications()

        const responseSub = Notifications.addNotificationResponseReceivedListener(handleResponse)

        const appStateSub = AppState.addEventListener('change', (next) => {
            if (next === 'background') void syncUnfinishedWorkoutReminder('background')
            else if (next === 'active') void syncUnfinishedWorkoutReminder('active')
        })

        return () => {
            responseSub.remove()
            appStateSub.remove()
        }
    }, [syncUnfinishedWorkoutReminder, handleResponse])

    // Cold-start tap: the launching response is delivered before the listener above exists.
    // Wait for the router to be ready, then navigate (the handled-id guard prevents a
    // double-navigation with the foreground listener).
    useEffect(() => {
        if (!lastResponse || !navigationState?.key) return
        handleResponse(lastResponse)
    }, [lastResponse, navigationState?.key, handleResponse])

    return null
}
