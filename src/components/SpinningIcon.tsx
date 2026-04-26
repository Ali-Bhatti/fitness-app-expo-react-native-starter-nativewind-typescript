import { Ionicons } from '@expo/vector-icons'
import React from 'react'
import { Animated } from 'react-native'

type Props = {
    name: React.ComponentProps<typeof Ionicons>['name']
    size: number
    color: string
    spinning?: boolean
}

export default function SpinningIcon({ name, size, color, spinning = false }: Props) {
    const rotation = React.useRef(new Animated.Value(0)).current
    const animation = React.useRef<Animated.CompositeAnimation | null>(null)

    React.useEffect(() => {
        if (spinning) {
            rotation.setValue(0)
            animation.current = Animated.loop(
                Animated.timing(rotation, {
                    toValue: 1,
                    duration: 800,
                    useNativeDriver: false,
                }),
            )
            animation.current.start()
        } else {
            animation.current?.stop()
            animation.current = null
            rotation.setValue(0)
        }
    }, [spinning])

    const rotate = rotation.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    })

    return (
        <Animated.View style={{ transform: [{ rotate }] }}>
            <Ionicons name={name} size={size} color={color} />
        </Animated.View>
    )
}
