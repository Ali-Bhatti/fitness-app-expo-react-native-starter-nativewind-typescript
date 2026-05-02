import AntDesign from '@expo/vector-icons/AntDesign'
import { useRouter } from 'expo-router'
import groq from 'groq'
import { defineQuery } from 'groq'
import React, { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import DifficultyBadge, { Difficulty } from '@/components/DifficultyBadge'
import ExerciseCard from '@/components/ExerciseCard'
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
    image
}`);

const DIFFICULTIES: Difficulty[] = ['beginner', 'intermediate', 'advanced']

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
}: {
    active: Difficulty | null
    onSelect: (d: Difficulty | null) => void
}) {
    return (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className='mb-4'
            contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
        >
            {/* All */}
            <Pressable
                onPress={() => onSelect(null)}
                className={`rounded-full px-3 py-2 active:opacity-70 ${active === null ? 'bg-[#0a7ea4]' : 'bg-gray-100'}`}
            >
                <Text className={`text-xs font-semibold ${active === null ? 'text-white' : 'text-gray-600'}`}>
                    All
                </Text>
            </Pressable>

            {DIFFICULTIES.map((d) => (
                <DifficultyBadge
                    key={d}
                    difficulty={d}
                    isActive={active === d}
                    onPress={() => onSelect(active === d ? null : d)}
                />
            ))}
        </ScrollView>
    )
}

export default function Exercises() {
    const router = useRouter()
    const [allExercises, setAllExercises] = useState<Exercise[]>([])
    const [exercises, setExercises] = useState<Exercise[]>([])
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [search, setSearch] = useState('')
    const [difficultyFilter] = useState<Difficulty | null>(null)

    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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

    // useEffect(() => {
    //     if (debounceRef.current) clearTimeout(debounceRef.current)
    //     debounceRef.current = setTimeout(() => fetchExercises(search), 400)
    //     return () => {
    //         if (debounceRef.current) clearTimeout(debounceRef.current)
    //     }
    // }, [search])

    // Client-side filtering
    useEffect(() => {
        const term = search.trim().toLowerCase()
        if (!term) {
            setExercises(allExercises)
            return
        }
        const filtered = allExercises.filter(
            (ex) =>
                ex.name?.toLowerCase().includes(term) ||
                ex.description?.toLowerCase().includes(term)
        )
        setExercises(filtered)
    }, [search, allExercises])

    return (
        <SafeAreaView className='flex-1 bg-gray-50' edges={['top']}>
            {/* Header */}
            <View className='px-4 pt-2 pb-4'>
                <Text className='text-3xl font-bold text-gray-900'>Exercise Library</Text>
                <Text className='text-sm text-gray-500 mt-1'>Discover and master new exercises</Text>
            </View>

            {/* Search */}
            <SearchBar value={search} onChange={setSearch} />

            {/* Difficulty filters */}
            {/* <FilterBar active={difficultyFilter} onSelect={setDifficultyFilter} /> */}

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
