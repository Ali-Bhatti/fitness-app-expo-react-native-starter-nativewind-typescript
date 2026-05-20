import TabHeader from '@/components/FTComponents/TabHeader'
import AntDesign from '@expo/vector-icons/AntDesign'
import { useRouter } from 'expo-router'
import React from 'react'
import { Pressable, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function Workout() {
    const router = useRouter()

    return (
        <SafeAreaView className='flex-1 bg-gray-50' edges={['top']}>
            <TabHeader title='Workout' subtitle="Let's get moving" />

            <View className='flex-1 items-center justify-center px-6'>
                <View className='w-24 h-24 rounded-full bg-primary/10 items-center justify-center mb-6'>
                    <AntDesign name='Trophy' size={40} color='#0a7ea4' />
                </View>

                <Text className='text-2xl font-bold text-gray-900 text-center mb-2'>
                    Ready to train?
                </Text>
                <Text className='text-sm text-gray-500 text-center mb-10 leading-5'>
                    Track your exercises, sets and weights in real time.{'\n'}
                    Your workout gets saved when you finish.
                </Text>

                <Pressable
                    onPress={() => router.push({
                        pathname: '/(tabs)/active-workout',
                        params: { session: Date.now().toString() },
                    } as never)}
                    className='bg-primary w-full rounded-2xl py-4 items-center active:opacity-80'
                    style={{
                        shadowColor: '#0a7ea4',
                        shadowOpacity: 0.3,
                        shadowRadius: 12,
                        shadowOffset: { width: 0, height: 4 },
                        elevation: 4,
                    }}
                >
                    <View className='flex-row items-center gap-2'>
                        <AntDesign name='plus' size={20} color='white' />
                        <Text className='text-white font-bold text-lg'>Start Workout</Text>
                    </View>
                </Pressable>
            </View>
        </SafeAreaView>
    )
}

