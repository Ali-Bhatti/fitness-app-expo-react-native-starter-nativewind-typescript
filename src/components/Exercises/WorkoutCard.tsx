import FTCard from '@/components/FTComponents/FTCard'
import { GET_WORKOUTS_QUERY_RESULT } from '@/lib/sanity/types'
import { formatDuration, formatRelativeDate } from '@/lib/utils'
import AntDesign from '@expo/vector-icons/AntDesign'
import { format } from 'date-fns'
import React from 'react'
import { Pressable, Text, View } from 'react-native'

type Props = {
    workout: GET_WORKOUTS_QUERY_RESULT[number]
    onPress?: () => void
    maxExercises?: number
}

export default function WorkoutCard({ workout, onPress, maxExercises }: Props) {
    const totalSets = workout.exercises?.reduce((sum, ex) => sum + (ex.sets?.length ?? 0), 0) ?? 0
    const totalExercises = workout.exercises?.length ?? 0

    return (
        <Pressable
            onPress={onPress}
            //className='bg-white rounded-2xl mb-3 mx-4 p-4 flex-row items-center gap-3 active:opacity-80'
            style={{
                shadowColor: '#000',
                shadowOpacity: 0.02,
                shadowRadius: 8,
                shadowOffset: { width: 0, height: 2 },
                elevation: 2,
            }}
        >
            <FTCard className='mb-3 mx-4'>

                {/* Header */}
                <View className='flex-row items-center justify-between mb-3'>
                    <View className='flex-row items-center gap-2'>
                        <View className='w-9 h-9 rounded-full bg-primary/10 items-center justify-center'>
                            <AntDesign name='Trophy' size={16} color='#0a7ea4' />
                        </View>
                        <View>
                            <Text className='text-sm font-bold text-gray-900'>
                                {formatRelativeDate(workout.date)}
                            </Text>
                            <Text className='text-xs text-gray-400'>
                                {workout.date ? format(new Date(workout.date), 'h:mm a') : 'Unknown time'}
                            </Text>
                        </View>
                    </View>
                    <View className='bg-primary/10 rounded-lg px-2.5 py-1'>
                        <Text className='text-xs font-semibold text-primary'>
                            {formatDuration(workout.duration)}
                        </Text>
                    </View>
                </View>

                {/* Stats row */}
                <View className='flex-row gap-4 mb-3 pl-1'>
                    <View className='flex-row items-center gap-1'>
                        <AntDesign name='bars' size={12} color='#6B7280' />
                        <Text className='text-xs text-gray-500'>
                            {totalExercises} exercise{totalExercises !== 1 ? 's' : ''}
                        </Text>
                    </View>
                    <View className='flex-row items-center gap-1'>
                        <AntDesign name='database' size={12} color='#6B7280' />
                        <Text className='text-xs text-gray-500'>
                            {totalSets} set{totalSets !== 1 ? 's' : ''}
                        </Text>
                    </View>
                </View>

                {/* Exercise list — names only */}
                {(maxExercises ? workout.exercises?.slice(0, maxExercises) : workout.exercises)?.map((ex, idx) => (
                    <View
                        key={idx}
                        className={`flex-row items-center py-2 ${idx > 0 ? 'border-t border-gray-100' : ''}`}
                    >
                        <Text className='text-sm font-medium text-gray-800 flex-1' numberOfLines={1}>
                            {ex.exercise?.name ?? 'Unknown Exercise'}
                        </Text>
                        {ex.exercise?.target && (
                            <Text className='text-xs text-gray-400 capitalize ml-2'>
                                {ex.exercise.target}
                            </Text>
                        )}
                    </View>
                ))}
                {maxExercises && workout.exercises && workout.exercises.length > maxExercises && (
                    <Text className='text-xs text-gray-400 pt-2 text-center'>
                        +{workout.exercises.length - maxExercises} more exercise{workout.exercises.length - maxExercises !== 1 ? 's' : ''}...
                    </Text>
                )}
            </FTCard>
        </Pressable>
    )
}
