import React from 'react'
import { IdCardData, formatEventDates, formatDob, formatRegistrationDateTime, getAgeCategory, getCategorySubtitle, QrSymbolDef } from './card-data'

// Moved verbatim from id-card-preview.tsx (printed output must stay pixel-identical:
// fixed colours here are intentional).

// ============================================================================
// 1. MOBILE PHONE PASS COMPONENT (Top One in Karate Athlete ID Card.html)
// Width: 390px, pure CSS typography, Google Sans, dark navy & teal theme
// ============================================================================

export interface IdCardPhonePassProps {
    data: IdCardData
    className?: string
    style?: React.CSSProperties
    printRef?: React.RefObject<HTMLDivElement | null>
    scale?: number
}

export function IdCardPhonePass({ data, className = '', style = {}, printRef, scale = 1 }: IdCardPhonePassProps) {
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
    const categorySubtitlePhone = getCategorySubtitle(data, false)

    const emergencyName = data.emergency_contact?.name || data.dojo.coach_name || '[Name]'
    const emergencyPhone = data.emergency_contact?.phone || data.student.phone || '[Phone]'
    const regEmail = data.registration?.email || 'parent@email.com'
    const regPhone = data.student.phone || data.registration?.phone || '[+91 00000 00000]'

    const { date: regDate, time: regTime } = formatRegistrationDateTime(data.created_at)
    const eventDates = formatEventDates(data.event.start_date, data.event.end_date)
    const venue = data.event.location || (data.dojo.city ? `${data.dojo.city} Arena, ${data.dojo.city}` : '[Venue name], [City]')

    // Parse event title: if it contains Karate Championship 2026 or separate line
    let eventTitleLine1 = '[Tournament Name]'
    let eventTitleLine2 = 'Karate Championship 2026'
    if (data.event.title) {
        if (data.event.title.toLowerCase().includes('karate')) {
            const parts = data.event.title.split(/(?=karate)/i)
            if (parts.length >= 2) {
                eventTitleLine1 = parts[0].trim() || data.event.title
                eventTitleLine2 = parts.slice(1).join(' ').trim()
            } else {
                eventTitleLine1 = data.event.title
                eventTitleLine2 = ''
            }
        } else {
            eventTitleLine1 = data.event.title
            eventTitleLine2 = 'Karate Championship 2026'
        }
    }

    const passElement = (
        <div
            ref={scale === 1 ? printRef : undefined}
            className={`karate-id-card-scope ${className}`}
            style={{
                width: 390,
                maxWidth: '100%',
                boxSizing: 'border-box',
                margin: '0 auto',
                transform: scale !== 1 ? `scale(${scale})` : undefined,
                transformOrigin: 'top left',
                ...style,
            }}
        >
            <div
                className="r"
                style={{
                    width: '100%',
                    maxWidth: 390,
                    boxSizing: 'border-box',
                    display: 'flex',
                    flexDirection: 'column',
                    background: '#fff',
                    color: '#0e2238',
                    fontFamily: '"Google Sans", "Product Sans", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    WebkitPrintColorAdjust: 'exact',
                    printColorAdjust: 'exact',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
                    borderRadius: 16,
                    overflow: 'hidden',
                }}
            >
                <QrSymbolDef />

                {/* 1. Header (Navy) */}
                <div style={{ background: '#0e2238', color: '#fff', padding: '16px 16px 18px' }}>
                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            fontSize: 12,
                            fontWeight: 600,
                            letterSpacing: '.1em',
                        }}
                    >
                        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <svg width="24" height="24" viewBox="0 0 26 26">
                                <circle cx="13" cy="13" r="12" fill="#0e2238" stroke="#fff" strokeWidth="1.5" />
                                <path d="M8 8l10 10M18 8L8 18" stroke="#3fd8c3" strokeWidth="2.6" strokeLinecap="round" />
                            </svg>
                            CRUX STUDIOS
                        </span>
                        <span style={{ color: '#3fd8c3' }}>ATHLETE PASS</span>
                    </div>

                    <div className="c" style={{ fontSize: 26, lineHeight: 1.12, marginTop: 18 }}>
                        {eventTitleLine1}
                        {eventTitleLine2 && (
                            <>
                                <br />
                                {eventTitleLine2}
                            </>
                        )}
                    </div>

                    <div style={{ marginTop: 12, fontSize: 14, lineHeight: 1.5, color: '#d8e3ec' }}>
                        <b style={{ color: '#fff' }}>{eventDates}</b>
                        <br />
                        {venue}
                    </div>
                </div>

                {/* 2. Middle Content (White) */}
                <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 18 }}>
                    {/* Athlete photo + Name / Dojo / Coach */}
                    <div style={{ display: 'flex', gap: 14 }}>
                        <div
                            style={{
                                width: 104,
                                height: 138,
                                background: '#e6ecf0',
                                border: '1.5px solid #0e2238',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 6,
                                flexShrink: 0,
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
                                    <span className="l" style={{ fontSize: 10 }}>Photo 3:4</span>
                                </>
                            )}
                        </div>

                        <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <div className="c" style={{ fontSize: 25, lineHeight: 1.1 }}>
                                {athleteName}
                            </div>
                            <div>
                                <div className="l">Dojo</div>
                                <div style={{ fontSize: 15, fontWeight: 600 }}>{dojoName}</div>
                            </div>
                            <div>
                                <div className="l">Coach</div>
                                <div style={{ fontSize: 15, fontWeight: 600 }}>{coachName}</div>
                            </div>
                        </div>
                    </div>

                    {/* CHEST NO. Banner (Teal) */}
                    <div
                        style={{
                            background: '#087f72',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '6px 16px',
                            borderRadius: 12,
                        }}
                    >
                        <div>
                            <div style={{ fontSize: 12, letterSpacing: '.14em', fontWeight: 700 }}>CHEST NO.</div>
                            <div style={{ fontSize: 13, marginTop: 2 }}>{categorySubtitlePhone}</div>
                        </div>
                        <div className="c m" style={{ fontSize: 58, lineHeight: 1.05 }}>
                            {chestNo}
                        </div>
                    </div>

                    {/* Competing in Checkboxes */}
                    <div>
                        <div className="l" style={{ marginBottom: 9 }}>Competing in</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
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

                    {/* QR Code Container */}
                    <div style={{ border: '2px solid #0e2238', borderRadius: 14, overflow: 'hidden' }}>
                        <div
                            style={{
                                background: '#0e2238',
                                color: '#fff',
                                textAlign: 'center',
                                fontSize: 12,
                                fontWeight: 700,
                                letterSpacing: '.12em',
                                padding: '8px 0',
                            }}
                        >
                            SCAN AT WEIGH-IN &amp; GATE
                        </div>
                        <div style={{ textAlign: 'center', padding: '16px 0 12px' }}>
                            {data.qr?.data_url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={data.qr.data_url}
                                    alt="Verification QR"
                                    width={200}
                                    height={200}
                                    style={{ display: 'inline-block', imageRendering: 'pixelated' }}
                                />
                            ) : (
                                <svg width="200" height="200" style={{ color: '#0e2238' }}>
                                    <use href="#qr" />
                                </svg>
                            )}
                            <div className="m" style={{ fontSize: 13, fontWeight: 600, marginTop: 8 }}>
                                [{regId}]
                            </div>
                        </div>
                    </div>
                </div>

                {/* 3. Detail Cards Section (Light Gray Background) */}
                <div style={{ background: '#f3f6f6', padding: 16, display: 'flex', flexDirection: 'column', gap: 14, flex: 1 }}>
                    {/* Athlete Card */}
                    <div className="card">
                        <div className="ch">Athlete</div>
                        <div className="row">
                            <span>Date of birth</span>
                            <b>{dobFormatted}</b>
                        </div>
                        <div className="row">
                            <span>Gender</span>
                            <b>{genderFormatted}</b>
                        </div>
                        <div className="row">
                            <span>Weight</span>
                            <b>{weightFormatted} kg</b>
                        </div>
                        <div className="row">
                            <span>Belt</span>
                            <b>{beltFormatted}</b>
                        </div>
                        <div className="row" style={{ border: 0 }}>
                            <span>Age category</span>
                            <b>{ageCatFormatted}</b>
                        </div>
                    </div>

                    {/* Dojo & coach Card */}
                    <div className="card">
                        <div className="ch">Dojo &amp; coach</div>
                        <div className="row">
                            <span>Dojo / Club</span>
                            <b>{dojoName}</b>
                        </div>
                        <div className="row">
                            <span>Coach</span>
                            <b>{coachName}</b>
                        </div>
                        <div className="row" style={{ border: 0 }}>
                            <span>Emergency contact</span>
                            <b>
                                {emergencyName}
                                <br />
                                {emergencyPhone}
                            </b>
                        </div>
                    </div>

                    {/* Registration Card */}
                    <div className="card">
                        <div className="ch">Registration</div>
                        <div className="row">
                            <span>Reg. ID</span>
                            <b className="m">[{regId}]</b>
                        </div>
                        <div className="row">
                            <span>Registered on</span>
                            <b>
                                {regDate}
                                <br />
                                {regTime}
                            </b>
                        </div>
                        <div className="row">
                            <span>Email used</span>
                            <b>{regEmail}</b>
                        </div>
                        <div className="row" style={{ border: 0 }}>
                            <span>Phone (optional)</span>
                            <b>{regPhone}</b>
                        </div>
                    </div>

                    {/* Before you come Card */}
                    <div className="card">
                        <div className="ch">Before you come</div>
                        <ol style={{ margin: '10px 0 0', paddingLeft: 20, fontSize: 15, lineHeight: 1.45 }}>
                            <li>Carry this pass plus a photo or school ID.</li>
                            <li>Weigh-in is mandatory. Arrive when your coach says.</li>
                            <li>Bring your gi, belt and approved kumite gear.</li>
                            <li>Be at your ring 30 minutes before your category.</li>
                            <li>Keep your chest number visible in every bout.</li>
                        </ol>
                    </div>

                    {/* On the day · Live Card */}
                    <div className="card" style={{ background: '#087f72', color: '#fff' }}>
                        <div className="ch" style={{ color: '#bff3ea' }}>On the day · Live</div>
                        <div style={{ fontSize: 20, fontWeight: 700, margin: '4px 0 6px' }}>Follow your ring live</div>
                        <div style={{ fontSize: 15, lineHeight: 1.4 }}>See bout order and results as they happen.</div>
                        <a
                            href="https://ringflow.cruxstudios.dev"
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                height: 50,
                                marginTop: 14,
                                borderRadius: 12,
                                background: '#fff',
                                color: '#0e2238',
                                fontWeight: 700,
                                textDecoration: 'none',
                            }}
                        >
                            Open live progress
                        </a>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 14 }}>
                            <svg width="84" height="84" style={{ color: '#0e2238', background: '#fff', padding: 5, borderRadius: 6 }}>
                                <use href="#qr" />
                            </svg>
                            <div style={{ fontSize: 13, lineHeight: 1.4 }}>
                                Or scan from another device
                                <div className="m" style={{ fontWeight: 600, marginTop: 4, overflowWrap: 'anywhere' }}>
                                    ringflow.cruxstudios.dev
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer Branding */}
                    <div
                        style={{
                            marginTop: 'auto',
                            paddingTop: 6,
                            display: 'flex',
                            justifyContent: 'space-between',
                            fontSize: 11,
                            letterSpacing: '.1em',
                            fontWeight: 600,
                            color: '#52606d',
                        }}
                    >
                        <span>CRUXSTUDIOS.DEV</span>
                        <span>ZERO BLOAT ENGINEERING</span>
                    </div>
                </div>
            </div>
        </div>
    )

    if (scale !== 1) {
        return (
            <div
                ref={printRef}
                style={{
                    width: 390 * scale,
                    overflow: 'hidden',
                    display: 'inline-block',
                }}
            >
                {passElement}
            </div>
        )
    }

    return passElement
}
