import { View, Text } from 'react-native'
import React from 'react'
import { Stack } from 'expo-router'

export default function Layout() {
    return (
        <Stack>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen
                name="workout-record"
                options={{
                    headerShown: true,
                    headerTitle: 'Workout Details',
                    headerBackTitle: 'History',
                    headerTintColor: '#0a7ea4',
                    headerStyle: {
                        backgroundColor: '#f8f8f8',
                    },
                    headerTitleStyle: {
                        fontSize: 30, // text-3xl
                        fontWeight: '700', // font-bold
                        color: '#111827', // text-gray-900
                    },
                    headerShadowVisible: false,
                }}
            />
        </Stack>
    )
}