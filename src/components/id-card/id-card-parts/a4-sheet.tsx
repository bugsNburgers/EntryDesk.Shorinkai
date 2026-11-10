import React from 'react'
import { IdCardData, formatEventDates, formatDob, formatRegistrationDateTime, getAgeCategory, getCategorySubtitle, QrSymbolDef } from './card-data'

// Moved verbatim from id-card-preview.tsx (printed output must stay pixel-identical:
// fixed colours here are intentional).

// ============================================================================
// 2. A4 PRINT PASS COMPONENT (Below One in Karate Athlete ID Card.html)
// Dimensions: 794px × 1123px (210mm × 297mm standard A4 portrait at 96 DPI)
// ============================================================================

export interface IdCardA4SheetProps {
    data: IdCardData
    className?: string
    style?: React.CSSProperties
    printRef?: React.RefObject<HTMLDivElement | null>
}

export function IdCardA4Sheet({ data, className = '', style = {}, printRef }: IdCardA4SheetProps) {
    const pType = (data.participation_type || 'both').toLowerCase()
    const isTeamKata = pType.includes('team_kata') || pType.includes('team kata')
    const isTeamKumite = pType.includes('team_kumite') || pType.includes('team kumite')
    const hasBoth = pType.includes('both')
    const withoutTeams = pType.replace(/team[_\s]kata/g, '').replace(/team[_\s]kumite/g, '')
    const isKata = hasBoth || withoutTeams.includes('kata')
    const isKumite = hasBoth || withoutTeams.includes('kumite')

    const athleteName = data.student.name || '[Athlete Full Name]'
    const dojoName = data.dojo.name || '[Dojo name]'
    const coachName = data.dojo.coach_name || '[Coach name]'
    const chestNo = data.chest_no ? String(data.chest_no).padStart(4, '0') : '0147'
    const regId = data.registration_no || (data.id ? 'REG-' + data.id.slice(0, 6).toUpperCase() : '[REG-000000]')
    const dobFormatted = formatDob(data.student.dob)
    const genderFormatted = data.student.gender
        ? data.student.gender.charAt(0).toUpperCase() + data.student.gender.slice(1)
        : '[Male / Female]'
    const weightFormatted = data.declared_weight_kg || data.student.weight
        ? Number(data.declared_weight_kg || data.student.weight).toFixed(1)
        : '[00.0]'
    const beltFormatted = data.student.rank || '[Belt]'
    const ageCatFormatted = getAgeCategory(data)
    const categorySubtitleA4 = getCategorySubtitle(data, true)

    const emergencyName = data.emergency_contact?.name || data.dojo.coach_name || '[Name]'
    const emergencyPhone = data.emergency_contact?.phone || data.student.phone || '[Phone]'
    const regEmail = data.registration?.email || 'parent@email.com'
    const regPhone = data.student.phone || data.registration?.phone || '[+91 00000 00000]'

    const { date: regDate, time: regTime } = formatRegistrationDateTime(data.created_at)
    const eventDates = formatEventDates(data.event.start_date, data.event.end_date)
    const venue = data.event.location || (data.dojo.city ? `${data.dojo.city} Arena, ${data.dojo.city}` : '[Venue name], [City]')

    const eventTitleA4 = data.event.title
        ? (data.event.title.toLowerCase().includes('karate') ? data.event.title : `${data.event.title} Karate Championship 2026`)
        : '[Tournament Name] Karate Championship 2026'

    return (
        <div
            ref={printRef}
            className={`karate-id-card-scope ${className}`}
            style={{
                width: 794,
                height: 1123,
                boxSizing: 'border-box',
                margin: '0 auto',
                background: '#fff',
                position: 'relative',
                ...style,
            }}
        >
            <div
                className="r"
                style={{
                    width: 794,
                    height: 1123,
                    boxSizing: 'border-box',
                    display: 'flex',
                    flexDirection: 'column',
                    background: '#fff',
                    color: '#0e2238',
                    fontFamily: '"Google Sans", "Product Sans", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    WebkitPrintColorAdjust: 'exact',
                    printColorAdjust: 'exact',
                    position: 'relative',
                    overflow: 'hidden',
                }}
            >
                <QrSymbolDef />

                {/* 1. Top Header Banner (Navy) */}
                <div
                    style={{
                        background: '#0e2238',
                        color: '#fff',
                        padding: '20px 32px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-end',
                    }}
                >
                    <div>
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                fontSize: 11,
                                fontWeight: 600,
                                letterSpacing: '.14em',
                                color: '#3fd8c3',
                            }}
                        >
                            <svg width="24" height="24" viewBox="0 0 26 26">
                                <circle cx="13" cy="13" r="12" fill="#0e2238" stroke="#fff" strokeWidth="1.5" />
                                <path d="M8 8l10 10M18 8L8 18" stroke="#3fd8c3" strokeWidth="2.6" strokeLinecap="round" />
                            </svg>
                            ATHLETE PASS
                        </div>
                        <div className="c" style={{ fontSize: 31, lineHeight: 1.1, marginTop: 10 }}>
                            {eventTitleA4}
                        </div>
                    </div>
                    <div style={{ textAlign: 'right', fontSize: 14, lineHeight: 1.5, flexShrink: 0, marginLeft: 24 }}>
                        <b>{eventDates}</b>
                        <br />
                        {venue}
                    </div>
                </div>

                {/* 2. Middle Body Grid */}
                <div style={{ padding: '22px 32px 0', display: 'flex', flexDirection: 'column', gap: 18, flex: 1 }}>
                    {/* Top 3-Col Hero Block */}
                    <div
                        style={{
                            border: '2px solid #0e2238',
                            display: 'grid',
                            gridTemplateColumns: '186px 1fr 196px',
                            height: 300,
                        }}
                    >
                        {/* Col 1: Photo 3:4 */}
                        <div
                            style={{
                                background: '#e6ecf0',
                                borderRight: '2px solid #0e2238',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 8,
                                overflow: 'hidden',
                            }}
                        >
                            {data.student.photo_url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={data.student.photo_url}
                                    alt={athleteName}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    crossOrigin="anonymous"
                                />
                            ) : (
                                <>
                                    <svg width="46" height="46" viewBox="0 0 46 46" fill="none" stroke="#52606d" strokeWidth="1.5">
                                        <circle cx="23" cy="16" r="8" />
                                        <path d="M6 42c0-10 7-16 17-16s17 6 17 16" />
                                    </svg>
                                    <span className="l">Photo 3:4</span>
                                </>
                            )}
                        </div>

                        {/* Col 2: Athlete Information */}
                        <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minWidth: 0 }}>
                            <div>
                                <div className="c" style={{ fontSize: 34, lineHeight: 1.05 }}>
                                    {athleteName}
                                </div>
                                <div style={{ fontSize: 16, fontWeight: 600, marginTop: 8 }}>
                                    {categorySubtitleA4}
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: 28 }}>
                                <div>
                                    <div className="l">Dojo</div>
                                    <div style={{ fontSize: 16, fontWeight: 600 }}>{dojoName}</div>
                                </div>
                                <div>
                                    <div className="l">Coach</div>
                                    <div style={{ fontSize: 16, fontWeight: 600 }}>{coachName}</div>
                                </div>
                            </div>

                            <div>
                                <div className="l" style={{ marginBottom: 8 }}>Competing in</div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'auto auto', justifyContent: 'start', gap: '8px 30px' }}>
                                    <div className="ev" style={{ color: isKata ? '#0e2238' : '#52606d' }}>
                                        <span className={`cb ${isKata ? 'on' : ''}`}>
                                            {isKata && (
                                                <svg width="12" height="12" viewBox="0 0 14 14">
                                                    <path d="M2 7.5l3 3 7-7.5" fill="none" stroke="#fff" strokeWidth="2.4" />
                                                </svg>
                                            )}
                                        </span>{' '}
                                        KATA
                                    </div>
                                    <div className="ev" style={{ color: isKumite ? '#0e2238' : '#52606d' }}>
                                        <span className={`cb ${isKumite ? 'on' : ''}`}>
                                            {isKumite && (
                                                <svg width="12" height="12" viewBox="0 0 14 14">
                                                    <path d="M2 7.5l3 3 7-7.5" fill="none" stroke="#fff" strokeWidth="2.4" />
                                                </svg>
                                            )}
                                        </span>{' '}
                                        KUMITE
                                    </div>
                                    <div className="ev" style={{ color: isTeamKata ? '#0e2238' : '#52606d' }}>
                                        <span className={`cb ${isTeamKata ? 'on' : ''}`}>
                                            {isTeamKata && (
                                                <svg width="12" height="12" viewBox="0 0 14 14">
                                                    <path d="M2 7.5l3 3 7-7.5" fill="none" stroke="#fff" strokeWidth="2.4" />
                                                </svg>
                                            )}
                                        </span>{' '}
                                        TEAM KATA
                                    </div>
                                    <div className="ev" style={{ color: isTeamKumite ? '#0e2238' : '#52606d' }}>
                                        <span className={`cb ${isTeamKumite ? 'on' : ''}`}>
                                            {isTeamKumite && (
                                                <svg width="12" height="12" viewBox="0 0 14 14">
                                                    <path d="M2 7.5l3 3 7-7.5" fill="none" stroke="#fff" strokeWidth="2.4" />
                                                </svg>
                                            )}
                                        </span>{' '}
                                        TEAM KUMITE
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Col 3: Chest No & QR */}
                        <div style={{ borderLeft: '2px solid #0e2238', display: 'flex', flexDirection: 'column' }}>
                            <div style={{ background: '#0e2238', color: '#fff', textAlign: 'center', padding: '6px 0 0' }}>
                                <div style={{ fontSize: 10.5, letterSpacing: '.14em', fontWeight: 700 }}>CHEST NO.</div>
                                <div className="c m" style={{ fontSize: 66, lineHeight: 1.1 }}>
                                    {chestNo}
                                </div>
                            </div>
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, textAlign: 'center' }}>
                                {data.qr?.data_url ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={data.qr.data_url}
                                        alt="Verification QR"
                                        width={116}
                                        height={116}
                                        style={{ display: 'inline-block', imageRendering: 'pixelated' }}
                                    />
                                ) : (
                                    <svg width="116" height="116" style={{ color: '#0e2238' }}>
                                        <use href="#qr" />
                                    </svg>
                                )}
                                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', lineHeight: 1.3 }}>
                                    SCAN AT WEIGH-IN<br />&amp; GATE
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Table 1: Athlete & Registration Grid (4 cols, 1px border gap #9aa7b3) */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, background: '#9aa7b3', border: '2px solid #0e2238' }}>
                        <div className="cell"><div className="l">Date of birth</div><b>{dobFormatted}</b></div>
                        <div className="cell"><div className="l">Gender</div><b>{genderFormatted}</b></div>
                        <div className="cell"><div className="l">Weight</div><b>{weightFormatted} kg</b></div>
                        <div className="cell"><div className="l">Belt</div><b>{beltFormatted}</b></div>
                        <div className="cell"><div className="l">Age category</div><b>{ageCatFormatted}</b></div>
                        <div className="cell"><div className="l">Reg. ID</div><b className="m" style={{ fontSize: 14 }}>[{regId}]</b></div>
                        <div className="cell" style={{ gridColumn: 'span 2' }}>
                            <div className="l">Registered on</div><b>{regDate}, {regTime}</b>
                        </div>
                        <div className="cell" style={{ gridColumn: 'span 2' }}>
                            <div className="l">Email used for registration</div><b>{regEmail}</b>
                        </div>
                        <div className="cell"><div className="l">Phone (optional)</div><b>{regPhone}</b></div>
                        <div className="cell"><div className="l">Emergency contact</div><b>{emergencyName} · {emergencyPhone}</b></div>
                    </div>

                    {/* Table 2: For Officials (4 cols) */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, background: '#9aa7b3', border: '2px solid #0e2238', marginTop: -4 }}>
                        <div className="cell" style={{ height: 46 }}><div className="l">For officials · Weigh-in kg</div></div>
                        <div className="cell"><div className="l">Weigh-in OK</div><div style={{ marginTop: 4 }}><span className="cb"></span></div></div>
                        <div className="cell"><div className="l">Mat / Ring no.</div></div>
                        <div className="cell"><div className="l">Official sign</div></div>
                    </div>

                    {/* Bottom Grid: Instructions & Live Progress (1fr 292px) */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 292px', gap: 22, flex: 1, minHeight: 0 }}>
                        <div>
                            <h2 className="c h">Instructions</h2>
                            <ol style={{ margin: 0, paddingLeft: 20, fontSize: 14, lineHeight: 1.4 }}>
                                <li>Carry this pass (printed or on phone) plus a photo or school ID.</li>
                                <li>Weigh-in is mandatory. Arrive at the time your coach confirms.</li>
                                <li>Bring your own gi, belt and approved kumite protective gear.</li>
                                <li>Report to your ring 30 minutes before your category starts.</li>
                                <li>Keep your chest number visible during every bout.</li>
                                <li>Lost pass? Open the QR from your portal or ask the help desk.</li>
                            </ol>
                        </div>
                        <div style={{ border: '2px solid #087f72', display: 'flex', flexDirection: 'column', alignSelf: 'start' }}>
                            <div style={{ background: '#087f72', color: '#fff', fontSize: 11, fontWeight: 700, letterSpacing: '.14em', padding: '7px 12px' }}>
                                ON THE DAY · FOLLOW LIVE
                            </div>
                            <div style={{ display: 'flex', gap: 12, alignItems: 'center', padding: 12 }}>
                                <svg width="100" height="100" style={{ color: '#0e2238', flexShrink: 0 }}>
                                    <use href="#qr" />
                                </svg>
                                <div style={{ fontSize: 13, lineHeight: 1.35 }}>
                                    Scan to track your ring, bout order and results.
                                    <div className="m" style={{ fontSize: 10.5, fontWeight: 600, marginTop: 6, color: '#087f72', overflowWrap: 'anywhere' }}>
                                        ringflow.cruxstudios.dev
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 3. Bottom Footer Branding */}
                <div
                    style={{
                        margin: '0 32px',
                        borderTop: '2px solid #0e2238',
                        padding: '9px 0 16px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: 10,
                        letterSpacing: '.12em',
                        fontWeight: 600,
                    }}
                >
                    <span>CRUXSTUDIOS.DEV</span>
                    <span style={{ color: '#52606d' }}>ZERO BLOAT ENGINEERING</span>
                </div>
            </div>
        </div>
    )
}
