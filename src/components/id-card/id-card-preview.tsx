// ============================================================================
// EntryDesk — Official Karate Athlete ID Card & A4 Pass System
// Pixel-to-pixel exact implementation of Karate Athlete ID Card.html
// Top: Mobile Phone Pass (390px)
// Below: A4 Print Pass (794px × 1123px)
// ============================================================================
// The implementation lives in ./id-card-parts (split for size; nothing about the output changed).

export * from './id-card-parts/card-data'
export * from './id-card-parts/phone-pass'
export * from './id-card-parts/a4-sheet'
import { IdCardPhonePass } from './id-card-parts/phone-pass'

// Backward compatibility alias for any existing imports
export const IdCardPreview = IdCardPhonePass
