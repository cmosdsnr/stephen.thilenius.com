import React, { useEffect } from "react";
import "./message.css"
import { useData } from '../../contexts/DataContext'

export default function Message({ msgItem }) {
    const { deleteMessage, pb } = useData()

    return (
        <div className="message" style={{ paddingBottom: "20px" }}>
            <b>{msgItem.created}</b> from {msgItem.expand.userId.name?.length > 1 ? <>{msgItem.expand.userId.name}</> : "unknown"} {
                msgItem.userId === pb.authStore.model?.id ?
                    <span className="deleteBtn"
                        onClick={() => deleteMessage(msgItem)}
                    >❌</span> : <></>}<br />
            {msgItem.message}
        </div>
    );
}
