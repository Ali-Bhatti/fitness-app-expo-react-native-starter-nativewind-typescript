import React from 'react'
import { Text } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function Workout() {
    return (
        <SafeAreaView className='flex-1' edges={["top"]}>
            <Text>Workout</Text>
        </SafeAreaView>
    )
}
