import AntDesign from '@expo/vector-icons/AntDesign'
import { Image } from 'expo-image'
import { useLocalSearchParams, useRouter } from 'expo-router'
import groq from 'groq'
import React, { useEffect, useState } from 'react'
import { ActivityIndicator, Linking, Pressable, ScrollView, StatusBar, Text, View, useColorScheme } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import DifficultyBadge from '@/components/DifficultyBadge'
import { sanityClient, urlFor } from '@/lib/sanity/client'
import { Exercise } from '@/lib/sanity/types'

const EXERCISE_DETAIL_QUERY = groq`*[_type == "exercise" && _id == $id][0] {
    _id,
    name,
    description,
    difficulty,
    target,
    videoUrl,
    image,
}`

export default function ExerciseDetail() {
    const router = useRouter()
    const { id } = useLocalSearchParams<{ id: string }>()
    const [exercise, setExercise] = useState<Exercise | null>(null)
    const [loading, setLoading] = useState(true)
    const colorScheme = useColorScheme()

    useEffect(() => {
        sanityClient
            .fetch<Exercise>(EXERCISE_DETAIL_QUERY, { id })
            .then(setExercise)
            .catch(console.error)
            .finally(() => setLoading(false))
    }, [id])

    if (loading) {
        return (
            <View className='flex-1 items-center justify-center bg-white'>
                <ActivityIndicator size='large' color='#0a7ea4' />
            </View>
        )
    }

    if (!exercise) {
        return (
            <SafeAreaView className='flex-1 bg-white items-center justify-center'>
                <Text className='text-gray-500 text-base'>Exercise not found</Text>
                <Pressable onPress={() => router.back()} className='mt-4'>
                    <Text className='text-[#0a7ea4] font-semibold'>Go Back</Text>
                </Pressable>
            </SafeAreaView>
        )
    }

    const getAIGuidance = () => {}

    const imageUrl = exercise.image ? urlFor(exercise.image).url() : null

    return (
        <SafeAreaView className='flex-1 bg-white' edges={['top', 'bottom']}>
            <StatusBar
                barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'}
                backgroundColor={colorScheme === 'dark' ? '#000' : '#fff'}
            />
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
                {/* Close button row */}
                <View className='px-4 pt-2 pb-2'>
                    <Pressable
                        onPress={() => router.back()}
                        className='w-9 h-9 rounded-full bg-gray-100 items-center justify-center active:opacity-70 self-start'
                    >
                        <AntDesign name='close' size={16} color='#6B7280' />
                    </Pressable>
                </View>

                {/* Exercise image / animation */}
                <View className='w-full h-72 bg-gray-50 items-center justify-center'>
                    {imageUrl ? (
                        <Image
                            source={{ uri: imageUrl }}
                            style={{ width: '100%', height: '100%' }}
                            contentFit='contain'
                            autoplay={true}
                        />
                    ) : (
                        <Text className='text-7xl'>🏋️</Text>
                    )}
                </View>

                {/* Content */}
                <View className='px-6 pt-6'>
                    {/* Name */}
                    <Text className='text-3xl font-bold text-gray-900'>{exercise.name}</Text>

                    {/* Difficulty badge */}
                    {exercise.difficulty && (
                        <View className='mt-3'>
                            <DifficultyBadge difficulty={exercise.difficulty} />
                        </View>
                    )}

                    {/* Target body part */}
                    {exercise.target ? (
                        <View className='flex-row items-center gap-2 mt-3'>
                            <AntDesign name='scan1' size={14} color='#6B7280' />
                            <Text className='text-sm text-gray-500'>Target Muscle: <Text className='font-semibold text-gray-700 capitalize'>{exercise.target}</Text></Text>
                        </View>
                    ) : null}

                    {/* Description */}
                    {exercise.description ? (
                        <View className='mt-6'>
                            <Text className='text-base font-bold text-gray-900 mb-2'>Description</Text>
                            <Text className='text-sm text-gray-600 leading-6'>{exercise.description}</Text>
                        </View>
                    ) : null}

                    {/* Video Tutorial */}
                    {exercise.videoUrl ? (
                        <View className='mt-6'>
                            <Text className='text-base font-bold text-gray-900 mb-3'>Video Tutorial</Text>
                            <Pressable
                                onPress={() => Linking.openURL(exercise.videoUrl!)}
                                className='bg-[#C06B6E] rounded-2xl p-4 flex-row items-center gap-4 active:opacity-80'
                            >
                                <View className='w-10 h-10 rounded-full bg-white/20 items-center justify-center'>
                                    <AntDesign name='playcircleo' size={22} color='white' />
                                </View>
                                <View>
                                    <Text className='text-white font-bold text-base'>Watch Tutorial</Text>
                                    <Text className='text-white/70 text-xs mt-0.5'>Learn proper form</Text>
                                </View>
                            </Pressable>
                        </View>
                    ) : null}

                    {/* AI Guidance */}
                    <Pressable 
                        className='mt-6 bg-[#0a7ea4] rounded-2xl py-4 items-center active:opacity-80'
                        onPress={getAIGuidance}
                    >
                        <Text className='text-white font-bold text-base'>Get AI Guidance on Form & Technique</Text>
                    </Pressable>

                    {/* Close */}
                    <Pressable
                        onPress={() => router.back()}
                        className='mt-3 bg-gray-100 rounded-2xl py-4 items-center active:opacity-70'
                    >
                        <Text className='text-gray-600 font-semibold text-base'>Close</Text>
                    </Pressable>
                </View>
            </ScrollView>
        </SafeAreaView>
    )
}
