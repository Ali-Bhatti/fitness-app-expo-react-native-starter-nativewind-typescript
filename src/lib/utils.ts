import { format, formatDistanceToNowStrict, isToday, isYesterday } from 'date-fns'

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
    return format(date, 'MMM d, yyyy')
}

const LBS_TO_KG = 0.453592
const KG_TO_LBS = 2.20462

export function toKg(weight: number, unit: string | null): number {
    if (unit === 'lbs') return weight * LBS_TO_KG
    return weight
}

export function toLbs(weight: number, unit: string | null): number {
    if (unit === 'kg' || !unit) return weight * KG_TO_LBS
    return weight
}

export function convertWeight(weight: number, fromUnit: string | null, toUnit: string): number {
    if (fromUnit === toUnit) return weight
    if (toUnit === 'kg') return toKg(weight, fromUnit)
    return toLbs(weight, fromUnit)
}

export function formatVolume(volume: number, unit: string): string {
    return `${Math.round(volume).toLocaleString()} ${unit}`
}