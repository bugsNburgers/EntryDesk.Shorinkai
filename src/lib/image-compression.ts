// ============================================================================
// EntryDesk — Client-Side Image Compression Utility
// Compresses athlete photos to <= 150KB / <= 600px width using HTML5 Canvas API.
// Suitable for tournament ID cards and coach dashboards.
// ============================================================================

export interface CompressionResult {
    file: File
    dataUrl: string
    originalSize: number
    compressedSize: number
    width: number
    height: number
}

const MAX_DIMENSION = 600
const MAX_BYTES = 150 * 1024 // 150 KB
const INITIAL_QUALITY = 0.82
const MIN_QUALITY = 0.50

/**
 * Load an image from a File or Blob into an HTMLImageElement safely.
 */
function loadImage(file: File | Blob): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image()
        const url = URL.createObjectURL(file)
        img.onload = () => {
            URL.revokeObjectURL(url)
            resolve(img)
        }
        img.onerror = () => {
            URL.revokeObjectURL(url)
            reject(new Error('Failed to load image. The file may be corrupted or unsupported.'))
        }
        img.src = url
    })
}

/**
 * Compress an athlete photo on the client before upload.
 * - Scales down to max 600px width/height while preserving aspect ratio.
 * - Converts to JPEG/WebP with iterative quality reduction to stay under 150KB.
 */
export async function compressAthletePhoto(file: File): Promise<CompressionResult> {
    const originalSize = file.size

    // Basic type validation
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
    const isImage = file.type.startsWith('image/') || validTypes.some((t) => file.name.toLowerCase().endsWith(t.replace('image/', '')))
    if (!isImage) {
        throw new Error('Please select an image file (JPG, PNG, WebP).')
    }

    const img = await loadImage(file)

    // Calculate scaled dimensions (max 600px on either side)
    let width = img.naturalWidth || img.width
    let height = img.naturalHeight || img.height

    if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        if (width >= height) {
            height = Math.round((height * MAX_DIMENSION) / width)
            width = MAX_DIMENSION
        } else {
            width = Math.round((width * MAX_DIMENSION) / height)
            height = MAX_DIMENSION
        }
    }

    // Render to offscreen canvas
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) {
        throw new Error('Canvas 2D context unavailable.')
    }

    // Fill white background for transparent PNGs converted to JPEG
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)
    ctx.drawImage(img, 0, 0, width, height)

    // Iteratively adjust quality until under target size (150KB)
    let quality = INITIAL_QUALITY
    let outputBlob: Blob | null = null

    // Determine output format (prefer image/jpeg for max compatibility across PDF and canvas)
    const mimeType = 'image/jpeg'

    while (quality >= MIN_QUALITY) {
        outputBlob = await new Promise<Blob | null>((resolve) => {
            canvas.toBlob(resolve, mimeType, quality)
        })

        if (!outputBlob) break
        if (outputBlob.size <= MAX_BYTES || quality <= MIN_QUALITY) {
            break
        }
        quality -= 0.08
    }

    if (!outputBlob) {
        throw new Error('Failed to encode compressed image.')
    }

    // Generate clean file name with .jpg extension
    const baseName = file.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_')
    const compressedFile = new File([outputBlob], `${baseName}.jpg`, {
        type: mimeType,
        lastModified: Date.now(),
    })

    const dataUrl = canvas.toDataURL(mimeType, quality)

    return {
        file: compressedFile,
        dataUrl,
        originalSize,
        compressedSize: compressedFile.size,
        width,
        height,
    }
}
