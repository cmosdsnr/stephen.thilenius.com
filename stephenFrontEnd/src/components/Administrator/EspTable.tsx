/**
 * @fileoverview ESP32 device management table component.
 * Displays a real-time table of discovered ESP32 devices on the network with
 * their IP addresses, last seen timestamps, and direct access links.
 * Provides network scanning and device monitoring capabilities.
 */

import React, { useEffect, useState } from 'react'
import { useWss } from '../../contexts/WssContext'
import AdminPageLayout from './AdminPageLayout'
import { API } from '../../api';

/**
 * ESP32 device management component that displays a real-time table of network devices.
 * Provides monitoring and direct access to ESP32 devices on the local network.
 *
 * @component
 * @returns {JSX.Element} A table interface for ESP32 device management
 */
export default function EspTable(): JSX.Element {

    const { ESPlist, subscribe, unsubscribe } = useWss();
    const [otherDevices, setOtherDevices] = useState<{ [name: string]: string }>({});

    useEffect(() => {
        subscribe("ESPlist");
        return () => { unsubscribe("ESPlist"); }
    }, [])

    useEffect(() => {
        fetch(API.mDNSOther())
            .then(r => r.json())
            .then(setOtherDevices)
            .catch(() => {});
    }, []);

    const handleRefresh = (): void => {
        fetch(API.ESPupdate())
            .then(response => response.text())
            .then(data => console.log('Rescan response:', data))
            .catch(error => console.error('Rescan failed:', error));
        fetch(API.mDNSOther())
            .then(r => r.json())
            .then(setOtherDevices)
            .catch(() => {});
    }

    const devices = Object.entries(ESPlist);

    return (
        <AdminPageLayout title="ESP32 Devices" subtitle={
            <p style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: '0.75rem', color: '#6a9ac4', marginTop: '0.5rem' }}>
                {devices.length} device{devices.length !== 1 ? 's' : ''} &mdash; links only available on local network
            </p>
        }>
            <div style={{ maxWidth: 760, margin: '0 auto' }}>

                {/* Device table card */}
                <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, boxShadow: '0 2px 12px rgba(0,24,48,0.07)', marginBottom: '1.5rem', overflow: 'hidden' }}>

                    <div style={{ background: '#001830', borderBottom: '2px solid #f59e0b', padding: '0.75rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: '0.8rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#f59e0b' }}>
                            Network Devices
                        </span>
                        <button
                            onClick={handleRefresh}
                            style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: '0.78rem', letterSpacing: '0.12em', textTransform: 'uppercase', background: 'transparent', color: '#f59e0b', border: '1.5px solid #f59e0b', borderRadius: 4, padding: '0.3rem 1rem', cursor: 'pointer' }}
                        >
                            Rescan
                        </button>
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'Share Tech Mono, monospace', fontSize: '0.82rem' }}>
                            <thead>
                                <tr>
                                    {['ESP', 'IP Address', 'Last Seen', 'Source'].map(h => (
                                        <th key={h} style={{ background: '#001830', color: '#6a9ac4', fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: '0.72rem', letterSpacing: '0.14em', textTransform: 'uppercase', padding: '0.5rem 1rem', textAlign: 'left', borderBottom: '1px solid #1c3050' }}>
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {devices.map(([deviceName, device], i) => (
                                    <tr
                                        key={deviceName}
                                        onClick={() => window.location.assign(`http://${device.ip}`)}
                                        style={{ background: i % 2 ? 'rgba(0,24,48,0.03)' : 'white', cursor: 'pointer' }}
                                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(245,158,11,0.08)')}
                                        onMouseLeave={e => (e.currentTarget.style.background = i % 2 ? 'rgba(0,24,48,0.03)' : 'white')}
                                    >
                                        <td style={{ padding: '0.6rem 1rem', borderBottom: '1px solid #f1f5f9', color: '#001830', fontWeight: 600 }}>
                                            {deviceName}
                                        </td>
                                        <td style={{ padding: '0.6rem 1rem', borderBottom: '1px solid #f1f5f9' }}>
                                            <a href={`http://${device.ip}`} style={{ color: '#6a9ac4', textDecoration: 'none' }} onClick={e => e.stopPropagation()}>
                                                {device.ip}
                                            </a>
                                        </td>
                                        <td style={{ padding: '0.6rem 1rem', borderBottom: '1px solid #f1f5f9', color: '#6a9ac4' }}>
                                            {deviceName !== 'Backend Server' ? device.elapsed : ''}
                                        </td>
                                        <td style={{ padding: '0.6rem 1rem', borderBottom: '1px solid #f1f5f9', color: '#6a9ac4' }}>
                                            {device.source ?? ''}
                                        </td>
                                    </tr>
                                ))}
                                {devices.length === 0 && (
                                    <tr>
                                        <td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: '#6a9ac4', fontFamily: 'Rajdhani, sans-serif', fontSize: '0.9rem', letterSpacing: '0.08em' }}>
                                            No devices found
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Other mDNS devices */}
                {Object.keys(otherDevices).length > 0 && (
                    <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, boxShadow: '0 2px 12px rgba(0,24,48,0.07)', overflow: 'hidden' }}>
                        <div style={{ background: '#001830', borderBottom: '2px solid #f59e0b', padding: '0.75rem 1.25rem' }}>
                            <span style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: '0.8rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#f59e0b' }}>
                                Other mDNS Devices
                            </span>
                        </div>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'Share Tech Mono, monospace', fontSize: '0.82rem' }}>
                                <thead>
                                    <tr>
                                        {['Name', 'IP Address'].map(h => (
                                            <th key={h} style={{ background: '#001830', color: '#6a9ac4', fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: '0.72rem', letterSpacing: '0.14em', textTransform: 'uppercase', padding: '0.5rem 1rem', textAlign: 'left', borderBottom: '1px solid #1c3050' }}>
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {Object.entries(otherDevices).map(([name, ip], i) => (
                                        <tr key={name} style={{ background: i % 2 ? 'rgba(0,24,48,0.03)' : 'white' }}>
                                            <td style={{ padding: '0.6rem 1rem', borderBottom: '1px solid #f1f5f9', color: '#001830', fontWeight: 600 }}>{name}</td>
                                            <td style={{ padding: '0.6rem 1rem', borderBottom: '1px solid #f1f5f9' }}>
                                                <a href={`http://${ip}`} style={{ color: '#6a9ac4', textDecoration: 'none' }}>{ip}</a>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

            </div>
        </AdminPageLayout>
    )
}
