import SpinningIcon from '@/components/SpinningIcon'
import { ThemedView } from '@/components/themed-view'
import { useAuth, useSignUp } from '@clerk/expo'
import { Ionicons } from '@expo/vector-icons'
import { Link, useFocusEffect } from 'expo-router'
import React from 'react'
import {
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    Text,
    TextInput,
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

const iconBoxShadow = Platform.select({
    ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
    },
    android: { elevation: 3 },
})

export default function Page() {
    const { signUp, errors, fetchStatus } = useSignUp()
    const { isSignedIn } = useAuth()


    const [emailAddress, setEmailAddress] = React.useState('')
    const [password, setPassword] = React.useState('')
    const [code, setCode] = React.useState('')
    const [isLoading, setIsLoading] = React.useState(false)
    const [showPassword, setShowPassword] = React.useState(false)

    useFocusEffect(
        React.useCallback(() => {
            void signUp.reset()
            setEmailAddress('')
            setPassword('')
            setCode('')
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

    const handleVerify = async () => {
        setIsLoading(true)
        await signUp.verifications.verifyEmailCode({ code })
        if (signUp.status === 'complete') {
            await signUp.finalize()
        } else {
            console.log('Sign-up attempt not complete:', signUp.status)
        }
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
            <ThemedView className="flex-1">
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    className="flex-1 justify-center px-6 bg-gray-100"
                >
                    <View className="bg-white rounded-3xl p-6" style={cardShadow}>
                        <Text className="text-2xl font-bold text-gray-900 text-center mb-2">
                            Verify Your Email
                        </Text>
                        <Text className="text-sm text-gray-500 text-center mb-6">
                            We sent a code to {emailAddress}
                        </Text>

                        <Text className="text-sm font-semibold text-gray-700 mb-2">
                            Verification Code
                        </Text>
                        <View className="flex-row items-center border border-gray-200 rounded-xl px-4 mb-2 bg-gray-50">
                            <Ionicons name="shield-checkmark-outline" size={20} color="#9ca3af" />
                            <TextInput
                                className="flex-1 py-3 px-3 text-gray-900"
                                value={code}
                                placeholder="Enter 6-digit code"
                                placeholderTextColor="#9ca3af"
                                onChangeText={setCode}
                                keyboardType="numeric"
                            />
                        </View>
                        {errors.fields.code && (
                            <Text className="text-red-500 text-xs mb-3">
                                Code is incorrect
                            </Text>
                        )}

                        <Pressable
                            className={`bg-[#0a7ea4] rounded-xl py-4 items-center flex-row justify-center mb-3 ${fetchStatus === 'fetching' ? 'opacity-50' : 'opacity-100'}`}
                            onPress={handleVerify}
                            disabled={fetchStatus === 'fetching'}
                        >
                            <Ionicons name="checkmark-circle-outline" size={20} color="white" />
                            <Text className="text-white font-bold text-base ml-2">Verify Email</Text>
                        </Pressable>

                        <Pressable
                            className="border border-gray-200 rounded-xl py-4 items-center mb-3"
                            onPress={() => signUp.verifications.sendEmailCode()}
                        >
                            <Text className="text-[#0a7ea4] font-semibold">Send a new code</Text>
                        </Pressable>

                        <Pressable className="items-center py-2" onPress={() => signUp.reset()}>
                            <Text className="text-gray-500">Start over</Text>
                        </Pressable>
                    </View>
                </KeyboardAvoidingView>
            </ThemedView>
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
                        <View
                            className="bg-[#0a7ea4]/10 rounded-2xl mb-4"
                            style={[iconBoxShadow, { width: 80, height: 80, alignItems: 'center', justifyContent: 'center' }]}
                        >
                            <Ionicons name="fitness" size={40} color="#0a7ea4" />
                        </View>
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

                        {/* Email */}
                        <Text className="text-sm font-semibold text-gray-700 mb-2">Email</Text>
                        <View className="flex-row items-center border border-gray-200 rounded-xl px-4 mb-1 bg-gray-50">
                            <Ionicons name="mail-outline" size={20} color="#9ca3af" />
                            <TextInput
                                className="flex-1 px-3 py-3 text-gray-900"
                                autoCapitalize="none"
                                value={emailAddress}
                                placeholder="Enter your email"
                                placeholderTextColor="#9ca3af"
                                onChangeText={setEmailAddress}
                                keyboardType="email-address"
                                editable={!isLoading}
                            />
                        </View>
                        {errors.fields.emailAddress && (
                            <Text className="text-red-500 text-xs mb-3 ml-1">
                                {errors.fields.emailAddress.message}
                            </Text>
                        )}

                        {/* Password */}
                        <Text className="text-sm font-semibold text-gray-700 mb-2 mt-3">Password</Text>
                        <View className="flex-row items-center border border-gray-200 rounded-xl px-4 mb-1 bg-gray-50">
                            <Ionicons name="lock-closed-outline" size={20} color="#9ca3af" />
                            <TextInput
                                className="flex-1 px-3 py-3 text-gray-900"
                                value={password}
                                placeholder="Create a password"
                                placeholderTextColor="#9ca3af"
                                secureTextEntry={!showPassword}
                                onChangeText={setPassword}
                                editable={!isLoading}
                            />
                            <Pressable onPress={() => setShowPassword(!showPassword)}>
                                <Ionicons
                                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                                    size={20}
                                    color="#9ca3af"
                                />
                            </Pressable>
                        </View>
                        <Text className="text-gray-400 text-xs ml-1 mb-1">
                            Must be at least 8 characters
                        </Text>
                        {errors.fields.password && (
                            <Text className="text-red-500 text-xs mb-3 ml-1">
                                {errors.fields.password.message}
                            </Text>
                        )}

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
