/**
 * Populate the Sanity dataset with exercises from the wger API.
 *
 * Source: https://wger.de/api/v2/exerciseinfo/?language=2  (English)
 *
 * No API key required for read access. Data is CC-BY-SA licensed
 * (license info is preserved in the cached JSON dump).
 *
 * Pipeline:
 *   1) Fetch every page of /exerciseinfo (English only) and save the raw
 *      response to  data/wger-exercises.json  — this is your durable cache.
 *      The cache is reused on re-runs so the API is only hit once.
 *   2) Map each entry to your Sanity `exercise` schema, upload images,
 *      and create the document. Re-running is safe: documents whose
 *      `name` already exists are skipped.
 *
 * Usage (from /sanity):
 *   1) Create a write token in Sanity (manage.sanity.io → Project → API → Tokens, "Editor" role)
 *   2) Add it to /sanity/.env:
 *        SANITY_WRITE_TOKEN=skXXXXXX
 *   3) Run:
 *        npx tsx scripts/populateExercisesWger.ts
 *      Helpful flags:
 *        LIMIT=10          ← only ingest the first N (good for a smoke test)
 *        REFRESH_CACHE=1   ← re-fetch from wger even if cache exists
 *        ONLY_WITH_IMAGES=1 ← skip wger entries that have no images
 *
 * Notes:
 *   - wger has no "difficulty" field. We default every doc to 'intermediate'.
 *     Edit in the studio, or relax `difficulty` to optional in your schema.
 *   - The cached JSON contains the full wger payload (muscles, equipment,
 *     translations, license author, etc.) so future migrations can use
 *     fields beyond what your current Sanity schema captures.
 */

import { createClient } from '@sanity/client'
import 'dotenv/config'
import fs from 'node:fs'
import path from 'node:path'

// ─── Config ──────────────────────────────────────────────────────────────────

const WGER_BASE = 'https://wger.de/api/v2'
const ENGLISH_LANG_ID = 2
const PAGE_SIZE = 100

const DATA_DIR = path.resolve(__dirname, '../data')
const CACHE_FILE = path.join(DATA_DIR, 'wger-exercises.json')

const client = createClient({
    projectId: 'a2johnbh',
    dataset: 'production',
    apiVersion: '2024-01-01',
    token:
        process.env.SANITY_WRITE_TOKEN ||
        'skTP3XPakabmDJwYe3CATcCcrlUoY3zxx9eJJIjfukDzohGcbM03LOfOSAsVdhe6ahafMTUE1Y1bzQv52nyJkUKCTOvY52CLylL1xW9FD1jBfaMkTtES9Vxrjx7I9RjgION8aeQB1VwcXCiNDwpDk1w8LIRrbbQj68H2NJ1nIjrtqRvNcTdL',
    useCdn: false,
})

// ─── wger response types (what we actually use) ──────────────────────────────

type WgerNamed = { id: number; name: string }

type WgerMuscle = {
    id: number
    name: string
    name_en: string | null
    is_front: boolean
    image_url_main: string | null
    image_url_secondary: string | null
}

type WgerTranslation = {
    id: number
    uuid: string
    name: string
    description: string // HTML
    language: number
    aliases?: { alias: string }[] | string[]
}

type WgerImage = {
    id: number
    uuid?: string
    exercise?: number
    image: string // full URL
    is_main?: boolean
}

type WgerVideo = {
    id: number
    uuid?: string
    exercise?: number
    video: string // full URL
    is_main?: boolean
}

type WgerExerciseInfo = {
    id: number
    uuid: string
    category: WgerNamed | null
    muscles: WgerMuscle[]
    muscles_secondary: WgerMuscle[]
    equipment: WgerNamed[]
    images: WgerImage[]
    videos: WgerVideo[]
    translations: WgerTranslation[]
    license?: { full_name: string; short_name: string; url: string }
    license_author?: string
}

type WgerPage = {
    count: number
    next: string | null
    previous: string | null
    results: WgerExerciseInfo[]
}

// ─── Step 1: build the local cache ───────────────────────────────────────────

async function fetchAllExercises(): Promise<WgerExerciseInfo[]> {
    const results: WgerExerciseInfo[] = []
    let url: string | null = `${WGER_BASE}/exerciseinfo/?language=${ENGLISH_LANG_ID}&limit=${PAGE_SIZE}`
    let pages = 0

    while (url) {
        const res = await fetch(url)
        if (!res.ok) throw new Error(`wger ${res.status} on ${url}`)
        const page = (await res.json()) as WgerPage
        results.push(...page.results)
        pages++
        console.log(`  fetched page ${pages} (${results.length}/${page.count})`)
        url = page.next
    }

    return results
}

async function loadCacheOrFetch(): Promise<WgerExerciseInfo[]> {
    const refresh = process.env.REFRESH_CACHE === '1'
    if (!refresh && fs.existsSync(CACHE_FILE)) {
        console.log(`Using cached ${CACHE_FILE}`)
        return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8')) as WgerExerciseInfo[]
    }

    console.log('Fetching all exercises from wger...')
    const all = await fetchAllExercises()
    fs.mkdirSync(DATA_DIR, { recursive: true })
    fs.writeFileSync(CACHE_FILE, JSON.stringify(all, null, 2))
    console.log(`Saved ${all.length} exercises to ${CACHE_FILE}`)
    return all
}

// ─── Step 2: map → Sanity ────────────────────────────────────────────────────

function pickEnglish(ex: WgerExerciseInfo): WgerTranslation | undefined {
    return ex.translations.find((t) => t.language === ENGLISH_LANG_ID)
}

function stripHtml(html: string): string {
    if (!html) return ''
    return html
        .replace(/<\s*br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&#39;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/\n{3,}/g, '\n\n')
        .trim()
}

function buildDescription(ex: WgerExerciseInfo, en: WgerTranslation): string {
    const meta: string[] = []
    if (ex.category?.name) meta.push(`Category: ${ex.category.name}.`)

    const primary = ex.muscles
        .map((m) => m.name_en || m.name)
        .filter(Boolean)
    if (primary.length) meta.push(`Primary muscles: ${primary.join(', ')}.`)

    const secondary = ex.muscles_secondary
        .map((m) => m.name_en || m.name)
        .filter(Boolean)
    if (secondary.length) meta.push(`Secondary muscles: ${secondary.join(', ')}.`)

    if (ex.equipment.length) {
        meta.push(`Equipment: ${ex.equipment.map((e) => e.name).join(', ')}.`)
    }

    const body = stripHtml(en.description)
    return [meta.join(' '), body].filter(Boolean).join('\n\n')
}

async function uploadImageFromUrl(url: string, name: string) {
    const res = await fetch(url)
    if (!res.ok) {
        console.warn(`  ⚠ image fetch failed (${res.status}) for ${url}`)
        return undefined
    }
    const buffer = Buffer.from(await res.arrayBuffer())
    const ext = (url.split('.').pop() || 'jpg').split('?')[0].toLowerCase()
    const safe = name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()
    const asset = await client.assets.upload('image', buffer, {
        filename: `${safe}.${ext}`,
    })
    return {
        _type: 'image' as const,
        asset: { _type: 'reference' as const, _ref: asset._id },
    }
}

async function alreadyExists(name: string): Promise<boolean> {
    const id = await client.fetch<string | null>(
        `*[_type == "exercise" && name == $name][0]._id`,
        { name },
    )
    return Boolean(id)
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
    const all = await loadCacheOrFetch()

    const onlyWithImages = process.env.ONLY_WITH_IMAGES === '1'
    const limit = process.env.LIMIT ? Number(process.env.LIMIT) : Infinity

    let created = 0
    let skipped = 0
    let failed = 0
    let processed = 0

    for (const ex of all) {
        if (processed >= limit) break

        const en = pickEnglish(ex)
        if (!en?.name) {
            skipped++
            continue
        }
        if (onlyWithImages && ex.images.length === 0) {
            skipped++
            continue
        }

        processed++
        const tag = `[${processed}]`
        const name = en.name.trim()

        try {
            if (await alreadyExists(name)) {
                console.log(`${tag} skip (exists): ${name}`)
                skipped++
                continue
            }

            // Pick the main image, falling back to the first available
            const mainImg =
                ex.images.find((i) => i.is_main)?.image ?? ex.images[0]?.image
            const image = mainImg
                ? await uploadImageFromUrl(mainImg, name)
                : undefined

            // Pick the main video if present
            const mainVideo =
                ex.videos.find((v) => v.is_main)?.video ?? ex.videos[0]?.video

            const doc = {
                _type: 'exercise',
                name,
                description: buildDescription(ex, en),
                // wger has no difficulty — default to intermediate.
                // Edit in the studio, or relax the schema field to optional.
                difficulty: 'intermediate' as const,
                isActive: true,
                ...(image ? { image } : {}),
                ...(mainVideo ? { videoUrl: mainVideo } : {}),
            }

            await client.create(doc)
            created++
            console.log(`${tag} created: ${name}`)
        } catch (err) {
            failed++
            console.error(`${tag} FAILED for ${name}:`, (err as Error).message)
        }
    }

    console.log(
        `\nDone. created=${created} skipped=${skipped} failed=${failed} totalSeen=${all.length}`,
    )
}

main().catch((err) => {
    console.error(err)
    process.exit(1)
})
