import AntDesign from '@expo/vector-icons/AntDesign'
import React, { useEffect } from 'react'
import {
    ActivityIndicator,
    FlatList,
    Modal,
    Pressable,
    RefreshControl,
    Text,
    View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import ExerciseCard from '@/components/ExerciseCard'
import ExerciseSearchBar from '@/components/ExerciseSearchBar'
import { useExerciseSearch } from '@/hooks/useExerciseSearch'

// ─── Props ────────────────────────────────────────────────────────────────────

type Props = {
    visible: boolean
    onClose: () => void
    onSelect: (id: string, name: string, target: string | null) => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ExerciseSelectionModal({ visible, onClose, onSelect }: Props) {
    const {
        visibleExercises,
        matchedAliases,
        loading,
        refreshing,
        search,
        setSearch,
        triggerFetch,
        resetSearch,
        handleRefresh,
    } = useExerciseSearch({ fetchOnDemand: true })

    // Fetch once when modal first opens; reset search when closed
    useEffect(() => {
        if (visible) {
            triggerFetch()
        } else {
            resetSearch()
        }
    }, [visible])

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
                    <ExerciseSearchBar value={search} onChange={setSearch} />
                </View>

                {/* List */}
                {loading ? (
                    <View className='flex-1 items-center justify-center'>
                        <ActivityIndicator size='large' color='#0a7ea4' />
                    </View>
                ) : (
                    <FlatList
                        data={visibleExercises}
                        keyExtractor={(item) => item._id}
                        renderItem={({ item }) => (
                            <ExerciseCard
                                item={item}
                                matchedAlias={matchedAliases[item._id]}
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
                                onRefresh={handleRefresh}
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
