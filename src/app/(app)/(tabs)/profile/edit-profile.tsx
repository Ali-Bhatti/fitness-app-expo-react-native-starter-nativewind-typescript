import FTAlert from '@/components/FTComponents/FTAlert'
import FTCard from '@/components/FTComponents/FTCard'
import FTField from '@/components/FTComponents/FTField'
import { useUser } from '@clerk/expo'
import AntDesign from '@expo/vector-icons/AntDesign'
import { useRouter } from 'expo-router'
import React, { useEffect, useState } from 'react'
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    Text,
    View,
} from 'react-native'
import { Image } from 'expo-image'
import { SafeAreaView } from 'react-native-safe-area-context'

type AlertState = { visible: boolean; type: 'success' | 'error'; title: string; message: string }

function InfoBanner({ icon, text }: { icon: string; text: string }) {
    return (
        <View className='flex-row items-center gap-2 bg-blue-50 rounded-xl px-3 py-2.5'>
            <AntDesign name={icon as any} size={14} color='#0a7ea4' />
            <Text className='text-xs text-primary flex-1'>{text}</Text>
        </View>
    )
}

export default function EditProfile() {
    const { user, isLoaded } = useUser()
    const router = useRouter()

    const [firstName, setFirstName] = useState('')
    const [lastName, setLastName] = useState('')
    const [saving, setSaving] = useState(false)
    const [alert, setAlert] = useState<AlertState>({ visible: false, type: 'success', title: '', message: '' })

    useEffect(() => {
        if (isLoaded && user) {
            setFirstName(user.firstName ?? '')
            setLastName(user.lastName ?? '')
        }
    }, [isLoaded, user])

    const isOAuth = (user?.externalAccounts?.length ?? 0) > 0
    const oAuthProvider = user?.externalAccounts?.[0]?.provider ?? 'your provider'
    const email = user?.primaryEmailAddress?.emailAddress ?? ''

    const isDirty =
        firstName.trim() !== (user?.firstName ?? '') ||
        lastName.trim() !== (user?.lastName ?? '')

    const handleSaveProfile = async () => {
        if (!user || !isDirty) return
        setSaving(true)
        try {
            await user.update({ firstName: firstName.trim(), lastName: lastName.trim() })
            setAlert({ visible: true, type: 'success', title: 'Profile updated', message: 'Your name has been saved.' })
        } catch (err: any) {
            const msg = err?.errors?.[0]?.longMessage ?? err?.message ?? 'Something went wrong.'
            setAlert({ visible: true, type: 'error', title: 'Update failed', message: msg })
        } finally {
            setSaving(false)
        }
    }

    const avatarUrl = user?.imageUrl ?? user?.externalAccounts?.[0]?.imageUrl ?? null

    if (!isLoaded) {
        return (
            <SafeAreaView className='flex-1 bg-gray-50 items-center justify-center' edges={['bottom']}>
                <ActivityIndicator size='large' color='#0a7ea4' />
            </SafeAreaView>
        )
    }

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
                    {/* Avatar */}
                    <View className='items-center py-2'>
                        <View className='relative'>
                            {avatarUrl ? (
                                <Image
                                    source={{ uri: avatarUrl }}
                                    style={{ width: 96, height: 96, borderRadius: 48, borderWidth: 3, borderColor: '#0a7ea4' }}
                                    contentFit='cover'
                                />
                            ) : (
                                <View
                                    className='w-24 h-24 rounded-full bg-primary/10 items-center justify-center'
                                    style={{ borderWidth: 3, borderColor: '#0a7ea4' }}
                                >
                                    <AntDesign name='user' size={36} color='#0a7ea4' />
                                </View>
                            )}
                        </View>
                        {isOAuth && (
                            <Text className='text-xs text-gray-400 mt-2 text-center'>
                                Profile photo managed by {oAuthProvider}
                            </Text>
                        )}
                    </View>

                    {/* Personal Info */}
                    <FTCard className='gap-4'>
                        <Text className='text-sm font-bold text-gray-700'>Personal Info</Text>
                        <FTField label='First Name' value={firstName} onChangeText={setFirstName} placeholder='First name' />
                        <FTField label='Last Name' value={lastName} onChangeText={setLastName} placeholder='Last name' />
                    </FTCard>

                    {/* Account */}
                    <FTCard className='gap-4'>
                        <Text className='text-sm font-bold text-gray-700'>Account</Text>
                        <FTField
                            label='Email'
                            value={email}
                            editable={false}
                            autoCapitalize='none'
                        />
                        {isOAuth && (
                            <InfoBanner
                                icon='infocirlceo'
                                text={`Signed in with ${oAuthProvider} — email is managed by your ${oAuthProvider} account and cannot be changed here.`}
                            />
                        )}
                    </FTCard>

                    {/* Save profile button */}
                    <Pressable
                        onPress={handleSaveProfile}
                        disabled={!isDirty || saving}
                        className={`rounded-2xl items-center justify-center ${isDirty && !saving ? 'bg-primary active:bg-primary/90' : 'bg-gray-200'}`}
                        style={{ height: 52 }}
                    >
                        {saving ? (
                            <View className='flex-row items-center gap-2'>
                                <ActivityIndicator size='small' color='#fff' />
                                <Text className='text-white font-semibold text-base'>Saving…</Text>
                            </View>
                        ) : (
                            <Text className={`font-semibold text-base ${isDirty ? 'text-white' : 'text-gray-400'}`}>
                                Save Changes
                            </Text>
                        )}
                    </Pressable>
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
                    onPress: () => alert.type === 'success'
                        ? router.back()
                        : setAlert((a) => ({ ...a, visible: false }))
                }]}
            />
        </SafeAreaView>
    )
}

