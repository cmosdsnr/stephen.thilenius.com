/**
 * @fileoverview Davis weather station monitoring component.
 * Provides the main interface for viewing Davis weather station data and metrics.
 * Part of the administrator dashboard for weather monitoring and analysis.
 */

import React from 'react'
import AdminPageLayout from './AdminPageLayout';

const Davis = () => {
    return (
        <AdminPageLayout title="Davis Wind Data">
            <div style={{ maxWidth: 760, margin: '0 auto' }}>
            </div>
        </AdminPageLayout>
    )
}

export default Davis;
