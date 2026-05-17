import FTCard from '@/components/FTCard'
import ProfileAchievements from '@/components/ProfileAchievements'
import ProfileFitnessStats from '@/components/ProfileFitnessStats'
import { sanityClient } from '@/lib/sanity/client'
import { HOME_LAST_WORKOUT_QUERY_RESULT } from '@/lib/sanity/types'
import { formatDuration, formatRelativeDate } from '@/lib/utils'
import { useAuth, useUser } from '@clerk/expo'
import AntDesign from '@expo/vector-icons/AntDesign'
import { defineQuery } from 'groq'
import React, { useCallback, useEffect, useState } from 'react'
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'

export const HOME_LAST_WORKOUT_QUERY = defineQuery(`
  *[_type == "workout" && userId == $userId] | order(date desc) [0] {
    _id,
    date,
    duration,
    exercises[] {
      "setCount": count(sets)
    }
  }
`)

function getGreeting(): string {
    const h = new Date().getHours()
    if (h < 12) return 'Good Morning'
    if (h < 17) return 'Good Afternoon'
    return 'Good Evening'
}

export default function HomePage() {
    const { userId } = useAuth()
    const { user } = useUser()
    const router = useRouter()
    const [lastWorkout, setLastWorkout] = useState<HOME_LAST_WORKOUT_QUERY_RESULT>(null)
    const [refreshKey, setRefreshKey] = useState(0)
    const [refreshing, setRefreshing] = useState(false)

    const fetchLastWorkout = useCallback(async () => {
        if (!userId) return
        try {
            const data = await sanityClient.fetch<HOME_LAST_WORKOUT_QUERY_RESULT>(
                HOME_LAST_WORKOUT_QUERY,
                { userId }
            )
            setLastWorkout(data)
        } catch (err) {
            console.error('Error fetching last workout:', err)
        }
    }, [userId])

    useEffect(() => { fetchLastWorkout() }, [fetchLastWorkout, refreshKey])

    const handleRefresh = () => {
        setRefreshing(true)
        setRefreshKey((k) => k + 1)
        setTimeout(() => setRefreshing(false), 800)
    }

    const firstName = user?.firstName ?? user?.fullName?.split(' ')[0] ?? 'Athlete'
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

    const lastWorkoutExerciseCount = lastWorkout?.exercises?.length ?? 0
    const lastWorkoutSetCount = lastWorkout?.exercises?.reduce((s, e) => s + (e.setCount ?? 0), 0) ?? 0

    return (
        <SafeAreaView className='flex-1 bg-gray-50' edges={['top']}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 32 }}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                        tintColor='#0a7ea4'
                        colors={['#0a7ea4']}
                    />
                }
            >
                {/* ── Greeting ── */}
                <View className='px-4 pt-4 pb-2'>
                    <Text className='text-sm text-gray-500'>{getGreeting()},</Text>
                    <Text className='text-3xl font-bold text-gray-900'>{firstName}!</Text>
                    <Text className='text-xs text-gray-400 mt-0.5'>{today}</Text>
                </View>

                {/* ── Compact stats ── */}
                {userId && (
                    <View className='px-4 mt-3'>
                        <ProfileFitnessStats userId={userId} refreshKey={refreshKey} variant='compact' />
                    </View>
                )}

                {/* ── Start Workout CTA ── */}
                <View className='px-4 mt-4'>
                    <Pressable
                        onPress={() => router.navigate('/(app)/(tabs)/workout')}
                        className='bg-primary rounded-2xl px-5 py-4 flex-row items-center justify-between active:opacity-90'
                    >
                        <View className='flex-row items-center gap-3'>
                            <View className='w-10 h-10 rounded-xl bg-white/20 items-center justify-center'>
                                <AntDesign name='caretright' size={18} color='white' />
                            </View>
                            <View>
                                <Text className='text-base font-bold text-white'>Start Workout</Text>
                                <Text className='text-xs text-white/70 mt-0.5'>Begin your training session</Text>
                            </View>
                        </View>
                        <AntDesign name='right' size={16} color='rgba(255,255,255,0.6)' />
                    </Pressable>
                </View>

                {/* ── Quick nav tiles ── */}
                <View className='px-4 mt-3 flex-row gap-3'>
                    <Pressable
                        className='flex-1 active:opacity-80'
                        onPress={() => router.navigate('/(app)/(tabs)/history')}
                    >
                        <FTCard className='items-center py-4 gap-2'>
                            <View className='w-10 h-10 rounded-xl bg-gray-100 items-center justify-center'>
                                <AntDesign name='clockcircleo' size={18} color='#6B7280' />
                            </View>
                            <Text className='text-sm font-semibold text-gray-700'>Workout History</Text>
                        </FTCard>
                    </Pressable>
                    <Pressable
                        className='flex-1 active:opacity-80'
                        onPress={() => router.navigate('/(app)/(tabs)/exercises')}
                    >
                        <FTCard className='items-center py-4 gap-2'>
                            <View className='w-10 h-10 rounded-xl bg-gray-100 items-center justify-center'>
                                <AntDesign name='book' size={18} color='#6B7280' />
                            </View>
                            <Text className='text-sm font-semibold text-gray-700'>Browse Exercises</Text>
                        </FTCard>
                    </Pressable>
                </View>

                {/* ── Last Workout ── */}
                <View className='px-4 mt-4'>
                    <Text className='text-base font-bold text-gray-900 mb-3'>Last Workout</Text>
                    {lastWorkout ? (
                        <Pressable
                            onPress={() => router.push({
                                pathname: '/history/workout-record',
                                params: { workoutId: lastWorkout._id },
                            })}
                            className='active:opacity-80'
                        >
                            <FTCard className='flex-row items-center justify-between'>
                                <View className='flex-row items-center gap-3 flex-1'>
                                    <View className='w-10 h-10 rounded-xl bg-primary/10 items-center justify-center'>
                                        <AntDesign name='heart' size={18} color='#0a7ea4' />
                                    </View>
                                    <View className='flex-1'>
                                        <Text className='text-sm font-bold text-gray-900'>
                                            {formatRelativeDate(lastWorkout.date)}
                                        </Text>
                                        <View className='flex-row items-center gap-1 mt-0.5'>
                                            <AntDesign name='clockcircleo' size={11} color='#9CA3AF' />
                                            <Text className='text-xs text-gray-500'>
                                                {formatDuration(lastWorkout.duration)}
                                            </Text>
                                        </View>
                                        <Text className='text-xs text-gray-400 mt-0.5'>
                                            {lastWorkoutExerciseCount} exercise{lastWorkoutExerciseCount !== 1 ? 's' : ''} · {lastWorkoutSetCount} set{lastWorkoutSetCount !== 1 ? 's' : ''}
                                        </Text>
                                    </View>
                                </View>
                                <AntDesign name='right' size={14} color='#D1D5DB' />
                            </FTCard>
                        </Pressable>
                    ) : (
                        <FTCard className='items-center py-6'>
                            <AntDesign name='Trophy' size={28} color='#D1D5DB' />
                            <Text className='text-sm text-gray-400 mt-2'>No workouts yet</Text>
                            <Text className='text-xs text-gray-400'>Complete your first workout to see it here</Text>
                        </FTCard>
                    )}
                </View>

                {/* ── Achievements ── */}
                {userId && (
                    <View className='mt-4'>
                        <ProfileAchievements userId={userId} refreshKey={refreshKey} />
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    )
}
