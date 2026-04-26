import GoogleSignIn from '@/components/GoogleSignIn'
import SpinningIcon from '@/components/SpinningIcon'
import { ThemedView } from '@/components/themed-view'
import { useSignIn } from '@clerk/expo'
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
    const { signIn, errors, fetchStatus } = useSignIn()


    const [emailAddress, setEmailAddress] = React.useState('')
    const [password, setPassword] = React.useState('')
    const [code, setCode] = React.useState('')
    const [isLoading, setIsLoading] = React.useState(false)
    const [showPassword, setShowPassword] = React.useState(false)

    useFocusEffect(
        React.useCallback(() => {
            void signIn.reset()
            setEmailAddress('')
            setPassword('')
            setCode('')
            setIsLoading(false)
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
        } else if (signIn.status === 'needs_second_factor') {
            // handle MFA
        } else if (signIn.status === 'needs_client_trust') {
            const emailCodeFactor = signIn.supportedSecondFactors.find(
                (factor) => factor.strategy === 'email_code',
            )
            if (emailCodeFactor) {
                await signIn.mfa.sendEmailCode()
            }
        } else {
            console.log('Sign-in attempt not complete:', signIn.status)
        }
        setIsLoading(false)
    }

    const handleVerify = async () => {
        setIsLoading(true)
        await signIn.mfa.verifyEmailCode({ code })
        if (signIn.status === 'complete') {
            await signIn.finalize()
            setIsLoading(false)
        } else {
            console.log('Sign-in attempt not complete:', signIn.status)
            setIsLoading(false)
        }
    }


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
                        <View
                            className="bg-[#0a7ea4]/10 rounded-2xl mb-4"
                            style={[iconBoxShadow, { width: 80, height: 80, alignItems: 'center', justifyContent: 'center' }]}
                        >
                            <Ionicons name="fitness" size={40} color="#0a7ea4" />
                        </View>
                        <Text className="text-3xl font-bold text-gray-900 mb-2">FitTracker</Text>
                        <Text className="text-lg text-gray-600 text-center">
                            Track your fitness journey{'\n'}and reach your goals
                        </Text>
                    </View>

                    {/* Form Card */}
                    <View
                        className="bg-white rounded-3xl p-6 mb-6"
                        style={cardShadow}
                    >
                        <Text className="text-2xl font-bold text-gray-900 text-center mb-6">
                            Welcome Back
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
                        {errors.fields.identifier && (
                            <Text className="text-red-500 text-xs mb-3 ml-1">
                                {errors.fields.identifier.message}
                            </Text>
                        )}

                        {/* Password */}
                        <Text className="text-sm font-semibold text-gray-700 mb-2 mt-3">Password</Text>
                        <View className="flex-row items-center border border-gray-200 rounded-xl px-4 mb-1 bg-gray-50">
                            <Ionicons name="lock-closed-outline" size={20} color="#9ca3af" />
                            <TextInput
                                className="flex-1 px-3 py-3 text-gray-900"
                                value={password}
                                placeholder="Enter your password"
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
                        {errors.fields.password && (
                            <Text className="text-red-500 text-xs mb-3 ml-1">
                                {errors.fields.password.message}
                            </Text>
                        )}

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
