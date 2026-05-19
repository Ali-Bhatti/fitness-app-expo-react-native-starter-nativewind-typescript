import AntDesign from '@expo/vector-icons/AntDesign'
import React from 'react'
import { TextInput, View } from 'react-native'

type Props = {
    value: string
    onChange: (text: string) => void
    placeholder?: string
}

export default function ExerciseSearchBar({ value, onChange, placeholder = 'Search exercises...' }: Props) {
    return (
        <View className='mx-4 mb-3 flex-row items-center bg-gray-100 rounded-xl px-4 py-2 gap-2'>
            <AntDesign name='search1' size={16} color='#9CA3AF' />
            <TextInput
                value={value}
                onChangeText={onChange}
                placeholder={placeholder}
                placeholderTextColor='#9CA3AF'
                className='flex-1 text-gray-900'
                returnKeyType='search'
                clearButtonMode='while-editing'
                autoCorrect={false}
            />
        </View>
    )
}
