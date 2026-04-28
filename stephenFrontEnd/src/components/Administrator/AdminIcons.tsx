import React from 'react'

interface IconProps {
    size?: number
}

// ─── All icons share a 48×48 viewBox, 1.8px stroke, line-art style ──────────

export const IconDashboard = ({ size = 48 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="5"  y="5"  width="16" height="16" rx="2.5" />
        <rect x="27" y="5"  width="16" height="16" rx="2.5" />
        <rect x="5"  y="27" width="16" height="16" rx="2.5" />
        <rect x="27" y="27" width="16" height="16" rx="2.5" />
    </svg>
)

export const IconFileShare = ({ size = 48 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 40V18a2 2 0 012-2h8l4 4h16a2 2 0 012 2v18a2 2 0 01-2 2H10a2 2 0 01-2-2z" />
        <path d="M24 23v11M20 27l4-4 4 4" />
    </svg>
)

export const IconSolar = ({ size = 48 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="24" cy="17" r="6" />
        <path d="M24 7v3M24 24v3M13 17h3M32 17h3M16.5 10.5l2 2M29.5 23.5l2 2M16.5 23.5l2-2M29.5 10.5l-2 2" />
        <rect x="12" y="30" width="24" height="8" rx="1.5" />
        <path d="M18 30v8M24 30v8M30 30v8M12 38h24" />
    </svg>
)

export const IconPowerMeter = ({ size = 48 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 35a16 16 0 1130 0" />
        <line x1="24" y1="35" x2="18" y2="20" strokeWidth="2" />
        <circle cx="24" cy="35" r="2" fill="currentColor" stroke="none" />
        <path d="M11 35h3M34 35h3" />
        <path d="M14 23.5l2 1.2M32 24.7l2-1.2M22 14.5l0.8 2.5M26 14.5l-0.8 2.5" strokeWidth="1.4" />
    </svg>
)

export const IconESP32 = ({ size = 48 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="13" y="13" width="22" height="22" rx="3" />
        <path d="M13 20H7M13 28H7M35 20h6M35 28h6M20 13V7M28 13V7M20 35v6M28 35v6" />
        <rect x="19" y="19" width="10" height="10" rx="1.5" strokeWidth="1.3" />
        <path d="M30 10a6 6 0 000-4M33 11.5a9 9 0 000-7" strokeWidth="1.3" />
    </svg>
)

export const IconSprinkler = ({ size = 48 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 28h10l-2 6H21z" />
        <path d="M24 34v6" />
        <path d="M12 22c0-6.6 5.4-12 12-12s12 5.4 12 12" />
        <path d="M8 28c0-8.8 7.2-16 16-16s16 7.2 16 16" strokeOpacity="0.45" />
        <circle cx="14" cy="18" r="1.2" fill="currentColor" stroke="none" />
        <circle cx="34" cy="18" r="1.2" fill="currentColor" stroke="none" />
        <circle cx="10" cy="25" r="1.2" fill="currentColor" stroke="none" />
        <circle cx="38" cy="25" r="1.2" fill="currentColor" stroke="none" />
    </svg>
)

export const IconDavis = ({ size = 48 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="24" cy="24" r="3.5" />
        <line x1="24" y1="20.5" x2="24" y2="12" />
        <line x1="27.1" y1="26.2" x2="34.3" y2="31.4" />
        <line x1="20.9" y1="26.2" x2="13.7" y2="31.4" />
        <path d="M20 12 a4 4 0 008 0" />
        <path d="M37.5 28.5 a4 4 0 00-4 6.9" />
        <path d="M10.5 28.5 a4 4 0 014 6.9" />
        <line x1="24" y1="27.5" x2="24" y2="40" />
        <line x1="20" y1="40" x2="28" y2="40" />
    </svg>
)

export const IconUltimeter = ({ size = 48 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="24" cy="27" r="16" />
        <path d="M10 27h3M35 27h3M13.8 17.5l2.1 1.2M32.1 17.5l-2.1 1.2M24 13v3" strokeWidth="1.4" />
        <line x1="24" y1="27" x2="17" y2="16" strokeWidth="2" />
        <circle cx="24" cy="27" r="2.2" fill="currentColor" stroke="none" />
        <path d="M28 8a3 3 0 00-8 0v10a5 5 0 108 0V8z" strokeWidth="1.3" strokeOpacity="0.5" />
    </svg>
)

export const IconLoan = ({ size = 48 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="24" cy="24" r="16" />
        <path d="M24 13v22" />
        <path d="M18.5 18.5c0-3 2.5-5 5.5-5s5.5 2.2 5.5 5-2.5 4-5.5 5-5.5 2.5-5.5 5.5 2.5 5 5.5 5 5.5-2.2 5.5-5" />
    </svg>
)

export const IconFutures = ({ size = 48 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 40h34M7 40V8" strokeOpacity="0.4" />
        <line x1="13" y1="13" x2="13" y2="16" />
        <rect x="10" y="16" width="6" height="12" rx="0.5" />
        <line x1="13" y1="28" x2="13" y2="34" />
        <line x1="24" y1="11" x2="24" y2="15" />
        <rect x="21" y="15" width="6" height="16" rx="0.5" />
        <line x1="24" y1="31" x2="24" y2="36" />
        <line x1="35" y1="18" x2="35" y2="21" />
        <rect x="32" y="21" width="6" height="9" rx="0.5" />
        <line x1="35" y1="30" x2="35" y2="34" />
        <path d="M9 33l8-8 8 4 8-10" strokeWidth="1.3" strokeOpacity="0.6" />
    </svg>
)
