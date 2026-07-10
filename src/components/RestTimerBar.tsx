import { useWorkoutStore } from '../../store/workout-store'
import AntDesign from '@expo/vector-icons/AntDesign'
import React, { useEffect, useState } from 'react'
import { Pressable, Text, View } from 'react-native'

/**
 * Countdown bar shown during rest between sets. Renders from the persisted
 * epoch end-time, so it survives backgrounding and app kills. Auto-clears
 * when the countdown reaches zero.
 */
export default function RestTimerBar() {
    const restEndsAtEpochMs = useWorkoutStore((s) => s.restEndsAtEpochMs)
    const skipRest = useWorkoutStore((s) => s.skipRest)
    const adjustRest = useWorkoutStore((s) => s.adjustRest)
    const [, setTick] = useState(0)

    const remainingSec = restEndsAtEpochMs
        ? Math.max(0, Math.ceil((restEndsAtEpochMs - Date.now()) / 1000))
        : 0

    useEffect(() => {
        if (!restEndsAtEpochMs) return
        const interval = setInterval(() => setTick((t) => t + 1), 1000)
        return () => clearInterval(interval)
    }, [restEndsAtEpochMs])

    useEffect(() => {
        if (restEndsAtEpochMs && remainingSec === 0) void skipRest()
    }, [restEndsAtEpochMs, remainingSec, skipRest])

    if (!restEndsAtEpochMs || remainingSec === 0) return null

    const mm = Math.floor(remainingSec / 60)
    const ss = String(remainingSec % 60).padStart(2, '0')

    return (
        <View className='flex-row items-center justify-between px-4 py-2.5 bg-primary/10 border-b border-primary/20'>
            <View className='flex-row items-center gap-2'>
                <AntDesign name='clockcircleo' size={16} color='#0a7ea4' />
                <Text className='text-sm font-semibold text-gray-700'>Rest</Text>
                <Text className='text-base font-bold text-primary tabular-nums'>{mm}:{ss}</Text>
            </View>
            <View className='flex-row items-center gap-2'>
                <Pressable
                    onPress={() => void adjustRest(-15)}
                    className='px-2.5 py-1.5 rounded-lg bg-white border border-gray-200 active:bg-gray-100'
                >
                    <Text className='text-xs font-semibold text-gray-600'>−15s</Text>
                </Pressable>
                <Pressable
                    onPress={() => void adjustRest(15)}
                    className='px-2.5 py-1.5 rounded-lg bg-white border border-gray-200 active:bg-gray-100'
                >
                    <Text className='text-xs font-semibold text-gray-600'>+15s</Text>
                </Pressable>
                <Pressable
                    onPress={() => void skipRest()}
                    className='px-3 py-1.5 rounded-lg bg-primary active:opacity-80'
                >
                    <Text className='text-xs font-bold text-white'>Skip</Text>
                </Pressable>
            </View>
        </View>
    )
}
