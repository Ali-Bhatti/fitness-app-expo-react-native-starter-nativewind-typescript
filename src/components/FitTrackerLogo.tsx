import { View, Text, Platform } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import React from 'react'


const iconBoxShadow = Platform.select({
    ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
    },
    android: { elevation: 0 },
})

export default function FitTrackerLogo() {
    return (
        <View
            className="bg-[#0a7ea4]/10 rounded-2xl mb-4"
            style={[iconBoxShadow, { width: 80, height: 80, alignItems: 'center', justifyContent: 'center' }]}
        >
            <Ionicons name="fitness" size={40} color="#0a7ea4" />
        </View>
    )
}