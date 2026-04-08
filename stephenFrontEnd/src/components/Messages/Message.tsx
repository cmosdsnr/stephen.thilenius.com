import React, { useCallback } from "react";
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

const Message = React.memo(function Message({ msgItem }: Props) {
    const { deleteMessage, pb } = useData()
    const handleDelete = useCallback(() => deleteMessage(msgItem), [deleteMessage, msgItem])

    return (
        <div className="pb-5">
            <b>{msgItem.created}</b> from {msgItem.expand.userId.name?.length > 1 ? <>{msgItem.expand.userId.name}</> : "unknown"} {
                msgItem.userId === pb.authStore.model?.id ?
                    <span className="hover:bg-yellow-300 hover:cursor-pointer"
                        onClick={handleDelete}
                    >❌</span> : <></>}<br />
            {msgItem.message}
        </div>
    );
})

export default Message;
