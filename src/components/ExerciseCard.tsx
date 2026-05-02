import AntDesign from '@expo/vector-icons/AntDesign'
import React from 'react'
import { Image, Pressable, Text, View } from 'react-native'
import DifficultyBadge, { Difficulty } from '@/components/DifficultyBadge'
import { Exercise } from '@/lib/sanity/types'
import { urlFor } from '@/lib/sanity/client'

export type ExerciseItem = {
    _id: string
    name: string
    description?: string
    difficulty?: Difficulty
    target?: string
    imageUrl?: string
}

type Props = {
    item: Exercise
    onPress: () => void
}

export default function ExerciseCard({ item, onPress }: Props) {
    return (
        <Pressable
            onPress={onPress}
            className='bg-white rounded-2xl mb-3 mx-4 p-4 flex-row items-center gap-3 active:opacity-80'
            style={{
                shadowColor: '#000',
                shadowOpacity: 0.06,
                shadowRadius: 8,
                shadowOffset: { width: 0, height: 2 },
                elevation: 2,
            }}
        >
            {/* Thumbnail */}
            <View className='w-20 h-20 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0'>
                {item?.image ? (
                    // <Image source={{ uri: `${item.image.asset}?fm=jpg` }} className='w-full h-full' resizeMode='cover' />
                    <Image source={{ uri: urlFor(item.image).format('jpg').url() }} className='w-full h-full' resizeMode='cover' />
                ) : (
                    <View className='flex-1 items-center justify-center'>
                        <Text className='text-3xl'>🏋️</Text>
                    </View>
                )}
            </View>

            {/* Content */}
            <View className='flex-1'>
                <Text className='text-base font-bold text-gray-900' numberOfLines={1}>
                    {item.name}
                </Text>

                {/* Target body part */}
                {item.target ? (
                    <View className='flex-row items-center gap-1 mt-0.5'>
                        <AntDesign name='scan1' size={11} color='#9CA3AF' />
                        <Text className='text-xs text-gray-400 capitalize'>{item.target}</Text>
                    </View>
                ) : null}

                {item.description ? (
                    <Text className='text-sm text-gray-500 leading-5 mt-1' numberOfLines={2}>
                        {item.description}
                    </Text>
                ) : null}

                {item.difficulty ? (
                    <View className='mt-2'>
                        <DifficultyBadge difficulty={item.difficulty} />
                    </View>
                ) : null}
            </View>

            {/* Chevron */}
            <AntDesign name='right' size={14} color='#9CA3AF' />
        </Pressable>
    )
}
