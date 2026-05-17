import React from 'react'
import { Text, View } from 'react-native'

type TabHeaderProps = {
    title: string
    subtitle?: string
    rightAction?: React.ReactNode
}

export default function TabHeader({ title, subtitle, rightAction }: TabHeaderProps) {
    return (
        <View className='px-4 pt-2 pb-4 flex-row items-start justify-between'>
            <View className='flex-1 mr-3'>
                <Text className='text-3xl font-bold text-gray-900'>{title}</Text>
                {subtitle ? (
                    <Text className='text-sm text-gray-500 mt-1'>{subtitle}</Text>
                ) : null}
            </View>
            {rightAction ? <View className='mt-1'>{rightAction}</View> : null}
        </View>
    )
}
