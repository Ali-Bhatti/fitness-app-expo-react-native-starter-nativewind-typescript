import FTAlert from '@/components/FTAlert'
import { formatDuration, formatRelativeDate } from '@/lib/utils'
import { sanityClient } from '@/lib/sanity/client'
import { GET_WORKOUT_DETAIL_QUERY_RESULT } from '@/lib/sanity/types'
import { useAuth } from '@clerk/expo'
import AntDesign from '@expo/vector-icons/AntDesign'
import { format } from 'date-fns'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { defineQuery } from 'groq'
import React, { useEffect, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native'

export const GET_WORKOUT_DETAIL_QUERY = defineQuery(`*[_type == "workout" && _id == $workoutId][0] {
    _id,
    date,
    duration,
    exercises[] {
        exercise->{
            _id,
            name,
            target,
            bodyPart,
            equipment
        },
        sets[] {
            reps,
            weight,
            weightUnit
        }
    }
}`)

export default function WorkoutRecord() {
    const router = useRouter()
    const { userId } = useAuth()
    const { workoutId } = useLocalSearchParams<{ workoutId: string }>()
    const [workout, setWorkout] = useState<GET_WORKOUT_DETAIL_QUERY_RESULT | null>(null)
    const [loading, setLoading] = useState(true)
    const [showDeleteAlert, setShowDeleteAlert] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [showErrorAlert, setShowErrorAlert] = useState(false)
    const [errorMessage, setErrorMessage] = useState('')

    useEffect(() => {
        if (!workoutId) return
        sanityClient
            .fetch<GET_WORKOUT_DETAIL_QUERY_RESULT>(GET_WORKOUT_DETAIL_QUERY, { workoutId })
            .then(setWorkout)
            .catch(console.error)
            .finally(() => setLoading(false))
    }, [workoutId])

    const handleDelete = async () => {
        setDeleting(true)
        try {
            const res = await fetch('/api/workout', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ workoutId, userId }),
            })
            if (res.ok) {
                setShowDeleteAlert(false)
                router.replace({
                    pathname: '/(app)/(tabs)/history',
                    params: { refresh: 'true' },
                })
            } else {
                const data = await res.json().catch(() => ({}))
                setShowDeleteAlert(false)
                setErrorMessage(data.error || 'Failed to delete workout. Please try again.')
                setShowErrorAlert(true)
            }
        } catch (error) {
            setShowDeleteAlert(false)
            setErrorMessage('Network error. Please check your connection and try again.')
            setShowErrorAlert(true)
        } finally {
            setDeleting(false)
        }
    }

    if (loading) {
        return (
            <View className='flex-1 bg-gray-50 items-center justify-center'>
                <ActivityIndicator size='large' color='#0a7ea4' />
            </View>
        )
    }

    if (!workout) {
        return (
            <View className='flex-1 bg-gray-50 items-center justify-center px-6'>
                <AntDesign name='exclamationcircleo' size={32} color='#9CA3AF' />
                <Text className='text-lg font-semibold text-gray-700 mt-3'>Workout not found</Text>
                <Pressable onPress={() => router.back()} className='mt-4 bg-primary rounded-xl px-6 py-3 active:opacity-80'>
                    <Text className='text-white font-semibold text-sm'>Go Back</Text>
                </Pressable>
            </View>
        )
    }

    const totalSets = workout.exercises?.reduce((sum, ex) => sum + (ex.sets?.length ?? 0), 0) ?? 0
    const totalExercises = workout.exercises?.length ?? 0
    const totalVolume = workout.exercises?.reduce(
        (sum, ex) => sum + (ex.sets?.reduce((s, set) => s + ((set.reps ?? 0) * (set.weight ?? 0)), 0) ?? 0), 0
    ) ?? 0

    const getExerciseVolume = (sets: typeof workout.exercises extends (infer T)[] | null ? T extends { sets: infer S } ? S : never : never) => {
        if (!sets) return 0
        return sets.reduce((sum, set) => sum + ((set.reps ?? 0) * (set.weight ?? 0)), 0)
    }

    return (
        <>
            <ScrollView className='flex-1 bg-gray-50' contentContainerStyle={{ paddingBottom: 40 }}>
                {/* Summary Card */}
                <View className='bg-white mx-4 mt-4 rounded-2xl p-5 border border-gray-100'>
                    <View className='flex-row items-center justify-between mb-4'>
                        <Text className='text-lg font-bold text-gray-900'>Workout Summary</Text>
                        <Pressable
                            onPress={() => setShowDeleteAlert(true)}
                            disabled={deleting}
                            className='w-9 h-9 rounded-full bg-red-50 items-center justify-center active:bg-red-100'
                        >
                            <AntDesign name='delete' size={16} color='#EF4444' />
                        </Pressable>
                    </View>

                    {/* Vertical stat list */}
                    <View className='gap-3'>
                        <View className='flex-row items-center gap-3'>
                            <AntDesign name='calendar' size={16} color='#6B7280' />
                            <Text className='text-sm text-gray-700'>
                                {workout.date ? format(new Date(workout.date), 'EEEE, MMMM d, yyyy \'at\' h:mm a') : 'Unknown date'}
                            </Text>
                        </View>
                        <View className='flex-row items-center gap-3'>
                            <AntDesign name='clockcircleo' size={16} color='#6B7280' />
                            <Text className='text-sm text-gray-700'>{formatDuration(workout.duration)}</Text>
                        </View>
                        <View className='flex-row items-center gap-3'>
                            <AntDesign name='heart' size={16} color='#6B7280' />
                            <Text className='text-sm text-gray-700'>{totalExercises} exercise{totalExercises !== 1 ? 's' : ''}</Text>
                        </View>
                        <View className='flex-row items-center gap-3'>
                            <AntDesign name='bars' size={16} color='#6B7280' />
                            <Text className='text-sm text-gray-700'>{totalSets} total sets</Text>
                        </View>
                        {totalVolume > 0 && (
                            <View className='flex-row items-center gap-3'>
                                <AntDesign name='swap' size={16} color='#6B7280' />
                                <Text className='text-sm text-gray-700'>{totalVolume.toLocaleString()} kg total volume</Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* Exercise Cards */}
                <View className='mx-4 mt-5'>
                    {workout.exercises?.map((ex, idx) => {
                        const exerciseVolume = getExerciseVolume(ex.sets)
                        const setCount = ex.sets?.length ?? 0

                        return (
                            <View key={idx} className='bg-white rounded-2xl p-4 mb-3 border border-gray-100'>
                                {/* Exercise header with number badge */}
                                <Pressable
                                    onPress={() => ex.exercise?._id && router.push({ pathname: '/exercise-detail', params: { id: ex.exercise._id } })}
                                    className='flex-row items-start justify-between mb-1 active:opacity-70'
                                >
                                    <View className='flex-1'>
                                        <Text className='text-base font-bold text-gray-900'>
                                            {ex.exercise?.name ?? 'Unknown Exercise'}
                                        </Text>
                                        <Text className='text-xs text-gray-400 mt-0.5'>
                                            {setCount} set{setCount !== 1 ? 's' : ''} completed
                                        </Text>
                                    </View>
                                    <View className='flex-row items-center gap-2'>
                                        <View className='w-8 h-8 rounded-full bg-primary/10 items-center justify-center'>
                                            <Text className='text-sm font-bold text-primary'>{idx + 1}</Text>
                                        </View>
                                        <AntDesign name='right' size={14} color='#9CA3AF' />
                                    </View>
                                </Pressable>

                                {/* Target + equipment metadata */}
                                {(ex.exercise?.target || ex.exercise?.equipment) && (
                                    <View className='flex-row items-center gap-2 mb-3'>
                                        {ex.exercise?.target && (
                                            <Text className='text-xs text-gray-400 capitalize'>{ex.exercise.target}</Text>
                                        )}
                                        {ex.exercise?.target && ex.exercise?.equipment && (
                                            <Text className='text-xs text-gray-300'>•</Text>
                                        )}
                                        {ex.exercise?.equipment && (
                                            <Text className='text-xs text-gray-400 capitalize'>{ex.exercise.equipment}</Text>
                                        )}
                                    </View>
                                )}

                                {/* Sets label */}
                                <Text className='text-xs font-semibold text-gray-500 mb-2'>Sets:</Text>

                                {/* Sets table */}
                                <View className='bg-gray-50 rounded-xl overflow-hidden'>
                                    {ex.sets?.map((set, setIdx) => (
                                        <View
                                            key={setIdx}
                                            className={`flex-row items-center px-3 py-2.5 ${setIdx > 0 ? 'border-t border-gray-100' : ''}`}
                                        >
                                            <View className='w-6 h-6 rounded-full bg-primary/10 items-center justify-center mr-3'>
                                                <Text className='text-xs font-semibold text-primary'>{setIdx + 1}</Text>
                                            </View>
                                            <Text className='text-sm font-medium text-gray-800 flex-1'>
                                                {set.reps ?? 0} reps
                                            </Text>
                                            {set.weight ? (
                                                <View className='flex-row items-center gap-1'>
                                                    <AntDesign name='swap' size={12} color='#6B7280' />
                                                    <Text className='text-sm text-gray-600'>
                                                        {set.weight} {set.weightUnit ?? 'kg'}
                                                    </Text>
                                                </View>
                                            ) : (
                                                <Text className='text-sm text-gray-400'>Bodyweight</Text>
                                            )}
                                        </View>
                                    ))}
                                </View>

                                {/* Per-exercise volume */}
                                {exerciseVolume > 0 && (
                                    <View className='flex-row items-center justify-between mt-3 pt-3 border-t border-gray-100'>
                                        <Text className='text-xs text-gray-500'>Exercise Volume:</Text>
                                        <Text className='text-sm font-bold text-gray-700'>{exerciseVolume.toLocaleString()} kg</Text>
                                    </View>
                                )}
                            </View>
                        )
                    })}
                </View>


            </ScrollView>

            <FTAlert
                visible={showDeleteAlert}
                type='warning'
                title='Delete Workout?'
                message='This action cannot be undone. Your workout data will be permanently removed.'
                onDismiss={() => setShowDeleteAlert(false)}
                loading={deleting}
                buttons={[
                    {
                        text: 'Delete',
                        style: 'destructive',
                        onPress: handleDelete,
                    },
                    {
                        text: 'Cancel',
                        style: 'cancel',
                        onPress: () => setShowDeleteAlert(false),
                    },
                ]}
            />

            <FTAlert
                visible={showErrorAlert}
                type='error'
                title='Delete Failed'
                message={errorMessage}
                onDismiss={() => setShowErrorAlert(false)}
                buttons={[
                    {
                        text: 'OK',
                        style: 'default',
                        onPress: () => setShowErrorAlert(false),
                    },
                ]}
            />
        </>
    )
}