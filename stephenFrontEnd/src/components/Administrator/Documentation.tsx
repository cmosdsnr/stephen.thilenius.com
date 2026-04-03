/**
 * @fileoverview Documentation viewer component for displaying generated API documentation.
 * Provides an embedded iframe interface for viewing TypeDoc or similar documentation
 * generated from the codebase. Supports dynamic documentation selection via URL parameters.
 */

import React, { useState } from 'react'
import { useParams } from 'react-router-dom'

/**
 * Documentation viewer component that displays generated API documentation in an iframe.
 * Dynamically loads documentation based on the URL selector parameter and environment configuration.
 * 
 * @component
 * @returns {JSX.Element} An iframe containing the requested documentation
 * 
 * @example
 * ```tsx
 * // Usage in routing - displays documentation for 'api' module
 * <Route path="/admin/docs/:selector" component={Documentation} />
 * // URL: /admin/docs/api -> loads docs/api/index.html
 * 
 * // Direct component usage
 * <Documentation />
 * // Requires selector parameter in URL context
 * ```
 * 
 * @description
 * This component serves as a documentation viewer that:
 * - Extracts the documentation selector from URL parameters
 * - Constructs the documentation URL using environment configuration
 * - Displays the documentation in a full-height iframe
 * - Supports different documentation modules based on the selector
 * 
 * @remarks
 * - Uses VITE_GALLERY_BASE environment variable for base URL configuration
 * - Fallback to empty string for local development when env var is not set
 * - Iframe is styled to take full viewport height (100vh) for optimal viewing
 * - Border is removed for seamless integration with the parent application
 * - Documentation files are expected to be in `/docs/{selector}/index.html` format
 * 
 * @since 1.0.0
 */
const Documentation = (): JSX.Element => {

    /** Documentation module selector extracted from URL parameters */
    const { selector } = useParams<{ selector: string }>()

    /** Base URL for gallery and documentation links, with fallback for local development */
    const BASE = (import.meta).env?.VITE_GALLERY_BASE || '';

    return (
        <>
            {/* <h1>docs</h1> */}
            <iframe style={{ border: 'none', width: '100%', height: '100vh' }} src={`${BASE}/docs/${selector}/index.html`}></iframe>
        </>
    )
}

export default Documentation;