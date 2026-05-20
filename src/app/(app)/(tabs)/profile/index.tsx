import AccountSettings from '@/components/Profile/AccountSettings'
import FTAlert from '@/components/FTComponents/FTAlert'
import FTCard from '@/components/FTComponents/FTCard'
import ProfileFitnessStats from '@/components/Profile/ProfileFitnessStats'
import TabHeader from '@/components/FTComponents/TabHeader'
import { useAuth, useUser } from '@clerk/expo'
import AntDesign from '@expo/vector-icons/AntDesign'
import React, { useState } from 'react'
import {
    Image,
    Pressable,
    RefreshControl,
    ScrollView,
    Text,
    View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function ProfilePage() {
    const { signOut, userId } = useAuth()
    const { user } = useUser()
    const [refreshKey, setRefreshKey] = useState(0)
    const [refreshing, setRefreshing] = useState(false)
    const [showSignOutAlert, setShowSignOutAlert] = useState(false)

    const handleRefresh = async () => {
        setRefreshing(true)
        try {
            await user?.reload()
            setRefreshKey((k) => k + 1)
        } finally {
            setRefreshing(false)
        }
    }

    const memberSince = user?.createdAt
        ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
        : null
    const avatarUrl = user?.imageUrl ?? user?.externalAccounts?.[0]?.imageUrl ?? null

    return (
        <SafeAreaView className='flex-1 bg-gray-50' edges={['top']}>
            <TabHeader
                title='Profile'
                subtitle='Manage your account and stats'
                rightAction={
                    <Pressable
                        onPress={() => setShowSignOutAlert(true)}
                        className='w-9 h-9 items-center justify-center rounded-xl bg-red-50 active:bg-red-100'
                        hitSlop={8}
                    >
                        <AntDesign name='logout' size={17} color='#EF4444' />
                    </Pressable>
                }
            />

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 32 }}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                        tintColor='#0a7ea4'
                        colors={['#0a7ea4']}
                        title='Pull to refresh profile'
                    />
                }
            >
                {/* ── Profile card ── */}
                <View className='px-4'>
                    <FTCard className='flex-row items-center gap-4'>
                        {avatarUrl ? (
                            <Image
                                source={{ uri: avatarUrl }}
                                style={{ width: 56, height: 56, borderRadius: 28, borderWidth: 2, borderColor: '#0a7ea4' }}
                            />
                        ) : (
                            <View
                                className='w-14 h-14 rounded-full bg-primary/10 items-center justify-center'
                                style={{ borderWidth: 2, borderColor: '#0a7ea4' }}
                            >
                                <AntDesign name='user' size={24} color='#0a7ea4' />
                            </View>
                        )}
                        <View className='flex-1'>
                            <Text className='text-base font-bold text-gray-900' numberOfLines={1}>
                                {user?.fullName ?? user?.username ?? 'Athlete'}
                            </Text>
                            <Text className='text-sm text-gray-500 mt-0.5' numberOfLines={1}>
                                {user?.primaryEmailAddress?.emailAddress ?? ''}
                            </Text>
                            {memberSince && (
                                <View className='flex-row items-center gap-1 mt-1'>
                                    <AntDesign name='calendar' size={10} color='#9CA3AF' />
                                    <Text className='text-xs text-gray-400'>Member since {memberSince}</Text>
                                </View>
                            )}
                        </View>
                    </FTCard>
                </View>

                {/* ── Fitness stats ── */}
                {userId && (
                    <View className='px-4 mt-3'>
                        <ProfileFitnessStats userId={userId} refreshKey={refreshKey} />
                    </View>
                )}

                {/* ── Account settings ── */}
                <View className='px-4 mt-3'>
                    <AccountSettings />
                </View>
            </ScrollView>

            <FTAlert
                visible={showSignOutAlert}
                type='warning'
                title='Sign Out'
                message='Are you sure you want to sign out?'
                onDismiss={() => setShowSignOutAlert(false)}
                buttons={[
                    { text: 'Sign Out', style: 'destructive', onPress: () => signOut() },
                    { text: 'Cancel', style: 'cancel', onPress: () => setShowSignOutAlert(false) },
                ]}
            />
        </SafeAreaView>
    )
}
