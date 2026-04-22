import { Text } from 'react-native'
import React from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function Exercises() {
    return (
        <SafeAreaView className='flex-1' edges={["top"]}>
            <Text>Exercises</Text>
        </SafeAreaView>
    )
}
