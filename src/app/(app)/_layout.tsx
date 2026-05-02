import { useAuth } from '@clerk/expo'
import { Stack } from 'expo-router'
import React from 'react'
import { ActivityIndicator, View } from 'react-native';

export default function Layout() {
    let { isSignedIn, isLoaded, userId, sessionId, getToken } = useAuth();

    console.log('isSignedIn', isSignedIn)
    if (!isLoaded) {
        return (
            <View className='flex-1 items-center justify-center'>
                <ActivityIndicator size="large" color="#0a7ea4" />
            </View>
        )
    }
    return (
        <Stack>
            <Stack.Protected guard={!!isSignedIn} >
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen
                    name="exercise-detail"
                    options={{
                        headerShown: false,
                        presentation: 'modal',
                        gestureEnabled: true,
                        gestureDirection: 'vertical',
                        animation: 'slide_from_bottom',
                    }}
                />
            </Stack.Protected>

            <Stack.Protected guard={!isSignedIn} >
                <Stack.Screen name="sign-in" options={{ headerShown: false }} />
                <Stack.Screen name="sign-up" options={{ headerShown: false }} />
            </Stack.Protected>
        </Stack>
    )
}
