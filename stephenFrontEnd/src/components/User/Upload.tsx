import React, { ChangeEvent, useState, useRef } from 'react';
import { Row, Col, Button } from 'react-bootstrap'
import { FaUpload } from "react-icons/fa";
import "./Upload.css"
import { API } from '../../api';

const Upload = ({ setAvailable }: any) => {

    const ref = useRef<HTMLInputElement | null>(null)
    const [fileList, setFileList] = useState<File[]>([]);

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        console.log("Uploading files...");
        if (Array.isArray(e.target.files)) setFileList(e.target.files as File[]);
    };

    const handleUploadClick = () => {
        if (!fileList) {
            return;
        }

        // 👇 Create new FormData object and append files
        const formData = new FormData();
        fileList.forEach((file, i) => {
            formData.append("files", fileList[i]);
        });

        // 👇 Uploading the files using the fetch API to the server
        fetch(API.uploadFiles(), {
            method: 'POST',
            body: formData,
        })
            .then((res) => res.json())
            .then((data) => {
                // console.log(data)
                setAvailable(data.files);
                setFileList([]);
                if (ref.current) ref.current.value = ""
            })
            .catch((err) => console.error(err));
    };

    // 👇 files is not an array, but it's iterable, spread to get an array of files
    // const files = fileList ? [...fileList] : [];

    return (
        <Row>
            <Col xs={12} >
                <Row className="container">
                    <Col xs={7}>
                        <Row>
                            <Col xs={12}>
                                <h4 className="mb-4">Upload a File</h4>
                            </Col>
                            <Col xs={12}>
                                <input className="input mb-4" id='files' ref={ref} type="file" onChange={handleFileChange} multiple />

                                <ul className="list">
                                    {fileList.map((file, i) => (
                                        <li key={i}>
                                            {file.name}
                                        </li>
                                    ))}
                                </ul>
                            </Col>
                        </Row>
                    </Col>
                    <Col xs={5}>
                        <Button className="submit-btn" style={{ marginTop: '25px' }} onClick={handleUploadClick}>Upload  <FaUpload /></Button>
                    </Col >
                </Row>
            </Col>
        </Row>
    );
}
export default Upload