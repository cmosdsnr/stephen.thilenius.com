/**
 * @fileoverview Shared layout wrapper for all Administrator pages.
 * Renders a responsive sidebar (MD+) / top-nav (XS–SM) using AdminMenu,
 * a centred page header, and a full-height content area.
 */

import React from 'react'
import { AdminMenu } from './AdminMenu'

interface AdminPageLayoutProps {
    /** Page title displayed in the centred header (e.g. "SolarEdge") */
    title: string
    /** Small eyebrow text above the title — defaults to "Administrator" */
    eyebrow?: string
    /** Optional content rendered below the accent rule (timestamp, device count, etc.) */
    subtitle?: React.ReactNode
    children: React.ReactNode
}

/**
 * Layout wrapper shared by all Administrator pages.
 *
 * On MD+ a 100 px sidebar holds the nav icons; on XS/SM a horizontal tile bar
 * appears at the top instead.  The page header (Administrator eyebrow, h1 title,
 * amber accent rule, optional subtitle) is rendered automatically so each page
 * only needs to supply its content.
 */
export default function AdminPageLayout({ title, eyebrow = 'Administrator', subtitle, children }: AdminPageLayoutProps) {
    return (
        <div style={{ minHeight: '100vh' }}>

            {/* Top nav — XS/SM only */}
            <div className="d-md-none" style={{ borderBottom: '1px solid #e2e8f0' }}>
                <AdminMenu />
            </div>

            <div style={{ display: 'flex' }}>

                {/* Sidebar — MD+ only */}
                <div className="d-none d-md-block" style={{ width: 100, flexShrink: 0, background: '#faf4dc', borderRight: '1px solid #e2e8f0', minHeight: '100vh', position: 'sticky', top: 0, alignSelf: 'flex-start' }}>
                    <AdminMenu sidebar />
                </div>

                {/* Content */}
                <div style={{ flex: 1, padding: '2rem 1rem 3rem', minWidth: 0 }}>

                    {/* Page header */}
                    <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                        {eyebrow && (
                            <p style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: '0.7rem', letterSpacing: '0.25em', textTransform: 'uppercase', color: '#6a9ac4', marginBottom: '0.25rem' }}>
                                {eyebrow}
                            </p>
                        )}
                        <h1 style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: '2.4rem', letterSpacing: '0.08em', color: '#001830', margin: 0 }}>
                            {title}
                        </h1>
                        <hr style={{ border: 'none', borderTop: '2px solid #f59e0b', width: 60, margin: '0.75rem auto 0' }} />
                        {subtitle}
                    </div>

                    {children}

                </div>
            </div>
        </div>
    )
}
