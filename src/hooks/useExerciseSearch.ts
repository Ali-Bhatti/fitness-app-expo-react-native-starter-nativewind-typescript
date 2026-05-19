import Fuse from 'fuse.js'
import { useEffect, useMemo, useRef, useState } from 'react'
import { exerciseQueryDQ } from '@/app/(app)/(tabs)/exercises'
import { Difficulty } from '@/components/DifficultyBadge'
import { sanityClient } from '@/lib/sanity/client'
import { Exercise } from '@/lib/sanity/types'

type Options = {
    /** Only fetch once (lazy) — useful for modals that mount before they open */
    fetchOnDemand?: boolean
}

export function useExerciseSearch({ fetchOnDemand = false }: Options = {}) {
    const [allExercises, setAllExercises] = useState<Exercise[]>([])
    const [exercises, setExercises] = useState<Exercise[]>([])
    const [matchedAliases, setMatchedAliases] = useState<Record<string, string>>({})
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [search, setSearch] = useState('')
    const [difficultyFilter, setDifficultyFilter] = useState<Difficulty>('all')

    const hasFetched = useRef(false)

    const fetchExercises = async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true)
        try {
            const data = await sanityClient.fetch<Exercise[]>(exerciseQueryDQ)
            setAllExercises(data)
            setExercises(data)
        } catch (err) {
            console.error('useExerciseSearch fetch error:', err)
        } finally {
            if (isRefresh) setRefreshing(false)
            else setLoading(false)
        }
    }

    // For non-demand mode, fetch immediately on mount
    useEffect(() => {
        if (!fetchOnDemand) {
            fetchExercises()
        }
    }, [])

    // Fuse.js index — rebuilt only when exercise list changes
    const fuse = useMemo(
        () =>
            new Fuse(allExercises, {
                keys: [
                    { name: 'name', weight: 0.5 },
                    { name: 'alternateNames', weight: 0.3 },
                    { name: 'target', weight: 0.15 },
                    { name: 'description', weight: 0.05 },
                ],
                threshold: 0.35,
                includeScore: true,
                includeMatches: true,
                ignoreLocation: true,
            }),
        [allExercises]
    )

    // Search filter — Fuse.js scored + alias chip tracking
    useEffect(() => {
        const term = search.trim()
        if (!term) {
            setExercises(allExercises)
            setMatchedAliases({})
            return
        }

        const results = fuse.search(term)
        const aliases: Record<string, string> = {}

        const sorted = results.map(({ item, matches }) => {
            const aliasMatch = matches?.find((m) => m.key === 'alternateNames')
            const nameLower = item.name?.toLowerCase() ?? ''
            if (aliasMatch && !nameLower.includes(term.toLowerCase())) {
                const matchedAlias = item.alternateNames?.[aliasMatch.refIndex ?? 0]
                if (matchedAlias) aliases[item._id] = matchedAlias
            }
            return item
        })

        setExercises(sorted)
        setMatchedAliases(aliases)
    }, [search, allExercises, fuse])

    // Difficulty chip filter applied on top of search results
    const visibleExercises = difficultyFilter === 'all'
        ? exercises
        : exercises.filter((ex) => ex.difficulty === difficultyFilter)

    // For fetchOnDemand (modal) — call this when you want to trigger the first fetch
    const triggerFetch = (isRefresh = false) => {
        if (!hasFetched.current || isRefresh) {
            hasFetched.current = true
            fetchExercises(isRefresh)
        }
    }

    const resetSearch = () => {
        setSearch('')
        setDifficultyFilter('all')
    }

    return {
        visibleExercises,
        matchedAliases,
        loading,
        refreshing,
        search,
        setSearch,
        difficultyFilter,
        setDifficultyFilter,
        handleRefresh: () => fetchExercises(true),
        triggerFetch,
        resetSearch,
    }
}
