import React from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import { useWindow } from "../../hooks/useWindow"

interface Props {
    icon: IconDefinition
    inverse?: boolean
}

export const MyFontAwesomeIcon = React.memo(function MyFontAwesomeIcon({ icon, inverse }: Props) {
    const width = useWindow();
    const showIcons = width >= 1200 || width < 768;
    return (
        <>{showIcons && <FontAwesomeIcon icon={icon} inverse={inverse} />}</>
    )
})
