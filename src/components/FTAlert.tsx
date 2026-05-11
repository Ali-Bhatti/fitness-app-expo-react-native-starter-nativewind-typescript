import AntDesign from '@expo/vector-icons/AntDesign'
import React, { useEffect, useRef } from 'react'
import { Animated, Modal, Pressable, Text, View } from 'react-native'

export type AlertType = 'confirm' | 'success' | 'error' | 'warning'

type AlertButton = {
    text: string
    onPress?: () => void
    style?: 'default' | 'cancel' | 'destructive'
}

type FTAlertProps = {
    visible: boolean
    type?: AlertType
    title: string
    message?: string
    buttons?: AlertButton[]
    onDismiss?: () => void
}

const ICON_CONFIG: Record<AlertType, { name: React.ComponentProps<typeof AntDesign>['name']; color: string; bg: string }> = {
    confirm: { name: 'questioncircleo', color: '#0a7ea4', bg: 'bg-primary/10' },
    success: { name: 'checkcircleo', color: '#22C55E', bg: 'bg-green-100' },
    error: { name: 'closecircleo', color: '#EF4444', bg: 'bg-red-100' },
    warning: { name: 'exclamationcircleo', color: '#F97316', bg: 'bg-orange-100' },
}

const BUTTON_STYLES = {
    default: 'bg-primary',
    cancel: 'bg-gray-100',
    destructive: 'bg-red-500',
}

const BUTTON_TEXT_STYLES = {
    default: 'text-white',
    cancel: 'text-gray-700',
    destructive: 'text-white',
}

export default function FTAlert({ visible, type = 'confirm', title, message, buttons, onDismiss }: FTAlertProps) {
    const fadeAnim = useRef(new Animated.Value(0)).current
    const scaleAnim = useRef(new Animated.Value(0.9)).current

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
                Animated.spring(scaleAnim, { toValue: 1, friction: 8, tension: 100, useNativeDriver: true }),
            ]).start()
        } else {
            fadeAnim.setValue(0)
            scaleAnim.setValue(0.9)
        }
    }, [visible])

    const handlePress = (button: AlertButton) => {
        button.onPress?.()
        onDismiss?.()
    }

    const icon = ICON_CONFIG[type]
    const resolvedButtons = buttons ?? [{ text: 'OK', style: 'default' as const }]

    return (
        <Modal visible={visible} transparent animationType='none' statusBarTranslucent onRequestClose={onDismiss}>
            <Animated.View
                style={{ opacity: fadeAnim }}
                className='flex-1 bg-black/50 items-center justify-center px-8'
            >
                <Pressable className='absolute inset-0' onPress={onDismiss} />

                <Animated.View
                    style={{ transform: [{ scale: scaleAnim }] }}
                    className='bg-white rounded-3xl w-full max-w-sm overflow-hidden'
                >
                    {/* Icon + Content */}
                    <View className='items-center pt-6 px-6 pb-4'>
                        <View className={`w-14 h-14 rounded-full ${icon.bg} items-center justify-center mb-4`}>
                            <AntDesign name={icon.name} size={28} color={icon.color} />
                        </View>
                        <Text className='text-lg font-bold text-gray-900 text-center'>{title}</Text>
                        {message && (
                            <Text className='text-sm text-gray-500 text-center mt-2 leading-5'>{message}</Text>
                        )}
                    </View>

                    {/* Buttons */}
                    <View className='px-6 pb-6 pt-2 gap-2.5'>
                        {resolvedButtons.map((btn, idx) => {
                            const btnStyle = btn.style ?? 'default'
                            return (
                                <Pressable
                                    key={idx}
                                    onPress={() => handlePress(btn)}
                                    className={`${BUTTON_STYLES[btnStyle]} rounded-xl py-3.5 items-center active:opacity-80`}
                                >
                                    <Text className={`${BUTTON_TEXT_STYLES[btnStyle]} font-semibold text-base`}>
                                        {btn.text}
                                    </Text>
                                </Pressable>
                            )
                        })}
                    </View>
                </Animated.View>
            </Animated.View>
        </Modal>
    )
}
