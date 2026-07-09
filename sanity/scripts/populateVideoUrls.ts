/**
 * Phase 5: Populate videoUrl for all exercises using YouTube Data API v3.
 *
 * ─── TWO-STEP WORKFLOW ────────────────────────────────────────────────────────
 *
 *  STEP 1 — Fetch all video URLs and save locally (run daily until complete):
 *    npx tsx scripts/populateVideoUrls.ts --fetch
 *
 *  STEP 2 — Review scripts/data/video-progress.json, fix any nulls manually,
 *            then push everything to Sanity in one go:
 *    npx tsx scripts/populateVideoUrls.ts --upload
 *
 * ─── PROGRESS FILE ───────────────────────────────────────────────────────────
 *
 *  scripts/data/video-progress.json stores every result:
 *  {
 *    "results": [
 *      { "exerciseId": "abc123", "name": "Barbell Bench Press", "videoUrl": "https://youtube.com/watch?v=xyz" },
 *      { "exerciseId": "def456", "name": "Plank",              "videoUrl": null }
 *    ]
 *  }
 *
 *  Re-running --fetch is safe: it skips exercises already in results[].
 *  Manually set any null videoUrl to a real URL before running --upload.
 *
 * ─── QUOTA ───────────────────────────────────────────────────────────────────
 *
 *  Free tier: 10,000 units/day. Each exercise costs ~101 units.
 *  → ~99 exercises/day free. All 1,321 done in ~14 daily runs.
 *
 *  Need it in one run? Request a quota increase at:
 *  console.cloud.google.com → YouTube Data API v3 → Quotas → Request increase
 *  Google usually approves 100,000 units/day for legitimate apps.
 *
 * ─── SETUP ───────────────────────────────────────────────────────────────────
 *
 *  Add to /sanity/.env:
 *    YOUTUBE_API_KEY=AIza...       (console.cloud.google.com → Credentials)
 *    SANITY_WRITE_TOKEN=sk...      (only needed for --upload)
 */

import { createClient } from '@sanity/client'
import * as fs from 'fs'
import * as path from 'path'
import 'dotenv/config'

// ─── Config ──────────────────────────────────────────────────────────────────

const MIN_DURATION_SEC = 90   // 1.5 min — skip Shorts and quick clips
const MAX_DURATION_SEC = 300  // 5 min  — skip long full-workout videos

// ~101 units per exercise (100 search + 1 details). Budget leaves a safety buffer.
const QUOTA_BUDGET_PER_RUN = 9000

const DELAY_MS = 250 // Throttle between YouTube requests

// ─── Paths ───────────────────────────────────────────────────────────────────

const DATA_DIR = path.join(__dirname, 'data')
const PROGRESS_FILE = path.join(DATA_DIR, 'video-progress.json')

// ─── Types ───────────────────────────────────────────────────────────────────

type ExerciseResult = {
    exerciseId: string
    name: string
    videoUrl: string | null
}

type ProgressFile = {
    totalExercises: number
    processedCount: number
    foundCount: number
    notFoundCount: number
    results: ExerciseResult[]
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

function ensureDir(dir: string) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

/** Parse ISO 8601 duration to seconds. e.g. "PT2M30S" → 150 */
function parseDuration(iso: string): number {
    const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
    if (!match) return 0
    return (parseInt(match[1] ?? '0') * 3600) +
        (parseInt(match[2] ?? '0') * 60) +
        parseInt(match[3] ?? '0')
}

/** Returns true if the video is a YouTube Short or otherwise too short. */
function isShort(title: string, durationSec: number): boolean {
    if (durationSec < MIN_DURATION_SEC) return true
    const lower = title.toLowerCase()
    return lower.includes('#shorts') || lower.includes('#short') || lower.endsWith(' shorts')
}

// ─── Progress file I/O ───────────────────────────────────────────────────────

function loadProgress(): ProgressFile {
    ensureDir(DATA_DIR)

    if (fs.existsSync(PROGRESS_FILE)) {
        const raw = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8'))

        // Detect old format (had a "completed" array of bare IDs) and reset it.
        if (Array.isArray(raw.completed)) {
            console.log('  ⚠  Old progress format detected — resetting to new format.\n')
            return emptyProgress()
        }

        return raw as ProgressFile
    }

    return emptyProgress()
}

function emptyProgress(): ProgressFile {
    return { totalExercises: 0, processedCount: 0, foundCount: 0, notFoundCount: 0, results: [] }
}

function saveProgress(progress: ProgressFile): void {
    ensureDir(DATA_DIR)
    progress.processedCount = progress.results.length
    progress.foundCount = progress.results.filter((r) => r.videoUrl !== null).length
    progress.notFoundCount = progress.results.filter((r) => r.videoUrl === null).length
    fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2))
}

// ─── YouTube search ───────────────────────────────────────────────────────────

type YouTubeVideoItem = {
    id: string
    snippet: { title: string }
    contentDetails: { duration: string }
}

/**
 * Searches YouTube for a focused tutorial for the given exercise name.
 * Uses videoDuration=short (YouTube's < 4 min filter) then applies our own
 * 90–300s window and Shorts detection.
 *
 * Quota: ~101 units per call (100 search + 1 videos.list).
 * Returns a YouTube watch URL, or null if no qualifying video found.
 */
async function findTutorialUrl(exerciseName: string, alternateNames: string[], apiKey: string): Promise<string | null> {
    // Step 1 — Search (100 units)
    const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search')
    searchUrl.searchParams.set('key', apiKey)
    searchUrl.searchParams.set('part', 'id')
    searchUrl.searchParams.set('type', 'video')
    searchUrl.searchParams.set('q', `${exerciseName} or ${alternateNames.slice(0, 2).join(' or ')} exercise tutorial proper form`)
    searchUrl.searchParams.set('videoDuration', 'short') // YouTube "short" = < 4 min
    searchUrl.searchParams.set('maxResults', '10')
    searchUrl.searchParams.set('relevanceLanguage', 'en')
    searchUrl.searchParams.set('safeSearch', 'strict')

    const searchRes = await fetch(searchUrl.toString())

    if (!searchRes.ok) {
        const body = await searchRes.text()
        if (searchRes.status === 403 && body.includes('quotaExceeded')) {
            throw new Error('QUOTA_EXCEEDED')
        }
        throw new Error(`YouTube search failed (${searchRes.status}): ${body.slice(0, 200)}`)
    }

    const searchData = await searchRes.json() as { items?: Array<{ id: { videoId: string } }> }
    const videoIds = (searchData.items ?? []).map((item) => item.id.videoId).filter(Boolean)
    if (videoIds.length === 0) return null

    // Step 2 — Get duration + title for all results in one call (~1 unit)
    const detailsUrl = new URL('https://www.googleapis.com/youtube/v3/videos')
    detailsUrl.searchParams.set('key', apiKey)
    detailsUrl.searchParams.set('part', 'contentDetails,snippet')
    detailsUrl.searchParams.set('id', videoIds.join(','))

    const detailsRes = await fetch(detailsUrl.toString())
    if (!detailsRes.ok) {
        throw new Error(`YouTube videos.list failed (${detailsRes.status})`)
    }

    const detailsData = await detailsRes.json() as { items?: YouTubeVideoItem[] }

    // Step 3 — Pick the first video that passes all filters
    for (const video of detailsData.items ?? []) {
        const durationSec = parseDuration(video.contentDetails.duration)
        const title = video.snippet.title

        if (durationSec >= MIN_DURATION_SEC && durationSec <= MAX_DURATION_SEC && !isShort(title, durationSec)) {
            return `https://www.youtube.com/watch?v=${video.id}`
        }
    }

    return null
}

// ─── STEP 1: --fetch ─────────────────────────────────────────────────────────

async function runFetch() {
    console.log('🔍 Phase 5 [--fetch]: Searching YouTube for exercise tutorials')
    console.log('════════════════════════════════════════════════════════════════\n')
    console.log(`  Filter: ${MIN_DURATION_SEC}s – ${MAX_DURATION_SEC}s, Shorts excluded`)
    console.log(`  Quota budget this run: ${QUOTA_BUDGET_PER_RUN} units (~${Math.floor(QUOTA_BUDGET_PER_RUN / 101)} exercises)\n`)

    const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY
    if (!YOUTUBE_API_KEY) throw new Error('Missing YOUTUBE_API_KEY in .env — see https://console.cloud.google.com/')

    // Load Sanity client (read-only, no token needed)
    const readClient = createClient({
        projectId: 'a2johnbh',
        dataset: 'production',
        apiVersion: '2024-01-01',
        useCdn: true,
    })

    // Fetch ALL exercises from Sanity (id + name only)
    const allExercises = await readClient.fetch<Array<{ _id: string; name: string; alternateNames: string[] }>>(
        `*[_type == "exercise"] { _id, name, alternateNames } | order(name asc)`,
    )
    console.log(`Total exercises in Sanity: ${allExercises.length}\n`)

    // Load progress and build a Set of already-processed IDs for O(1) lookup
    const progress = loadProgress()
    progress.totalExercises = allExercises.length
    const processedIds = new Set(progress.results.map((r) => r.exerciseId))

    const todo = allExercises.filter((ex) => !processedIds.has(ex._id))
    console.log(`Already processed: ${progress.results.length}`)
    console.log(`Remaining this session: ${todo.length}\n`)

    if (todo.length === 0) {
        console.log('✅ All exercises have been searched. Run --upload to push to Sanity.')
        return
    }

    let quotaUsed = 0
    let sessionFound = 0
    let sessionNotFound = 0
    let sessionFailed = 0

    for (let i = 0; i < todo.length; i++) {
        const ex = todo[i]
        const tag = `[${progress.results.length + 1}/${allExercises.length}]`

        if (quotaUsed + 101 > QUOTA_BUDGET_PER_RUN) {
            console.log(`\n⏸  Quota budget reached (${QUOTA_BUDGET_PER_RUN} units used this run).`)
            console.log(`   Progress saved. ${todo.length - i} exercises remaining.`)
            console.log(`   Run --fetch again tomorrow to continue.`)
            break
        }

        try {
            const videoUrl = await findTutorialUrl(ex.name, ex.alternateNames, YOUTUBE_API_KEY)

            const result: ExerciseResult = {
                exerciseId: ex._id,
                name: ex.name,
                videoUrl,
            }

            progress.results.push(result)
            quotaUsed += 101

            if (videoUrl) {
                console.log(`${tag} ✓  ${ex.name}`)
                console.log(`         → ${videoUrl}`)
                sessionFound++
            } else {
                console.log(`${tag} —  ${ex.name}: no qualifying video found (videoUrl: null)`)
                sessionNotFound++
            }
        } catch (err) {
            const message = (err as Error).message

            if (message === 'QUOTA_EXCEEDED') {
                console.log(`\n🚫 YouTube quota exceeded. Progress saved.`)
                console.log(`   Run --fetch again tomorrow. ${todo.length - i - 1} exercises remaining.`)
                saveProgress(progress)
                break
            }

            // On other errors: store null so we don't retry the same exercise infinitely.
            // You can manually fix nulls in the JSON before running --upload.
            progress.results.push({ exerciseId: ex._id, name: ex.name, videoUrl: null })
            sessionFailed++
            console.error(`${tag} ✗  FAILED "${ex.name}": ${message} (stored as null)`)
        }

        // Save after every exercise — crash-safe
        saveProgress(progress)
        await sleep(DELAY_MS)
    }

    const remaining = allExercises.length - progress.results.length
    console.log('\n════════════════════════════════════════════════════════════════')
    console.log(`Session: found=${sessionFound}  not_found=${sessionNotFound}  failed=${sessionFailed}`)
    console.log(`Overall: processed=${progress.results.length}/${allExercises.length}  found=${progress.foundCount}  not_found=${progress.notFoundCount}`)

    if (remaining > 0) {
        console.log(`\n  ${remaining} exercises remaining. Run --fetch again tomorrow.`)
    } else {
        console.log(`\n✅ All exercises searched!`)
        console.log(`   Review scripts/data/video-progress.json — fix any nulls manually.`)
        console.log(`   Then run: npx tsx scripts/populateVideoUrls.ts --upload`)
    }
}

// ─── STEP 2: --upload ────────────────────────────────────────────────────────

async function runUpload() {
    console.log('🚀 Phase 5 [--upload]: Pushing videoUrls from JSON → Sanity')
    console.log('════════════════════════════════════════════════════════════════\n')

    const SANITY_WRITE_TOKEN = process.env.SANITY_WRITE_TOKEN
    if (!SANITY_WRITE_TOKEN) throw new Error('Missing SANITY_WRITE_TOKEN in .env')

    if (!fs.existsSync(PROGRESS_FILE)) {
        throw new Error('No video-progress.json found. Run --fetch first.')
    }

    const progress = loadProgress()

    if (progress.results.length === 0) {
        console.log('Progress file is empty. Run --fetch first.')
        return
    }

    // Only upload entries that have a real URL
    const toUpload = progress.results.filter((r) => r.videoUrl !== null)
    const nullCount = progress.results.filter((r) => r.videoUrl === null).length

    console.log(`Total in progress file : ${progress.results.length}`)
    console.log(`Will upload (non-null) : ${toUpload.length}`)
    console.log(`Skipping (null)        : ${nullCount}`)
    console.log(`\nStarting Sanity patches...\n`)

    const writeClient = createClient({
        projectId: 'a2johnbh',
        dataset: 'production',
        apiVersion: '2024-01-01',
        token: SANITY_WRITE_TOKEN,
        useCdn: false,
    })

    let uploaded = 0
    let failed = 0

    for (let i = 0; i < toUpload.length; i++) {
        const entry = toUpload[i]
        const tag = `[${i + 1}/${toUpload.length}]`

        try {
            await writeClient
                .patch(entry.exerciseId)
                .set({ videoUrl: entry.videoUrl })
                .commit()

            console.log(`${tag} ✓  ${entry.name}`)
            uploaded++
        } catch (err) {
            failed++
            console.error(`${tag} ✗  FAILED "${entry.name}": ${(err as Error).message}`)
        }

        // Small delay to avoid hammering Sanity
        await sleep(100)
    }

    console.log('\n════════════════════════════════════════════════════════════════')
    console.log(`✅ Upload complete. uploaded=${uploaded}  failed=${failed}  skipped_nulls=${nullCount}`)
    if (nullCount > 0) {
        console.log(`\n💡 ${nullCount} exercises still have no video. To fix:`)
        console.log(`   1. Open scripts/data/video-progress.json`)
        console.log(`   2. Find entries with "videoUrl": null`)
        console.log(`   3. Set the correct YouTube URL manually`)
        console.log(`   4. Re-run: npx tsx scripts/populateVideoUrls.ts --upload`)
        console.log(`      (already-uploaded exercises will just get patched again — harmless)`)
    }
}

// ─── Entry point ─────────────────────────────────────────────────────────────

async function main() {
    const mode = process.argv[2]

    await runFetch()

    //await runUpload()

//     if (mode === '--fetch') {
//         await runFetch()
//     } else if (mode === '--upload') {
//         await runUpload()
//     } else {
//         console.log(`
// Usage:
//   npx tsx scripts/populateVideoUrls.ts --fetch    Fetch YouTube URLs → video-progress.json
//   npx tsx scripts/populateVideoUrls.ts --upload   Push video-progress.json → Sanity

// Run --fetch daily until all exercises are processed, then --upload once.
//         `.trim())
//         process.exit(1)
//     }
}

main().catch((err) => {
    console.error('Fatal error:', err)
    process.exit(1)
})
