import React, { useEffect } from 'react'
import PostMessage from './PostMessage'
import MessagesDisplay from './MessagesDisplay'
import "./message.css"
import { useData } from '../../contexts/DataContext'


export default function MessageBoard() {
    const { loadMessages } = useData();
    useEffect(() => {
        loadMessages();

        return () => { }
    }, [])


    return (
        <div className="msgBoardC" style={{ width: "80%", margin: "40px auto" }}>
            <h1 style={{ marginBottom: "40px" }}>Feel free to post for all to see!</h1>
            <PostMessage />
            <MessagesDisplay />
        </div>
    );
}

