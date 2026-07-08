import FTAlert from '@/components/FTComponents/FTAlert'
import { formatDuration } from '@/lib/utils'
import { useWorkoutStore } from '../../store/workout-store'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import React, { useEffect, useRef, useState } from 'react'
import { AppState, Pressable, Text, View } from 'react-native'

export default function WorkoutMiniBanner() {
    const router = useRouter()
    const { workoutStatus, workoutExercises, getElapsedMs, clearSession } = useWorkoutStore()

    const [, setTick] = useState(0)
    const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const [showDiscardAlert, setShowDiscardAlert] = useState(false)

    useEffect(() => {
        if (workoutStatus === 'running') {
            tickRef.current = setInterval(() => setTick(t => t + 1), 1000)
        } else {
            if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null }
        }
        return () => { if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null } }
    }, [workoutStatus])

    useEffect(() => {
        const sub = AppState.addEventListener('change', state => {
            if (state === 'active') setTick(t => t + 1)
        })
        return () => sub.remove()
    }, [])

    if (workoutStatus === 'idle') return null

    const elapsedSeconds = Math.floor(getElapsedMs() / 1000)
    const completedSets = workoutExercises.reduce((acc, ex) => acc + ex.sets.filter(s => s.isCompleted).length, 0)
    const totalSets = workoutExercises.reduce((acc, ex) => acc + ex.sets.length, 0)

    return (
        <>
            <Pressable
                onPress={() => router.push('/(app)/(tabs)/active-workout' as never)}
                style={{
                    marginHorizontal: 12,
                    marginBottom: 8,
                    backgroundColor: '#0a7ea4',
                    borderRadius: 16,
                    paddingLeft: 16,
                    paddingRight: 8,
                    paddingVertical: 11,
                    flexDirection: 'row',
                    alignItems: 'center',
                    shadowColor: '#0a7ea4',
                    shadowOffset: { width: 0, height: 3 },
                    shadowOpacity: 0.28,
                    shadowRadius: 10,
                    elevation: 5,
                }}
            >
                {/* Live indicator dot */}
                <View
                    style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: workoutStatus === 'running' ? '#4ADE80' : '#FCD34D',
                        marginRight: 10,
                    }}
                />

                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15, marginRight: 10 }}>
                    {formatDuration(elapsedSeconds)}
                </Text>

                <Text style={{ color: 'rgba(255,255,255,0.72)', fontSize: 13, flex: 1 }}>
                    {workoutExercises.length} exercise{workoutExercises.length !== 1 ? 's' : ''}
                    {totalSets > 0 ? ` · ${completedSets}/${totalSets} sets` : ''}
                </Text>

                <Ionicons name='chevron-up' size={16} color='rgba(255,255,255,0.75)' style={{ marginRight: 4 }} />

                {/* Discard × button — separate hit target so it doesn't trigger the main press */}
                <Pressable
                    onPress={(e) => { e.stopPropagation(); setShowDiscardAlert(true) }}
                    hitSlop={8}
                    style={{
                        width: 28,
                        height: 28,
                        borderRadius: 14,
                        backgroundColor: 'rgba(255,255,255,0.18)',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginLeft: 4,
                    }}
                >
                    <Ionicons name='close' size={16} color='rgba(255,255,255,0.9)' />
                </Pressable>
            </Pressable>

            <FTAlert
                visible={showDiscardAlert}
                type='warning'
                title='Discard Workout?'
                message='This will permanently delete your current session and all logged sets.'
                onDismiss={() => setShowDiscardAlert(false)}
                buttons={[
                    {
                        text: 'Discard',
                        style: 'destructive',
                        onPress: () => { setShowDiscardAlert(false); clearSession() },
                    },
                    {
                        text: 'Keep Going',
                        style: 'cancel',
                        onPress: () => setShowDiscardAlert(false),
                    },
                ]}
            />
        </>
    )
}
