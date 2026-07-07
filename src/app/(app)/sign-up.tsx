import FitTrackerLogo from '@/components/FTComponents/FitTrackerLogo'
import FTField from '@/components/FTComponents/FTField'
import VerificationScreen from '@/components/Auth/VerificationScreen'
import SpinningIcon from '@/components/ui/SpinningIcon'
import { ThemedView } from '@/components/ui/themed-view'
import { useAuth, useSignUp } from '@clerk/expo'
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
    const { signUp, errors, fetchStatus } = useSignUp()
    const { isSignedIn } = useAuth()

    const [emailAddress, setEmailAddress] = React.useState('')
    const [password, setPassword] = React.useState('')
    const [isLoading, setIsLoading] = React.useState(false)

    useFocusEffect(
        React.useCallback(() => {
            void signUp.reset()
            setEmailAddress('')
            setPassword('')
            setIsLoading(false)
        }, []),
    )

    const handleSubmit = async () => {
        setIsLoading(true)
        const { error } = await signUp.password({ emailAddress, password })
        if (error) {
            console.log(JSON.stringify(error, null, 2))
            setIsLoading(false)
            return
        }
        await signUp.verifications.sendEmailCode()
        setIsLoading(false)
    }

    if (signUp.status === 'complete' || isSignedIn) {
        return null
    }

    if (
        signUp.status === 'missing_requirements' &&
        signUp.unverifiedFields.includes('email_address') &&
        signUp.missingFields.length === 0
    ) {
        return (
            <VerificationScreen
                title='Verify Your Email'
                subtitle={`We sent a code to ${emailAddress}`}
                codeError={!!errors.fields.code}
                isLoading={isLoading}
                onVerify={async (code) => {
                    setIsLoading(true)
                    await signUp.verifications.verifyEmailCode({ code })
                    if (signUp.status === 'complete') {
                        await signUp.finalize()
                    } else {
                        console.log('Sign-up attempt not complete:', signUp.status)
                    }
                    setIsLoading(false)
                }}
                onResend={() => signUp.verifications.sendEmailCode()}
                onStartOver={() => signUp.reset()}
            />
        )
    }

    return (
        <ThemedView lightColor="#f3f4f6" className="flex-1">
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                className="flex-1"
            >
                <ScrollView
                    contentContainerClassName="flex-grow justify-center px-6 py-8"
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Header Section */}
                    <View className="items-center mb-8">
                        <FitTrackerLogo />
                        <Text className="text-3xl font-bold text-gray-900 mb-2">Join FitTracker</Text>
                        <Text className="text-lg text-gray-600 text-center">
                            Start your fitness journey{'\n'}and achieve your goals
                        </Text>
                    </View>

                    {/* Form Card */}
                    <View className="bg-white rounded-3xl p-6 mb-6" style={cardShadow}>
                        <Text className="text-2xl font-bold text-gray-900 text-center mb-6">
                            Create Your Account
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
                            hint={errors.fields.emailAddress?.message}
                            hintError
                        />

                        <FTField
                            label="Password"
                            labelVariant="auth"
                            leftIconName="lock-closed-outline"
                            value={password}
                            onChangeText={setPassword}
                            placeholder="Create a password"
                            autoCapitalize="none"
                            secureTextEntry
                            editable={!isLoading}
                            hint={errors.fields.password?.message || 'Must be at least 8 characters'}
                            hintError={!!errors.fields.password?.message}
                            className="mt-4"
                        />

                        {/* Create Account Button */}
                        <Pressable
                            className={`bg-[#0a7ea4] rounded-xl py-4 items-center flex-row justify-center mt-5 mb-3 ${(!emailAddress || !password || fetchStatus === 'fetching' || isLoading) ? 'opacity-50' : 'opacity-100'}`}
                            onPress={handleSubmit}
                            disabled={!emailAddress || !password || fetchStatus === 'fetching' || isLoading}
                        >
                            <SpinningIcon name={isLoading ? 'refresh' : 'person-add-outline'} size={22} color="white" spinning={isLoading} />
                            <Text className="text-white font-bold text-base ml-2">
                                {isLoading ? 'Creating Account...' : 'Create Account'}
                            </Text>
                        </Pressable>

                        <Text className="text-gray-400 text-xs text-center">
                            By signing up, you agree to our{' '}
                            <Text className="text-[#0a7ea4]">Terms of Service</Text>
                            {' '}and{' '}
                            <Text className="text-[#0a7ea4]">Privacy Policy</Text>
                        </Text>
                    </View>

                    {/* Footer */}
                    <View className="items-center">
                        <View className="flex-row items-center">
                            <Text className="text-gray-600">Already have an account? </Text>
                            <Link href="/sign-in">
                                <Text className="text-[#0a7ea4] font-semibold">Sign In</Text>
                            </Link>
                        </View>
                        <Text className="text-gray-400 text-sm mt-4">
                            Ready to transform your fitness?
                        </Text>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Required for Clerk bot protection */}
            <View nativeID="clerk-captcha" />
        </ThemedView>
    )
}
