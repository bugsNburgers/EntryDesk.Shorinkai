import React from 'react'

// ============================================================================
// EntryDesk — Official Tournament Credential & ID Card Pass System
// Designed for World-Class Martial Arts Championships & Tournaments.
// All styles are pure inline (HEX/RGB) for pixel-perfect html2canvas & jsPDF export.
// ============================================================================

export interface IdCardData {
    id: string
    chest_no: number | null
    participation_type: string | null
    category_name: string | null
    declared_weight_kg?: number | null
    student: {
        name: string
        gender: string
        rank: string | null
        photo_url: string | null
        dob?: string | null
        weight?: number | null
    }
    dojo: {
        name: string
        coach_name: string | null
        city?: string | null
    }
    event: {
        id?: string
        title: string
        location: string | null
        start_date: string
        end_date: string
    }
    qr: {
        token?: string
        verify_url: string
        data_url: string
    }
}

export interface BeltConfig {
    bg: string
    border: string
    text: string
    label: string
    barColor: string
    tipColor: string
}

export function getBeltConfig(rank: string | null): BeltConfig {
    if (!rank) {
        return {
            bg: '#F8FAFC',
            border: '#CBD5E1',
            text: '#1E293B',
            label: 'Open Belt',
            barColor: '#E2E8F0',
            tipColor: '#94A3B8',
        }
    }
    const r = rank.toLowerCase()
    if (r.includes('white')) {
        return { bg: '#F8FAFC', border: '#E2E8F0', text: '#0F172A', label: 'White Belt', barColor: '#F8FAFC', tipColor: '#CBD5E1' }
    }
    if (r.includes('yellow')) {
        return { bg: '#FEF9C3', border: '#FACC15', text: '#713F12', label: 'Yellow Belt', barColor: '#FACC15', tipColor: '#000000' }
    }
    if (r.includes('orange')) {
        return { bg: '#FFEDD5', border: '#FB923C', text: '#7C2D12', label: 'Orange Belt', barColor: '#FB923C', tipColor: '#000000' }
    }
    if (r.includes('green')) {
        return { bg: '#DCFCE7', border: '#22C55E', text: '#14532D', label: 'Green Belt', barColor: '#22C55E', tipColor: '#000000' }
    }
    if (r.includes('blue')) {
        return { bg: '#DBEAFE', border: '#3B82F6', text: '#1E3A8A', label: 'Blue Belt', barColor: '#3B82F6', tipColor: '#000000' }
    }
    if (r.includes('purple')) {
        return { bg: '#F3E8FF', border: '#A855F7', text: '#581C87', label: 'Purple Belt', barColor: '#A855F7', tipColor: '#000000' }
    }
    if (r.includes('brown')) {
        return { bg: '#FEF3C7', border: '#B45309', text: '#78350F', label: 'Brown Belt', barColor: '#78350F', tipColor: '#000000' }
    }
    if (r.includes('black')) {
        return { bg: '#18181B', border: '#27272A', text: '#FDE047', label: 'Black Belt', barColor: '#09090B', tipColor: '#F59E0B' }
    }
    if (r.includes('red')) {
        return { bg: '#FEE2E2', border: '#EF4444', text: '#7F1D1D', label: 'Red Belt', barColor: '#EF4444', tipColor: '#000000' }
    }
    return { bg: '#F1F5F9', border: '#CBD5E1', text: '#1E293B', label: rank, barColor: '#E2E8F0', tipColor: '#94A3B8' }
}

function formatEventDate(start: string, end: string): string {
    const s = new Date(start)
    const e = new Date(end)
    if (start === end) {
        return s.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    }
    return `${s.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} – ${e.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`
}

// ============================================================================
// 1. FRONT BADGE: Official Tournament Accreditation Card
// ============================================================================

export const CARD_WIDTH = 380
export const CARD_HEIGHT = 550

interface IdCardPreviewProps {
    data: IdCardData
    printRef?: React.RefObject<HTMLDivElement | null>
    scale?: number
}

export function IdCardPreview({ data, printRef, scale = 1 }: IdCardPreviewProps) {
    const { student, event, dojo, qr, chest_no, participation_type, category_name } = data
    const belt = getBeltConfig(student.rank)

    const cardElement = (
        <div
            ref={scale === 1 ? printRef : undefined}
            style={{
                width: CARD_WIDTH,
                height: CARD_HEIGHT,
                transform: scale !== 1 ? `scale(${scale})` : undefined,
                transformOrigin: 'top left',
                fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                background: '#FFFFFF',
                color: '#0F172A',
                overflow: 'hidden',
                position: 'relative',
                borderRadius: scale < 1 ? 14 : 0,
                boxShadow: scale < 1 ? '0 10px 30px rgba(0,0,0,0.18)' : 'none',
                boxSizing: 'border-box',
                border: scale < 1 ? '1px solid #E2E8F0' : 'none',
            }}
        >
            {/* Lanyard Slot Hole Guide */}
            <div
                style={{
                    height: 18,
                    background: '#070B14',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    paddingTop: 3,
                }}
            >
                <div
                    style={{
                        width: 42,
                        height: 6,
                        borderRadius: 3,
                        border: '1px dashed #64748B',
                        background: 'rgba(255,255,255,0.06)',
                    }}
                />
                <span style={{ fontSize: 6.5, color: '#64748B', letterSpacing: 1.2, textTransform: 'uppercase', marginTop: 1 }}>
                    ⌾ LANYARD SLOT ⌾
                </span>
            </div>

            {/* Executive Championship Header */}
            <div
                style={{
                    background: 'linear-gradient(145deg, #090D16 0%, #0F172A 50%, #1E1B4B 100%)',
                    padding: '12px 16px 10px',
                    textAlign: 'center',
                    position: 'relative',
                    overflow: 'hidden',
                }}
            >
                {/* Decorative radial glow */}
                <div
                    style={{
                        position: 'absolute',
                        top: -30,
                        right: -30,
                        width: 120,
                        height: 120,
                        borderRadius: '50%',
                        background: 'radial-gradient(circle, rgba(245,158,11,0.14) 0%, rgba(245,158,11,0) 70%)',
                        pointerEvents: 'none',
                    }}
                />

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <span style={{ color: '#F59E0B', fontSize: 9 }}>★</span>
                    <p
                        style={{
                            color: '#F59E0B',
                            fontSize: 8,
                            fontWeight: 800,
                            letterSpacing: 2,
                            textTransform: 'uppercase',
                            margin: 0,
                        }}
                    >
                        OFFICIAL ATHLETE ACCREDITATION
                    </p>
                    <span style={{ color: '#F59E0B', fontSize: 9 }}>★</span>
                </div>

                <h2
                    style={{
                        color: '#FFFFFF',
                        fontSize: 15,
                        fontWeight: 900,
                        margin: '3px 0 0',
                        lineHeight: 1.25,
                        textTransform: 'uppercase',
                        letterSpacing: '0.4px',
                    }}
                >
                    {event.title}
                </h2>

                <p
                    style={{
                        color: '#CBD5E1',
                        fontSize: 9,
                        margin: '3px 0 0',
                        fontWeight: 500,
                        letterSpacing: 0.2,
                    }}
                >
                    {formatEventDate(event.start_date, event.end_date)}
                    {event.location ? `  •  ${event.location}` : ''}
                </p>
            </div>

            {/* Rainbow Holographic Security Foil Strip */}
            <div
                style={{
                    height: 3,
                    width: '100%',
                    background: 'linear-gradient(90deg, #F59E0B 0%, #FCD34D 20%, #10B981 40%, #06B6D4 60%, #3B82F6 80%, #F59E0B 100%)',
                }}
            />

            {/* Hero Athlete Block: Portrait Photo + Chest No & Discipline */}
            <div
                style={{
                    padding: '10px 16px 6px',
                    display: 'flex',
                    gap: 12,
                    alignItems: 'center',
                }}
            >
                {/* Athlete Portrait Frame */}
                <div
                    style={{
                        width: 104,
                        height: 126,
                        borderRadius: 10,
                        overflow: 'hidden',
                        border: '2px solid #0F172A',
                        background: '#0F172A',
                        position: 'relative',
                        flexShrink: 0,
                        boxShadow: '0 4px 10px rgba(0,0,0,0.12)',
                    }}
                >
                    {student.photo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={student.photo_url}
                            alt={student.name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            crossOrigin="anonymous"
                        />
                    ) : (
                        <div
                            style={{
                                width: '100%',
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
                                color: '#F59E0B',
                            }}
                        >
                            <div
                                style={{
                                    width: 44,
                                    height: 44,
                                    borderRadius: '50%',
                                    border: '2px solid #F59E0B',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: 22,
                                    fontWeight: 900,
                                    background: 'rgba(245,158,11,0.12)',
                                }}
                            >
                                {student.name.slice(0, 1).toUpperCase()}
                            </div>
                            <span
                                style={{
                                    fontSize: 8,
                                    fontWeight: 800,
                                    letterSpacing: 1.5,
                                    textTransform: 'uppercase',
                                    color: '#CBD5E1',
                                    marginTop: 6,
                                }}
                            >
                                ATHLETE
                            </span>
                        </div>
                    )}

                    {/* Corner Verified Tag */}
                    <div
                        style={{
                            position: 'absolute',
                            bottom: 4,
                            right: 4,
                            background: '#10B981',
                            color: '#FFFFFF',
                            fontSize: 7.5,
                            fontWeight: 800,
                            padding: '1px 5px',
                            borderRadius: 3,
                            letterSpacing: 0.5,
                        }}
                    >
                        VERIFIED ✓
                    </div>
                </div>

                {/* Right Hero Info: Chest Number & Event Badges */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {/* Chest / Bib Number Box */}
                    <div
                        style={{
                            background: '#F8FAFC',
                            border: '1.5px solid #CBD5E1',
                            borderRadius: 8,
                            padding: '6px 8px',
                            textAlign: 'center',
                        }}
                    >
                        <p
                            style={{
                                fontSize: 8,
                                color: '#64748B',
                                fontWeight: 800,
                                letterSpacing: 1.5,
                                textTransform: 'uppercase',
                                margin: 0,
                            }}
                        >
                            CHEST / BIB NUMBER
                        </p>
                        <p
                            style={{
                                fontSize: 32,
                                fontWeight: 900,
                                color: '#0F172A',
                                lineHeight: 1,
                                margin: '2px 0',
                                fontFamily: "'Impact', 'Inter', sans-serif",
                                letterSpacing: '1px',
                            }}
                        >
                            #{chest_no ? String(chest_no).padStart(2, '0') : '01'}
                        </p>
                        <p
                            style={{
                                fontSize: 7.5,
                                color: '#2563EB',
                                fontWeight: 800,
                                letterSpacing: 1,
                                textTransform: 'uppercase',
                                margin: 0,
                            }}
                        >
                            OFFICIAL COMPETITOR
                        </p>
                    </div>

                    {/* Discipline Badge */}
                    <div style={{ display: 'flex', gap: 4 }}>
                        {!participation_type || participation_type === 'both' ? (
                            <>
                                <div
                                    style={{
                                        flex: 1,
                                        background: '#EEF2FF',
                                        border: '1px solid #C7D2FE',
                                        borderRadius: 5,
                                        padding: '3px 0',
                                        textAlign: 'center',
                                        fontSize: 9,
                                        fontWeight: 800,
                                        color: '#4338CA',
                                        letterSpacing: 0.5,
                                    }}
                                >
                                    KATA
                                </div>
                                <div
                                    style={{
                                        flex: 1,
                                        background: '#FEF2F2',
                                        border: '1px solid #FECACA',
                                        borderRadius: 5,
                                        padding: '3px 0',
                                        textAlign: 'center',
                                        fontSize: 9,
                                        fontWeight: 800,
                                        color: '#DC2626',
                                        letterSpacing: 0.5,
                                    }}
                                >
                                    KUMITE
                                </div>
                            </>
                        ) : participation_type === 'kata' ? (
                            <div
                                style={{
                                    width: '100%',
                                    background: '#EEF2FF',
                                    border: '1px solid #C7D2FE',
                                    borderRadius: 5,
                                    padding: '3px 0',
                                    textAlign: 'center',
                                    fontSize: 9,
                                    fontWeight: 800,
                                    color: '#4338CA',
                                    letterSpacing: 0.5,
                                }}
                            >
                                KATA COMPETITOR
                            </div>
                        ) : (
                            <div
                                style={{
                                    width: '100%',
                                    background: '#FEF2F2',
                                    border: '1px solid #FECACA',
                                    borderRadius: 5,
                                    padding: '3px 0',
                                    textAlign: 'center',
                                    fontSize: 9,
                                    fontWeight: 800,
                                    color: '#DC2626',
                                    letterSpacing: 0.5,
                                }}
                            >
                                KUMITE COMPETITOR
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Athlete Name & Dojo Bar */}
            <div style={{ padding: '0 16px', textAlign: 'left' }}>
                <h1
                    style={{
                        fontSize: 18,
                        fontWeight: 900,
                        color: '#0F172A',
                        margin: 0,
                        lineHeight: 1.15,
                        textTransform: 'uppercase',
                        letterSpacing: '0.4px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                    }}
                >
                    {student.name}
                </h1>
                <div
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        background: '#F1F5F9',
                        border: '1px solid #E2E8F0',
                        borderRadius: 5,
                        padding: '2px 8px',
                        marginTop: 4,
                        maxWidth: '100%',
                    }}
                >
                    <span style={{ fontSize: 10 }}>🥋</span>
                    <span
                        style={{
                            fontSize: 9.5,
                            fontWeight: 700,
                            color: '#334155',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                        }}
                    >
                        {dojo.name}
                        {dojo.coach_name ? ` • Coach: ${dojo.coach_name}` : ''}
                    </span>
                </div>
            </div>

            {/* Category / Division Banner */}
            <div
                style={{
                    margin: '8px 16px 0',
                    background: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)',
                    border: '1.5px solid #F59E0B',
                    borderRadius: 6,
                    padding: '5px 10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                }}
            >
                <span
                    style={{
                        fontSize: 8,
                        fontWeight: 800,
                        color: '#92400E',
                        letterSpacing: 1,
                        textTransform: 'uppercase',
                    }}
                >
                    DIVISION / CATEGORY
                </span>
                <span
                    style={{
                        fontSize: 10.5,
                        fontWeight: 800,
                        color: '#78350F',
                        textTransform: 'capitalize',
                        textAlign: 'right',
                    }}
                >
                    {category_name || 'Open Category'}
                </span>
            </div>

            {/* Karate Belt Swatch & Biometrics */}
            <div style={{ margin: '7px 16px 0', display: 'flex', gap: 6, alignItems: 'stretch' }}>
                {/* Karate Belt Strip */}
                <div
                    style={{
                        flex: 2,
                        background: belt.bg,
                        border: `1.5px solid ${belt.border}`,
                        borderRadius: 6,
                        padding: '4px 8px',
                        display: 'flex',
                        alignItems: 'center',
                        position: 'relative',
                        overflow: 'hidden',
                    }}
                >
                    <div
                        style={{
                            position: 'absolute',
                            right: 0,
                            top: 0,
                            bottom: 0,
                            width: 14,
                            background: belt.tipColor,
                        }}
                    />
                    <span
                        style={{
                            fontSize: 9.5,
                            fontWeight: 800,
                            color: belt.text,
                            zIndex: 1,
                            textTransform: 'uppercase',
                            letterSpacing: 0.5,
                        }}
                    >
                        🥋 {belt.label}
                    </span>
                </div>

                {/* Gender Tag */}
                <div
                    style={{
                        flex: 1,
                        background: '#F8FAFC',
                        border: '1px solid #E2E8F0',
                        borderRadius: 6,
                        padding: '4px 6px',
                        textAlign: 'center',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                    }}
                >
                    <span style={{ fontSize: 7, color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        GENDER
                    </span>
                    <span style={{ fontSize: 9.5, fontWeight: 800, color: '#0F172A', textTransform: 'uppercase' }}>
                        {student.gender}
                    </span>
                </div>

                {/* Weight Tag */}
                <div
                    style={{
                        flex: 1,
                        background: '#F8FAFC',
                        border: '1px solid #E2E8F0',
                        borderRadius: 6,
                        padding: '4px 6px',
                        textAlign: 'center',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                    }}
                >
                    <span style={{ fontSize: 7, color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        WEIGHT
                    </span>
                    <span style={{ fontSize: 9.5, fontWeight: 800, color: '#0F172A' }}>
                        {data.declared_weight_kg || student.weight ? `${data.declared_weight_kg || student.weight} kg` : 'Open'}
                    </span>
                </div>
            </div>

            {/* Official Security Verification Box + QR */}
            <div
                style={{
                    margin: '8px 16px 0',
                    background: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: 8,
                    padding: '7px 10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                }}
            >
                <div
                    style={{
                        width: 66,
                        height: 66,
                        background: '#FFFFFF',
                        border: '1px solid #CBD5E1',
                        borderRadius: 5,
                        padding: 2,
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={qr.data_url}
                        alt="Verification QR"
                        style={{ width: '100%', height: '100%', imageRendering: 'pixelated' }}
                    />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 9, fontWeight: 800, color: '#0F172A', margin: 0, letterSpacing: 0.3 }}>
                        SCAN FOR WEIGH-IN & CHECK-IN
                    </p>
                    <p style={{ fontSize: 7.5, color: '#64748B', margin: '2px 0 0', lineHeight: 1.3 }}>
                        Official QR confirms valid registration & mat-side eligibility.
                    </p>
                    <p style={{ fontSize: 8, color: '#0369A1', fontFamily: 'monospace', fontWeight: 700, margin: '2px 0 0' }}>
                        ID: {data.id.slice(0, 8).toUpperCase()}-{(chest_no || '0').toString().padStart(3, '0')}
                    </p>
                    <p style={{ fontSize: 7.5, color: '#16A34A', fontWeight: 800, margin: '2px 0 0' }}>
                        ✓ ENTRYDESK CERTIFIED CREDENTIAL
                    </p>
                </div>
            </div>

            {/* Security Bottom Strip */}
            <div
                style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    background: '#0F172A',
                    color: '#94A3B8',
                    padding: '4px 16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: 7,
                    letterSpacing: 0.5,
                }}
            >
                <span>OFFICIAL PARTICIPANT PASS • NON-TRANSFERABLE</span>
                <span style={{ fontWeight: 700, color: '#F59E0B' }}>ENTRYDESK.IN</span>
            </div>
        </div>
    )

    if (scale !== 1) {
        return (
            <div
                ref={printRef}
                style={{
                    width: CARD_WIDTH * scale,
                    height: CARD_HEIGHT * scale,
                    overflow: 'hidden',
                    display: 'inline-block',
                }}
            >
                {cardElement}
            </div>
        )
    }

    return cardElement
}

// ============================================================================
// 2. REVERSE PANEL: Event Rules, Emergency Info & Backup Barcode
// ============================================================================

export function IdCardBackPreview({ data, scale = 1 }: { data: IdCardData; scale?: number }) {
    const { student, event, dojo, chest_no } = data

    const cardElement = (
        <div
            style={{
                width: CARD_WIDTH,
                height: CARD_HEIGHT,
                transform: scale !== 1 ? `scale(${scale})` : undefined,
                transformOrigin: 'top left',
                fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                background: '#FFFFFF',
                color: '#0F172A',
                overflow: 'hidden',
                position: 'relative',
                borderRadius: scale < 1 ? 14 : 0,
                boxShadow: scale < 1 ? '0 10px 30px rgba(0,0,0,0.18)' : 'none',
                boxSizing: 'border-box',
                border: scale < 1 ? '1px solid #E2E8F0' : 'none',
            }}
        >
            {/* Lanyard Slot Hole Guide */}
            <div
                style={{
                    height: 18,
                    background: '#070B14',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    paddingTop: 3,
                }}
            >
                <div
                    style={{
                        width: 42,
                        height: 6,
                        borderRadius: 3,
                        border: '1px dashed #64748B',
                        background: 'rgba(255,255,255,0.06)',
                    }}
                />
                <span style={{ fontSize: 6.5, color: '#64748B', letterSpacing: 1.2, textTransform: 'uppercase', marginTop: 1 }}>
                    ⌾ LANYARD SLOT ⌾
                </span>
            </div>

            {/* Header */}
            <div
                style={{
                    background: '#0F172A',
                    padding: '12px 16px 10px',
                    textAlign: 'center',
                    color: '#FFFFFF',
                }}
            >
                <p style={{ color: '#F59E0B', fontSize: 8, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', margin: 0 }}>
                    ACCREDITATION PROTOCOL & SAFETY
                </p>
                <h3 style={{ fontSize: 13, fontWeight: 800, margin: '3px 0 0', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                    {event.title}
                </h3>
            </div>

            {/* Gold Rule */}
            <div style={{ height: 2, background: '#F59E0B' }} />

            {/* Athlete Summary Strip */}
            <div style={{ padding: '10px 16px 0' }}>
                <div
                    style={{
                        background: '#F8FAFC',
                        border: '1px solid #E2E8F0',
                        borderRadius: 8,
                        padding: '8px 12px',
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, 1fr)',
                        gap: '6px 12px',
                        fontSize: 9,
                    }}
                >
                    <div>
                        <span style={{ color: '#64748B', fontSize: 7.5, textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>
                            ATHLETE
                        </span>
                        <strong style={{ color: '#0F172A', fontSize: 10.5 }}>{student.name}</strong>
                    </div>
                    <div>
                        <span style={{ color: '#64748B', fontSize: 7.5, textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>
                            CHEST / BIB
                        </span>
                        <strong style={{ color: '#0F172A', fontSize: 10.5 }}>#{chest_no || '01'}</strong>
                    </div>
                    <div>
                        <span style={{ color: '#64748B', fontSize: 7.5, textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>
                            DOJO
                        </span>
                        <span style={{ color: '#334155', fontWeight: 600 }}>{dojo.name}</span>
                    </div>
                    <div>
                        <span style={{ color: '#64748B', fontSize: 7.5, textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>
                            COACH
                        </span>
                        <span style={{ color: '#334155', fontWeight: 600 }}>{dojo.coach_name || 'Assigned Coach'}</span>
                    </div>
                </div>
            </div>

            {/* Rules & Guidelines */}
            <div style={{ padding: '10px 16px 0' }}>
                <p style={{ fontSize: 8.5, fontWeight: 800, color: '#0F172A', textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 6px' }}>
                    COMPETITOR CODE OF CONDUCT
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {[
                        '1. Pass must be displayed around neck at all times in competition and warm-up areas.',
                        '2. Report to tatami marshal desk 2 bouts prior to your scheduled category.',
                        '3. Mandatory WKF/association-approved protective gear and clean uniform (Gi) required.',
                        '4. Present digital QR code at weigh-in counter prior to first bout.',
                        '5. Misconduct by athlete or spectators may result in immediate accreditation revocation.',
                    ].map((rule, idx) => (
                        <div
                            key={idx}
                            style={{
                                fontSize: 8,
                                color: '#475569',
                                lineHeight: 1.35,
                                background: '#F8FAFC',
                                padding: '4px 8px',
                                borderRadius: 5,
                                borderLeft: '2px solid #2563EB',
                            }}
                        >
                            {rule}
                        </div>
                    ))}
                </div>
            </div>

            {/* Stylized Barcode Graphic */}
            <div style={{ padding: '12px 16px 0', textAlign: 'center' }}>
                <div
                    style={{
                        background: '#FFFFFF',
                        border: '1px solid #CBD5E1',
                        borderRadius: 6,
                        padding: '6px 12px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                    }}
                >
                    {/* Simulated barcode bars */}
                    <div style={{ display: 'flex', gap: 2, height: 26, alignItems: 'center' }}>
                        {[3, 1, 2, 4, 1, 3, 2, 1, 4, 2, 1, 3, 1, 2, 4, 1, 3, 2, 1, 3, 2, 4, 1, 3, 2, 1, 4, 2, 1, 3, 1].map((w, i) => (
                            <div key={i} style={{ width: w, height: 24, background: '#0F172A' }} />
                        ))}
                    </div>
                    <span style={{ fontFamily: 'monospace', fontSize: 8, color: '#64748B', fontWeight: 700, marginTop: 4, letterSpacing: 2 }}>
                        ED-{data.id.slice(0, 12).toUpperCase()}
                    </span>
                </div>
            </div>

            {/* Footer */}
            <div
                style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    background: '#0F172A',
                    color: '#94A3B8',
                    padding: '4px 16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: 7,
                    letterSpacing: 0.5,
                }}
            >
                <span>CHAMPIONSHIP SECURITY • TOURNAMENT PASS</span>
                <span style={{ fontWeight: 700, color: '#F59E0B' }}>ENTRYDESK.IN</span>
            </div>
        </div>
    )

    if (scale !== 1) {
        return (
            <div
                style={{
                    width: CARD_WIDTH * scale,
                    height: CARD_HEIGHT * scale,
                    overflow: 'hidden',
                    display: 'inline-block',
                }}
            >
                {cardElement}
            </div>
        )
    }

    return cardElement
}

// ============================================================================
// 3. COMPLETE A4 PRINT SHEET (210mm × 297mm @ 96 DPI: 794px × 1123px)
// Renders Front + Back pass side-by-side with cut & fold guides + instructions.
// ============================================================================

export function IdCardA4Sheet({ data, printRef }: { data: IdCardData; printRef?: React.RefObject<HTMLDivElement | null> }) {
    return (
        <div
            ref={printRef}
            style={{
                width: 794,
                height: 1123,
                boxSizing: 'border-box',
                background: '#FFFFFF',
                color: '#0F172A',
                fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                padding: '24px 30px',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
            }}
        >
            {/* Top A4 Sheet Header */}
            <div>
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderBottom: '2px solid #0F172A',
                        paddingBottom: 10,
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div
                            style={{
                                width: 34,
                                height: 34,
                                borderRadius: 8,
                                background: '#0F172A',
                                color: '#F59E0B',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 900,
                                fontSize: 16,
                            }}
                        >
                            ED
                        </div>
                        <div>
                            <h1 style={{ fontSize: 16, fontWeight: 900, color: '#0F172A', margin: 0, letterSpacing: 0.5 }}>
                                ENTRYDESK OFFICIAL TOURNAMENT CREDENTIAL
                            </h1>
                            <p style={{ fontSize: 9.5, color: '#64748B', margin: '2px 0 0' }}>
                                Official Competitor Accreditation Pass & Verification Dossier
                            </p>
                        </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                        <span
                            style={{
                                background: '#FEF3C7',
                                color: '#92400E',
                                border: '1px solid #F59E0B',
                                fontSize: 8,
                                fontWeight: 800,
                                padding: '3px 8px',
                                borderRadius: 5,
                                letterSpacing: 1,
                                textTransform: 'uppercase',
                            }}
                        >
                            READY FOR PRINT
                        </span>
                        <p style={{ fontSize: 8.5, color: '#94A3B8', margin: '3px 0 0' }}>
                            Scale: 100% • Format: A4 Portrait
                        </p>
                    </div>
                </div>

                <div
                    style={{
                        margin: '10px 0 16px',
                        background: '#F8FAFC',
                        border: '1px solid #E2E8F0',
                        borderRadius: 6,
                        padding: '6px 14px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: 9.5,
                        color: '#334155',
                    }}
                >
                    <span>
                        <strong>Tournament:</strong> {data.event.title}
                    </span>
                    <span>
                        <strong>Dates:</strong> {formatEventDate(data.event.start_date, data.event.end_date)}
                    </span>
                    <span>
                        <strong>Venue:</strong> {data.event.location || 'Official Arena'}
                    </span>
                </div>
            </div>

            {/* Center: Foldable Pass Area (Front + Back with Fold Line) */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
                <div
                    style={{
                        border: '1.5px dashed #94A3B8',
                        borderRadius: 8,
                        padding: '10px 14px 12px',
                        background: '#FAFAFA',
                        position: 'relative',
                    }}
                >
                    {/* Top Scissor Cut Guide */}
                    <div
                        style={{
                            textAlign: 'center',
                            fontSize: 8,
                            fontWeight: 800,
                            color: '#64748B',
                            letterSpacing: 2,
                            textTransform: 'uppercase',
                            marginBottom: 8,
                        }}
                    >
                        ✂ CUT ALONG OUTER DOTTED BORDER ✂
                    </div>

                    <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                        {/* Front Panel (Card) */}
                        <div style={{ width: 345, height: 500, overflow: 'hidden' }}>
                            <IdCardPreview data={data} scale={345 / CARD_WIDTH} />
                        </div>

                        {/* Fold Line */}
                        <div
                            style={{
                                height: 490,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '0 4px',
                            }}
                        >
                            <span style={{ fontSize: 7, color: '#94A3B8', fontWeight: 800, letterSpacing: 1 }}>▲ TOP</span>
                            <div
                                style={{
                                    height: 420,
                                    width: 1,
                                    borderLeft: '2px dashed #CBD5E1',
                                }}
                            />
                            <div
                                style={{
                                    transform: 'rotate(-90deg)',
                                    whiteSpace: 'nowrap',
                                    fontSize: 7.5,
                                    color: '#64748B',
                                    fontWeight: 800,
                                    letterSpacing: 1.5,
                                }}
                            >
                                - - - FOLD HERE (BACK-TO-BACK) - - -
                            </div>
                            <span style={{ fontSize: 7, color: '#94A3B8', fontWeight: 800, letterSpacing: 1 }}>▼ BASE</span>
                        </div>

                        {/* Back Panel (Card) */}
                        <div style={{ width: 345, height: 500, overflow: 'hidden' }}>
                            <IdCardBackPreview data={data} scale={345 / CARD_WIDTH} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Instructions Guide */}
            <div>
                <div
                    style={{
                        background: '#F8FAFC',
                        border: '1px solid #E2E8F0',
                        borderRadius: 8,
                        padding: '12px 18px',
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span style={{ fontSize: 9.5, fontWeight: 900, color: '#0F172A', letterSpacing: 0.5 }}>
                            TOURNAMENT CHECK-IN INSTRUCTIONS FOR ATHLETES & COACHES
                        </span>
                        <span style={{ fontSize: 8, color: '#2563EB', fontWeight: 700 }}>
                            OFFICIAL ACCREDITATION DESK
                        </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 6, padding: '8px 10px' }}>
                            <span style={{ fontSize: 8.5, fontWeight: 800, color: '#2563EB', display: 'block' }}>
                                STEP 1: CUT & FOLD
                            </span>
                            <p style={{ fontSize: 8, color: '#64748B', margin: '3px 0 0', lineHeight: 1.35 }}>
                                Cut with scissors along the outer dotted border. Fold down the center line so both sides face outward.
                            </p>
                        </div>

                        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 6, padding: '8px 10px' }}>
                            <span style={{ fontSize: 8.5, fontWeight: 800, color: '#2563EB', display: 'block' }}>
                                STEP 2: LANYARD MOUNT
                            </span>
                            <p style={{ fontSize: 8, color: '#64748B', margin: '3px 0 0', lineHeight: 1.35 }}>
                                Punch the slot at the top marker or place inside a standard 100×140mm transparent lanyard pouch.
                            </p>
                        </div>

                        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 6, padding: '8px 10px' }}>
                            <span style={{ fontSize: 8.5, fontWeight: 800, color: '#2563EB', display: 'block' }}>
                                STEP 3: MAT-SIDE SCAN
                            </span>
                            <p style={{ fontSize: 8, color: '#64748B', margin: '3px 0 0', lineHeight: 1.35 }}>
                                Present this pass at the weigh-in counter and tatami marshal table for electronic QR verification.
                            </p>
                        </div>
                    </div>
                </div>

                <div
                    style={{
                        marginTop: 10,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: 8,
                        color: '#94A3B8',
                        padding: '0 4px',
                    }}
                >
                    <span>ENTRYDESK SECURE VERIFICATION SYSTEM • ALL RIGHTS RESERVED</span>
                    <span>PASS TOKEN: {data.id.slice(0, 16).toUpperCase()}</span>
                    <span>HTTPS://ENTRYDESK.IN</span>
                </div>
            </div>
        </div>
    )
}
