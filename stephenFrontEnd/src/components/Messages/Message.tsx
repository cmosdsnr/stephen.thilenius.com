import React, { useEffect } from "react";
import styles from "./message.module.css"
import { useData } from '../../contexts/DataContext'

interface Props {
    msgItem: {
        id: string;
        created: string;
        message: string;
        userId: string;
        expand: {
            userId: {
                name: string;
            };
        };
    };
}

export default function Message({ msgItem }: Props) {
    const { deleteMessage, pb } = useData()

    return (
        <div className={styles.message}>
            <b>{msgItem.created}</b> from {msgItem.expand.userId.name?.length > 1 ? <>{msgItem.expand.userId.name}</> : "unknown"} {
                msgItem.userId === pb.authStore.model?.id ?
                    <span className={styles.deleteBtn}
                        onClick={() => deleteMessage(msgItem)}
                    >❌</span> : <></>}<br />
            {msgItem.message}
        </div>
    );
}
