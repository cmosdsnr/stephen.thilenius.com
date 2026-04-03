import React, { useState, useEffect } from 'react'
import { Row, Col, Button } from 'react-bootstrap'
import { Link, useParams, useNavigate } from 'react-router-dom'
import back from '../../images/back.png'
import boxImage from './images/box.jpg'
import { serverURL } from '../src/constants'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronLeft, faChevronRight, faRotateLeft, faRotateRight } from '@fortawesome/free-solid-svg-icons'

// Use a fallback for the gallery base URL, useful for local development.
const GALLERY_BASE = (import.meta as any).env?.VITE_GALLERY_BASE || '';

export function Boxes() {

    const [boxes, setBoxes] = useState<number[]>([])

    useEffect(() => {
        const url = new URL('/api/readDirectories/box', serverURL);
        fetch(url.toString())
            .then((response) => response.json())
            .then((responseJson) => {
                setBoxes(responseJson.files)
            })
    }, [])

    return (
        <>
            <div>Packed Boxes</div>
            <Row>
                {boxes.map((a, i) => {
                    return (
                        <Col
                            xs={12}
                            sm={12}
                            md={6}
                            lg={4}
                            xl={3}
                            key={i}
                        >
                            <Link to={"/photos/BoxImages/" + a} ><div className='box' style={{ backgroundImage: boxImage }}>{a}</div></Link>
                        </Col>
                    )
                })}
            </Row>
        </>
    )
}


export function BoxImages() {

    const { name } = useParams();
    const [images, setImages] = useState([])

    useEffect(() => {
        if (typeof name === 'undefined') return
        const url = new URL(`/api/readImages/${encodeURIComponent(name)}/box`, serverURL);
        fetch(url.toString())
            .then((response) => response.json())
            .then((responseJson) => {
                setImages(responseJson.files)
            })
    }, [])

    return (
        <>
            <Link to={"/photos/boxes"} >
                <img width="100px" src={back} alt="" />
            </Link>
            <div>{name}</div>
            <Row>
                {images.map((a, i) => {
                    return (
                        <Col
                            xs={12}
                            sm={12}
                            md={6}
                            lg={4}
                            xl={3}
                            key={i}
                        >
                            <Link to={"/photos/BoxImage/" + name + "/" + a} >
                                <figure className="albumsImg">
                                    <img width="100%" src={`${GALLERY_BASE}/gallery/boxes/boxImages/${name}/thumbnail/${a}`} alt="" />

                                </figure>
                            </Link>
                        </Col>
                    )
                })}
            </Row>
        </>
    )
}



export function BoxImage(): JSX.Element {
    const { box, image } = useParams<{ box: string; image: string; }>();
    const navigate = useNavigate();

    const [images, setImages] = useState<string[]>([]);
    const [index, setIndex] = useState(0);
    const [rot, setRot] = useState(0);


    // 1) Fetch image list only when the *album* changes.
    useEffect(() => {
        if (!box) return;
        const url = new URL(`/api/readImages/${box}/box`, serverURL);
        fetch(url.toString())
            .then(r => r.json())
            .then(j => {
                const files: string[] = j.files ?? [];
                setImages(files);
            })
            .catch(console.error);
    }, [box]);

    // 2) When the URL's :image (or the list) changes, sync the index.
    useEffect(() => {
        if (!images.length) return;
        const idx = image ? images.indexOf(image) : 0;
        setIndex(idx >= 0 ? idx : 0);
        setRot(0); // reset rotation when navigating to a different image
    }, [image, images]);

    // 3) Navigation that *doesn't* trigger a refetch/remount.
    const goTo = (i: number) => {
        if (!box || i < 0 || i >= images.length) return;
        const nextName = images[i];
        navigate(`/photos/boxImage/${box}/${nextName}`, { replace: false });
        setIndex(i);
        setRot(0);
    };

    const prev = () => goTo(index - 1);
    const next = () => goTo(index + 1);

    // (Optional) Preload neighbors for snappier next/prev
    useEffect(() => {
        const neighbors = [index - 1, index + 1].filter(
            i => i >= 0 && i < images.length
        );
        neighbors.forEach(i => {
            const img = new Image();
            img.src = `${GALLERY_BASE}/gallery/boxes/boxImages/${box}/${encodeURIComponent(images[i] ?? "")}`;
        });
    }, [index, images, box]);

    const atStart = index <= 0;
    const atEnd = index >= images.length - 1;

    const src =
        box && images[index]
            ? `${GALLERY_BASE}/gallery/boxes/boxImages/${box}/${encodeURIComponent(images[index])}`
            : "";
    console.log(src);
    return (
        <Row className="align-items-center">
            <div className="mb-3">
                <Button
                    variant="secondary"
                    onClick={() => navigate('/photos/boxes')}
                >
                    ← Back to boxes
                </Button>
            </div>
            <Col xs={1}>
                <FontAwesomeIcon
                    icon={faChevronLeft}
                    size="2x"
                    onClick={atStart ? undefined : prev}
                    style={{ color: atStart ? "#ccc" : undefined, cursor: atStart ? "not-allowed" : "pointer" }}
                />
            </Col>
            <Col xs={1}>
                <FontAwesomeIcon
                    icon={faRotateLeft}
                    size="2x"
                    onClick={() => setRot(r => r - 90)}
                    style={{ cursor: "pointer" }}
                />
            </Col>
            <Col xs={8} className="text-center">
                {src && (
                    <>
                        <img
                            src={src}
                            style={{ transform: `rotate(${rot}deg)`, width: "100%" }}
                        />

                    </>
                )}
            </Col>
            <Col xs={1}>
                <FontAwesomeIcon
                    icon={faRotateRight}
                    size="2x"
                    onClick={() => setRot(r => r + 90)}
                    style={{ cursor: "pointer" }}
                />
            </Col>
            <Col xs={1}>
                <FontAwesomeIcon
                    icon={faChevronRight}
                    size="2x"
                    onClick={atEnd ? undefined : next}
                    style={{ color: atEnd ? "#ccc" : undefined, cursor: atEnd ? "not-allowed" : "pointer" }}
                />
            </Col>
        </Row>
    );
}

