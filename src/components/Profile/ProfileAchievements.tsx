import { sanityClient } from '@/lib/sanity/client'
import { PROFILE_WORKOUTS_QUERY_RESULT } from '@/lib/sanity/types'
import AntDesign from '@expo/vector-icons/AntDesign'
import groq from 'groq'
import React, { useEffect, useState } from 'react'
import { ScrollView, Text, View } from 'react-native'

const ACHIEVEMENTS_WORKOUTS_QUERY = groq`*[_type == "workout" && userId == $userId] {
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

type Achievement = {
    label: string
    icon: React.ComponentProps<typeof AntDesign>['name']
    color: string
    bg: string
    unlocked: boolean
    subtitle: string
}

type Props = {
    userId: string
    refreshKey?: number
}

function AchievementBadge({ label, icon, color, bg, unlocked, subtitle }: Achievement) {
    return (
        <View className='items-center w-[72px]'>
            <View
                className='w-14 h-14 rounded-2xl items-center justify-center mb-1.5'
                style={{ backgroundColor: unlocked ? bg : '#F3F4F6' }}
            >
                <AntDesign name={icon} size={24} color={unlocked ? color : '#D1D5DB'} />
                {!unlocked && (
                    <View className='absolute bottom-0 right-0 w-4 h-4 rounded-full bg-gray-300 items-center justify-center'>
                        <AntDesign name='lock' size={8} color='#9CA3AF' />
                    </View>
                )}
            </View>
            <Text
                className='text-xs font-semibold text-center leading-tight'
                style={{ color: unlocked ? '#374151' : '#9CA3AF' }}
                numberOfLines={2}
            >
                {label}
            </Text>
            <Text className='text-[10px] text-gray-400 text-center mt-0.5'>{subtitle}</Text>
        </View>
    )
}

export default function ProfileAchievements({ userId, refreshKey = 0 }: Props) {
    const [workouts, setWorkouts] = useState<WorkoutSummary[]>([])

    useEffect(() => {
        let cancelled = false
        sanityClient
            .fetch<PROFILE_WORKOUTS_QUERY_RESULT>(ACHIEVEMENTS_WORKOUTS_QUERY, { userId })
            .then((data) => { if (!cancelled) setWorkouts(data) })
            .catch((err) => console.error('Error fetching achievements data:', err))
        return () => { cancelled = true }
    }, [userId, refreshKey])

    const totalWorkouts = workouts.length
    const streak = getCurrentStreak(workouts)
    const daysActive = getDaysActive(workouts)

    const achievements: Achievement[] = [
        { label: 'First Step', icon: 'rocket1', color: '#8B5CF6', bg: '#EDE9FE', unlocked: totalWorkouts >= 1, subtitle: '1 workout' },
        { label: '5 Workouts', icon: 'like2', color: '#F97316', bg: '#FFF7ED', unlocked: totalWorkouts >= 5, subtitle: '5 workouts' },
        { label: 'Dedicated', icon: 'Trophy', color: '#F59E0B', bg: '#FFFBEB', unlocked: totalWorkouts >= 10, subtitle: '10 workouts' },
        { label: 'On a Roll', icon: 'calendar', color: '#10B981', bg: '#ECFDF5', unlocked: streak >= 3, subtitle: '3-day streak' },
        { label: 'Week Warrior', icon: 'star', color: '#0a7ea4', bg: '#E0F2FE', unlocked: daysActive >= 7, subtitle: '7 days active' },
        { label: 'Champion', icon: 'Safety', color: '#EF4444', bg: '#FEF2F2', unlocked: totalWorkouts >= 25, subtitle: '25 workouts' },
    ]

    return (
        <View>
            <Text className='text-base font-bold text-gray-900 px-4 mb-3'>Achievements</Text>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}
            >
                {achievements.map((a, i) => (
                    <AchievementBadge key={i} {...a} />
                ))}
            </ScrollView>
        </View>
    )
}
