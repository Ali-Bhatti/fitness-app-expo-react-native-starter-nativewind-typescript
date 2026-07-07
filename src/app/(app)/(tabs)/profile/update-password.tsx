import FTAlert from '@/components/FTComponents/FTAlert'
import FTCard from '@/components/FTComponents/FTCard'
import FTField from '@/components/FTComponents/FTField'
import { useUser } from '@clerk/expo'
import AntDesign from '@expo/vector-icons/AntDesign'
import { useRouter } from 'expo-router'
import React, { useState } from 'react'
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    Text,
    View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

type AlertState = { visible: boolean; type: 'success' | 'error'; title: string; message: string }

export default function UpdatePassword() {
    const { user, isLoaded } = useUser()
    const router = useRouter()

    const [currentPassword, setCurrentPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [saving, setSaving] = useState(false)
    const [alert, setAlert] = useState<AlertState>({ visible: false, type: 'success', title: '', message: '' })

    const isOAuth = (user?.externalAccounts?.length ?? 0) > 0
    const oAuthProvider = user?.externalAccounts?.[0]?.provider ?? 'your provider'

    const passwordHint =
        newPassword.length > 0 && newPassword.length < 8 ? 'Must be at least 8 characters' : undefined
    const confirmHint =
        confirmPassword.length > 0 && confirmPassword !== newPassword ? "Passwords don't match" : undefined

    const isValid =
        currentPassword.length > 0 &&
        newPassword.length >= 8 &&
        newPassword === confirmPassword

    const handleUpdate = async () => {
        if (!user || !isValid) return
        setSaving(true)
        try {
            await user.updatePassword({ currentPassword, newPassword })
            setCurrentPassword('')
            setNewPassword('')
            setConfirmPassword('')
            setAlert({ visible: true, type: 'success', title: 'Password updated', message: 'Your new password is now active.' })
        } catch (err: any) {
            const msg = err?.errors?.[0]?.longMessage ?? err?.message ?? 'Something went wrong.'
            setAlert({ visible: true, type: 'error', title: 'Update failed', message: msg })
        } finally {
            setSaving(false)
        }
    }

    if (!isLoaded) return null

    return (
        <SafeAreaView className='flex-1 bg-gray-50' edges={['bottom']}>
            <KeyboardAvoidingView
                className='flex-1'
                behavior={Platform.OS === 'ios' ? 'position' : 'height'}
                keyboardVerticalOffset={100}
            >
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 16 }}
                    keyboardShouldPersistTaps='handled'
                >
                    {isOAuth ? (
                        /* ── OAuth user — no password to change ── */
                        <FTCard className='gap-4'>
                            <View className='flex-row items-center gap-3'>
                                <View className='w-12 h-12 rounded-full bg-green-100 items-center justify-center'>
                                    <AntDesign name='Safety' size={22} color='#16a34a' />
                                </View>
                                <View className='flex-1'>
                                    <Text className='text-base font-semibold text-gray-800'>Password-free sign-in</Text>
                                    <Text className='text-xs text-gray-400 mt-0.5'>
                                        You sign in with {oAuthProvider}. No password is set.
                                    </Text>
                                </View>
                            </View>
                            <View className='flex-row items-start gap-2 bg-blue-50 rounded-xl px-3 py-3'>
                                <AntDesign name='infocirlceo' size={14} color='#0a7ea4' style={{ marginTop: 1 }} />
                                <Text className='text-xs text-primary flex-1'>
                                    To set or change your password, visit your {oAuthProvider} account security settings.
                                </Text>
                            </View>
                        </FTCard>
                    ) : (
                        /* ── Email/password user ── */
                        <FTCard className='gap-4'>
                            <FTField
                                label='Current Password'
                                value={currentPassword}
                                onChangeText={setCurrentPassword}
                                placeholder='Enter current password'
                                autoCapitalize='none'
                                secureTextEntry
                            />
                            <FTField
                                label='New Password'
                                value={newPassword}
                                onChangeText={setNewPassword}
                                placeholder='At least 8 characters'
                                autoCapitalize='none'
                                secureTextEntry
                                hint={passwordHint}
                                hintError
                            />
                            <FTField
                                label='Confirm New Password'
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                                placeholder='Repeat new password'
                                autoCapitalize='none'
                                secureTextEntry
                                hint={confirmHint}
                                hintError
                            />

                            <Pressable
                                onPress={handleUpdate}
                                disabled={!isValid || saving}
                                className={`rounded-2xl items-center justify-center ${isValid && !saving ? 'bg-primary active:bg-primary/90' : 'bg-gray-200'}`}
                                style={{ height: 52 }}
                            >
                                {saving ? (
                                    <View className='flex-row items-center gap-2'>
                                        <ActivityIndicator size='small' color='#fff' />
                                        <Text className='text-white font-semibold text-base'>Updating…</Text>
                                    </View>
                                ) : (
                                    <Text className={`font-semibold text-base ${isValid ? 'text-white' : 'text-gray-400'}`}>
                                        Update Password
                                    </Text>
                                )}
                            </Pressable>
                        </FTCard>
                    )}
                </ScrollView>
            </KeyboardAvoidingView>

            <FTAlert
                visible={alert.visible}
                type={alert.type}
                title={alert.title}
                message={alert.message}
                onDismiss={() => setAlert((a) => ({ ...a, visible: false }))}
                buttons={[{
                    text: 'OK',
                    style: 'default',
                    onPress: () => {
                        setAlert((a) => ({ ...a, visible: false }))
                        if (alert.type === 'success') router.back()
                    },
                }]}
            />
        </SafeAreaView>
    )
}
