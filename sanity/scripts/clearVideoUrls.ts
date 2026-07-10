/**
 * Utility: Clear all videoUrl fields in Sanity so they can be repopulated.
 *
 * Run from /sanity:
 *   npx tsx scripts/clearVideoUrls.ts
 *
 * Requires SANITY_WRITE_TOKEN in /sanity/.env
 */

import { createClient } from '@sanity/client'
import 'dotenv/config'

const SANITY_WRITE_TOKEN = process.env.SANITY_WRITE_TOKEN
if (!SANITY_WRITE_TOKEN) throw new Error('Missing SANITY_WRITE_TOKEN in .env')

const client = createClient({
    projectId: 'a2johnbh',
    dataset: 'production',
    apiVersion: '2024-01-01',
    token: SANITY_WRITE_TOKEN,
    useCdn: false,
})

const DELAY_MS = 50 // Small delay between patches to avoid hammering Sanity

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

async function main() {
    console.log('🧹 Clearing all videoUrl fields in Sanity exercises')
    console.log('═══════════════════════════════════════════════════\n')

    const exercises = await client.fetch<Array<{ _id: string; name: string }>>(
        `*[_type == "exercise" && defined(videoUrl) && videoUrl != ""] { _id, name } | order(name asc)`,
    )

    if (exercises.length === 0) {
        console.log('✅ No exercises have a videoUrl set. Nothing to clear.')
        return
    }

    console.log(`Found ${exercises.length} exercises with a videoUrl.\n`)

    let cleared = 0
    let failed = 0

    for (let i = 0; i < exercises.length; i++) {
        const ex = exercises[i]
        const tag = `[${i + 1}/${exercises.length}]`

        try {
            await client.patch(ex._id).unset(['videoUrl']).commit()
            console.log(`${tag} ✓  ${ex.name}`)
            cleared++
        } catch (err) {
            failed++
            console.error(`${tag} ✗  FAILED "${ex.name}": ${(err as Error).message}`)
        }

        await sleep(DELAY_MS)
    }

    console.log('\n═══════════════════════════════════════════════════')
    console.log(`✅ Done. cleared=${cleared}  failed=${failed}`)
    console.log(`\nYou can now repopulate with:`)
    console.log(`  npx tsx scripts/populateVideoUrls.ts --fetch`)
}

main().catch((err) => {
    console.error('Fatal error:', err)
    process.exit(1)
})
