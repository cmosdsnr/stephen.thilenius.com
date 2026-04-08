/**
 * @fileoverview ESP32 device management table component.
 * Displays a real-time table of discovered ESP32 devices on the network with
 * their IP addresses, last seen timestamps, and direct access links.
 * Provides network scanning and device monitoring capabilities.
 */

import React, { useEffect } from 'react'
import { Button, Row, Col } from 'react-bootstrap'
import { useWss } from '../../contexts/WssContext'
import { AdminMenu } from './AdminMenu'
import { API } from '../../api';

/**
 * ESP32 device management component that displays a real-time table of network devices.
 * Provides monitoring and direct access to ESP32 devices on the local network.
 * 
 * @component
 * @returns {JSX.Element} A table interface for ESP32 device management
 * 
 * @example
 * ```tsx
 * // Usage in routing
 * <Route path="/admin/espTable" component={EspTable} />
 * 
 * // Direct component usage
 * <EspTable />
 * ```
 * 
 * @description
 * This component provides:
 * - Real-time ESP32 device discovery via WebSocket
 * - Clickable table rows for direct device access
 * - Device information including name, IP, and last seen time
 * - Manual network rescan functionality
 * - Links only work on local network for security
 * 
 * @remarks
 * - Subscribes to "ESPlist" WebSocket topic for real-time updates
 * - Device links are only accessible from local network
 * - Displays expected device count (20-23 devices nominal)
 * - Uses AdminMenu for navigation with specific layout props
 * - Automatically unsubscribes from WebSocket on component unmount
 */
export default function EspTable(): JSX.Element {

    /** WebSocket context providing ESP device list and subscription methods */
    const { ESPlist, subscribe, unsubscribe } = useWss();

    /**
     * Effect hook to subscribe to ESP device updates via WebSocket.
     * Automatically unsubscribes when component unmounts to prevent memory leaks.
     */
    useEffect(() => {
        subscribe("ESPlist");
        return () => {
            unsubscribe("ESPlist");
        }
    }, [])

    /**
     * Triggers a network rescan for ESP32 devices.
     * Calls the server API to refresh the device discovery process.
     * 
     * @example
     * ```tsx
     * // Called when Rescan button is clicked
     * handleRefresh();
     * // Initiates network scan and updates ESPlist via WebSocket
     * ```
     */
    const handleRefresh = (): void => {
        fetch(API.ESPupdate())
            .then(response => response.text())
            .then(data => console.log('Rescan response:', data))
            .catch(error => console.error('Rescan failed:', error));
    }

    return (
        <>
            <AdminMenu span={4} offset={8} />
            <Row>
                <h1>Available ESPs</h1>
                <center><p>Links only Available on local network </p></center>
            </Row>
            <Row>
                <Col xs={{ span: 10, offset: 1 }}>
                    <table style={{ marginTop: 20 }}>
                        <thead>
                            <tr>
                                <th>ESP</th>
                                <th>IP Address</th>
                                <th>Last seen (ago)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Object.keys(ESPlist).map((deviceName, index) => {
                                const device = ESPlist[deviceName];
                                return (
                                    <tr
                                        key={index}
                                        onClick={() => window.location.assign(`http://${device.ip}`)}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        <td><a href={`http://${device.ip}`}>{deviceName}</a></td>
                                        <td><a href={`http://${device.ip}`}>{device.ip}</a></td>
                                        <td>{device.elapsed}</td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </Col>
            </Row>
            <Row>
                <Col xs={{ span: 1, offset: 6 }}>
                    <Button
                        style={{ marginTop: 20 }}
                        onClick={handleRefresh}
                        variant="primary"
                    >
                        Rescan
                    </Button>
                </Col>
            </Row>
        </>
    )
}