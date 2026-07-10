import FTCard from '@/components/FTComponents/FTCard'
import {
    ensurePermission,
    getPermissionGranted,
    rescheduleWorkoutReminders,
} from '@/lib/notifications'
import { REST_DURATION_PRESETS, useNotificationStore } from '../../../../../store/notification-store'
import { useNotificationPrefsSync } from '@/hooks/useNotificationPrefsSync'
import DateTimePicker from '@react-native-community/datetimepicker'
import AntDesign from '@expo/vector-icons/AntDesign'
import Constants, { ExecutionEnvironment } from 'expo-constants'
import { useFocusEffect } from 'expo-router'
import React, { useCallback, useEffect, useState } from 'react'
import { AppState, Linking, Platform, Pressable, RefreshControl, ScrollView, Switch, Text, View } from 'react-native'

// expo-notifications permission APIs are broken in Expo Go SDK 53 — always return false
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient

// Chips render Mon-first; values are expo weekday numbers (1 = Sunday … 7 = Saturday)
const DAY_CHIPS: { label: string; weekday: number }[] = [
    { label: 'Mon', weekday: 2 },
    { label: 'Tue', weekday: 3 },
    { label: 'Wed', weekday: 4 },
    { label: 'Thu', weekday: 5 },
    { label: 'Fri', weekday: 6 },
    { label: 'Sat', weekday: 7 },
    { label: 'Sun', weekday: 1 },
]

function formatTime(hour: number, minute: number): string {
    const h12 = hour % 12 === 0 ? 12 : hour % 12
    return `${h12}:${String(minute).padStart(2, '0')} ${hour < 12 ? 'AM' : 'PM'}`
}

export default function Notifications() {
    const {
        workoutRemindersEnabled,
        reminderDays,
        reminderTime,
        restTimerAlertEnabled,
        restDurationSec,
        pausedWorkoutReminderEnabled,
        setWorkoutRemindersEnabled,
        toggleReminderDay,
        setReminderTime,
        setRestTimerAlertEnabled,
        setRestDurationSec,
        setPausedWorkoutReminderEnabled,
        hasHydrated,
    } = useNotificationStore()

    const { refresh, isRefreshing } = useNotificationPrefsSync()

    const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null)
    const [showTimePicker, setShowTimePicker] = useState(false)

    // Re-check on focus (navigation) and on app foreground (returning from OS settings)
    useFocusEffect(
        useCallback(() => {
            void getPermissionGranted().then(setPermissionGranted)
        }, [])
    )

    useEffect(() => {
        const sub = AppState.addEventListener('change', (state) => {
            if (state === 'active') void getPermissionGranted().then(setPermissionGranted)
        })
        return () => sub.remove()
    }, [])

    // Any reminder-setting change → cancel-all + reschedule.
    // Wait for hydration: running with pre-hydration defaults (enabled: false) would
    // cancel the user's already-scheduled reminders.
    useEffect(() => {
        if (!hasHydrated) return
        void rescheduleWorkoutReminders({
            enabled: workoutRemindersEnabled,
            days: reminderDays,
            hour: reminderTime.hour,
            minute: reminderTime.minute,
        })
    }, [hasHydrated, workoutRemindersEnabled, reminderDays, reminderTime])

    const guardedEnable = (setter: (v: boolean) => void) => async (value: boolean) => {
        if (value && !isExpoGo && !permissionGranted) {
            const granted = await ensurePermission()
            setPermissionGranted(granted)
            if (!granted) return
        }
        setter(value)
    }

    const timeAsDate = new Date()
    timeAsDate.setHours(reminderTime.hour, reminderTime.minute, 0, 0)

    if (permissionGranted === false && !isExpoGo) {
        return (
            <ScrollView
                className='flex-1 bg-gray-50'
                contentContainerStyle={{ padding: 16 }}
                refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refresh} />}
            >
                <FTCard className='items-center py-10'>
                    <View className='w-16 h-16 rounded-full bg-primary/10 items-center justify-center mb-4'>
                        <AntDesign name='notification' size={26} color='#0a7ea4' />
                    </View>
                    <Text className='text-base font-semibold text-gray-700 mb-1'>Notifications are off</Text>
                    <Text className='text-sm text-gray-400 text-center mb-5'>
                        Enable notifications for FitTracker in your system settings to get workout
                        reminders and rest alerts.
                    </Text>
                    <Pressable
                        onPress={() => void Linking.openSettings()}
                        className='px-5 py-2.5 rounded-xl bg-primary active:opacity-80'
                    >
                        <Text className='font-semibold text-sm text-white'>Open Settings</Text>
                    </Pressable>
                </FTCard>
            </ScrollView>
        )
    }

    return (
        <ScrollView
            className='flex-1 bg-gray-50'
            contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
            refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refresh} />}
        >
            {/* ── Expo Go warning banner ── */}
            {isExpoGo && (
                <View className='flex-row items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 mb-3'>
                    <AntDesign name='infocirlceo' size={15} color='#D97706' style={{ marginTop: 1 }} />
                    <Text className='text-xs text-amber-700 flex-1'>
                        Notifications don't work in Expo Go. Use a dev build (<Text className='font-semibold'>npx expo run:android</Text>) to test them. Settings saved here will apply in the real app.
                    </Text>
                </View>
            )}

            {/* ── Workout reminders ── */}
            <FTCard className='mb-3'>
                <View className='flex-row items-center justify-between'>
                    <View className='flex-1 mr-3'>
                        <Text className='text-base font-bold text-gray-900'>Workout Reminders</Text>
                        <Text className='text-xs text-gray-400 mt-0.5'>
                            A nudge on your training days
                        </Text>
                    </View>
                    <Switch
                        value={workoutRemindersEnabled}
                        onValueChange={(v) => void guardedEnable(setWorkoutRemindersEnabled)(v)}
                        trackColor={{ true: '#0a7ea4' }}
                    />
                </View>

                {workoutRemindersEnabled && (
                    <>
                        {/* Day chips */}
                        <View className='flex-row justify-between mt-4'>
                            {DAY_CHIPS.map(({ label, weekday }) => {
                                const selected = reminderDays.includes(weekday)
                                return (
                                    <Pressable
                                        key={weekday}
                                        onPress={() => toggleReminderDay(weekday)}
                                        className={`w-10 h-10 rounded-full items-center justify-center ${selected ? 'bg-primary' : 'bg-gray-100'}`}
                                    >
                                        <Text className={`text-xs font-semibold ${selected ? 'text-white' : 'text-gray-500'}`}>
                                            {label}
                                        </Text>
                                    </Pressable>
                                )
                            })}
                        </View>

                        {/* Time row */}
                        <View className='flex-row items-center justify-between mt-4'>
                            <Text className='text-sm font-medium text-gray-600'>Reminder time</Text>
                            {Platform.OS === 'ios' ? (
                                <DateTimePicker
                                    value={timeAsDate}
                                    mode='time'
                                    display='compact'
                                    onChange={(_event, date) => {
                                        if (date) setReminderTime({ hour: date.getHours(), minute: date.getMinutes() })
                                    }}
                                />
                            ) : (
                                <Pressable
                                    onPress={() => setShowTimePicker(true)}
                                    className='px-3 py-1.5 rounded-lg bg-gray-100 active:bg-gray-200'
                                >
                                    <Text className='text-sm font-semibold text-primary'>
                                        {formatTime(reminderTime.hour, reminderTime.minute)}
                                    </Text>
                                </Pressable>
                            )}
                        </View>
                        {Platform.OS === 'android' && showTimePicker && (
                            <DateTimePicker
                                value={timeAsDate}
                                mode='time'
                                display='default'
                                onChange={(event, date) => {
                                    setShowTimePicker(false)
                                    if (event.type === 'set' && date) {
                                        setReminderTime({ hour: date.getHours(), minute: date.getMinutes() })
                                    }
                                }}
                            />
                        )}
                    </>
                )}
            </FTCard>

            {/* ── Rest timer ── */}
            <FTCard className='mb-3'>
                <View className='flex-row items-center justify-between'>
                    <View className='flex-1 mr-3'>
                        <Text className='text-base font-bold text-gray-900'>Rest Timer Alert</Text>
                        <Text className='text-xs text-gray-400 mt-0.5'>
                            Notify when rest is over and the app is in the background
                        </Text>
                    </View>
                    <Switch
                        value={restTimerAlertEnabled}
                        onValueChange={(v) => void guardedEnable(setRestTimerAlertEnabled)(v)}
                        trackColor={{ true: '#0a7ea4' }}
                    />
                </View>

                {/* Duration drives the in-app countdown regardless of the alert toggle,
                    so presets stay selectable even when the notification is off. */}
                <Text className='text-sm font-medium mt-4 mb-2 text-gray-600'>
                    Rest duration
                </Text>
                <View className='flex-row gap-2'>
                    {REST_DURATION_PRESETS.map((sec) => {
                        const selected = restDurationSec === sec
                        return (
                            <Pressable
                                key={sec}
                                onPress={() => setRestDurationSec(sec)}
                                className={`flex-1 py-2 rounded-xl items-center ${selected ? 'bg-primary' : 'bg-gray-100'}`}
                            >
                                <Text className={`text-sm font-semibold ${selected ? 'text-white' : 'text-gray-500'}`}>
                                    {sec < 120 ? `${sec}s` : `${sec / 60}m`}
                                </Text>
                            </Pressable>
                        )
                    })}
                </View>
            </FTCard>

            {/* ── Unfinished workout ── */}
            <FTCard>
                <View className='flex-row items-center justify-between'>
                    <View className='flex-1 mr-3'>
                        <Text className='text-base font-bold text-gray-900'>Unfinished Workout</Text>
                        <Text className='text-xs text-gray-400 mt-0.5'>
                            Remind me 15 minutes after leaving a workout unfinished
                        </Text>
                    </View>
                    <Switch
                        value={pausedWorkoutReminderEnabled}
                        onValueChange={(v) => void guardedEnable(setPausedWorkoutReminderEnabled)(v)}
                        trackColor={{ true: '#0a7ea4' }}
                    />
                </View>
            </FTCard>
        </ScrollView>
    )
}
