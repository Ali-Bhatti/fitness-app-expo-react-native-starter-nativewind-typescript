import FTAlert from '@/components/FTAlert'
import FTCard from '@/components/FTCard'
import ExerciseSelectionModal from '@/components/ExerciseSelectionModal'
import { formatDuration } from '@/lib/utils'
import { useWorkoutStore } from '../../../../store/workout-store'
import { useAuth } from '@clerk/expo'
import AntDesign from '@expo/vector-icons/AntDesign'
import { useFocusEffect, useRouter } from 'expo-router'
import React, { useCallback, useState } from 'react'
import { useStopwatch } from 'react-timer-hook'
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

// ─── Component ────────────────────────────────────────────────────────────────

export default function ActiveWorkout() {
    const router = useRouter()
    const { userId } = useAuth()

    // Timer
    const { totalSeconds, start, pause, reset } = useStopwatch({ autoStart: false })

    // Store
    const {
        weightUnit,
        workoutExercises,
        setWeightUnit,
        addExercise,
        removeExercise,
        addSet,
        removeSet,
        updateSet,
        toggleSetCompleted,
        resetWorkout,
    } = useWorkoutStore()

    // Picker
    const [showPicker, setShowPicker] = useState(false)

    // Alerts
    const [showDiscardAlert, setShowDiscardAlert] = useState(false)
    const [showFinishAlert, setShowFinishAlert] = useState(false)
    const [showErrorAlert, setShowErrorAlert] = useState(false)
    const [errorMessage, setErrorMessage] = useState('')
    const [isSaving, setIsSaving] = useState(false)

    // Reset workout data and start timer fresh on every focus
    useFocusEffect(
        useCallback(() => {
            reset(undefined, true)
            resetWorkout()
            setShowPicker(false)
            setShowDiscardAlert(false)
            setShowFinishAlert(false)
            setShowErrorAlert(false)
            setErrorMessage('')
            setIsSaving(false)

            return () => pause()
        }, [])
    )

    const hasValidData = workoutExercises.some(ex =>
        ex.sets.some(s => parseInt(s.reps) > 0)
    )

    const handleFinish = async () => {
        setIsSaving(true)
        try {
            const res = await fetch('/api/workout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    duration: totalSeconds,
                    exercises: workoutExercises.map(ex => ({
                        exerciseId: ex.sanityId,
                        sets: ex.sets.map(s => ({
                            reps: s.reps,
                            weight: s.weight,
                            weightUnit,
                        })),
                    })),
                }),
            })
            if (res.ok) {
                setShowFinishAlert(false)
                setTimeout(() => router.replace({ pathname: '/(app)/(tabs)/history', params: { refresh: Date.now().toString() } }), 150)
            } else {
                const data = await res.json().catch(() => ({}))
                setShowFinishAlert(false)
                setErrorMessage(data.error || 'Failed to save workout. Please try again.')
                setShowErrorAlert(true)
            }
        } catch {
            setShowFinishAlert(false)
            setErrorMessage('Network error. Please check your connection and try again.')
            setShowErrorAlert(true)
        } finally {
            setIsSaving(false)
        }
    }

    // ─── Render ───────────────────────────────────────────────────────────────

    return (
        <SafeAreaView className='flex-1 bg-white' edges={['top']}>

            {/* ── Header ── */}
            <View className='flex-row items-center justify-between px-4 py-3 border-b border-gray-100 bg-white'>
                {/* Left: title + timer */}
                <View>
                    <Text className='text-lg font-bold text-gray-900'>Active Workout</Text>
                    <Text className='text-sm font-semibold text-primary mt-0.5'>{formatDuration(totalSeconds)}</Text>
                </View>

                {/* Right: unit toggle + end button */}
                <View className='flex-row items-center gap-2'>
                    {/* Global lbs / kg toggle */}
                    <View className='flex-row bg-gray-100 rounded-lg overflow-hidden'>
                        {(['lbs', 'kg'] as const).map(unit => (
                            <Pressable
                                key={unit}
                                onPress={() => setWeightUnit(unit)}
                                className={`px-3 py-1.5 ${weightUnit === unit ? 'bg-primary' : ''}`}
                            >
                                <Text className={`text-xs font-semibold ${weightUnit === unit ? 'text-white' : 'text-gray-500'}`}>{unit}</Text>
                            </Pressable>
                        ))}
                    </View>

                    <Pressable
                        onPress={() => {
                            if (workoutExercises.length > 0) {
                                pause()
                                setShowFinishAlert(true)
                            } else {
                                setShowDiscardAlert(true)
                            }
                        }}
                        disabled={isSaving}
                        className='bg-ft-red rounded-xl px-4 py-2 active:opacity-80'
                    >
                        {isSaving
                            ? <ActivityIndicator size='small' color='#fff' />
                            : <Text className='font-bold text-sm text-white'>{workoutExercises.length > 0 ? 'Complete Workout' : 'End Workout'}</Text>
                        }
                    </Pressable>
                </View>
            </View>

            {/* ── Content ── */}
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                className='flex-1 bg-gray-50'
            >
                <ScrollView
                    className='flex-1'
                    contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 40 }}
                    keyboardShouldPersistTaps='handled'
                    showsVerticalScrollIndicator={false}
                >
                    {/* Empty state */}
                    {workoutExercises.length === 0 && (
                        <FTCard className='items-center py-10 mt-2'>
                            <View className='w-16 h-16 rounded-full bg-primary/10 items-center justify-center mb-4'>
                                <AntDesign name='plus' size={28} color='#0a7ea4' />
                            </View>
                            <Text className='text-base font-semibold text-gray-700 mb-1'>No exercises yet</Text>
                            <Text className='text-sm text-gray-400 text-center'>
                                Tap "Add Exercise" below to start logging
                            </Text>
                        </FTCard>
                    )}

                    {/* Exercise cards */}
                    {workoutExercises.map((ex) => (
                        <FTCard key={ex.id} className='mb-3'>
                            {/* Exercise header */}
                            <View className='flex-row items-start justify-between mb-3'>
                                <View className='flex-1 mr-3'>
                                    <Text className='text-base font-bold text-gray-900' numberOfLines={1}>{ex.name}</Text>
                                    {ex.target && <Text className='text-xs text-gray-400 capitalize mt-0.5'>{ex.target}</Text>}
                                </View>
                                <Pressable onPress={() => removeExercise(ex.id)} className='p-1 rounded-full bg-red-50 items-center justify-center active:bg-red-100'>
                                    <AntDesign name='delete' size={15} color='#EF4444' />
                                </Pressable>
                            </View>

                            {/* Column headers */}
                            <View className='flex-row items-center mb-2 px-1'>
                                <Text className='w-8 text-xs font-semibold text-gray-400'>SET</Text>
                                <Text className='flex-1 text-xs font-semibold text-gray-400 text-center'>REPS</Text>
                                <Text className='flex-1 text-xs font-semibold text-gray-400 text-center'>{weightUnit.toUpperCase()}</Text>
                                <View className='w-7' />
                            </View>

                            {/* Set rows */}
                            {ex.sets.map((set, setIdx) => (
                                <View key={set.id} className='flex-row items-center mb-2'>
                                    <Pressable
                                        onPress={() => toggleSetCompleted(ex.id, set.id)}
                                        className={`w-8 h-7 rounded-full items-center justify-center ${set.isCompleted ? 'bg-ft-green' : 'bg-primary/10'}`}
                                    >
                                        {set.isCompleted
                                            ? <AntDesign name='check' size={12} color='#fff' />
                                            : <Text className='text-xs font-bold text-primary'>{setIdx + 1}</Text>
                                        }
                                    </Pressable>
                                    <TextInput
                                        value={set.reps}
                                        onChangeText={v => updateSet(ex.id, set.id, 'reps', v.replace(/[^0-9]/g, ''))}
                                        placeholder='0'
                                        placeholderTextColor='#9CA3AF'
                                        keyboardType='number-pad'
                                        style={{ flex: 1, backgroundColor: set.isCompleted ? '#F0FDF4' : '#F9FAFB', borderRadius: 10, textAlign: 'center', paddingVertical: 8, fontSize: 14, fontWeight: '500', color: '#1F2937', marginHorizontal: 4, borderWidth: 1, borderColor: set.isCompleted ? '#BBF7D0' : '#F3F4F6' }}
                                    />
                                    <TextInput
                                        value={set.weight}
                                        onChangeText={v => updateSet(ex.id, set.id, 'weight', v.replace(/[^0-9.]/g, ''))}
                                        placeholder='—'
                                        placeholderTextColor='#9CA3AF'
                                        keyboardType='decimal-pad'
                                        style={{ flex: 1, backgroundColor: set.isCompleted ? '#F0FDF4' : '#F9FAFB', borderRadius: 10, textAlign: 'center', paddingVertical: 8, fontSize: 14, fontWeight: '500', color: '#1F2937', marginHorizontal: 4, borderWidth: 1, borderColor: set.isCompleted ? '#BBF7D0' : '#F3F4F6' }}
                                    />
                                    <Pressable
                                        onPress={() => ex.sets.length > 1 ? removeSet(ex.id, set.id) : undefined}
                                        className='w-7 items-center justify-center active:opacity-60'
                                    >
                                        <AntDesign name='delete' size={14} color={ex.sets.length > 1 ? '#EF4444' : '#E5E7EB'} />
                                    </Pressable>
                                </View>
                            ))}

                            {/* Add set */}
                            <Pressable
                                onPress={() => addSet(ex.id)}
                                className='mt-1 flex-row items-center justify-center gap-1.5 py-2.5 rounded-xl bg-gray-50 active:bg-gray-100'
                            >
                                <AntDesign name='plus' size={12} color='#6B7280' />
                                <Text className='text-sm text-gray-500 font-medium'>Add Set</Text>
                            </Pressable>
                        </FTCard>
                    ))}

                    {/* Add Exercise button */}
                    <Pressable
                        onPress={() => setShowPicker(true)}
                        className='flex-row items-center justify-center gap-2 py-4 rounded-2xl border-2 border-dashed border-primary/40 active:bg-primary/5 mt-4'
                    >
                        <AntDesign name='plus' size={18} color='#0a7ea4' />
                        <Text className='text-primary font-semibold text-base'>Add Exercise</Text>
                    </Pressable>
                </ScrollView>
            </KeyboardAvoidingView>

            {/* ── Exercise Picker Modal ── */}
            <ExerciseSelectionModal
                visible={showPicker}
                onClose={() => setShowPicker(false)}
                onSelect={(id, name, target) => addExercise(id, name, target)}
            />

            {/* ── Alerts ── */}
            <FTAlert
                visible={showDiscardAlert}
                type='warning'
                title='Discard Workout?'
                message='All progress will be lost. This cannot be undone.'
                onDismiss={() => setShowDiscardAlert(false)}
                buttons={[
                    {
                        text: 'Discard', style: 'destructive', onPress: () => {
                            setShowDiscardAlert(false)
                            // Let modal close animation finish before navigating
                            setTimeout(() => router.back(), 150)
                        }
                    },
                    { text: 'Keep Going', style: 'cancel', onPress: () => setShowDiscardAlert(false) },
                ]}
            />

            <FTAlert
                visible={showFinishAlert}
                type='success'
                title='Finish Workout?'
                message={`${formatDuration(totalSeconds)} · ${workoutExercises.length} exercise${workoutExercises.length !== 1 ? 's' : ''}. Save and complete?`}
                onDismiss={() => {
                    if (!isSaving) {
                        start()  // resume timer
                        setShowFinishAlert(false)
                    }
                }}
                loading={isSaving}
                buttons={[
                    { text: 'Save Workout', style: 'default', onPress: handleFinish },
                    {
                        text: 'Keep Going', style: 'cancel', onPress: () => {
                            start()  // resume timer
                            setShowFinishAlert(false)
                        }
                    },
                ]}
            />

            <FTAlert
                visible={showErrorAlert}
                type='error'
                title='Save Failed'
                message={errorMessage}
                onDismiss={() => setShowErrorAlert(false)}
                buttons={[{ text: 'OK', style: 'default', onPress: () => setShowErrorAlert(false) }]}
            />
        </SafeAreaView>
    )
}

