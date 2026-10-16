import Image from 'next/image'

export interface AthleteIconProps {
    size?: number
    className?: string
    alt?: string
}

/**
 * Custom Athlete / Credential SVG Icon
 * Selects the optimal SVG asset from /public/icons/ based on requested size.
 */
export function AthleteIcon({ size = 32, className = '', alt = 'Athlete icon' }: AthleteIconProps) {
    const assetSize =
        size <= 16 ? 16 :
        size <= 32 ? 32 :
        size <= 64 ? 64 :
        size <= 128 ? 128 :
        size <= 256 ? 256 : 512

    return (
        <Image
            src={`/icons/add-athlete-${assetSize}.svg`}
            width={size}
            height={size}
            alt={alt}
            className={`inline-block shrink-0 ${className}`}
        />
    )
}
