/**
 * Populate the Sanity dataset with exercises from the Free Exercise DB.
 *
 * Source: https://github.com/yuhonas/free-exercise-db (no API key, no rate limit)
 *
 * Usage:
 *   1) Create a write token in Sanity (manage.sanity.io → Project → API → Tokens, "Editor" role)
 *   2) Add it to a .env file in /sanity:
 *        SANITY_WRITE_TOKEN=skXXXXXX
 *   3) From /sanity:
 *        npx ts-node scripts/populateExercises.ts
 *      (or `npx tsx scripts/populateExercises.ts`)
 *
 * Re-running is safe: it skips exercises whose `name` already exists.
 */

import { createClient } from '@sanity/client'
import 'dotenv/config'

const SOURCE_URL =
    'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json'

const IMAGE_BASE =
    'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises'

type SourceExercise = {
    id: string
    name: string
    force: string | null
    level: 'beginner' | 'intermediate' | 'expert'
    mechanic: string | null
    equipment: string | null
    primaryMuscles: string[]
    secondaryMuscles: string[]
    instructions: string[]
    category: string
    images: string[] // e.g. ["3_4_Sit-Up/0.jpg", "3_4_Sit-Up/1.jpg"]
}

const client = createClient({
    projectId: 'a2johnbh',
    dataset: 'production',
    apiVersion: '2024-01-01',
    token: process.env.SANITY_WRITE_TOKEN,
    useCdn: false,
})

// Map Free Exercise DB level -> your schema's difficulty enum
function mapDifficulty(level: SourceExercise['level']): 'beginner' | 'intermediate' | 'advanced' {
    if (level === 'expert') return 'advanced'
    return level
}

// Build a clean text description from instructions + meta
function buildDescription(ex: SourceExercise): string {
    const meta: string[] = []
    if (ex.primaryMuscles?.length) meta.push(`Primary muscles: ${ex.primaryMuscles.join(', ')}.`)
    if (ex.equipment) meta.push(`Equipment: ${ex.equipment}.`)
    if (ex.category) meta.push(`Category: ${ex.category}.`)

    const steps =
        ex.instructions?.length
            ? ex.instructions.map((s, i) => `${i + 1}. ${s}`).join('\n')
            : ''

    return [meta.join(' '), steps].filter(Boolean).join('\n\n')
}

async function uploadImage(imagePath: string, name: string) {
    const url = `${IMAGE_BASE}/${imagePath}`
    const res = await fetch(url)
    if (!res.ok) {
        console.warn(`  ⚠ image fetch failed (${res.status}) for ${url}`)
        return undefined
    }
    const buffer = Buffer.from(await res.arrayBuffer())
    const asset = await client.assets.upload('image', buffer, {
        filename: `${name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.jpg`,
        contentType: 'image/jpeg',
    })
    return {
        _type: 'image',
        asset: { _type: 'reference', _ref: asset._id },
    }
}

async function alreadyExists(name: string): Promise<boolean> {
    const id = await client.fetch<string | null>(
        `*[_type == "exercise" && name == $name][0]._id`,
        { name },
    )
    return Boolean(id)
}

async function main() {
    // if (!process.env.SANITY_WRITE_TOKEN) {
    //     throw new Error('Missing SANITY_WRITE_TOKEN env var')
    // }

    console.log('Fetching exercises from Free Exercise DB...')
    const res = await fetch(SOURCE_URL)
    const all = (await res.json()) as SourceExercise[]
    console.log(`Got ${all.length} exercises.`)

    // Optional: filter out novelty/uncommon ones, or limit while testing
    const LIMIT = Number(process.env.LIMIT ?? all.length)
    const list = all.slice(0, LIMIT)

    let created = 0
    let skipped = 0
    let failed = 0

    for (const [i, ex] of list.entries()) {
        const tag = `[${i + 1}/${list.length}]`
        try {
            if (await alreadyExists(ex.name)) {
                console.log(`${tag} skip (exists): ${ex.name}`)
                skipped++
                continue
            }

            const image = ex.images?.[0] ? await uploadImage(ex.images[0], ex.name) : undefined

            const doc = {
                _type: 'exercise',
                name: ex.name,
                description: buildDescription(ex),
                difficulty: mapDifficulty(ex.level),
                isActive: true,
                ...(image ? { image } : {}),
                // videoUrl intentionally left blank — Free Exercise DB has no videos.
                // You can fill it later from another source if needed.
            }

            await client.create(doc)
            created++
            console.log(`${tag} created: ${ex.name}`)
        } catch (err) {
            failed++
            console.error(`${tag} FAILED for ${ex.name}:`, (err as Error).message)
        }
    }

    console.log(`\nDone. created=${created} skipped=${skipped} failed=${failed}`)
}

main().catch((err) => {
    console.error(err)
    process.exit(1)
})
