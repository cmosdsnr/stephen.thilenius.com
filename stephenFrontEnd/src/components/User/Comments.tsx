import React, { useState, useEffect } from 'react'
import { useData } from '../../contexts/DataContext'
import { Card } from 'react-bootstrap'
import { Link } from 'react-router-dom'

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
        <div className="home">
            <h1>Comments</h1><span>(click for details)</span>
            {/* <div className="blog-by">By Stephen</div> */}

            {posts && posts.map((post, i) => {
                return (
                    <Card key={i} className="post" onClick={() => { handleClick(i) }}>
                        <p>from: {post.firstName + " " + post.lastName}<br />
                            at: {post.email}</p>
                        <h3>{post.title}</h3>
                        <p>
                            {post.subTitle}
                        </p>
                        {showContent[i] ? <p>{post.content}</p> : <></>}
                    </Card>

                )
            })}
        </div>
    )
}
