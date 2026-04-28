import React, { useState, useEffect } from 'react'
import { useData } from '../../contexts/DataContext'

export default function Comments() {
    const [posts, setPosts] = useState([])
    const [showContent, setShowContent] = useState([])
    const { getPosts } = useData()

    useEffect(() => {
        return getPosts(setPosts)
    }, [getPosts])

    const handleClick = (i) => {
        const t = [...showContent]
        t[i] = !t[i]
        setShowContent(t)
    }

    return (
        <div style={{ maxWidth: 800, margin: '0 auto', padding: '2rem 1.25rem 4rem' }}>

            {/* ── Page Header ── */}
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <p style={eyebrowStyle}>Reader Submissions</p>
                <h1 style={pageTitleStyle}>Comments</h1>
                <hr style={ruleStyle} />
            </div>

            {/* ── Post Cards ── */}
            {posts && posts.map((post, i) => (
                <div
                    key={i}
                    style={cardStyle}
                    onClick={() => handleClick(i)}
                >
                    <div style={cardHeaderStyle}>
                        <span style={cardTitleStyle}>{post.title}</span>
                        <span style={cardMetaStyle}>{post.firstName} {post.lastName}</span>
                    </div>
                    <div style={cardBodyStyle}>
                        <div style={emailStyle}>{post.email}</div>
                        {post.subTitle && (
                            <p style={subTitleStyle}>{post.subTitle}</p>
                        )}
                        {showContent[i] && post.content && (
                            <p style={contentStyle}>{post.content}</p>
                        )}
                        <div style={hintStyle}>{showContent[i] ? 'click to collapse' : 'click for details'}</div>
                    </div>
                </div>
            ))}

            {posts?.length === 0 && (
                <div style={{ ...cardStyle }}>
                    <div style={cardBodyStyle}>
                        <p style={{ ...subTitleStyle, textAlign: 'center', color: '#6a9ac4' }}>No comments yet.</p>
                    </div>
                </div>
            )}
        </div>
    )
}

// ─────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────
const eyebrowStyle:   React.CSSProperties = { fontFamily: 'Share Tech Mono,monospace', fontSize: '0.7rem', letterSpacing: '0.35em', textTransform: 'uppercase', color: '#f59e0b', margin: '0 0 0.3rem' };
const pageTitleStyle: React.CSSProperties = { fontFamily: 'Rajdhani,sans-serif', fontSize: '2.6rem', fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase', color: '#001830', margin: '0 0 0.5rem', lineHeight: 1 };
const ruleStyle:      React.CSSProperties = { width: 56, height: 2, background: 'linear-gradient(90deg,transparent,#f59e0b,transparent)', margin: '0 auto', border: 'none' };
const cardStyle:      React.CSSProperties = { background: 'rgba(255,255,255,0.9)', border: '1px solid rgba(0,24,48,0.12)', borderRadius: '2px 2px 8px 8px', marginBottom: '1.25rem', overflow: 'hidden', boxShadow: '0 2px 16px rgba(0,24,48,0.09)', cursor: 'pointer' };
const cardHeaderStyle: React.CSSProperties = { background: '#001830', borderBottom: '2px solid #f59e0b', padding: '0.85rem 1.5rem', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' };
const cardTitleStyle: React.CSSProperties = { fontFamily: 'Rajdhani,sans-serif', fontSize: '1.1rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#dde6f0' };
const cardMetaStyle:  React.CSSProperties = { fontFamily: 'Share Tech Mono,monospace', fontSize: '0.75rem', color: '#f59e0b', letterSpacing: '0.1em', whiteSpace: 'nowrap' };
const cardBodyStyle:  React.CSSProperties = { padding: '1.1rem 1.5rem' };
const emailStyle:     React.CSSProperties = { fontFamily: 'Share Tech Mono,monospace', fontSize: '0.75rem', color: '#6a9ac4', marginBottom: '0.6rem' };
const subTitleStyle:  React.CSSProperties = { fontSize: '0.95rem', lineHeight: 1.7, color: '#1a2a3a', margin: '0 0 0.5rem' };
const contentStyle:   React.CSSProperties = { fontSize: '0.9rem', lineHeight: 1.75, color: '#334', margin: '0.75rem 0 0.5rem', borderLeft: '3px solid rgba(245,158,11,0.5)', paddingLeft: '0.85rem' };
const hintStyle:      React.CSSProperties = { fontFamily: 'Share Tech Mono,monospace', fontSize: '0.68rem', letterSpacing: '0.15em', color: '#aab8c8', textTransform: 'uppercase', marginTop: '0.5rem' };
