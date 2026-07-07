import { Ionicons } from '@expo/vector-icons'
import AntDesign from '@expo/vector-icons/AntDesign'
import React, { useState } from 'react'
import { KeyboardTypeOptions, Pressable, Text, TextInput, View, ViewStyle } from 'react-native'

type FTFieldProps = {
    label?: string
    /**
     * 'default' = uppercase xs gray-500 (profile/settings styles)
     * 'auth'    = sm gray-700 (sign-in / sign-up style)
     */
    labelVariant?: 'default' | 'auth'
    value: string
    onChangeText?: (t: string) => void
    placeholder?: string
    editable?: boolean
    autoCapitalize?: 'none' | 'words' | 'sentences'
    secureTextEntry?: boolean
    keyboardType?: KeyboardTypeOptions
    /** Ionicons icon rendered on the left side of the input */
    leftIconName?: React.ComponentProps<typeof Ionicons>['name']
    /** Hint / error text shown below the input */
    hint?: string
    /** When true, hint text is red (error). Default: gray (info). */
    hintError?: boolean
    className?: string
    style?: ViewStyle
}

export default function FTField({
    label,
    labelVariant = 'default',
    value,
    onChangeText,
    placeholder,
    editable = true,
    autoCapitalize = 'words',
    secureTextEntry = false,
    keyboardType,
    leftIconName,
    hint,
    hintError = false,
    className,
    style,
}: FTFieldProps) {
    const [show, setShow] = useState(false)

    const labelClass =
        labelVariant === 'auth'
            ? 'text-sm font-semibold text-gray-700 mb-2'
            : 'text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5'

    const bgClass = editable ? 'bg-gray-50' : 'bg-gray-100'

    return (
        <View className={className} style={style}>
            {label ? <Text className={labelClass}>{label}</Text> : null}
            <View className={`flex-row items-center rounded-xl px-4 border border-gray-200 ${bgClass}`}>
                {leftIconName && (
                    <Ionicons name={leftIconName} size={20} color='#9ca3af' style={{ marginRight: 8 }} />
                )}
                <TextInput
                    value={value}
                    onChangeText={onChangeText}
                    placeholder={placeholder}
                    placeholderTextColor='#9CA3AF'
                    editable={editable}
                    autoCapitalize={autoCapitalize}
                    autoCorrect={false}
                    secureTextEntry={secureTextEntry && !show}
                    keyboardType={keyboardType}
                    className='flex-1 py-3'
                    style={{ color: editable ? '#111827' : '#9CA3AF' }}
                />
                {secureTextEntry && (
                    <Pressable onPress={() => setShow((s) => !s)} hitSlop={8}>
                        <AntDesign name={show ? 'eye' : 'eyeo'} size={18} color='#9CA3AF' />
                    </Pressable>
                )}
            </View>
            {hint ? (
                <Text className={`text-xs mt-1 ml-1 ${hintError ? 'text-red-500' : 'text-gray-400'}`}>
                    {hint}
                </Text>
            ) : null}
        </View>
    )
}
