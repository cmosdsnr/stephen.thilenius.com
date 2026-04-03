import React, { useEffect, useState } from 'react'
import Emmy from './Emmy'

export default function Transcription(props: any) {
    const { who } = props
    const [text, setText] = useState("")

    useEffect(() => {
        if (who === "Emmy")
            setText(Emmy)
    }, [])


    return (
        <div>{text}</div>
    )
}
