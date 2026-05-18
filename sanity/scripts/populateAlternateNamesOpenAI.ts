/**
 * Phase 4 (OpenAI variant): Populate alternateNames for all exercises using GPT-4o-mini.
 *
 * Setup:
 *   Add to /sanity/.env:
 *     OPENAI_API_KEY=sk-proj-...
 *     SANITY_WRITE_TOKEN=sk...
 *
 * Run from /sanity:
 *   npx tsx scripts/populateAlternateNamesOpenAI.ts
 *
 * Safe to re-run: only processes exercises that have no alternateNames yet.
 * Results are also written to scripts/data/alternateNamesOpenAI.json.
 */

import { createClient } from '@sanity/client'
import 'dotenv/config'
import * as fs from 'fs'
import OpenAI from 'openai'
import * as path from 'path'

// ─── Validation ─────────────────────────────────────────────────────────────

const OPENAI_API_KEY = process.env.OPENAI_API_KEY
if (!OPENAI_API_KEY) throw new Error('Missing OPENAI_API_KEY in .env')

const SANITY_WRITE_TOKEN = process.env.SANITY_WRITE_TOKEN
if (!SANITY_WRITE_TOKEN) throw new Error('Missing SANITY_WRITE_TOKEN in .env')

// ─── Clients ─────────────────────────────────────────────────────────────────

const openai = new OpenAI({ apiKey: OPENAI_API_KEY })

const client = createClient({
    projectId: 'a2johnbh',
    dataset: 'production',
    apiVersion: '2024-01-01',
    token: SANITY_WRITE_TOKEN,
    useCdn: false,
})

// ─── Config ──────────────────────────────────────────────────────────────────

const MODEL = 'gpt-4o-mini'
const DELAY_MS = 150 // ~400 exercises/min

// ─── Output file ─────────────────────────────────────────────────────────────

const OUTPUT_PATH = path.join(__dirname, 'data', 'alternateNamesOpenAI.json')

type ExerciseResult = {
    sanity_id: string
    name: string
    target: string
    equipment: string
    bodyPart: string
    alternateNames: string[]
}

function loadExistingResults(): Record<string, ExerciseResult> {
    if (fs.existsSync(OUTPUT_PATH)) {
        try {
            const arr: ExerciseResult[] = JSON.parse(fs.readFileSync(OUTPUT_PATH, 'utf-8'))
            return Object.fromEntries(arr.map((r) => [r.sanity_id, r]))
        } catch { }
    }
    return {}
}

function saveResults(results: Record<string, ExerciseResult>): void {
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(Object.values(results), null, 2), 'utf-8')
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Extracts a JSON array from the model response, even if there is
 * surrounding explanation text (defensive against model verbosity).
 */
function extractJsonArray(text: string): string[] | null {
    try {
        const parsed = JSON.parse(text.trim())
        if (Array.isArray(parsed)) return parsed as string[]
    } catch { }

    const match = text.match(/\[[\s\S]*?\]/)
    if (match) {
        try {
            const parsed = JSON.parse(match[0])
            if (Array.isArray(parsed)) return parsed as string[]
        } catch { }
    }

    return null
}

// ─── Core ─────────────────────────────────────────────────────────────────────

async function getAlternateNames(
    name: string,
    target: string,
    equipment: string,
    bodyPart: string,
): Promise<string[]> {
    const prompt = `You are a fitness expert with deep knowledge of gym terminology.

List the most common alternative names used in gyms and fitness communities for this exercise:

Exercise: "${name}"
Targets: ${target}
Equipment: ${equipment}
Body Part: ${bodyPart}

Rules:
- Return ONLY a valid JSON array of strings — no explanation, no markdown, nothing else.
- Include 0–5 names that are genuinely used (common gym slang, machine brand names, regional names, etc.)
- Do NOT include the exercise's own name in the list.
- If no real alternatives exist, return [].

Examples of good responses:
  "Lever Seated Fly" → ["Pec Deck Fly", "Machine Fly", "Chest Fly Machine"]
  "Barbell Back Squat" → ["Back Squat", "Olympic Squat", "High Bar Squat"]
  "Plank" → ["Front Plank", "Prone Plank"]
  "Obscure machine exercise" → []`

    const response = await openai.chat.completions.create({
        model: MODEL,
        max_tokens: 150,
        messages: [{ role: 'user', content: prompt }],
    })

    const text = response.choices[0]?.message?.content ?? ''
    const names = extractJsonArray(text)

    if (names === null) {
        console.warn(`    ⚠ Could not parse JSON from response: ${text.slice(0, 80)}`)
        return []
    }

    // Sanitise: remove empty strings, trim whitespace, deduplicate
    return [...new Set(names.map((n) => String(n).trim()).filter(Boolean))]
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
    console.log('🤖 Phase 4 (OpenAI): Populating alternateNames via GPT-4o-mini')
    console.log('═══════════════════════════════════════════════════════════════\n')

    const exercises = await client.fetch<
        Array<{ _id: string; name: string; target: string; equipment: string; bodyPart: string }>
    >(
        `*[_type == "exercise" && (!defined(alternateNames) || count(alternateNames) == 0)] {
            _id, name, target, equipment, bodyPart
        } | order(name asc)`,
    )

    if (exercises.length === 0) {
        console.log('✅ All exercises already have alternateNames. Nothing to do.')
        return
    }

    console.log(`Found ${exercises.length} exercises to process.\n`)

    const fileResults = loadExistingResults()
    let updated = 0
    let empty = 0
    let failed = 0

    for (let i = 0; i < 1; i++) {
        const ex = exercises[i]
        const tag = `[${i + 1}/${exercises.length}]`

        try {
            const names = await getAlternateNames(ex.name, ex.target, ex.equipment, ex.bodyPart)

            // Write to file regardless of whether names are empty
            fileResults[ex._id] = {
                sanity_id: ex._id,
                name: ex.name,
                target: ex.target,
                equipment: ex.equipment,
                bodyPart: ex.bodyPart,
                alternateNames: names,
            }
            saveResults(fileResults)

            if (names.length > 0) {
                await client.patch(ex._id).set({ alternateNames: names }).commit()
                console.log(`${tag} ✓  ${ex.name}`)
                console.log(`        → ${names.join(' · ')}`)
                updated++
            } else {
                console.log(`${tag} —  ${ex.name}: no alternatives`)
                empty++
            }
        } catch (err) {
            failed++
            console.error(`${tag} ✗  FAILED for "${ex.name}":`, (err as Error).message)
        }

        await sleep(DELAY_MS)
    }

    console.log('\n═══════════════════════════════════════════════════════════════')
    console.log(`✅ Phase 4 (OpenAI) complete.`)
    console.log(`   updated=${updated}  no_alternatives=${empty}  failed=${failed}`)
    console.log(`   Results written to: ${OUTPUT_PATH}`)
    // gpt-4o-mini: ~$0.15/1M input tokens; typical prompt ~120 tokens
    console.log(
        `   Estimated cost: ~$${((updated + empty) * 0.00002).toFixed(4)} USD (GPT-4o-mini)`,
    )
}

main().catch((err) => {
    console.error('Fatal error:', err)
    process.exit(1)
})
