import React, { useEffect } from 'react'
import PostMessage from './PostMessage'
import MessagesDisplay from './MessagesDisplay'
import styles from "./message.module.css"
import { useData } from '../../contexts/DataContext'


export default function MessageBoard() {
    const { loadMessages } = useData();
    useEffect(() => {
        loadMessages();

        return () => { }
    }, [])


    return (
        <div className={styles.board}>
            <h1 className={styles.boardTitle}>Feel free to post for all to see!</h1>
            <PostMessage />
            <MessagesDisplay />
        </div>
    );
}
