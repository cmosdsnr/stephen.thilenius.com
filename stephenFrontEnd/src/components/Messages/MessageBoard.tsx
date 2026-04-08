import React, { useEffect } from 'react'
import PostMessage from './PostMessage'
import MessagesDisplay from './MessagesDisplay'
import { useData } from '../../contexts/DataContext'


export default function MessageBoard() {
    const { loadMessages } = useData();
    useEffect(() => {
        loadMessages();

        return () => { }
    }, [])


    return (
        <div className="w-4/5 my-10 mx-auto">
            <h1 className="mb-10">Feel free to post for all to see!</h1>
            <PostMessage />
            <MessagesDisplay />
        </div>
    );
}
