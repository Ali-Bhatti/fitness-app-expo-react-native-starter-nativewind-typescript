import FTCard from '@/components/FTCard'
import { sanityClient } from '@/lib/sanity/client'
import { PROFILE_WORKOUTS_QUERY_RESULT } from '@/lib/sanity/types'
import { formatDuration } from '@/lib/utils'
import AntDesign from '@expo/vector-icons/AntDesign'
import groq from 'groq'
import React, { useEffect, useState } from 'react'
import { ActivityIndicator, Text, View } from 'react-native'

const PROFILE_WORKOUTS_QUERY = groq`*[_type == "workout" && userId == $userId] {
  date,
  duration
}`

type WorkoutSummary = PROFILE_WORKOUTS_QUERY_RESULT[number]

function getDaysActive(workouts: WorkoutSummary[]): number {
    const unique = new Set(workouts.map((w) => w.date?.split('T')[0]).filter(Boolean))
    return unique.size
}

function getCurrentStreak(workouts: WorkoutSummary[]): number {
    if (!workouts.length) return 0
    const uniqueDays = Array.from(
        new Set(workouts.map((w) => w.date?.split('T')[0]).filter((d): d is string => Boolean(d)))
    ).sort((a, b) => b.localeCompare(a))

    let streak = 0
    let checkDate = new Date()
    checkDate.setHours(0, 0, 0, 0)

    for (const day of uniqueDays) {
        const d = new Date(day)
        d.setHours(0, 0, 0, 0)
        const diff = Math.round((checkDate.getTime() - d.getTime()) / 86400000)
        if (diff <= 1) { streak++; checkDate = d } else break
    }
    return streak
}

function getAvgDuration(workouts: WorkoutSummary[]): number {
    const valid = workouts.filter((w) => (w.duration ?? 0) > 0)
    if (!valid.length) return 0
    return valid.reduce((s, w) => s + (w.duration ?? 0), 0) / valid.length
}

type Props = {
    userId: string
    refreshKey?: number
}

function StatTile({
    value,
    label,
    icon,
}: {
    value: string
    label: string
    icon: React.ComponentProps<typeof AntDesign>['name']
}) {
    return (
        <View className='flex-1 bg-gray-50 rounded-2xl p-4'>
            <View className='flex-row items-center gap-2 mb-2'>
                <View className='w-7 h-7 rounded-lg bg-primary/10 items-center justify-center'>
                    <AntDesign name={icon} size={14} color='#0a7ea4' />
                </View>
                <Text className='text-xs text-gray-500 font-medium flex-1' numberOfLines={1}>
                    {label}
                </Text>
            </View>
            <Text className='text-2xl font-bold text-primary'>{value}</Text>
        </View>
    )
}

export default function ProfileFitnessStats({ userId, refreshKey = 0 }: Props) {
    const [workouts, setWorkouts] = useState<WorkoutSummary[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let cancelled = false
        setLoading(true)
        sanityClient
            .fetch<PROFILE_WORKOUTS_QUERY_RESULT>(PROFILE_WORKOUTS_QUERY, { userId })
            .then((data) => { if (!cancelled) { setWorkouts(data); setLoading(false) } })
            .catch((err) => { console.error('Error fetching fitness stats:', err); if (!cancelled) setLoading(false) })
        return () => { cancelled = true }
    }, [userId, refreshKey])

    const totalWorkouts = workouts.length
    const totalDuration = workouts.reduce((s, w) => s + (w.duration ?? 0), 0)
    const daysActive = getDaysActive(workouts)
    const streak = getCurrentStreak(workouts)
    const avgDuration = getAvgDuration(workouts)

    if (loading) {
        return (
            <FTCard className='items-center justify-center py-8'>
                <ActivityIndicator size='small' color='#0a7ea4' />
            </FTCard>
        )
    }

    return (
        <FTCard>
            <Text className='text-base font-bold text-gray-900 mb-4'>Your Fitness Stats</Text>

            <View className='gap-3 mb-3'>
                <View className='flex-row gap-3'>
                    <StatTile value={String(totalWorkouts)} label='Total Workouts' icon='Trophy' />
                    <StatTile value={formatDuration(totalDuration)} label='Total Time' icon='clockcircleo' />
                </View>
                <View className='flex-row gap-3'>
                    <StatTile value={String(daysActive)} label='Days Active' icon='calendar' />
                    <StatTile value={String(streak)} label='Day Streak' icon='star' />
                </View>
            </View>

            <View className='flex-row items-center justify-between bg-gray-50 rounded-xl px-4 py-3'>
                <Text className='text-sm text-gray-500'>Average duration</Text>
                <Text className='text-sm font-bold text-gray-900'>
                    {avgDuration > 0 ? formatDuration(Math.round(avgDuration)) : '—'}
                </Text>
            </View>
        </FTCard>
    )
}
