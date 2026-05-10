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
import Markdown from 'react-native-markdown-display'

const EXERCISE_DETAIL_QUERY = groq`*[_type == "exercise" && _id == $id][0] {
    _id,
    name,
    alternateNames,
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
    const [aiLoading, setAiLoading] = useState(false)
    const [aiGuidance, setAiGuidance] = useState<string | null>(null)
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
                    <Text className='text-primary font-semibold'>Go Back</Text>
                </Pressable>
            </SafeAreaView>
        )
    }

    const getAIGuidance = async () => {
        if (!exercise) return;

        setAiLoading(true)
        setAiGuidance(null)

        try {
            const response = await fetch("/api/ai", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ exerciseName: exercise.name, alternateNames: exercise.alternateNames }),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || `Request failed with status ${response.status}`)
            }

            if (!data.aiGuidance) {
                throw new Error('No guidance received from AI')
            }

            setAiGuidance(data.aiGuidance)
        } catch (error) {
            console.error("Error fetching AI guidance:", error)
            const message = error instanceof Error ? error.message : 'Unknown error'
            setAiGuidance(`**Unable to get AI guidance**\n\n${message}. Please try again later.`)
        } finally {
            setAiLoading(false)
        }
    }

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
                                className='bg-secondary rounded-2xl p-4 flex-row items-center gap-4 active:opacity-80'
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

                    {/* AI Guidance Content */}
                    {aiLoading && (
                        <View className='mt-6 flex-row items-center gap-3'>
                            <ActivityIndicator size="small" color="#0a7ea4" />
                            <Text className='text-gray-600 text-sm'>Generating AI guidance...</Text>
                        </View>
                    )}

                    {!aiLoading && aiGuidance && (
                        <View className='mt-6'>
                            <View className='flex-row items-center gap-2 mb-3'>
                                <AntDesign name='heart' size={16} color='#0a7ea4' />
                                <Text className='text-base font-bold text-gray-900'>AI Coach says...</Text>
                            </View>
                            <View
                                className='bg-gray-50 rounded-2xl p-4 border-l-4 border-primary'
                            >
                                <Markdown
                                    style={{
                                        body: {
                                            color: '#4B5563',
                                            fontSize: 14,
                                            lineHeight: 22,
                                        },
                                        heading2: {
                                            color: '#1F2937',
                                            fontSize: 16,
                                            fontWeight: 'bold',
                                            marginTop: 12,
                                            marginBottom: 4,
                                        },
                                        heading3: {
                                            color: '#1F2937',
                                            fontSize: 15,
                                            fontWeight: '600',
                                            marginTop: 10,
                                            marginBottom: 4,
                                        },
                                        strong: {
                                            color: '#374151',
                                            fontWeight: 'bold',
                                        },
                                        bullet_list: {
                                            marginTop: 4,
                                            marginBottom: 4,
                                        },
                                        ordered_list: {
                                            marginTop: 4,
                                            marginBottom: 4,
                                        },
                                        list_item: {
                                            marginBottom: 4,
                                        },
                                        paragraph: {
                                            marginTop: 2,
                                            marginBottom: 6,
                                        },
                                    }}
                                >
                                    {aiGuidance}
                                </Markdown>
                            </View>
                        </View>
                    )}

                    {/* AI Guidance */}
                    <Pressable
                        className={`mt-6 rounded-2xl py-4 items-center active:opacity-80 ${aiGuidance ? 'bg-ft-green' : 'bg-primary'}`}
                        onPress={getAIGuidance}
                    >
                        {aiLoading ? (
                            <View className='flex-row items-center gap-2'>
                                <ActivityIndicator size="small" color="#ffffff" />
                                <Text className='text-white font-bold text-base'>Loading...</Text>
                            </View>
                        ) : (
                            <Text className='text-white font-bold text-base'>
                                {aiGuidance ? 'Re-Generate AI Guidance' : 'Get AI Guidance on Form & Technique'}
                            </Text>
                        )}
                    </Pressable>

                    {/* Close */}
                    <Pressable
                        onPress={() => router.back()}
                        className='mt-3 bg-ft-gray rounded-2xl py-4 items-center active:opacity-70'
                    >
                        <Text className='text-gray-600 font-semibold text-base'>Close</Text>
                    </Pressable>
                </View>
            </ScrollView>
        </SafeAreaView>
    )
}
