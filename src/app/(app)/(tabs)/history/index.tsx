import { useAuth } from '@clerk/expo'
import AntDesign from '@expo/vector-icons/AntDesign'
import groq from 'groq'
import React, { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, FlatList, RefreshControl, Text, View } from 'react-native'
import FTCard from '@/components/FTCard'
import { SafeAreaView } from 'react-native-safe-area-context'
import TabHeader from '@/components/TabHeader'
import WorkoutCard from '@/components/WorkoutCard'
import { sanityClient } from '@/lib/sanity/client'
import { GET_WORKOUTS_QUERY_RESULT } from '@/lib/sanity/types'
import { useLocalSearchParams, useRouter } from 'expo-router'

const GET_WORKOUTS_QUERY = groq`*[_type == "workout" && userId == $userId] | order(date desc) {
    _id,
    date,
    duration,
    exercises[] {
        exercise->{
            _id,
            name,
            target,
            bodyPart
        },
        sets[] {
            reps,
            weight,
            weightUnit
        }
    }
}`

export default function HistoryPage() {
    const { userId } = useAuth()
    const [workouts, setWorkouts] = useState<GET_WORKOUTS_QUERY_RESULT>([])
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const { refresh } = useLocalSearchParams();
    const router = useRouter();

    const fetchWorkouts = useCallback(async (isRefresh = false) => {
        if (!userId) return
        if (isRefresh) setRefreshing(true)
        try {
            const data = await sanityClient.fetch<GET_WORKOUTS_QUERY_RESULT>(GET_WORKOUTS_QUERY, { userId })
            setWorkouts(data)
        } catch (err) {
            console.error('Error fetching workout history:', err)
        } finally {
            if (isRefresh) setRefreshing(false)
            else setLoading(false)
        }
    }, [userId])

    useEffect(() => {
        fetchWorkouts()
    }, [fetchWorkouts])

    // if anything changes and we go to history tab then it should be refreshed.
    useEffect(() => {
        if (refresh) {
            fetchWorkouts(true)
            router.replace('(app)/(tabs)/history')
        }
    }, [refresh]);

    if (loading) {
        return (
            <SafeAreaView className='flex-1 bg-gray-50 items-center justify-center' edges={['top']}>
                <ActivityIndicator size='large' color='#0a7ea4' />
            </SafeAreaView>
        )
    }

    return (
        <SafeAreaView className='flex-1 bg-gray-50' edges={['top']}>
            <TabHeader
                title='Workout History'
                subtitle={workouts.length > 0 ? `${workouts.length} workout${workouts.length !== 1 ? 's' : ''} completed` : undefined}
            />

            <FlatList
                data={workouts}
                keyExtractor={(item) => item._id}
                renderItem={({ item }) => (
                    <WorkoutCard
                        workout={item}
                        maxExercises={3}
                        onPress={() => router.push({ pathname: `/history/workout-record`, params: { workoutId: item._id } })}
                    />
                )}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 32, paddingTop: 4 }}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={() => fetchWorkouts(true)} tintColor='#0a7ea4' title='Pull to refresh workouts' />
                }
                ListEmptyComponent={
                    <FTCard className='mx-4 mt-8 items-center py-8'>
                        <View className='w-16 h-16 rounded-full bg-gray-200 items-center justify-center mb-4'>
                            <AntDesign name='clockcircleo' size={28} color='#9CA3AF' />
                        </View>
                        <Text className='text-lg font-semibold text-gray-700 mb-1'>No workouts yet</Text>
                        <Text className='text-sm text-gray-400 text-center'>
                            Complete your first workout and it will show up here
                        </Text>
                    </FTCard>
                }
            />
        </SafeAreaView>
    )
}
