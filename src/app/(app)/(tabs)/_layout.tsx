import AntDesign from '@expo/vector-icons/AntDesign'
import { Tabs } from 'expo-router'
import React from 'react'
import { Image } from 'react-native'

export default function Layout() {
    return (
        <Tabs>
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
                    tabBarStyle: { display: "none" },
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
                        <AntDesign name="user" size={size} color={color} />
                    )
                    // tabBarIcon: ({ color, size }) => (
                    //     <Image
                    //         source={{ uri: user?.Image ?? user.ExternalAccount[0]?.ImageUrl }}
                    //         style={{ width: size, height: size, borderRadius: size / 2 }}
                    //         className='rounded-full'
                    //     />
                    // )
                }}
            />
        </Tabs>
    )
}
