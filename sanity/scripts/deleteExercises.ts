/**
 * Delete all exercise documents from the Sanity dataset.
 *
 * Usage (from /sanity):
 *   npx tsx scripts/deleteExercises.ts
 */

import { createClient } from '@sanity/client'
import 'dotenv/config'

const client = createClient({
    projectId: 'a2johnbh',
    dataset: 'production',
    apiVersion: '2024-01-01',
    token: process.env.SANITY_WRITE_TOKEN,
    useCdn: false,
})

async function main() {
    if (!process.env.SANITY_WRITE_TOKEN) {
        throw new Error('Missing SANITY_WRITE_TOKEN env var')
    }

    console.log('Fetching all exercise IDs...')

    // Fetch published + draft IDs
    const publishedIds = await client.fetch<string[]>('*[_type == "exercise"]._id')
    const draftIds = publishedIds.map((id) => `drafts.${id}`)
    const allIds = [...publishedIds, ...draftIds]

    if (allIds.length === 0) {
        console.log('No exercises found. Nothing to delete.')
        return
    }

    console.log(`Found ${publishedIds.length} exercise(s). Deleting...`)

    // Delete in batches of 50 to avoid transaction size limits
    const BATCH_SIZE = 50
    let deleted = 0

    for (let i = 0; i < allIds.length; i += BATCH_SIZE) {
        const batch = allIds.slice(i, i + BATCH_SIZE)
        const tx = client.transaction()
        batch.forEach((id) => tx.delete(id))
        await tx.commit({ visibility: 'async' })
        deleted += batch.length
        console.log(`Deleted ${Math.min(deleted, publishedIds.length)} / ${publishedIds.length}`)
    }

    console.log(`\nDone. ${publishedIds.length} exercise(s) deleted.`)
}

main().catch((err) => {
    console.error(err)
    process.exit(1)
})
