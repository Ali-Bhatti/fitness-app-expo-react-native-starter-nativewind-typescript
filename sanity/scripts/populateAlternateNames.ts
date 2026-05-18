/**
 * Phase 4: Populate alternateNames for all exercises using Claude Haiku.
 *
 * ⚠️  IMPORTANT — Two separate Anthropic accounts:
 *   - Claude.ai Pro ($20/mo) is the chat interface — it does NOT give API access.
 *   - The Anthropic API has its own billing. Get your key at:
 *       https://console.anthropic.com → API Keys
 *   Claude Haiku is very cheap. All 1,321 exercises will cost under $0.50 total.
 *
 * Setup:
 *   Add to /sanity/.env:
 *     ANTHROPIC_API_KEY=sk-ant-...
 *     SANITY_WRITE_TOKEN=sk...
 *
 * Run from /sanity:
 *   npx tsx scripts/populateAlternateNames.ts
 *
 * Safe to re-run: only processes exercises that have no alternateNames yet.
 */

import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@sanity/client'
import 'dotenv/config'
import * as fs from 'fs'
import * as path from 'path'

// ─── Validation ─────────────────────────────────────────────────────────────

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
if (!ANTHROPIC_API_KEY) throw new Error('Missing ANTHROPIC_API_KEY in .env — see https://console.anthropic.com')

const SANITY_WRITE_TOKEN = process.env.SANITY_WRITE_TOKEN
if (!SANITY_WRITE_TOKEN) throw new Error('Missing SANITY_WRITE_TOKEN in .env')

// ─── Clients ─────────────────────────────────────────────────────────────────

const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY })

const client = createClient({
    projectId: 'a2johnbh',
    dataset: 'production',
    apiVersion: '2024-01-01',
    token: SANITY_WRITE_TOKEN,
    useCdn: false,
})

// ─── Config ──────────────────────────────────────────────────────────────────

const MODEL = 'claude-haiku-4-5-20251001'
const DELAY_MS = 150 // ~400 exercises/min, stays well under Haiku rate limits

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Extracts a JSON array from a Claude response, even if there is
 * surrounding explanation text (defensive against model verbosity).
 */
function extractJsonArray(text: string): string[] | null {
    // Try direct parse first (ideal case — model returned clean JSON)
    try {
        const parsed = JSON.parse(text.trim())
        if (Array.isArray(parsed)) return parsed as string[]
    } catch { }

    // Fall back: extract first [...] block from response
    const match = text.match(/\[[\s\S]*?\]/)
    if (match) {
        try {
            const parsed = JSON.parse(match[0])
            if (Array.isArray(parsed)) return parsed as string[]
        } catch { }
    }

    return null
}

// ─── Output file ─────────────────────────────────────────────────────────────

const OUTPUT_PATH = path.join(__dirname, 'data', 'alternateNames.json')

/** Load existing results so re-runs are additive, not destructive. */
function loadExistingResults(): Record<string, {
    sanity_id: string
    name: string
    target: string
    equipment: string
    bodyPart: string
    alternateNames: string[]
}> {
    if (fs.existsSync(OUTPUT_PATH)) {
        try {
            return JSON.parse(fs.readFileSync(OUTPUT_PATH, 'utf-8'))
        } catch {}
    }
    return {}
}

function saveResults(results: ReturnType<typeof loadExistingResults>): void {
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(Object.values(results), null, 2), 'utf-8')
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

    const response = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 150,
        messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
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
    console.log('🤖 Phase 4: Populating alternateNames via Claude Haiku')
    console.log('═══════════════════════════════════════════════════════\n')

    // Fetch only exercises that don't have alternateNames yet
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
    let empty = 0    // Exercises with no real alternatives (still a success)
    let failed = 0

    for (let i = 0; i < exercises.length; i++) {
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

    console.log('\n═══════════════════════════════════════════════════════')
    console.log(`✅ Phase 4 complete.`)
    console.log(`   updated=${updated}  no_alternatives=${empty}  failed=${failed}`)
    console.log(`   Results written to: ${OUTPUT_PATH}`)
    console.log(
        `   Estimated cost: ~$${((updated + empty) * 0.0003).toFixed(3)} USD (Claude Haiku)`,
    )
}

main().catch((err) => {
    console.error('Fatal error:', err)
    process.exit(1)
})
