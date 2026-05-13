import { sanityAdminClient } from '@/lib/sanity/client'

function uid() {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`
}

export async function POST(request: Request) {
    const { userId, exercises, duration } = await request.json()

    if (!userId || !Array.isArray(exercises) || exercises.length === 0) {
        return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 })
    }

    try {
        const doc = {
            _type: 'workout',
            userId,
            date: new Date().toISOString(),
            duration: Math.round(duration),
            exercises: exercises
                .map((ex: any) => ({
                    _key: uid(),
                    exercise: { _type: 'reference', _ref: ex.exerciseId },
                    sets: (ex.sets as any[])
                        .map((s) => ({
                            _key: uid(),
                            reps: Math.max(0, parseInt(s.reps) || 0),
                            weight: s.weight ? parseFloat(s.weight) : undefined,
                            weightUnit: s.weightUnit || 'kg',
                        }))
                        .filter((s) => s.reps > 0),
                }))
                .filter((ex: any) => ex.sets.length > 0),
        }

        if (doc.exercises.length === 0) {
            return new Response(JSON.stringify({ error: 'No valid sets found' }), { status: 400 })
        }

        const result = await sanityAdminClient.create(doc)
        return new Response(JSON.stringify({ id: result._id }), { status: 201 })
    } catch (error) {
        console.error('Error saving workout:', error)
        return new Response(JSON.stringify({ error: 'Failed to save workout' }), { status: 500 })
    }
}

export async function DELETE(request: Request) {
    const { workoutId, userId } = await request.json()

    if (!workoutId || !userId) {
        return new Response(JSON.stringify({ error: 'Missing workoutId or userId' }), { status: 400 })
    }

    try {
        const workout = await sanityAdminClient.fetch(
            `*[_type == "workout" && _id == $workoutId && userId == $userId][0]{ _id }`,
            { workoutId, userId }
        )

        if (!workout) {
            return new Response(JSON.stringify({ error: 'Workout not found or unauthorized' }), { status: 404 })
        }

        await sanityAdminClient.delete(workoutId)

        return new Response(JSON.stringify({ success: true }), { status: 200 })
    } catch (error) {
        console.error('Error deleting workout:', error)
        return new Response(JSON.stringify({ error: 'Failed to delete workout' }), { status: 500 })
    }
}
