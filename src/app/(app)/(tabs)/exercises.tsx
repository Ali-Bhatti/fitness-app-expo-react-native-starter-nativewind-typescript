import { useRouter } from 'expo-router'
import groq from 'groq'
import { defineQuery } from 'groq'
import React from 'react'
import { ActivityIndicator, FlatList, RefreshControl, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import DifficultyBadge, { Difficulty } from '@/components/Exercises/DifficultyBadge'
import ExerciseCard from '@/components/Exercises/ExerciseCard'
import ExerciseSearchBar from '@/components/Exercises/ExerciseSearchBar'
import TabHeader from '@/components/FTComponents/TabHeader'
import { useExerciseSearch } from '@/hooks/useExerciseSearch'

export const EXERCISES_QUERY = groq`*[_type == "exercise" && isActive == true
    && ($search == "" || name match $search + "*" || description match $search + "*")
] | order(name asc) {
    _id,
    name,
    description,
    difficulty,
    target,
    "imageUrl": image.asset->url
}`

export const exerciseQueryDQ = defineQuery(`*[_type == "exercise"] | order(name asc) {
    _id,
    name,
    description,
    difficulty,
    target,
    alternateNames,
    image
}`);

const DIFFICULTIES: Difficulty[] = ['all', 'beginner', 'intermediate', 'advanced']

function FilterBar({
    active,
    onSelect,
    disabled,
}: {
    active: Difficulty
    onSelect: (d: Difficulty) => void
    disabled?: boolean
}) {
    return (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className='mb-2'
            style={{ flexGrow: 0, flexShrink: 0 }}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 8, alignItems: 'center' }}
        >
            {DIFFICULTIES.map((d) => (
                <DifficultyBadge
                    key={d}
                    difficulty={d}
                    isActive={active === d}
                    disabled={disabled}
                    onPress={() => onSelect(d)}
                />
            ))}
        </ScrollView>
    )
}

export default function Exercises() {
    const router = useRouter()
    const {
        visibleExercises,
        matchedAliases,
        loading,
        refreshing,
        search,
        setSearch,
        difficultyFilter,
        setDifficultyFilter,
        handleRefresh,
    } = useExerciseSearch()

    return (
        <SafeAreaView className='flex-1 bg-gray-50' edges={['top']}>
            <TabHeader
                title='Exercise Library'
                subtitle='Discover and master new exercises'
            />

            <ExerciseSearchBar value={search} onChange={setSearch} />

            <FilterBar active={difficultyFilter} onSelect={setDifficultyFilter} disabled={loading} />

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
                            onPress={() => router.push(`/exercise-detail?id=${item._id}` as never)}
                        />
                    )}
                    ListEmptyComponent={
                        <View className='items-center justify-center mt-20'>
                            <Text className='text-4xl mb-3'>🔍</Text>
                            <Text className='text-gray-500 text-base'>No exercises found</Text>
                        </View>
                    }
                    contentContainerStyle={{ paddingBottom: 24 }}
                    showsVerticalScrollIndicator={true}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={handleRefresh}
                            tintColor='#0a7ea4'
                            colors={['#0a7ea4']}
                            title='Pull to refresh exercises'
                        />
                    }
                />
            )}
        </SafeAreaView>
    )
}

