import { NotificationPrefs, useNotificationStore } from '../../store/notification-store'
import { useUser } from '@clerk/expo'
import { useCallback, useEffect, useRef, useState } from 'react'

export function useNotificationPrefsSync() {
    const { user } = useUser()
    const hydrate = useNotificationStore((s) => s.hydrate)

    const workoutRemindersEnabled = useNotificationStore((s) => s.workoutRemindersEnabled)
    const reminderDays = useNotificationStore((s) => s.reminderDays)
    const reminderTime = useNotificationStore((s) => s.reminderTime)
    const restTimerAlertEnabled = useNotificationStore((s) => s.restTimerAlertEnabled)
    const restDurationSec = useNotificationStore((s) => s.restDurationSec)
    const pausedWorkoutReminderEnabled = useNotificationStore((s) => s.pausedWorkoutReminderEnabled)

    const [isRefreshing, setIsRefreshing] = useState(false)

    // Always points to the latest user — used inside timeouts to avoid stale closures
    const userRef = useRef(user)
    useEffect(() => { userRef.current = user }, [user])

    // Guards: hydratedRef prevents re-hydration when Clerk refreshes the user
    // reference after our own user.update() writes (which caused the revert bug).
    const hydratedRef = useRef(false)
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    const applyPrefs = useCallback((u: typeof user) => {
        if (!u) return
        const saved = u.unsafeMetadata?.notificationPrefs as NotificationPrefs | undefined
        if (saved) hydrate(saved)
    }, [hydrate])

    // Hydrate exactly once — when user first becomes available on mount.
    // NOT reactive to subsequent user-ref changes (those come from our own writes).
    useEffect(() => {
        if (hydratedRef.current || !user) return
        applyPrefs(user)
        hydratedRef.current = true
    }, [user, applyPrefs])

    // Explicit refresh: reload from server, bypasses the hydration guard.
    const refresh = useCallback(async () => {
        const u = userRef.current
        if (!u) return
        setIsRefreshing(true)
        await u.reload()                 // updates u.unsafeMetadata in place
        applyPrefs(u)
        setIsRefreshing(false)
    }, [applyPrefs])

    // Debounced write-back — deps are pref values only, NOT user.
    // This ensures the effect never fires because Clerk refreshed the user ref;
    // it only fires when the user actually changed a preference.
    useEffect(() => {
        if (!hydratedRef.current) return
        if (timerRef.current) clearTimeout(timerRef.current)
        timerRef.current = setTimeout(() => {
            const u = userRef.current
            if (!u) return
            void u.update({
                unsafeMetadata: {
                    ...u.unsafeMetadata,
                    notificationPrefs: {
                        workoutRemindersEnabled,
                        reminderDays,
                        reminderTime,
                        restTimerAlertEnabled,
                        restDurationSec,
                        pausedWorkoutReminderEnabled,
                    } satisfies NotificationPrefs,
                },
            })
        }, 500)
        return () => { if (timerRef.current) clearTimeout(timerRef.current) }
    }, [workoutRemindersEnabled, reminderDays, reminderTime, restTimerAlertEnabled, restDurationSec, pausedWorkoutReminderEnabled])

    return { refresh, isRefreshing }
}
