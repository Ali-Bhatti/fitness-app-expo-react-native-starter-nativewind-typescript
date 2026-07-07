import FTField from '@/components/FTComponents/FTField'
import { ThemedView } from '@/components/ui/themed-view'
import { Ionicons } from '@expo/vector-icons'
import React, { useState } from 'react'
import {
    KeyboardAvoidingView,
    Platform,
    Pressable,
    Text,
    View,
} from 'react-native'

const cardShadow = Platform.select({
    ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
    },
    android: { elevation: 5 },
})

type Props = {
    title: string
    subtitle: string
    /** If true, shows an error hint on the code field */
    codeError?: boolean
    isLoading?: boolean
    onVerify: (code: string) => void
    onResend: () => void
    onStartOver: () => void
}

export default function VerificationScreen({
    title,
    subtitle,
    codeError,
    isLoading = false,
    onVerify,
    onResend,
    onStartOver,
}: Props) {
    const [code, setCode] = useState('')

    return (
        <ThemedView className='flex-1'>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                className='flex-1 justify-center px-6 bg-gray-100'
            >
                <View className='bg-white rounded-3xl p-6' style={cardShadow}>
                    <Text className='text-2xl font-bold text-gray-900 text-center mb-2'>
                        {title}
                    </Text>
                    <Text className='text-sm text-gray-500 text-center mb-6'>
                        {subtitle}
                    </Text>

                    <FTField
                        label='Verification Code'
                        labelVariant='auth'
                        leftIconName='shield-checkmark-outline'
                        value={code}
                        onChangeText={setCode}
                        placeholder='Enter 6-digit code'
                        autoCapitalize='none'
                        keyboardType='numeric'
                        hint={codeError ? 'Code is incorrect' : undefined}
                        hintError
                    />

                    <Pressable
                        className={`bg-[#0a7ea4] rounded-xl py-4 items-center flex-row justify-center mt-5 mb-3 ${(!code || isLoading) ? 'opacity-50' : 'opacity-100'}`}
                        onPress={() => onVerify(code)}
                        disabled={!code || isLoading}
                    >
                        <Ionicons name='checkmark-circle-outline' size={20} color='white' />
                        <Text className='text-white font-bold text-base ml-2'>
                            {isLoading ? 'Verifying...' : 'Verify'}
                        </Text>
                    </Pressable>

                    <Pressable
                        className='border border-gray-200 rounded-xl py-4 items-center mb-3'
                        onPress={onResend}
                    >
                        <Text className='text-[#0a7ea4] font-semibold'>Send a new code</Text>
                    </Pressable>

                    <Pressable className='items-center py-2' onPress={onStartOver}>
                        <Text className='text-gray-500'>Start over</Text>
                    </Pressable>
                </View>
            </KeyboardAvoidingView>
        </ThemedView>
    )
}
