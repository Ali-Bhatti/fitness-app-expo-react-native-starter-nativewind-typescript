import React from 'react'
import { View, ViewProps } from 'react-native'

type FTCardProps = ViewProps & {
    children: React.ReactNode
}

export default function FTCard({ children, className = '', ...props }: FTCardProps) {
    return (
        <View className={`bg-white rounded-2xl p-4 border border-gray-100 ${className}`} {...props}>
            {children}
        </View>
    )
}
