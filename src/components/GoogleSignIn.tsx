import * as AuthSession from 'expo-auth-session'
import * as WebBrowser from 'expo-web-browser'
import { useSSO } from '@clerk/expo'
import { Ionicons } from '@expo/vector-icons'
import * as React from 'react'
import { Platform, Pressable, Text } from 'react-native'

// Source link: https://clerk.com/docs/guides/development/custom-flows/authentication/oauth-connections

export const useWarmUpBrowser = () => {
    React.useEffect(() => {
        if (Platform.OS !== 'android') return
        void WebBrowser.warmUpAsync()
        return () => {
            void WebBrowser.coolDownAsync()
        }
    }, [])
}

WebBrowser.maybeCompleteAuthSession()

export default function GoogleSignIn() {
    useWarmUpBrowser()

    const { startSSOFlow } = useSSO()
    const [isLoading, setIsLoading] = React.useState(false)

    const onPress = async () => {
        setIsLoading(true)
        try {
            const { createdSessionId, setActive } = await startSSOFlow({
                strategy: 'oauth_google',
                redirectUrl: AuthSession.makeRedirectUri({
                    scheme: 'acme',
                    path: '/sign-in',
                }),
            })

            if (createdSessionId) {
                await setActive!({ session: createdSessionId })
            }
        } catch (err) {
            console.log(JSON.stringify(err, null, 2))
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Pressable
            className={`border border-gray-200 rounded-xl py-4 items-center flex-row justify-center bg-white ${isLoading ? 'opacity-50' : 'opacity-100'}`}
            onPress={onPress}
            disabled={isLoading}
        >
            <Ionicons name="logo-google" size={20} color="#ea4335" />
            <Text className="text-gray-700 font-semibold text-base ml-2">
                {isLoading ? 'Connecting...' : 'Continue with Google'}
            </Text>
        </Pressable>
    )
}
