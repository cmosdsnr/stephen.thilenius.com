import React, { useState } from "react"
import { useData } from '../../contexts/DataContext'

export default function PostMessage() {
    const [msg, setMsg] = useState("");
    const { saveMessage } = useData()

    //Dynamically Update States for the form
    function updateFormEdits(event) {
        setMsg(event.target.value);
    }

    //Submit a new post
    function postFormUpdate(e) {
        e.preventDefault();
        saveMessage({ message: msg })
    }

    return (
        <div
            className="postMsgC"
            style={{
                background: "#ccc",
                width: "30%",
                float: "left",
                padding: "20px"
            }}
        >
            <form onSubmit={postFormUpdate}>
                <h2>Post A Message</h2>

                <textarea
                    name="msg"
                    value={msg}
                    onChange={updateFormEdits}
                    placeholder="Enter message"
                    style={{ width: "98%", height: "80px" }}
                />
                <br />
                <br />
                <input
                    type="submit"
                    value="Post Message"
                    style={{ width: "100px", height: "30px" }}
                />
            </form>
        </div>
    );
}
