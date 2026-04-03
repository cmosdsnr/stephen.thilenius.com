import React, { useEffect } from 'react'


export default function Tree() {

    useEffect(() => {
        window.location.href = "https://webtrees.thilenius.com/webtrees/index.php";
    }, []);

    return (
        <div>One second, redirecting ...</div>
    )
}
