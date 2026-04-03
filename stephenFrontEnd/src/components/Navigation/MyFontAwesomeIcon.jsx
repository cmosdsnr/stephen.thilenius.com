import React from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useWindow } from "../../hooks/useWindow"

export const MyFontAwesomeIcon = (props) => {
    const width = useWindow();
    const showIcons = width > 950 || width < 768;
    const { icon, inverse } = props;
    return (
        <>{showIcons && <FontAwesomeIcon icon={icon} inverse={inverse} />}</>
    )
}
