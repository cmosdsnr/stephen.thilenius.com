import React, { useState } from 'react'
import { useQuery } from 'react-query'
import toast from 'react-hot-toast'
import { Row, Col, Button } from 'react-bootstrap'
import skyLine from '../../images/San-Diego-Skyline.jpg'
import { useData } from '../../contexts/DataContext'
import YesNoModal from "../../modals/YesNoModal"
import OnClickLink from '../../modals/OnClickLink'
import Upload from './Upload'
import { API } from '../../api'
import { SkeletonTable } from '../Skeleton'

const FileShare = ({ logout }: any) => {
    const [file, setFile] = useState("")
    const [open, setOpen] = useState(false)
    const { pb } = useData()

    const { data: availableData, isLoading: availableLoading, error: availableError, refetch: refetchAvailable } = useQuery(
        ['getAvailableFiles'],
        async () => {
            const response = await fetch(API.getAvailableFiles());
            const text = await response.text();
            const res = JSON.parse(text);
            return res;
        }
    );

    const available: any[] = availableData?.files ?? [];
    const availableApiError: string | null = availableData?.error ?? null;

    const { data: historyData, isLoading: historyLoading, error: historyError } = useQuery(
        ['fileDownloads'],
        async () => {
            const records = await pb.collection("fileDownloads").getFullList({ sort: "-created" });
            return records.map((record: any) => ({ fileName: record.fileName, created: record.created }));
        }
    );

    const history: any[] = historyData ?? [];

    const deleteFile = (fileName: string) => {
        fetch(API.fileDelete(fileName))
            .then(response => response.json())
            .then(() => {
                refetchAvailable();
            })
            .catch(err => { console.error(err); toast.error('Failed to delete file'); });
    }

    const handleFile = (del: boolean) => {
        var a = document.createElement("a");
        a.href = API.fileDownload(file);
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
                        {availableApiError &&
                            <Col xs={12}>
                                <h1 className="mx-4">{availableApiError}</h1>
                            </Col>
                        }
                        {availableError &&
                            <Col xs={12}>
                                <h5 className="mx-4">Error loading files: {(availableError as Error).message}</h5>
                            </Col>
                        }
                        <Col xs={12}>
                            <h4 className="mx-4">Available Files</h4>
                        </Col>
                        <Col xs={12}>
                            {availableLoading ? <SkeletonTable rows={4} cols={2} /> : available.length === 0 ? <>
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

                    <Upload className='container' setAvailable={() => refetchAvailable()} />
                    <Row className='container' style={{ marginTop: "20px" }}>
                        {/* <Col xs={12} style={{ maxHeight: "30px" }}>
                            <h4 className="mx-4">Activity</h4>
                        </Col> */}
                        <Col xs={12}>
                            <h4 className="mx-4" style={{ width: "100%" }}>Activity</h4>
                            {historyError && <h5>Error loading activity: {(historyError as Error).message}</h5>}
                            {historyLoading ? <SkeletonTable rows={4} cols={2} /> : history.length === 0 ? <>
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
