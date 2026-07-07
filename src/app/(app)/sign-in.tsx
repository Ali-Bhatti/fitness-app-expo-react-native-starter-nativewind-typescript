import FitTrackerLogo from '@/components/FTComponents/FitTrackerLogo'
import FTField from '@/components/FTComponents/FTField'
import GoogleSignIn from '@/components/Auth/GoogleSignIn'
import VerificationScreen from '@/components/Auth/VerificationScreen'
import SpinningIcon from '@/components/ui/SpinningIcon'
import { ThemedView } from '@/components/ui/themed-view'
import { useSignIn } from '@clerk/expo'
import { Link, useFocusEffect } from 'expo-router'
import React from 'react'
import {
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
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

export default function Page() {
    const { signIn, errors, fetchStatus } = useSignIn()

    const [emailAddress, setEmailAddress] = React.useState('')
    const [password, setPassword] = React.useState('')
    const [isLoading, setIsLoading] = React.useState(false)
    const [needsVerification, setNeedsVerification] = React.useState(false)

    useFocusEffect(
        React.useCallback(() => {
            void signIn.reset()
            setEmailAddress('')
            setPassword('')
            setIsLoading(false)
            setNeedsVerification(false)
        }, []),
    )

    const handleSubmit = async () => {
        setIsLoading(true)
        const { error } = await signIn.password({ emailAddress, password })
        if (error) {
            console.log(JSON.stringify(error, null, 2))
            setIsLoading(false)
            return
        }

        if (signIn.status === 'complete') {
            await signIn.finalize()
        } else if (signIn.status === 'needs_client_trust' || signIn.status === 'needs_second_factor') {
            const emailCodeFactor = signIn.supportedSecondFactors.find(
                (factor) => factor.strategy === 'email_code',
            )
            if (emailCodeFactor) {
                await signIn.mfa.sendEmailCode()
                setNeedsVerification(true)
            }
        } else {
            console.log('Sign-in attempt not complete:', signIn.status)
        }
        setIsLoading(false)
    }

    // ── Device verification screen (needs_client_trust) ──────────────────────
    if (needsVerification) {
        return (
            <VerificationScreen
                title='Verify Your Device'
                subtitle={`We sent a verification code to ${emailAddress}`}
                isLoading={isLoading}
                onVerify={async (code) => {
                    setIsLoading(true)
                    try {
                        await signIn.mfa.verifyEmailCode({ code })
                        if (signIn.status === 'complete') {
                            await signIn.finalize()
                        }
                    } catch (err) {
                        console.log('Verification error:', JSON.stringify(err, null, 2))
                    }
                    setIsLoading(false)
                }}
                onResend={() => signIn.mfa.sendEmailCode()}
                onStartOver={() => {
                    signIn.reset()
                    setNeedsVerification(false)
                }}
            />
        )
    }

    // ── Main sign-in screen ──────────────────────────────────────────────────
    return (
        <ThemedView lightColor="#f3f4f6" className="flex-1">
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                className="flex-1 bg-gray-100"
            >
                <ScrollView
                    contentContainerClassName="flex-grow justify-center px-6 py-8"
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Header Section */}
                    <View className="items-center mb-8">
                        <FitTrackerLogo />
                        <Text className="text-3xl font-bold text-gray-900 mb-2">FitTracker</Text>
                        <Text className="text-lg text-gray-600 text-center">
                            Track your fitness journey{'\n'}and reach your goals
                        </Text>
                    </View>

                    {/* Form Card */}
                    <View className="bg-white rounded-3xl p-6 mb-6" style={cardShadow}>
                        <Text className="text-2xl font-bold text-gray-900 text-center mb-6">
                            Welcome Back
                        </Text>

                        <FTField
                            label="Email"
                            labelVariant="auth"
                            leftIconName="mail-outline"
                            value={emailAddress}
                            onChangeText={setEmailAddress}
                            placeholder="Enter your email"
                            autoCapitalize="none"
                            keyboardType="email-address"
                            editable={!isLoading}
                            hint={errors.fields.identifier?.message}
                            hintError
                        />

                        <FTField
                            label="Password"
                            labelVariant="auth"
                            leftIconName="lock-closed-outline"
                            value={password}
                            onChangeText={setPassword}
                            placeholder="Enter your password"
                            autoCapitalize="none"
                            secureTextEntry
                            editable={!isLoading}
                            hint={errors.fields.password?.message}
                            hintError
                            className="mt-4"
                        />

                        {/* Sign In Button */}
                        <Pressable
                            className={`bg-[#0a7ea4] rounded-xl py-4 items-center flex-row justify-center mt-5 mb-4 ${(!emailAddress || !password || fetchStatus === 'fetching' || isLoading) ? 'opacity-50' : 'opacity-100'}`}
                            onPress={handleSubmit}
                            disabled={!emailAddress || !password || fetchStatus === 'fetching' || isLoading}
                        >
                            <SpinningIcon name={isLoading ? 'refresh' : 'log-in-outline'} size={22} color="white" spinning={isLoading} />
                            <Text className="text-white font-bold text-lg ml-2">
                                {isLoading ? 'Signing In...' : 'Sign In'}
                            </Text>
                        </Pressable>

                        {/* Divider */}
                        <View className="flex-row items-center mb-4">
                            <View className="flex-1 h-px bg-gray-200" />
                            <Text className="mx-4 text-gray-400 text-sm">or</Text>
                            <View className="flex-1 h-px bg-gray-200" />
                        </View>

                        {/* Google Button */}
                        <GoogleSignIn />
                    </View>

                    {/* Footer */}
                    <View className="items-center">
                        <View className="flex-row items-center">
                            <Text className="text-gray-600">Don't have an account? </Text>
                            <Link href="/sign-up">
                                <Text className="text-[#0a7ea4] font-semibold">Sign Up</Text>
                            </Link>
                        </View>
                        <Text className="text-gray-400 text-sm mt-4">
                            Start your fitness journey today
                        </Text>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </ThemedView>
    )
}
