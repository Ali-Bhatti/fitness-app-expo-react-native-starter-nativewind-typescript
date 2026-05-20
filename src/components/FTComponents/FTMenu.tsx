import AntDesign from '@expo/vector-icons/AntDesign'
import Entypo from '@expo/vector-icons/Entypo'
import React, { useRef, useState } from 'react'
import { Animated, Modal, Pressable, Text, View, useWindowDimensions } from 'react-native'

export type FTMenuItem = {
    label: string
    icon?: React.ComponentProps<typeof AntDesign>['name']
    style?: 'default' | 'destructive'
    onPress: () => void
}

type FTMenuProps = {
    items: FTMenuItem[]
}

type MenuPosition = { top: number; right: number }

export default function FTMenu({ items }: FTMenuProps) {
    const [visible, setVisible] = useState(false)
    const [pos, setPos] = useState<MenuPosition>({ top: 0, right: 0 })
    const triggerRef = useRef<View>(null)
    const fadeAnim = useRef(new Animated.Value(0)).current
    const scaleAnim = useRef(new Animated.Value(0.92)).current
    const translateYAnim = useRef(new Animated.Value(-6)).current
    const { width: screenWidth } = useWindowDimensions()

    const openMenu = () => {
        triggerRef.current?.measure((_x, _y, width, height, pageX, pageY) => {
            setPos({ top: pageY + height + 6, right: screenWidth - pageX - width })
            fadeAnim.setValue(0)
            scaleAnim.setValue(0.92)
            translateYAnim.setValue(-6)
            setVisible(true)
            Animated.parallel([
                Animated.timing(fadeAnim, { toValue: 1, duration: 160, useNativeDriver: true }),
                Animated.spring(scaleAnim, { toValue: 1, friction: 7, tension: 130, useNativeDriver: true }),
                Animated.spring(translateYAnim, { toValue: 0, friction: 7, tension: 130, useNativeDriver: true }),
            ]).start()
        })
    }

    const closeMenu = (callback?: () => void) => {
        Animated.timing(fadeAnim, { toValue: 0, duration: 120, useNativeDriver: true }).start(() => {
            setVisible(false)
            callback?.()
        })
    }

    const handleItemPress = (item: FTMenuItem) => {
        closeMenu(() => item.onPress())
    }

    return (
        <>
            {/* Trigger */}
            <View ref={triggerRef} collapsable={false}>
                <Pressable
                    onPress={openMenu}
                    className='w-9 h-9 items-center justify-center rounded-xl active:bg-gray-100'
                    hitSlop={8}
                >
                    <Entypo name='dots-three-vertical' size={16} color='#6B7280' />
                </Pressable>
            </View>

            {/* Dropdown */}
            <Modal
                visible={visible}
                transparent
                animationType='none'
                statusBarTranslucent
                onRequestClose={() => closeMenu()}
            >
                <Pressable className='flex-1' onPress={() => closeMenu()}>
                    <Animated.View
                        style={[
                            {
                                position: 'absolute',
                                top: pos.top,
                                right: pos.right,
                                minWidth: 190,
                                opacity: fadeAnim,
                                transform: [{ scale: scaleAnim }, { translateY: translateYAnim }],
                            },
                        ]}
                    >
                        <View
                            className='bg-white rounded-2xl border border-gray-100 overflow-hidden'
                            style={{
                                shadowColor: '#000',
                                shadowOffset: { width: 0, height: 4 },
                                shadowOpacity: 0.12,
                                shadowRadius: 16,
                                elevation: 8,
                            }}
                        >
                            {items.map((item, idx) => (
                                <Pressable
                                    key={idx}
                                    onPress={() => handleItemPress(item)}
                                    className={`flex-row items-center gap-3 px-4 py-3.5 active:bg-gray-50 ${idx > 0 ? 'border-t border-gray-100' : ''}`}
                                >
                                    {item.icon && (
                                        <AntDesign
                                            name={item.icon}
                                            size={15}
                                            color={item.style === 'destructive' ? '#EF4444' : '#374151'}
                                        />
                                    )}
                                    <Text
                                        className={`text-sm font-semibold ${item.style === 'destructive' ? 'text-red-500' : 'text-gray-700'}`}
                                    >
                                        {item.label}
                                    </Text>
                                </Pressable>
                            ))}
                        </View>
                    </Animated.View>
                </Pressable>
            </Modal>
        </>
    )
}
