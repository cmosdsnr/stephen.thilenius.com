import React from 'react'
import { useData } from '../../contexts/DataContext'
import {
    IconDashboard, IconFileShare, IconSolar, IconPowerMeter,
    IconESP32, IconSprinkler, IconDavis, IconUltimeter, IconLoan, IconFutures
} from './AdminIcons'
import './AdminMenu.css'

interface AdminMenuProps {
    span?: number;
    offset?: number;
    sidebar?: boolean;
}

interface TileEntry {
    href: string;
    label: string;
    icon: React.ReactNode;
    show: boolean;
    dividerBefore?: boolean;
}

export const AdminMenu = ({ span, offset, sidebar }: AdminMenuProps) => {
    const path = window.location.pathname;
    const { pb } = useData();
    const role = pb.authStore.model?.role
    const isAdmin = role === 'Administrator'
    const isBorrower = role === 'Borrower' || role === 'Administrator'

    const tiles: TileEntry[] = [
        {
            href: '/dashboard',
            label: 'Dashboard',
            icon: <IconDashboard size={46} />,
            show: path !== '/dashboard',
        },
        {
            href: '/user/fileShare',
            label: 'File Share',
            icon: <IconFileShare size={46} />,
            show: path !== '/user/fileShare',
        },
        {
            href: '/admin/solar',
            label: 'Solar Edge',
            dividerBefore: true,
            icon: <IconSolar size={46} />,
            show: path !== '/admin/solar' && isAdmin,
        },
        {
            href: '/admin/powermeter',
            label: 'Power Meter',
            icon: <IconPowerMeter size={46} />,
            show: path !== '/admin/powermeter' && isAdmin,
        },
        {
            href: '/admin/espTable',
            label: 'ESP32',
            icon: <IconESP32 size={46} />,
            show: path !== '/admin/espTable' && isAdmin,
        },
        {
            href: '/admin/sprinkler',
            label: 'Sprinkler',
            icon: <IconSprinkler size={46} />,
            show: path !== '/admin/sprinkler' && isAdmin,
        },
        {
            href: '/admin/davis',
            label: 'Davis',
            icon: <IconDavis size={46} />,
            show: path !== '/admin/davis' && isAdmin,
        },
        {
            href: '/admin/ultimeter',
            label: 'Ultimeter',
            icon: <IconUltimeter size={46} />,
            show: path !== '/admin/ultimeter' && isAdmin,
        },
        {
            href: '/admin/sophiesLoan',
            label: "Sophie's Loan",
            icon: <IconLoan size={46} />,
            show: path !== '/admin/sophiesLoan' && isBorrower,
        },
        {
            href: '/admin/futures',
            label: 'Futures',
            icon: <IconFutures size={46} />,
            show: path !== '/admin/futures' && isAdmin,
        },
    ]

    const visible = tiles.filter(t => t.show)
    if (visible.length === 0) return null

    if (sidebar) {
        return (
            <div className="th-tile-sidebar">
                <div className="th-section-label" style={{ textAlign: 'center', padding: '8px 4px 4px' }}>Navigation</div>
                {visible.map(tile => (
                    <a key={tile.href} href={tile.href} className="th-tile" title={tile.label}>
                        {tile.icon}
                        <span className="th-tile-label">{tile.label}</span>
                    </a>
                ))}
            </div>
        )
    }

    return (
        <>
            <div className="th-section-label">Navigation</div>
            <div className="th-tile-grid">
                {visible.map(tile => (
                    <a key={tile.href} href={tile.href} className="th-tile">
                        {tile.icon}
                        <span className="th-tile-label">{tile.label}</span>
                    </a>
                ))}
            </div>
        </>
    )
}
