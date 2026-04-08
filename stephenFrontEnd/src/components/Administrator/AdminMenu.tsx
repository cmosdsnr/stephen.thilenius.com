/**
 * @fileoverview Admin navigation menu component for the administrator dashboard.
 * Provides role-based navigation to various system management interfaces including
 * solar monitoring, power metering, ESP32 device management, sprinkler control,
 * weather stations, loan management, and futures trading.
 */

import React from 'react'
import { Row, Col } from 'react-bootstrap'
import styles from '../User/Dashboard.module.css'
import solarEdge from "../../images/solarEdge.jpeg"
import meter from "../../images/meter.jpeg"
import esp32 from "../../images/esp32.jpeg"
import loan from "../../images/loan.jpeg"
import sprinkler from "../../images/sprinklers.jpeg"
import davis from "../../images/davis.jpg"
import ultimeter from "../../images/ultimeter.jpg"
import dashboard from "../../images/dashboard.png"
import futures from "../../images/futures.jpg"
import download from "../../images/download.png"
import { useData } from '../../contexts/DataContext'

/** CSS Grid layout for 4 columns (25% each) */
const single = { gridTemplateColumns: "repeat(auto-fill, minmax(100%, 1fr))" }

/** CSS Grid layout for 4 columns (25% each) */
const halves = { gridTemplateColumns: "repeat(auto-fill, minmax(50%, 1fr))" }

/** CSS Grid layout for 4 columns (25% each) */
const quarters = { gridTemplateColumns: "repeat(auto-fill, minmax(25%, 1fr))" }

/** CSS Grid layout for 5 columns (20% each) */
const fifths = { gridTemplateColumns: "repeat(auto-fill, minmax(20%, 1fr))" }

/** CSS Grid layout for 6 columns (~16.67% each) */
const sixths = { gridTemplateColumns: "repeat(auto-fill, minmax(16.67%, 1fr))" }

/** CSS Grid layout for 7 columns (~14.3% each) */
const sevenths = { gridTemplateColumns: "repeat(auto-fill, minmax(14.3%, 1fr))" }

/** CSS Grid layout for 8 columns (12.5% each) */
const eighths = { gridTemplateColumns: "repeat(auto-fill, minmax(12.5%, 1fr))" }

/** CSS Grid layout for 9 columns (11.11% each) */
const ninths = { gridTemplateColumns: "repeat(auto-fill, minmax(11.11%, 1fr))" }

interface AdminMenuProps {
    span: number;
    offset: number;
}

/**
 * Admin navigation menu component that renders role-based navigation links.
 * Displays different menu items based on user role and current page location.
 * Uses a responsive grid layout that adjusts column count based on user permissions.
 *
 * @component
 * @param {Object} props - Component props
 * @param {number} props.span - Bootstrap column size for extra small screens
 * @param {number} props.offset - Bootstrap column offset for extra small screens
 *
 * @returns {JSX.Element} A responsive navigation menu with role-based visibility
 *
 * @example
 * ```jsx
 * // Basic usage with responsive column sizing
 * <AdminMenu xs={12} />
 *
 * // Menu automatically shows different items based on user role:
 * // - Members: 6 columns (dashboard, solar, power meter, ESP32, sprinkler, weather)
 * // - Borrower/Administrator: 8 columns (adds loan management and futures)
 * ```
 *
 * @description
 * Navigation items displayed:
 * - Dashboard: Main system overview
 * - Solar Edge: Solar power monitoring and analytics
 * - Power Meter: Electrical consumption monitoring
 * - ESP32: IoT device management and status
 * - Sprinkler: Irrigation system control
 * - Davis: Davis weather station data
 * - Ultimeter: Ultimeter wind monitoring
 * - Sophie's Loan: Loan management (Borrower/Administrator only)
 * - Futures: Trading interface (Administrator only)
 *
 * @remarks
 * - Menu items are conditionally rendered based on current route to avoid showing current page
 * - Grid layout automatically adjusts: 6 columns for Members, 8 columns for elevated roles
 * - Uses PocketBase authentication context to determine user role and permissions
 * - All navigation uses standard anchor tags for full page navigation
 */
export const AdminMenu = ({ span, offset }: AdminMenuProps) => {

    /** Current page path from browser location */
    const path = window.location.pathname;

    /** PocketBase instance with authentication data from DataContext */
    const { pb } = useData();

    /**
     * Effect hook for debugging user role information.
     * Currently commented out but available for development debugging.
     */
    React.useEffect(() => {
        // pb.authStore.model && pb.authStore.model.role && console.log("role: ", pb.authStore.model.role)
    })

    return (
        <Row>
            <Col xs={{ span: span, offset: offset }}>
                <div className={styles.imageContainer} style={((pb.authStore.model && pb.authStore.model.role && pb.authStore.model.role != "Member") ? ninths : single)} >
                    {path != "/dashboard" && <center><a href="/dashboard"><img src={dashboard} alt="Dashboard" /></a></center>}
                    {path != "/user/fileShare" && <center><a href="/user/fileShare"><img src={download} alt="File Share" /></a></center>}
                    {path != "/admin/solar" && ["Administrator"].includes(pb.authStore.model?.role) && <center><a href="/admin/solar"><img src={solarEdge} alt="Solar Edge" /></a></center>}
                    {path != "/admin/powermeter" && ["Administrator"].includes(pb.authStore.model?.role) && <center><a href="/admin/powermeter"><img src={meter} alt="Power Meter" /></a></center>}
                    {path != "/admin/espTable" && ["Administrator"].includes(pb.authStore.model?.role) && <center><a href="/admin/espTable"><img src={esp32} alt="ESP32" /></a></center>}
                    {path != "/admin/sprinkler" && ["Administrator"].includes(pb.authStore.model?.role) && <center><a href="/admin/sprinkler"><img src={sprinkler} alt="sprinkler" /></a></center>}
                    {path != "/admin/davis" && ["Administrator"].includes(pb.authStore.model?.role) && <center><a href="/admin/davis"><img src={davis} alt="davis" /></a></center>}
                    {path != "/admin/ultimeter" && ["Administrator"].includes(pb.authStore.model?.role) && <center><a href="/admin/ultimeter"><img src={ultimeter} alt="ultimeter" /></a></center>}
                    {path != "/admin/sophiesLoan" && ["Borrower", "Administrator"].includes(pb.authStore.model?.role) && <center><a href="/admin/sophiesLoan"><img src={loan} alt="Sophie's Loan" /></a></center>}
                    {path != "/admin/futures" && ["Administrator"].includes(pb.authStore.model?.role) && <center><a href="/admin/futures"><img src={futures} alt="Futures" /></a></center>}
                </div>
            </Col>
        </Row>
    )
}
