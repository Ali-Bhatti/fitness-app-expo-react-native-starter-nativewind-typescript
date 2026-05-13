import AntDesign from '@expo/vector-icons/AntDesign'
import React, { useEffect, useRef, useState } from 'react'
import {
    ActivityIndicator,
    FlatList,
    Modal,
    Pressable,
    RefreshControl,
    Text,
    TextInput,
    View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import ExerciseCard from '@/components/ExerciseCard'
import { sanityClient } from '@/lib/sanity/client'
import { Exercise } from '@/lib/sanity/types'
import { exerciseQueryDQ } from '@/app/(app)/(tabs)/exercises'

// ─── Search bar ───────────────────────────────────────────────────────────────

function SearchBar({ value, onChange }: { value: string; onChange: (text: string) => void }) {
    return (
        <View className='mx-4 mb-3 flex-row items-center bg-gray-100 rounded-xl px-4 py-2 gap-2'>
            <AntDesign name='search1' size={16} color='#9CA3AF' />
            <TextInput
                value={value}
                onChangeText={onChange}
                placeholder='Search exercises...'
                placeholderTextColor='#9CA3AF'
                className='flex-1 text-gray-900'
                returnKeyType='search'
                clearButtonMode='while-editing'
                autoCorrect={false}
            />
        </View>
    )
}

// ─── Props ────────────────────────────────────────────────────────────────────

type Props = {
    visible: boolean
    onClose: () => void
    onSelect: (id: string, name: string, target: string | null) => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ExerciseSelectionModal({ visible, onClose, onSelect }: Props) {
    const [allExercises, setAllExercises] = useState<Exercise[]>([])
    const [exercises, setExercises] = useState<Exercise[]>([])
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [search, setSearch] = useState('')

    const hasFetched = useRef(false)

    const fetchExercises = async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true)
        try {
            const data = await sanityClient.fetch<Exercise[]>(exerciseQueryDQ)
            setAllExercises(data)
            setExercises(data)
        } catch (err) {
            console.error('ExerciseSelectionModal fetch error:', err)
        } finally {
            if (isRefresh) setRefreshing(false)
            else setLoading(false)
        }
    }

    // Fetch once when modal first opens
    useEffect(() => {
        if (visible && !hasFetched.current) {
            hasFetched.current = true
            fetchExercises()
        }
        // Reset search when closed
        if (!visible) setSearch('')
    }, [visible])

    // Client-side search filter
    useEffect(() => {
        const term = search.trim().toLowerCase()
        if (!term) {
            setExercises(allExercises)
            return
        }
        setExercises(
            allExercises.filter(
                (ex) =>
                    ex.name?.toLowerCase().includes(term) ||
                    ex.description?.toLowerCase().includes(term)
            )
        )
    }, [search, allExercises])

    return (
        <Modal
            visible={visible}
            animationType='slide'
            presentationStyle='pageSheet'
            onRequestClose={onClose}
        >
            <SafeAreaView className='flex-1 bg-gray-50' edges={['top']}>

                {/* Header */}
                <View className='flex-row items-center justify-between px-4 py-3 border-b border-gray-100 bg-white'>
                    <View>
                        <Text className='text-xl font-bold text-gray-900'>Add Exercise</Text>
                        <Text className='text-sm text-gray-400 mt-0.5'>Tap any exercise to add it</Text>
                    </View>
                    <Pressable
                        onPress={onClose}
                        className='w-8 h-8 rounded-full bg-gray-100 items-center justify-center active:bg-gray-200'
                    >
                        <AntDesign name='close' size={16} color='#6B7280' />
                    </Pressable>
                </View>

                {/* Search */}
                <View className='pt-3'>
                    <SearchBar value={search} onChange={setSearch} />
                </View>

                {/* List */}
                {loading ? (
                    <View className='flex-1 items-center justify-center'>
                        <ActivityIndicator size='large' color='#0a7ea4' />
                    </View>
                ) : (
                    <FlatList
                        data={exercises}
                        keyExtractor={(item) => item._id}
                        renderItem={({ item }) => (
                            <ExerciseCard
                                item={item}
                                onPress={() => {
                                    onSelect(item._id, item.name ?? 'Unknown', item.target ?? null)
                                    onClose()
                                }}
                                selectionMode
                            />
                        )}
                        ListEmptyComponent={
                            <View className='items-center justify-center mt-20'>
                                <Text className='text-4xl mb-3'>🔍</Text>
                                <Text className='text-gray-500 text-base'>No exercises found</Text>
                            </View>
                        }
                        contentContainerStyle={{ paddingBottom: 24, paddingTop: 4 }}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps='handled'
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={() => fetchExercises(true)}
                                tintColor='#0a7ea4'
                                colors={['#0a7ea4']}
                            />
                        }
                    />
                )}
            </SafeAreaView>
        </Modal>
    )
}
