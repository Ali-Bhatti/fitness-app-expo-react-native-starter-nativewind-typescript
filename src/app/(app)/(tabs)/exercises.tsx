import AntDesign from '@expo/vector-icons/AntDesign'
import { useRouter } from 'expo-router'
import Fuse from 'fuse.js'
import groq from 'groq'
import { defineQuery } from 'groq'
import React, { useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, FlatList, RefreshControl, ScrollView, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import DifficultyBadge, { Difficulty } from '@/components/DifficultyBadge'
import ExerciseCard from '@/components/ExerciseCard'
import TabHeader from '@/components/TabHeader'
import { sanityClient } from '@/lib/sanity/client'
import { Exercise } from '@/lib/sanity/types'

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
            />
        </View>
    )
}

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

    const [allExercises, setAllExercises] = useState<Exercise[]>([])
    const [exercises, setExercises] = useState<Exercise[]>([])
    const [matchedAliases, setMatchedAliases] = useState<Record<string, string>>({})
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [search, setSearch] = useState('')
    const [difficultyFilter, setDifficultyFilter] = useState<Difficulty>('all')

    // Build Fuse index whenever the exercise list changes
    const fuse = useMemo(
        () =>
            new Fuse(allExercises, {
                keys: [
                    { name: 'name',           weight: 0.5  },
                    { name: 'alternateNames', weight: 0.3  },
                    { name: 'target',         weight: 0.15 },
                    { name: 'description',    weight: 0.05 },
                ],
                threshold: 0.35,      // 0 = exact only, 1 = match anything
                includeScore: true,
                includeMatches: true, // needed to detect which field triggered the match
                ignoreLocation: true, // don't penalise matches in the middle of a string
                useExtendedSearch: false,
            }),
        [allExercises]
    )

    const fetchExercises = async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true)
        try {
            const data = await sanityClient.fetch<Exercise[]>(exerciseQueryDQ)
            setAllExercises(data)
            setExercises(data)
        } catch (err) {
            console.error(err)
        } finally {
            if (isRefresh) setRefreshing(false)
            else setLoading(false)
        }
    }

    const handleRefresh = () => fetchExercises(true)

    useEffect(() => {
        fetchExercises()
    }, [])

    // Fuse.js search — scored, fuzzy, weighted by field importance
    useEffect(() => {
        const term = search.trim()
        if (!term) {
            setExercises(allExercises)
            setMatchedAliases({})
            return
        }

        const results = fuse.search(term) // already sorted by score (lowest = best)

        const aliases: Record<string, string> = {}
        const sorted = results.map(({ item, matches }) => {
            // Find which alternateNames field triggered the match (if any)
            const aliasMatch = matches?.find((m) => m.key === 'alternateNames')
            const nameLower = item.name?.toLowerCase() ?? ''
            const termLower = term.toLowerCase()

            if (aliasMatch && !nameLower.includes(termLower)) {
                const matchedAlias = item.alternateNames?.[aliasMatch.refIndex ?? 0]
                if (matchedAlias) aliases[item._id] = matchedAlias
            }
            return item
        })

        setExercises(sorted)
        setMatchedAliases(aliases)
    }, [search, allExercises, fuse])

    // Apply difficulty chip filter on top of search results
    const visibleExercises = difficultyFilter === 'all'
        ? exercises
        : exercises.filter((ex) => ex.difficulty === difficultyFilter)

    return (
        <SafeAreaView className='flex-1 bg-gray-50' edges={['top']}>
            <TabHeader
                title='Exercise Library'
                subtitle='Discover and master new exercises'
            />

            {/* Search */}
            <SearchBar value={search} onChange={setSearch} />

            {/* Difficulty filters */}
            <FilterBar active={difficultyFilter} onSelect={setDifficultyFilter} disabled={loading} />

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
