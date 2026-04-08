import React from 'react'
import { Row, Col } from 'react-bootstrap'

// Inject shimmer keyframes once at module load (client-only, fine for Vite/React)
if (typeof document !== 'undefined') {
    const s = document.createElement('style')
    s.textContent = `@keyframes sk-shimmer { from { background-position: 200% 0 } to { background-position: -200% 0 } }`
    document.head.appendChild(s)
}

const shimmer: React.CSSProperties = {
    background: 'linear-gradient(90deg, #e8e8e8 25%, #f5f5f5 50%, #e8e8e8 75%)',
    backgroundSize: '200% 100%',
    animation: 'sk-shimmer 1.5s infinite',
    borderRadius: 4,
}

export const SkeletonBlock = React.memo(function SkeletonBlock({ width = '100%', height = 20, style: extra }: {
    width?: string | number
    height?: string | number
    style?: React.CSSProperties
}) {
    return <div style={{ width, height, ...shimmer, ...extra }} />
})

/** Aspect-ratio box — defaults to 4:3 landscape (typical thumbnail) */
export const SkeletonImage = React.memo(function SkeletonImage({ aspect = '75%' }: { aspect?: string }) {
    return (
        <div style={{ width: '100%', paddingBottom: aspect, position: 'relative', overflow: 'hidden', borderRadius: 4 }}>
            <div style={{ position: 'absolute', inset: 0, ...shimmer }} />
        </div>
    )
})

/** Grid of skeleton thumbnail cards — for album/gallery loading states */
export const SkeletonGrid = React.memo(function SkeletonGrid({ count = 8 }: { count?: number }) {
    return (
        <Row className="mt-3">
            {Array.from({ length: count }).map((_, i) => (
                <Col key={i} xs={12} sm={6} md={4} lg={3} className="mb-3">
                    <SkeletonImage />
                    <SkeletonBlock height={14} style={{ marginTop: 8, width: '70%' }} />
                </Col>
            ))}
        </Row>
    )
})

/** Chart-shaped placeholder rectangle */
export const SkeletonChart = React.memo(function SkeletonChart({ height = 300 }: { height?: number }) {
    return <SkeletonBlock height={height} style={{ marginBottom: 16 }} />
})

/** Table with N skeleton rows */
export const SkeletonTable = React.memo(function SkeletonTable({ rows = 5, cols = 2 }: { rows?: number; cols?: number }) {
    return (
        <table style={{ width: '100%' }}>
            <tbody>
                {Array.from({ length: rows }).map((_, r) => (
                    <tr key={r}>
                        {Array.from({ length: cols }).map((_, c) => (
                            <td key={c} style={{ padding: '6px 4px' }}>
                                <SkeletonBlock height={14} width={c === cols - 1 ? '60%' : '80%'} />
                            </td>
                        ))}
                    </tr>
                ))}
            </tbody>
        </table>
    )
})
