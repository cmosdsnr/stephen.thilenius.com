import React, { useEffect } from "react";
import Message from "./Message";
import { useData } from '../../contexts/DataContext'

export default function MessagesDisplay() {
    const { messages, messagesLoaded } = useData()

    function getMessages() {
        if (messagesLoaded) {
            return messages.map(function (msgItem, i) {
                return <Message key={i} msgItem={msgItem} />;
            });
        } else {
            return <h1>Loading...</h1>;
        }
    }

    return (
        <div
            className="msgsC"
            style={{
                background: "#ccc",
                width: "55%",
                float: "right",
                padding: "20px"
            }}
        >
            <h2>Messages</h2>

            {getMessages()}
        </div>
    );
}
