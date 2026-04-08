import React from 'react'
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

interface AdminMenuProps {
    span: number;
    offset: number;
}

export const AdminMenu = ({ span, offset }: AdminMenuProps) => {
    const path = window.location.pathname;
    const { pb } = useData();
    const role = pb.authStore.model?.role
    const isAdmin = role === 'Administrator'
    const isBorrower = role === 'Borrower' || role === 'Administrator'

    return (
        <div className="flex flex-wrap">
            {path !== '/dashboard' &&
                <a href="/dashboard"><img src={dashboard} alt="Dashboard" loading="lazy" className="w-[120px] h-[120px] object-contain p-[5px]" /></a>}
            {path !== '/user/fileShare' &&
                <a href="/user/fileShare"><img src={download} alt="File Share" loading="lazy" className="w-[120px] h-[120px] object-contain p-[5px]" /></a>}
            {path !== '/admin/solar' && isAdmin &&
                <a href="/admin/solar"><img src={solarEdge} alt="Solar Edge" loading="lazy" className="w-[120px] h-[120px] object-contain p-[5px]" /></a>}
            {path !== '/admin/powermeter' && isAdmin &&
                <a href="/admin/powermeter"><img src={meter} alt="Power Meter" loading="lazy" className="w-[120px] h-[120px] object-contain p-[5px]" /></a>}
            {path !== '/admin/espTable' && isAdmin &&
                <a href="/admin/espTable"><img src={esp32} alt="ESP32" loading="lazy" className="w-[120px] h-[120px] object-contain p-[5px]" /></a>}
            {path !== '/admin/sprinkler' && isAdmin &&
                <a href="/admin/sprinkler"><img src={sprinkler} alt="Sprinkler" loading="lazy" className="w-[120px] h-[120px] object-contain p-[5px]" /></a>}
            {path !== '/admin/davis' && isAdmin &&
                <a href="/admin/davis"><img src={davis} alt="Davis" loading="lazy" className="w-[120px] h-[120px] object-contain p-[5px]" /></a>}
            {path !== '/admin/ultimeter' && isAdmin &&
                <a href="/admin/ultimeter"><img src={ultimeter} alt="Ultimeter" loading="lazy" className="w-[120px] h-[120px] object-contain p-[5px]" /></a>}
            {path !== '/admin/sophiesLoan' && isBorrower &&
                <a href="/admin/sophiesLoan"><img src={loan} alt="Sophie's Loan" loading="lazy" className="w-[120px] h-[120px] object-contain p-[5px]" /></a>}
            {path !== '/admin/futures' && isAdmin &&
                <a href="/admin/futures"><img src={futures} alt="Futures" loading="lazy" className="w-[120px] h-[120px] object-contain p-[5px]" /></a>}
        </div>
    )
}
