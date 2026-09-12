export const EVENT_LEVEL_VALUES = ['district', 'state', 'national', 'international'] as const

export type EventLevel = (typeof EVENT_LEVEL_VALUES)[number]

export const EVENT_LEVEL_OPTIONS: Array<{ value: EventLevel; label: string }> = [
    { value: 'district', label: 'District Level' },
    { value: 'state', label: 'State Level' },
    { value: 'national', label: 'National Level' },
    { value: 'international', label: 'International Level' },
]

export function isEventLevel(value: string | null | undefined): value is EventLevel {
    return EVENT_LEVEL_VALUES.includes(value as EventLevel)
}

export function formatEventLevelLabel(level: string | null | undefined) {
    if (!level) {
        return null
    }

    const matchingOption = EVENT_LEVEL_OPTIONS.find((option) => option.value === level)
    if (matchingOption) {
        return matchingOption.label
    }

    return level
        .trim()
        .replace(/[_-]+/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase())
}