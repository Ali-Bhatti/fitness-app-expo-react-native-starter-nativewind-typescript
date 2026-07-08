import WorkoutMiniBanner from '@/components/WorkoutMiniBanner'
import { useWorkoutStore } from '../../../../store/workout-store'
import AntDesign from '@expo/vector-icons/AntDesign'
import { BottomTabBar } from '@react-navigation/bottom-tabs'
import { Tabs } from 'expo-router'
import React from 'react'
import { Image, View } from 'react-native'
import { useUser } from '@clerk/expo'

export default function Layout() {
    const { user } = useUser()
    const { workoutStatus } = useWorkoutStore()

    return (
        <Tabs
            screenOptions={{ tabBarActiveTintColor: '#0a7ea4' }}
            tabBar={(props) => {
                const currentRoute = props.state.routes[props.state.index]?.name
                const showBanner = workoutStatus !== 'idle' && currentRoute !== 'active-workout'
                return (
                    <View>
                        {showBanner && <WorkoutMiniBanner />}
                        <BottomTabBar {...props} />
                    </View>
                )
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    headerShown: false,
                    title: "Home",
                    tabBarIcon: ({ color, size }) => (
                        <AntDesign name="home" size={size} color={color} />
                    ),
                }}
            />

            <Tabs.Screen
                name="exercises"
                options={{
                    headerShown: false,
                    title: "Exercises",
                    tabBarIcon: ({ color, size }) => (
                        <AntDesign name="book" size={size} color={color} />
                    ),
                }}
            />

            <Tabs.Screen
                name='workout'
                options={{
                    headerShown: false,
                    title: "Workout",
                    tabBarIcon: ({ color, size }) => (
                        <AntDesign name="pluscircle" size={size} color={color} />
                    )
                }}
            />

            <Tabs.Screen
                name='active-workout'
                options={{
                    headerShown: false,
                    title: "Active Workout",
                    href: null,
                }}
            />

            <Tabs.Screen
                name='history'
                options={{
                    headerShown: false,
                    title: "History",
                    tabBarIcon: ({ color, size }) => (
                        <AntDesign name="clockcircleo" size={size} color={color} />
                    )
                }}
            />

            <Tabs.Screen
                name='profile'
                options={{
                    headerShown: false,
                    title: "Profile",
                    tabBarIcon: ({ color, size }) => (
                        <Image
                            source={{ uri: user?.imageUrl ?? user?.externalAccounts[0]?.imageUrl }}
                            style={{ width: size, height: size, borderRadius: size / 2 }}
                            className='rounded-full'
                        />
                    )
                }}
            />
        </Tabs>
    )
}
