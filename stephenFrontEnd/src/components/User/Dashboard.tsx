import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useData } from '../../contexts/DataContext'
import AdminPageLayout from '../Administrator/AdminPageLayout'
import Avatar from './Avatar'
import '../Administrator/AdminMenu.css'

export default function Dashboard() {
    const { pb } = useData()
    const navigate = useNavigate()
    const model = pb.authStore.model

    if (!pb.authStore.isValid) {
        navigate('/logout')
        return null
    }

    const [showBar, setShowBar] = useState(() => localStorage.getItem('showGridSize') !== 'false');

    const toggleBar = () => {
        const next = !showBar;
        setShowBar(next);
        window.dispatchEvent(new CustomEvent('toggleGridSize', { detail: next }));
    };

    const hasSettings =
        model?.settings != null &&
        Object.keys(model.settings).length > 0

    return (
        <AdminPageLayout title={model?.name || 'Dashboard'} eyebrow={model?.role || ''}>

            {/* ── Profile Strip ─────────────────────────────────── */}
            <div className="th-profile-panel">
                <div className="th-avatar-wrap">
                    <Avatar />
                </div>

                <div className="th-profile-info">
                    <div className="th-profile-name">
                        {model?.name || 'User'}
                    </div>
                    <div className="th-profile-email">
                        {model?.email}
                    </div>

                    <div className="th-profile-meta">
                        {model?.role && (
                            <span className="th-role-badge">{model.role}</span>
                        )}
                    </div>

                    {hasSettings && (
                        <div className="th-settings-row">
                            {Object.keys(model.settings).map((key, i) => (
                                <div key={i}>
                                    <span className="th-settings-key">{key}:</span>
                                    {model.settings[key]}
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="th-profile-actions">
                        <Link to="/update-profile" className="th-btn-primary">
                            Edit Profile
                        </Link>
                        <button
                            className="th-btn-ghost"
                            onClick={() => navigate('/logout')}
                        >
                            Sign Out
                        </button>
                    </div>

                    <div className="th-settings-row" style={{ marginTop: '0.75rem' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                            <input type="checkbox" checked={showBar} onChange={toggleBar} />
                            Show version/size bar
                        </label>
                    </div>
                </div>
            </div>

        </AdminPageLayout>
    )
}
