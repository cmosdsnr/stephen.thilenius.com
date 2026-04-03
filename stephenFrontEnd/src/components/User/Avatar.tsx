import React, { useEffect, useState } from "react";

import { useData } from '../../contexts/DataContext'
import "./Avatar.css";
import user from "../../images/user.png"

/*
This was developed from the example in https://medium.com/@dprincecoder/creating-a-drag-and-drop-file-upload-component-in-react-a-step-by-step-guide-4d93b6cc21e0
*/

const Avatar = () => {

    const { pb, changeAvatar } = useData();
    const name = pb.authStore.model?.name;
    const avatar = pb.authStore.model?.avatar;


    const handleFileChange = async (e: any) => {
        sendAvatar(e.target.files[0]);
    }

    const handleDrop = (e: any) => {
        e.preventDefault();
        sendAvatar(e.dataTransfer.files[0]);
    }

    const sendAvatar = async (file: File) => {
        console.log("file:", file);
        if (file.type.includes("image")) {
            const data = new FormData();
            data.append("avatar", file); // selected File must be File or Blob instance
            changeAvatar(data);
        } else console.log("Not an image file");
    }

    return (
        <div
            className={`document-uploader upload-box`}
            onDrop={handleDrop}
            onDragOver={(event) => event.preventDefault()}
        >

            <input
                type="file"
                hidden
                id="browse"
                onChange={handleFileChange}
                accept=".jpg, .jpeg, .gif, .png"
            // multiple
            />
            <label
                htmlFor="browse" className="browse-btn">
                {pb.authStore.model && pb.authStore.model?.avatar != "" ?
                    <img style={{ display: "block", marginLeft: "auto", height: "90px" }} src={pb.files.getUrl(pb.authStore.model, avatar, { 'thumb': '100x250' })} alt={name} />
                    :
                    <img style={{ display: "block", marginLeft: "auto", height: "90px" }} src={user} alt="default" />
                }
            </label>
        </div>
    );
};

export default Avatar;