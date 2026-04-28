/**
 * Migrate exercises from WorkoutX API into Sanity.
 * Source API docs: https://workoutxapp.com/docs.html
 * Three phases (run sequentially):
 *   Phase 1: Fetch all exercises → scripts/data/exercises.json
 *   Phase 2: Download GIFs → scripts/data/gifs/{id}.gif (throttled to 120 req/min)
 *   Phase 3: Upload to Sanity (GIF + document creation)
 *
 * Usage:
 *   1) Add your keys to /sanity/.env:
 *        SANITY_WRITE_TOKEN=sk...
 *        WORKOUTX_API_KEY=wx_...
 *   2) Run from /sanity:
 *        npx tsx scripts/migrateFromWorkoutX.ts
 *
 * Re-running is safe:
 *   - Phase 1 skips if exercises.json already exists (delete to re-fetch)
 *   - Phase 2 skips GIFs already on disk
 *   - Phase 3 skips exercises whose externalId already exists in Sanity
 */

import { createClient } from '@sanity/client'
import * as fs from 'fs'
import * as path from 'path'
import 'dotenv/config'

// ─── Config ─────────────────────────────────────────────────────────────────

const WORKOUTX_API_KEY = process.env.WORKOUTX_API_KEY as string
if (!WORKOUTX_API_KEY || WORKOUTX_API_KEY === 'your_api_key_here') {
    throw new Error('Missing WORKOUTX_API_KEY in .env')
}

const client = createClient({
    projectId: 'a2johnbh',
    dataset: 'production',
    apiVersion: '2024-01-01',
    token: process.env.SANITY_WRITE_TOKEN,
    useCdn: false,
})

const DATA_DIR = path.join(__dirname, 'data')
const GIFS_DIR = path.join(DATA_DIR, 'gifs')
const EXERCISES_JSON = path.join(DATA_DIR, 'exercises.json')

const API_BASE = 'https://api.workoutxapp.com/v1'

// Rate limiting: 120 requests/min = 2 requests/sec → 500ms between requests
const DELAY_MS = 500

// ─── Types ──────────────────────────────────────────────────────────────────

type WorkoutXExercise = {
    id: string
    name: string
    bodyPart: string
    equipment: string
    target: string
    secondaryMuscles: string[]
    instructions: string[]
    gifUrl: string
    category: string
    difficulty: string
    mechanic: string
    force: string
    met: number
    caloriesPerMinute: number
    description: string
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

function ensureDir(dir: string) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
    }
}

// ─── Phase 1: Fetch all exercises ───────────────────────────────────────────

async function phase1_fetchExercises(): Promise<WorkoutXExercise[]> {
    console.log('\n═══ Phase 1: Fetch exercises from WorkoutX API ═══\n')

    if (fs.existsSync(EXERCISES_JSON)) {
        console.log(`  ✓ exercises.json already exists, loading from disk...`)
        const raw = JSON.parse(fs.readFileSync(EXERCISES_JSON, 'utf-8'))
        const data: WorkoutXExercise[] = Array.isArray(raw) ? raw : raw.data
        console.log(`  ✓ Loaded ${data.length} exercises from cache.`)
        return data
    }

    ensureDir(DATA_DIR)

    console.log('  Fetching all exercises...')
    const res = await fetch(`${API_BASE}/exercises?limit=1400&offset=0`, {
        headers: { 'X-WorkoutX-Key': WORKOUTX_API_KEY },
    })

    if (!res.ok) {
        throw new Error(`API error: ${res.status} ${res.statusText} — ${await res.text()}`)
    }

    const json = await res.json()
    const exercises: WorkoutXExercise[] = Array.isArray(json) ? json : json.data
    fs.writeFileSync(EXERCISES_JSON, JSON.stringify(exercises, null, 2))
    console.log(`  ✓ Saved ${exercises.length} exercises to exercises.json`)

    return exercises
}

// ─── Phase 2: Download GIFs ─────────────────────────────────────────────────

async function phase2_downloadGifs(exercises: WorkoutXExercise[]) {
    console.log('\n═══ Phase 2: Download GIFs (throttled: 120 req/min) ═══\n')

    ensureDir(GIFS_DIR)

    let downloaded = 0
    let skipped = 0
    let failed = 0

    for (let i = 0; i < exercises.length; i++) {
        const ex = exercises[i]
        const gifPath = path.join(GIFS_DIR, `${ex.id}.gif`)
        const tag = `[${i + 1}/${exercises.length}]`

        if (fs.existsSync(gifPath)) {
            skipped++
            continue
        }

        try {
            const gifUrl = `${API_BASE}/gifs/${ex.id}.gif`
            const res = await fetch(gifUrl, {
                headers: { 'X-WorkoutX-Key': WORKOUTX_API_KEY },
            })

            if (!res.ok) {
                console.warn(`  ${tag} ⚠ GIF download failed (${res.status}) for ${ex.id}: ${ex.name}`)
                failed++
            } else {
                const buffer = Buffer.from(await res.arrayBuffer())
                fs.writeFileSync(gifPath, buffer)
                downloaded++
                if (downloaded % 50 === 0) {
                    console.log(`  ${tag} ✓ Downloaded ${downloaded} GIFs so far...`)
                }
            }
        } catch (err) {
            failed++
            console.error(`  ${tag} ✗ Error downloading GIF for ${ex.id}:`, (err as Error).message)
        }

        // Throttle: wait 500ms between requests (= 120 req/min)
        await sleep(DELAY_MS)
    }

    console.log(`\n  ✓ GIF download complete: downloaded=${downloaded} skipped=${skipped} failed=${failed}`)
}

// ─── Phase 3: Upload to Sanity ──────────────────────────────────────────────

async function phase3_uploadToSanity(exercises: WorkoutXExercise[]) {
    console.log('\n═══ Phase 3: Upload to Sanity ═══\n')

    let created = 0
    let skipped = 0
    let failed = 0

    for (let i = 0; i < 600; i++) {
        const ex = exercises[i]
        const tag = `[${i + 1}/${exercises.length}]`

        try {
            // Check if already exists
            const exists = await client.fetch<string | null>(
                `*[_type == "exercise" && externalId == $externalId][0]._id`,
                { externalId: ex.id },
            )

            if (exists) {
                skipped++
                continue
            }

            // Upload GIF as the image field
            let image: Record<string, unknown> | undefined
            const gifPath = path.join(GIFS_DIR, `${ex.id}.gif`)

            if (fs.existsSync(gifPath)) {
                const gifBuffer = fs.readFileSync(gifPath)
                const asset = await client.assets.upload('image', gifBuffer, {
                    filename: `${ex.id}.gif`,
                    contentType: 'image/gif',
                })
                image = {
                    _type: 'image',
                    asset: { _type: 'reference', _ref: asset._id },
                }
            }

            // Create document
            const doc = {
                _type: 'exercise',
                externalId: ex.id,
                name: ex.name,
                description: ex.description || '',
                bodyPart: ex.bodyPart,
                target: ex.target,
                equipment: ex.equipment,
                instructions: ex.instructions || [],
                category: ex.category,
                difficulty: ex.difficulty,
                mechanic: ex.mechanic,
                force: ex.force,
                met: ex.met,
                caloriesPerMinute: ex.caloriesPerMinute,
                isActive: true,
                ...(image ? { image } : {}),
            }

            await client.create(doc)
            created++

            if (created % 25 === 0) {
                console.log(`  ${tag} ✓ Created ${created} exercises so far...`)
            }
        } catch (err) {
            failed++
            console.error(`  ${tag} ✗ FAILED for ${ex.name}:`, (err as Error).message)
        }
    }

    console.log(`\n  ✓ Upload complete: created=${created} skipped=${skipped} failed=${failed}`)
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
    if (!process.env.SANITY_WRITE_TOKEN) {
        throw new Error('Missing SANITY_WRITE_TOKEN env var')
    }
    console.log('🏋️ WorkoutX → Sanity Migration')
    console.log('================================')

    const exercises = await phase1_fetchExercises()
    //await phase2_downloadGifs(exercises)
    await phase3_uploadToSanity(exercises)

    console.log('\n✅ Migration complete!')
}

main().catch((err) => {
    console.error('Fatal error:', err)
    process.exit(1)
})
