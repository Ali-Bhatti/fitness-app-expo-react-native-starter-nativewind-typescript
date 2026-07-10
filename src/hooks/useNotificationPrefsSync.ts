import { rescheduleWorkoutReminders } from '@/lib/notifications'
import { NotificationPrefs, useNotificationStore } from '../../store/notification-store'
import { useUser } from '@clerk/expo'
import { useCallback, useEffect, useRef, useState } from 'react'

// ─── Root hydration ─────────────────────────────────────────────────────────

/**
 * Mounted once at the app root (inside NotificationsBootstrap). Pulls the saved
 * notification prefs out of Clerk `unsafeMetadata` into the store exactly once,
 * flipping `hasHydrated` so every consumer stops reading in-memory defaults.
 *
 * On a fresh device with stored prefs it also (re)schedules the OS workout
 * reminders so they survive a reinstall without opening the settings screen.
 */
export function useNotificationPrefsHydration() {
    const { user, isLoaded } = useUser()
    const hydrate = useNotificationStore((s) => s.hydrate)
    const markHydrated = useNotificationStore((s) => s.markHydrated)

    const doneRef = useRef(false)

    useEffect(() => {
        // Never mark hydrated while Clerk is still resolving — consumers must keep waiting.
        if (doneRef.current || !isLoaded) return
        doneRef.current = true

        const saved = user?.unsafeMetadata?.notificationPrefs as NotificationPrefs | undefined
        if (!saved) {
            // Signed-out, or a user with no stored prefs — nothing to pull, but we're "done".
            markHydrated()
            return
        }

        hydrate(saved)
        // Reschedule with the values we just hydrated so a fresh install gets its OS
        // reminders back. The service no-ops when permission isn't granted.
        const s = useNotificationStore.getState()
        void rescheduleWorkoutReminders({
            enabled: s.workoutRemindersEnabled,
            days: s.reminderDays,
            hour: s.reminderTime.hour,
            minute: s.reminderTime.minute,
        })
    }, [isLoaded, user, hydrate, markHydrated])
}

// ─── Settings-screen write-back + refresh ────────────────────────────────────

/**
 * Used by the settings screen. Debounces pref changes back into Clerk and exposes
 * a pull-to-refresh that reloads the server copy. Hydration is handled separately
 * at the root (useNotificationPrefsHydration).
 */
export function useNotificationPrefsSync() {
    const { user } = useUser()

    const hasHydrated = useNotificationStore((s) => s.hasHydrated)
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

    const applyPrefs = useCallback((u: typeof user) => {
        if (!u) return
        const saved = u.unsafeMetadata?.notificationPrefs as NotificationPrefs | undefined
        if (saved) hydrate(saved)
    }, [hydrate])

    // Explicit pull-to-refresh: reload from server. try/finally keeps the spinner honest.
    const refresh = useCallback(async () => {
        const u = userRef.current
        if (!u) return
        setIsRefreshing(true)
        try {
            await u.reload()             // updates u.unsafeMetadata in place
            applyPrefs(u)
        } catch (e) {
            console.warn('Failed to refresh notification prefs', e)
        } finally {
            setIsRefreshing(false)
        }
    }, [applyPrefs])

    // Debounced write-back — deps are pref values only, NOT user, so it never fires
    // because Clerk refreshed the user ref; only when the user changed a preference.
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const pendingWriteRef = useRef<(() => void) | null>(null)
    // Skip the first run after hydration (mount) so opening the screen doesn't write.
    const firstRunSkippedRef = useRef(false)

    useEffect(() => {
        if (!hasHydrated) return
        if (!firstRunSkippedRef.current) {
            firstRunSkippedRef.current = true
            return
        }

        const prefs: NotificationPrefs = {
            workoutRemindersEnabled,
            reminderDays,
            reminderTime,
            restTimerAlertEnabled,
            restDurationSec,
            pausedWorkoutReminderEnabled,
        }
        const write = () => {
            const u = userRef.current
            if (!u) return
            void u.update({
                unsafeMetadata: { ...u.unsafeMetadata, notificationPrefs: prefs },
            }).catch((e) => console.warn('Failed to save notification prefs', e))
        }

        pendingWriteRef.current = write
        if (timerRef.current) clearTimeout(timerRef.current)
        timerRef.current = setTimeout(() => {
            pendingWriteRef.current = null
            write()
        }, 500)
    }, [hasHydrated, workoutRemindersEnabled, reminderDays, reminderTime, restTimerAlertEnabled, restDurationSec, pausedWorkoutReminderEnabled])

    // Flush any pending debounced write on unmount instead of dropping it.
    useEffect(() => {
        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current)
                timerRef.current = null
            }
            pendingWriteRef.current?.()
            pendingWriteRef.current = null
        }
    }, [])

    return { refresh, isRefreshing }
}
