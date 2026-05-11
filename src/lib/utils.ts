import { formatDistanceToNowStrict, isToday, isYesterday } from 'date-fns'

export function formatDuration(seconds: number | null): string {
    if (seconds === null) return '0s'
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    if (h > 0) return `${h}h ${m}m`
    if (m > 0) return `${m}m ${s}s`
    return `${s}s`
}

export function formatRelativeDate(dateString: string | null): string {
    if (!dateString) return 'Unknown date'
    const date = new Date(dateString)
    if (isToday(date)) return 'Today'
    if (isYesterday(date)) return 'Yesterday'
    return formatDistanceToNowStrict(date, { addSuffix: true })
}