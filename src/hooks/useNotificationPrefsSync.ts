import { rescheduleWorkoutReminders } from '@/lib/notifications'
import { NotificationPrefs, useNotificationStore } from '../../store/notification-store'
import { useUser } from '@clerk/expo'
import { useCallback, useEffect, useRef, useState } from 'react'

// ─── Root hydration ─────────────────────────────────────────────────────────

/**
 * Mounted once at the app root (inside NotificationsBootstrap). Pulls the saved
 * notification prefs out of Clerk `unsafeMetadata` into the store, flipping
 * `hasHydrated` so every consumer stops reading in-memory defaults.
 *
 * Hydration is keyed on the user id, not once-per-process: on every identity
 * transition (sign-in, account switch, sign-out) the store is reset to defaults
 * first so one user's prefs never leak into another's session, then the new
 * user's saved prefs (if any) are pulled.
 *
 * On a fresh device with stored prefs it also (re)schedules the OS workout
 * reminders so they survive a reinstall without opening the settings screen.
 */
export function useNotificationPrefsHydration() {
    const { user, isLoaded } = useUser()
    const hydrate = useNotificationStore((s) => s.hydrate)
    const markHydrated = useNotificationStore((s) => s.markHydrated)
    const reset = useNotificationStore((s) => s.reset)

    // Which user id we last hydrated for — undefined means "never run".
    // A one-shot boolean would lock on the signed-out first tick and skip
    // hydration when the user then signs in (or switches accounts).
    const hydratedUserIdRef = useRef<string | null | undefined>(undefined)

    useEffect(() => {
        // Never mark hydrated while Clerk is still resolving — consumers must keep waiting.
        if (!isLoaded) return

        const currentId = user?.id ?? null
        if (hydratedUserIdRef.current === currentId) return
        hydratedUserIdRef.current = currentId

        // Identity changed — drop the previous identity's in-memory prefs first.
        reset()

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
    }, [isLoaded, user, hydrate, markHydrated, reset])
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

    // Debounced write-back plumbing (used by the effects below)
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const pendingWriteRef = useRef<(() => void) | null>(null)
    // Skip the first run after each hydration so opening the screen (or a root
    // re-hydration after an account switch) doesn't echo-write hydrated values back.
    const firstRunSkippedRef = useRef(false)

    // Always points to the latest user — used inside timeouts to avoid stale closures
    const userRef = useRef(user)
    useEffect(() => {
        // Identity change (sign-out / account switch): drop any pending debounced
        // write — it holds the previous user's values — and re-arm the first-run
        // skip so the next hydration isn't echo-written back to Clerk.
        if (userRef.current?.id !== user?.id) {
            if (timerRef.current) {
                clearTimeout(timerRef.current)
                timerRef.current = null
            }
            pendingWriteRef.current = null
            firstRunSkippedRef.current = false
        }
        userRef.current = user
    }, [user])

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
    useEffect(() => {
        if (!hasHydrated) {
            // Re-hydration in progress (identity changed): drop any pending write —
            // it holds the previous identity's values — and re-arm the first-run skip.
            if (timerRef.current) {
                clearTimeout(timerRef.current)
                timerRef.current = null
            }
            pendingWriteRef.current = null
            firstRunSkippedRef.current = false
            return
        }
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
