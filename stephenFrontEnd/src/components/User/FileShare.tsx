import React, { useState, useEffect } from 'react'
import { Row, Col, Button } from 'react-bootstrap'
import skyLine from '../../images/San-Diego-Skyline.jpg'
import { useData } from '../../contexts/DataContext'
import YesNoModal from "../../modals/YesNoModal"
import OnClickLink from '../../modals/OnClickLink'
import Upload from './Upload'
import { serverURL } from '../../constants'

const FileShare = ({ logout }: any) => {
    const [file, setFile] = useState("")
    const [open, setOpen] = useState(false)
    const [error, setError] = useState<String | null>(null)
    const [history, setHistory] = useState<any[]>([])
    const [available, setAvailable] = useState<any[]>([])
    const { pb } = useData()

    useEffect(() => {
        const url = new URL('/api/getAvailableFiles', serverURL);
        fetch(url.toString()).then(response => response.text())
            .then(ans => {
                try {
                    const res = JSON.parse(ans)
                    setAvailable(res.files)
                    setError(res.error)
                } catch (e) {
                    console.log(e, ans)
                }
            })
        pb.collection("fileDownloads")
            .getFullList({
                sort: "-created",
            })
            .then((records) => {
                let h: any[] = []
                records.forEach((record) =>
                    h.push({ fileName: record.fileName, created: record.created }))
                setHistory(h)
            })
    }, [])

    const deleteFile = (fileName: string) => {
        const url = new URL('/api/delete', serverURL);
        url.searchParams.set('name', fileName);
        fetch(url.toString())
            .then(response => response.json())
            .then(avl => {
                setAvailable(avl.files)
            })
    }

    const handleFile = (del: boolean) => {
        const url = new URL('/api/file', serverURL);
        url.searchParams.set('name', file);
        var a = document.createElement("a");
        a.href = url.toString();
        if (del) a.href += "&d=1"
        else a.href += "&d=0"
        a.click()
        a.remove()
    }

    const handleOpen = (fileName: string) => {
        setOpen(true)
        setFile(fileName)
    }

    return (
        <div style={{
            backgroundImage: `url(${skyLine})`,
            width: '100%',
            height: '98vh',
        }}>
            <YesNoModal
                message="Delete File after Download?"
                onYes={(() => handleFile(true))}
                onNo={(() => handleFile(false))}
                open={open}
            />
            <Row style={{ marginTop: "10px" }}>
                <Col xs={11}>
                    <h1 className="mx-4 mt-2" style={{ textAlign: 'center' }}>Welcome {pb.authStore.model?.name}</h1>
                </Col>

            </Row>
            <Row style={{ marginTop: "10px", textAlign: "center" }}>
                <Col xs={12} lg={5} className='container'>
                    <Row>
                        {error &&
                            <Col xs={12}>
                                <h1 className="mx-4">{error}</h1>
                            </Col>
                        }
                        <Col xs={12}>
                            <h4 className="mx-4">Available Files</h4>
                        </Col>
                        <Col xs={12}>
                            {available.length === 0 ? <>
                                <h5>No files Available</h5>
                            </> : <>
                                <table className="mx-4" style={{ width: "90%", marginBottom: "20px" }}>
                                    <thead>
                                        <tr>
                                            <th>Filename</th>
                                            <th>Delete</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {available.map((file, i) => {
                                            return (
                                                <tr key={i}>
                                                    {/* <td><a style={{ color: "yellow" }} href={import.meta.env.VITE_APP_SERVER_URL + '/file/' + file}>{file}</a></td> */}
                                                    <td><OnClickLink color='black' fn={() => handleOpen(file)}>{file}</OnClickLink></td>

                                                    <td><OnClickLink fn={() => deleteFile(file)}>❌</OnClickLink></td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </>
                            }
                        </Col>
                    </Row>
                </Col>
                <Col xs={12} lg={{ span: 6, offset: 1 }} >

                    <Upload className='container' setAvailable={setAvailable} />
                    <Row className='container' style={{ marginTop: "20px" }}>
                        {/* <Col xs={12} style={{ maxHeight: "30px" }}>
                            <h4 className="mx-4">Activity</h4>
                        </Col> */}
                        <Col xs={12}>
                            <h4 className="mx-4" style={{ width: "100%" }}>Activity</h4>
                            {history.length === 0 ? <>
                                <h5>No Info Available</h5>
                            </> : <>
                                <table className="mx-4" style={{ width: "90%", marginBottom: "20px" }}>
                                    <thead>
                                        <tr>
                                            <th>Filename</th>
                                            <th>Downloaded</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {history.map((row, i) => {
                                            return (
                                                <tr key={i}>
                                                    <td>{row.fileName}</td>
                                                    <td>{row.created}</td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>

                                </table>
                            </>
                            }
                        </Col>
                    </Row>
                </Col>
            </Row >
        </div >
    )
}

export default FileShare;
