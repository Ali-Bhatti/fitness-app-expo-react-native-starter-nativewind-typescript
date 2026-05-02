import React from 'react'
import { Pressable, Text, View } from 'react-native'

export type Difficulty = 'beginner' | 'intermediate' | 'advanced'

export const DIFFICULTY_CONFIG: Record<
    Difficulty,
    { label: string; lightBg: string; solidBg: string; lightText: string }
> = {
    beginner: {
        label: 'Beginner',
        lightBg: 'bg-green-100',
        solidBg: 'bg-green-600',
        lightText: 'text-green-800',
    },
    intermediate: {
        label: 'Intermediate',
        lightBg: 'bg-yellow-100',
        solidBg: 'bg-yellow-500',
        lightText: 'text-yellow-800',
    },
    advanced: {
        label: 'Advanced',
        lightBg: 'bg-red-100',
        solidBg: 'bg-red-600',
        lightText: 'text-red-800',
    },
}

type Props = {
    difficulty: Difficulty
    /** When provided the badge becomes a pressable filter chip */
    onPress?: () => void
    /** Shows solid background — used for the active filter state */
    isActive?: boolean
}

export default function DifficultyBadge({ difficulty, onPress, isActive = false }: Props) {
    const config = DIFFICULTY_CONFIG[difficulty]
    if (!config) return null

    const bg = isActive ? config.solidBg : config.lightBg
    const textColor = isActive ? 'text-white' : config.lightText

    const badge = (
        <View className={`self-start rounded-full px-3 py-1 ${bg}`}>
            <Text className={`text-xs font-semibold ${textColor}`}>{config.label}</Text>
        </View>
    )

    if (onPress) {
        return (
            <Pressable onPress={onPress} className='active:opacity-70'>
                {badge}
            </Pressable>
        )
    }

    return badge
}
