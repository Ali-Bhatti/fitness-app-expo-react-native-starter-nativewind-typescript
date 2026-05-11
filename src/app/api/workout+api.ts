import { sanityAdminClient } from '@/lib/sanity/client'

export async function DELETE(request: Request) {
    const { workoutId, userId } = await request.json()

    if (!workoutId || !userId) {
        return new Response(JSON.stringify({ error: 'Missing workoutId or userId' }), { status: 400 })
    }

    try {
        // Verify the workout belongs to the user before deleting
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
