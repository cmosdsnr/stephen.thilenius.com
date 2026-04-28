import React, { useState } from 'react'
import { useQuery } from 'react-query'
import toast from 'react-hot-toast'
import { useData } from '../../contexts/DataContext'
import YesNoModal from "../../modals/YesNoModal"
import OnClickLink from '../../modals/OnClickLink'
import Upload from './Upload'
import { API } from '../../api'
import { SkeletonTable } from '../Skeleton'

const formatPT = (raw: string): string => {
    const d = new Date(raw);
    if (isNaN(d.getTime())) return raw;
    return new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Los_Angeles',
        month: 'numeric', day: 'numeric', year: '2-digit',
        hour: 'numeric', minute: '2-digit', hour12: true,
    }).format(d);
};

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
            .then(() => { refetchAvailable(); })
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
        <div style={{ minHeight: '100vh', padding: '2rem 1rem 3rem' }}>

            <YesNoModal
                message="Delete File after Download?"
                onYes={(() => handleFile(true))}
                onNo={(() => handleFile(false))}
                open={open}
            />

            {/* Page header */}
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <p style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: '0.7rem', letterSpacing: '0.25em', textTransform: 'uppercase', color: '#6a9ac4', marginBottom: '0.25rem' }}>
                    Welcome, {pb.authStore.model?.name}
                </p>
                <h1 style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: '2.4rem', letterSpacing: '0.08em', color: '#001830', margin: 0 }}>
                    File Share
                </h1>
                <hr style={{ border: 'none', borderTop: '2px solid #f59e0b', width: 60, margin: '0.75rem auto 0' }} />
            </div>

            {/* Top row: Upload (XS-first) + Available Files */}
            <style>{`.fs-avail { order: 2; } .fs-upload { order: 1; } @media (min-width: 768px) { .fs-avail { order: 1; } .fs-upload { order: 2; } }`}</style>
            <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>

                {/* Available Files card */}
                <div className="fs-avail" style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, boxShadow: '0 2px 12px rgba(0,24,48,0.07)', overflow: 'hidden' }}>
                    <div style={{ background: '#001830', borderBottom: '2px solid #f59e0b', padding: '0.75rem 1.25rem' }}>
                        <span style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: '0.8rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#f59e0b' }}>
                            Available Files
                        </span>
                    </div>

                    {availableApiError && (
                        <div style={{ padding: '1rem 1.25rem', background: 'rgba(239,68,68,0.07)', borderBottom: '1px solid rgba(239,68,68,0.2)', fontFamily: 'Share Tech Mono, monospace', fontSize: '0.95rem', color: '#ef4444' }}>
                            {availableApiError}
                        </div>
                    )}
                    {availableError && (
                        <div style={{ padding: '1rem 1.25rem', background: 'rgba(239,68,68,0.07)', borderBottom: '1px solid rgba(239,68,68,0.2)', fontFamily: 'Share Tech Mono, monospace', fontSize: '0.95rem', color: '#ef4444' }}>
                            Error loading files: {(availableError as Error).message}
                        </div>
                    )}

                    {availableLoading ? (
                        <div style={{ padding: '1.25rem' }}><SkeletonTable rows={4} cols={2} /></div>
                    ) : available.length === 0 ? (
                        <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'Rajdhani, sans-serif', fontSize: '0.9rem', color: '#6a9ac4', letterSpacing: '0.08em' }}>
                            No files available
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'Share Tech Mono, monospace', fontSize: '0.95rem' }}>
                                <thead>
                                    <tr>
                                        {['Filename', ''].map((h, i) => (
                                            <th key={i} style={{ background: '#001830', color: '#6a9ac4', fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: '0.72rem', letterSpacing: '0.14em', textTransform: 'uppercase', padding: '0.5rem 1rem', textAlign: 'left', borderBottom: '1px solid #1c3050' }}>
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {available.map((f, i) => (
                                        <tr
                                            key={i}
                                            style={{ background: i % 2 ? 'rgba(0,24,48,0.03)' : 'white' }}
                                            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(245,158,11,0.06)')}
                                            onMouseLeave={e => (e.currentTarget.style.background = i % 2 ? 'rgba(0,24,48,0.03)' : 'white')}
                                        >
                                            <td style={{ padding: '0.3rem 1rem', borderBottom: '1px solid #f1f5f9' }}>
                                                <OnClickLink color='#6a9ac4' fn={() => handleOpen(f)}>{f}</OnClickLink>
                                            </td>
                                            <td style={{ padding: '0.3rem 1rem', borderBottom: '1px solid #f1f5f9', textAlign: 'center' }}>
                                                <OnClickLink fn={() => deleteFile(f)}>❌</OnClickLink>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Upload card */}
                <div className="fs-upload" style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, boxShadow: '0 2px 12px rgba(0,24,48,0.07)', overflow: 'hidden' }}>
                    <div style={{ background: '#001830', borderBottom: '2px solid #f59e0b', padding: '0.75rem 1.25rem' }}>
                        <span style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: '0.8rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#f59e0b' }}>
                            Upload
                        </span>
                    </div>
                    <div style={{ padding: '1.25rem' }}>
                        <Upload setAvailable={() => refetchAvailable()} />
                    </div>
                </div>

            </div>

            {/* Activity row — centered, date column fits on one line */}
            <div style={{ maxWidth: 660, margin: '1.5rem auto 0' }}>
                <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, boxShadow: '0 2px 12px rgba(0,24,48,0.07)', overflow: 'hidden' }}>
                    <div style={{ background: '#001830', borderBottom: '2px solid #f59e0b', padding: '0.75rem 1.25rem' }}>
                        <span style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: '0.8rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#f59e0b' }}>
                            Activity
                        </span>
                    </div>

                    {historyError && (
                        <div style={{ padding: '1rem 1.25rem', fontFamily: 'Share Tech Mono, monospace', fontSize: '0.95rem', color: '#ef4444' }}>
                            Error loading activity: {(historyError as Error).message}
                        </div>
                    )}

                    {historyLoading ? (
                        <div style={{ padding: '1.25rem' }}><SkeletonTable rows={4} cols={2} /></div>
                    ) : history.length === 0 ? (
                        <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'Rajdhani, sans-serif', fontSize: '0.9rem', color: '#6a9ac4', letterSpacing: '0.08em' }}>
                            No activity yet
                        </div>
                    ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'Share Tech Mono, monospace', fontSize: '0.95rem', tableLayout: 'fixed' }}>
                            <colgroup>
                                <col style={{ width: 'auto' }} />
                                <col style={{ width: '10rem' }} />
                            </colgroup>
                            <thead>
                                <tr>
                                    {['Filename', 'Downloaded'].map((h, i) => (
                                        <th key={i} style={{ background: '#001830', color: '#6a9ac4', fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: '0.72rem', letterSpacing: '0.14em', textTransform: 'uppercase', padding: '0.5rem 1rem', textAlign: 'left', borderBottom: '1px solid #1c3050' }}>
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {history.map((row, i) => (
                                    <tr key={i} style={{ background: i % 2 ? 'rgba(0,24,48,0.03)' : 'white' }}>
                                        <td style={{ padding: '0.3rem 1rem', borderBottom: '1px solid #f1f5f9', color: '#001830', wordBreak: 'break-word' }}>
                                            {row.fileName}
                                        </td>
                                        <td style={{ padding: '0.3rem 1rem', borderBottom: '1px solid #f1f5f9', color: '#6a9ac4', whiteSpace: 'nowrap' }}>
                                            {formatPT(row.created)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

        </div>
    )
}

export default FileShare;
