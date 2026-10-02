import React from 'react'

// ============================================================================
// EntryDesk — Official Karate Athlete ID Card & A4 Pass System
// Pixel-to-pixel exact implementation of Karate Athlete ID Card.html
// Top: Mobile Phone Pass (390px)
// Below: A4 Print Pass (794px × 1123px)
// ============================================================================

export interface IdCardData {
    id: string
    status?: string
    chest_no: number | null
    registration_no?: string | null
    created_at?: string | null
    participation_type: string | null
    category_name: string | null
    category_snapshot?: any
    declared_weight_kg?: number | null
    student: {
        name: string
        gender: string
        rank: string | null
        photo_url: string | null
        dob?: string | null
        weight?: number | null
        phone?: string | null
        school_or_city?: string | null
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
    emergency_contact?: {
        name?: string | null
        phone?: string | null
    } | null
    registration?: {
        email?: string | null
        phone?: string | null
    } | null
    qr: {
        token?: string
        verify_url: string
        data_url: string
    }
}

// ─── Formatters & Helpers ────────────────────────────────────────────────────

export function formatEventDates(startDate?: string | null, endDate?: string | null): string {
    if (!startDate) return '[DD] – [DD] [Month] 2026'
    try {
        const s = new Date(startDate)
        const e = endDate ? new Date(endDate) : s
        const sDay = s.getDate()
        const eDay = e.getDate()
        const sMonth = s.toLocaleDateString('en-IN', { month: 'short' })
        const eMonth = e.toLocaleDateString('en-IN', { month: 'short' })
        const year = s.getFullYear()

        if (s.toDateString() === e.toDateString()) {
            return `${sDay} ${sMonth} ${year}`
        }
        if (sMonth === eMonth && s.getFullYear() === e.getFullYear()) {
            return `${sDay} – ${eDay} ${sMonth} ${year}`
        }
        return `${sDay} ${sMonth} – ${eDay} ${eMonth} ${year}`
    } catch {
        return '[DD] – [DD] [Month] 2026'
    }
}

export function formatDob(dob?: string | null): string {
    if (!dob) return '[DD/MM/YYYY]'
    try {
        const d = new Date(dob)
        if (isNaN(d.getTime())) return dob
        const day = String(d.getDate()).padStart(2, '0')
        const month = String(d.getMonth() + 1).padStart(2, '0')
        const year = d.getFullYear()
        return `${day}/${month}/${year}`
    } catch {
        return dob
    }
}

export function formatRegistrationDateTime(dateStr?: string | null): { date: string; time: string } {
    if (!dateStr) {
        return { date: '[DD Mon YYYY]', time: '[HH:MM]' }
    }
    try {
        const d = new Date(dateStr)
        if (isNaN(d.getTime())) return { date: '[DD Mon YYYY]', time: '[HH:MM]' }
        const date = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
        const time = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })
        return { date, time }
    } catch {
        return { date: '[DD Mon YYYY]', time: '[HH:MM]' }
    }
}

export function getAgeCategory(data: IdCardData): string {
    if (data.category_name) {
        const cat = data.category_name.toLowerCase()
        if (cat.includes('cadet')) return 'Cadet'
        if (cat.includes('junior')) return 'Junior'
        if (cat.includes('senior')) return 'Senior'
        if (cat.includes('sub-junior') || cat.includes('sub junior')) return 'Sub-Junior'
        if (cat.includes('u-') || cat.includes('u21')) return 'U-21'
        return data.category_name.split(' ')[0] || 'Cadet'
    }
    if (data.student.dob) {
        const birth = new Date(data.student.dob)
        const ageDiffMs = Date.now() - birth.getTime()
        const age = Math.floor(ageDiffMs / (365.25 * 24 * 60 * 60 * 1000))
        if (age < 14) return 'Sub-Junior'
        if (age <= 15) return 'Cadet'
        if (age <= 17) return 'Junior'
        if (age <= 20) return 'U-21'
        return 'Senior'
    }
    return '[Cadet]'
}

export function getCategorySubtitle(data: IdCardData, forA4 = false): string {
    const ageCat = getAgeCategory(data)
    const gender = data.student.gender
        ? data.student.gender.toLowerCase() === 'female'
            ? 'Girls'
            : 'Boys'
        : 'Boys'
    
    const weightVal = data.declared_weight_kg || data.student.weight
    const weight = weightVal ? `U-${Math.ceil(Number(weightVal))} kg` : 'U-47 kg'
    
    let belt = data.student.rank || 'Brown'
    if (forA4) {
        belt = belt.toLowerCase().includes('belt') ? belt : `${belt} belt`
    }
    
    return `${ageCat} · ${gender} · ${weight} · ${belt}`
}

// ─── Reusable QR Definition ──────────────────────────────────────────────────

export function QrSymbolDef() {
    return (
        <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
            <symbol id="qr" viewBox="0 0 21 21">
                <rect x=".5" y=".5" width="6" height="6" fill="none" stroke="currentColor" />
                <rect x="2" y="2" width="3" height="3" fill="currentColor" />
                <rect x="14.5" y=".5" width="6" height="6" fill="none" stroke="currentColor" />
                <rect x="16" y="2" width="3" height="3" fill="currentColor" />
                <rect x=".5" y="14.5" width="6" height="6" fill="none" stroke="currentColor" />
                <rect x="2" y="16" width="3" height="3" fill="currentColor" />
                <path
                    fill="currentColor"
                    d="M8 1h2v1H8zM11 2h1v2h-1zM8 4h1v2H8zM10 5h2v1h-2zM0 8h2v1H0zM3 9h1v2H3zM5 8h2v1H5zM8 8h1v1H8zM10 9h2v1h-2zM13 8h2v2h-2zM16 9h1v1h-1zM18 8h3v1h-3zM2 11h2v1H2zM6 10h1v2H6zM9 11h1v3H9zM12 11h1v1h-1zM15 12h2v1h-2zM18 11h1v2h-1zM8 15h2v1H8zM11 14h1v2h-1zM14 15h2v2h-2zM17 14h1v1h-1zM19 16h2v1h-2zM8 18h1v2H8zM10 19h2v1h-2zM13 18h1v3h-1zM16 19h2v1h-2zM19 18h2v1h-2z"
                />
            </symbol>
        </svg>
    )
}

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

// Backward compatibility alias for any existing imports
export const IdCardPreview = IdCardPhonePass
