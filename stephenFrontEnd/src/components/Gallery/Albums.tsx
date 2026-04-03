/**
 * React components for rendering gallery: albums list, individual Album views, and Picture slideshow with navigation.
 * Supports regular albums, special albums (admin-only), and numbered photo boxes with image rotation functionality.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Row, Col, Button, Form } from 'react-bootstrap'
import { Link, useParams, useNavigate } from 'react-router-dom'
import back from '../../images/back.png'
import { serverURL } from '../../constants'
import { useData } from '../../contexts/DataContext'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronLeft, faChevronRight, faRotateLeft, faRotateRight } from '@fortawesome/free-solid-svg-icons'
import './gallery.css'

// Use a fallback for the gallery base URL, useful for local development.
const GALLERY_BASE = (import.meta as any).env?.VITE_GALLERY_BASE || '';

/** Gallery collection types supported by the application */
type Mode = 'album' | 'box';

/**
 * Albums component - Main gallery landing page
 * 
 * Fetches and displays a grid of album/box thumbnails with mode switching.
 * Supports both regular and special albums based on user permissions.
 * Includes right-click rotation functionality for cover images.
 *
 * @returns {JSX.Element} Grid layout of album/box thumbnails with navigation
 * 
 * @example
 * ```tsx
 * // Renders albums grid with mode switcher
 * <Albums />
 * ```
 */
export function Albums(): JSX.Element {
    /** Current viewing mode - 'album' for photo albums, 'box' for numbered photo boxes */
    const [mode, setMode] = useState<Mode>((localStorage.getItem('AlbumMode') || 'album') as Mode);

    /** List of regular photo albums available to the user */
    const [albums, setAlbums] = useState<string[]>([]);

    /** List of special/admin-only albums available to administrators */
    const [specialAlbums, setSpecialAlbums] = useState<string[]>([]);

    /** List of numbered photo boxes available to the user */
    const [boxes, setBoxes] = useState<string[]>([]);

    /** Rotation values for cover images - maps item name to quarter-turns (0-3) */
    const [rotation, setRotation] = useState<Record<string, number>>({});

    const { pb } = useData();

    /**
     * Fetch directory listings based on current mode
     * Loads albums, special albums, or boxes from the server with authentication
     */
    useEffect(() => {
        const controller = new AbortController();
        const fetchList = async () => {
            try {
                const url = new URL(`/api/readDirectories/${mode}`, serverURL);
                const res = await fetch(url.toString(), {
                    headers: { Authorization: `Bearer ${pb.authStore.token}` },
                    signal: controller.signal,
                });
                const json = await res.json();

                if (json.error) {
                    console.error(`${mode} fetch error:`, json.error);
                    return;
                }

                // Reset everything then set based on mode
                setRotation((json.rotation ?? {}) as Record<string, number>);
                if (mode === 'album') {
                    setAlbums(json.files ?? []);
                    setSpecialAlbums(json.special ?? []);
                    setBoxes([]); // clear boxes list
                } else {
                    setBoxes(json.files ?? []);
                    setAlbums([]);
                    setSpecialAlbums([]);
                }
            } catch (err) {
                if ((err as any)?.name !== 'AbortError') {
                    console.error(`Failed to fetch ${mode} list:`, err);
                }
            }
        };

        fetchList();
        return () => controller.abort();
    }, [mode, pb.authStore.token]);

    /**
     * Handle right-click rotation for cover images
     * Rotates the cover image 90 degrees clockwise, with 0 degrees removing the rotation entry
     * 
     * @param key - The album/box identifier to rotate
     * @returns Event handler function for right-click events
     */
    const onRotateRightClick = (key: string) => (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setRotation(prev => {
            const cur = prev[key] ?? 0;
            const next = (cur + 1) % 4; // +90°
            const copy = { ...prev };
            if (next === 0) delete copy[key]; else copy[key] = next;
            return copy;
        });
    };

    return (
        <>
            {/* Toggle between Albums and Boxes */}
            <Row className="mb-3" style={{ marginTop: '20px' }}>
                <Col xs={4} className="text-center mb-2">
                    <h2>{mode === 'album' ? 'Albums' : 'Boxes'}</h2>
                </Col>
                <Col xs={{ span: 4, offset: 0 }} className="d-inline-flex align-items-center gap-3">
                    <Form.Check
                        inline
                        label="Albums"
                        name="modeRadios"
                        type="radio"
                        id="mode-albums"
                        checked={mode === 'album'}
                        onChange={() => { localStorage.setItem('AlbumMode', 'album'); setMode('album'); }}
                    />
                    <Form.Check
                        inline
                        label="Boxes"
                        name="modeRadios"
                        type="radio"
                        id="mode-boxes"
                        checked={mode === 'box'}
                        onChange={() => { localStorage.setItem('AlbumMode', 'box'); setMode('box'); }}
                    />
                </Col>
            </Row>

            <Row>
                {/* Regular albums */}
                {mode === 'album' && albums.map(a => (
                    <Col key={`album-${a}`} xs={12} sm={6} md={4} lg={3}>
                        <Link to={`/photos/album/${encodeURIComponent(a)}`}>
                            <figure>
                                <img
                                    style={{
                                        transform: `rotate(${(rotation[a] ?? 0) * 90}deg)`,
                                        width: '100%',
                                    }}
                                    src={`${GALLERY_BASE}/gallery/albums/${encodeURIComponent(a)}/thumbnail/cover.jpg`}
                                    alt={a}
                                    onContextMenu={onRotateRightClick(a)}
                                />
                                <figcaption>{a}</figcaption>
                            </figure>
                        </Link>
                    </Col>
                ))}

                {/* Special albums (only when in album mode) */}
                {mode === 'album' && specialAlbums.map(a => (
                    <Col key={`special-${a}`} xs={12} sm={6} md={4} lg={3}>
                        <Link to={`/photos/album/${encodeURIComponent(a)}/special`}>
                            <figure>
                                <img
                                    style={{
                                        transform: `rotate(${(rotation[a] ?? 0) * 90}deg)`,
                                        width: '100%',
                                    }}
                                    src={`${GALLERY_BASE}/gallery/specialAlbums/${encodeURIComponent(a)}/thumbnail/cover.jpg`}
                                    alt={a}
                                    onContextMenu={onRotateRightClick(a)}
                                />
                                <figcaption>{a} <em>(special)</em></figcaption>
                            </figure>
                        </Link>
                    </Col>
                ))}

                {/* Boxes */}
                {mode === 'box' && boxes.map(b => (
                    <Col key={`box-${b}`} xs={12} sm={6} md={4} lg={3}>
                        <Link to={`/photos/album/${b}/box`}>
                            <figure>
                                <img
                                    style={{
                                        transform: `rotate(${(rotation[b] ?? 0) * 90}deg)`,
                                        width: '100%',
                                    }}
                                    src={`${GALLERY_BASE}/gallery/boxes/images/box.jpg`}
                                    alt={`Box ${b}`}
                                    onContextMenu={onRotateRightClick(b)}
                                />
                                <figcaption>Box {b}</figcaption>
                            </figure>
                        </Link>
                    </Col>
                ))}
            </Row>
        </>
    );
}

/**
 * Album component - Individual album/box thumbnail grid view
 * 
 * Displays thumbnails for all images in a specific album, box, or special album.
 * Includes right-click rotation functionality and debounced auto-save of rotation changes.
 * 
 * @returns {JSX.Element} Grid of image thumbnails with navigation back to albums list
 * 
 * @example
 * ```tsx
 * // Route: /photos/album/:name/:special?
 * // Renders thumbnail grid for the specified album
 * <Album />
 * ```
 */
export function Album(): JSX.Element {
    const { name, special } = useParams<{ name: string, special?: string }>()

    /** List of image filenames in the current album/box */
    const [images, setImages] = useState<string[]>([])

    /** Rotation values for images - maps filename to quarter-turns (0-3) */
    const [rotation, setRotation] = useState<{ [key: string]: number }>({})

    /** Flag indicating if this is a special/admin-only album */
    const isSpecial: boolean = (special === "special");

    /** Flag indicating if this is a numbered photo box */
    const isBoxes: boolean = (special === "box")

    /** Flag indicating if this is a regular photo album */
    const isPhotos: boolean = !isSpecial && !isBoxes;

    /** Base URL for image assets based on album type */
    const baseUrl = `${GALLERY_BASE}/gallery/` + (isSpecial ? 'specialAlbums' : isBoxes ? 'boxes/boxImages' : 'albums');

    // ---- Debounce + unmount save wiring ----
    /** Timer reference for debounced rotation save operations */
    const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    /** Ref to access current rotation state in async operations */
    const rotationRef = useRef(rotation);

    /**
     * Keep rotation ref in sync with state for async save operations
     */
    useEffect(() => { rotationRef.current = rotation; }, [rotation]);

    /**
     * Save current rotation state to the server
     * Posts rotation data to the appropriate API endpoint based on album type
     */
    const saveRotation = useCallback(async () => {
        if (!name) return;
        try {
            const url = new URL(`/api/rotation/${encodeURIComponent(name)}/${isSpecial ? 'special' : isBoxes ? 'box' : 'album'}`, serverURL);
            await fetch(url.toString(), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rotation: rotationRef.current }),
            });
        } catch (e) {
            console.error('Failed to save rotation', e);
        }
    }, [name, isSpecial, isBoxes]);

    /**
     * Start/reset 10-second timer whenever rotation changes
     * Implements debounced auto-save to avoid excessive server requests
     */
    useEffect(() => {
        if (!name) return;
        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => {
            saveTimer.current = null;
            void saveRotation();
        }, 10_000);
        return () => { /* no-op here; real cleanup in unmount effect below */ };
    }, [name, rotation, saveRotation]);

    /**
     * On component unmount: clear any pending timer and save immediately
     * Ensures rotation changes are persisted even if user navigates away quickly
     */
    useEffect(() => {
        return () => {
            if (saveTimer.current) {
                clearTimeout(saveTimer.current);
                saveTimer.current = null;
            }
            void saveRotation();
        };
    }, [saveRotation]);
    // ----------------------------------------

    /**
     * Load images and rotation data for the current album/box
     * Fetches from the appropriate API endpoint based on album type
     */
    useEffect(() => {
        if (!name) return

        const url = new URL(`/api/readImages/${encodeURIComponent(name)}/${isSpecial ? 'special' : isBoxes ? 'box' : 'album'}`, serverURL);
        fetch(url.toString())
            .then((res) => res.json())
            .then((json) => {
                setImages(json.files as string[]);
                setRotation(json.rotation as { [key: string]: number });
            });
    }, [name, isSpecial, isBoxes])

    return (
        <>
            <Link to="/photos/albums">
                <img width="100px" src={back} alt="Back to albums" />
            </Link>
            <h2>{name}</h2>
            <Row>
                {images.map((image) => (
                    <Col key={image} xs={12} sm={6} md={4} lg={3}>
                        <Link to={`/photos/picture/${encodeURIComponent(name!)}/${encodeURIComponent(image)}${isSpecial ? '/special' : isBoxes ? '/box' : ''}`}>
                            <figure className="thumbBox">
                                <img
                                    className="thumbImg"
                                    style={{ transform: `rotate(${(rotation[image] ?? 0) * 90}deg)`, width: "100%" }}
                                    src={`${baseUrl}/${encodeURIComponent(name!)}/thumbnail/${encodeURIComponent(image)}`}
                                    alt={image}
                                    onContextMenu={(e) => {
                                        e.preventDefault();       // block browser menu
                                        e.stopPropagation();      // don't let <Link> see it

                                        setRotation(prev => {
                                            const cur = prev[image] ?? 0;
                                            const next = (cur + 1) % 4;   // rotate +90°
                                            const copy = { ...prev };
                                            if (next === 0) delete copy[image]; else copy[image] = next;
                                            return copy;
                                        });
                                    }}
                                />
                            </figure>
                        </Link>
                    </Col>
                ))}
            </Row>
        </>
    )
}

/**
 * Picture component - Full-size image viewer with navigation
 * 
 * Displays a single image in full size with navigation controls, rotation buttons,
 * and keyboard/click navigation. Includes image preloading for smooth navigation.
 * Auto-saves rotation changes with debouncing.
 * 
 * @returns {JSX.Element} Full-size image display with navigation controls
 * 
 * @example
 * ```tsx
 * // Route: /photos/picture/:album/:image/:special?
 * // Renders full-size image with navigation controls
 * <Picture />
 * ```
 */
export function Picture(): JSX.Element {
    const { album, image, special } = useParams<{ album: string; image: string; special?: string }>();
    const navigate = useNavigate();

    /** List of all image filenames in the current album/box */
    const [images, setImages] = useState<string[]>([]);

    /** Rotation values for images - maps filename to quarter-turns (0-3) */
    const [rotation, setRotation] = useState<{ [key: string]: number }>({});

    /** Current image index in the images array */
    const [index, setIndex] = useState(0);

    /** Flag indicating if this is a special/admin-only album */
    const isSpecial: boolean = (special === "special");

    /** Flag indicating if this is a numbered photo box */
    const isBoxes: boolean = (special === "box")

    /** Flag indicating if this is a regular photo album */
    const isPhotos: boolean = !isSpecial && !isBoxes;

    /** Base URL for image assets based on album type */
    const baseUrl = `${GALLERY_BASE}/gallery/` + (isSpecial ? 'specialAlbums' : isBoxes ? 'boxes/boxImages' : 'albums');

    // ---- Debounce + unmount save wiring ----
    /** Timer reference for debounced rotation save operations */
    const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    /** Ref to access current rotation state in async operations */
    const rotationRef = useRef(rotation);

    /**
     * Keep rotation ref in sync with state for async save operations
     */
    useEffect(() => { rotationRef.current = rotation; }, [rotation]);

    /**
     * Save current rotation state to the server
     * Posts rotation data to the appropriate API endpoint based on album type
     */
    const saveRotation = useCallback(async () => {
        if (!album) return;
        try {
            const url = new URL(`/api/rotation/${encodeURIComponent(album)}/${isSpecial ? 'special' : isBoxes ? 'box' : 'album'}`, serverURL);
            await fetch(url.toString(), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rotation: rotationRef.current }),
            });
        } catch (e) {
            console.error('Failed to save rotation', e);
        }
    }, [album, isSpecial, isBoxes]);

    /**
     * Start/reset 10-second timer whenever rotation changes
     * Implements debounced auto-save to avoid excessive server requests
     */
    useEffect(() => {
        if (!album) return;
        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => {
            saveTimer.current = null;
            void saveRotation();
        }, 10_000);
        return () => { /* no-op here; real cleanup in unmount effect below */ };
    }, [album, rotation, saveRotation]);

    /**
     * On component unmount: clear any pending timer and save immediately
     * Ensures rotation changes are persisted even if user navigates away quickly
     */
    useEffect(() => {
        return () => {
            if (saveTimer.current) {
                clearTimeout(saveTimer.current);
                saveTimer.current = null;
            }
            void saveRotation();
        };
    }, [saveRotation]);
    // ----------------------------------------

    /**
     * Load images and rotation data for the current album/box
     * Fetches from the appropriate API endpoint based on album type
     */
    useEffect(() => {
        if (!album) return;
        const url = new URL(`/api/readImages/${encodeURIComponent(album)}/${isSpecial ? 'special' : isBoxes ? 'box' : 'album'}`, serverURL);
        fetch(url.toString())
            .then(r => r.json())
            .then(json => {
                const files: string[] = json.files ?? [];
                setImages(files);
                setRotation(json.rotation as { [key: string]: number } || {});
            })
            .catch(console.error);
    }, [album, isSpecial, isBoxes]);

    /**
     * Update current index when image parameter changes
     * Finds the index of the current image in the loaded images array
     */
    useEffect(() => {
        if (!images.length) return;
        const idx = image ? images.indexOf(image) : 0;
        setIndex(idx >= 0 ? idx : 0);
    }, [image, images]);

    /**
     * Navigate to a specific image by index
     * Updates the URL to reflect the new image while maintaining album context
     * 
     * @param i - Index of the image to navigate to
     */
    const goTo = (i: number) => {
        if (!album || i < 0 || i >= images.length) return;
        const nextName = images[i];
        navigate(`/photos/picture/${album}/${nextName}/${isSpecial ? 'special' : isBoxes ? 'box' : ''}`, { replace: false });
        setIndex(i);
    };

    /** Navigate to the previous image in the sequence */
    const prev = () => goTo(index - 1);

    /** Navigate to the next image in the sequence */
    const next = () => goTo(index + 1);

    /**
     * Preload neighboring images for smooth navigation
     * Loads the previous and next images in the background
     */
    useEffect(() => {
        const neighbors = [index - 1, index + 1].filter(i => i >= 0 && i < images.length);
        neighbors.forEach(i => {
            const img = new Image();
            img.src = `${baseUrl}/${encodeURIComponent(album ?? '')}/${encodeURIComponent(images[i] ?? '')}`;
        });
    }, [index, images, album, baseUrl]);

    /** Flag indicating if user is at the first image (cannot go back) */
    const atStart = index <= 0;

    /** Flag indicating if user is at the last image (cannot go forward) */
    const atEnd = index >= images.length - 1;

    /** Full URL for the current image */
    const src =
        album && images[index]
            ? `${baseUrl}/${encodeURIComponent(album)}/${encodeURIComponent(images[index])}`
            : '';

    return (
        <Row className="align-items-center">
            <div className="mb-3">
                <Button variant="secondary" onClick={() => navigate('/photos/albums')}>
                    ← Back to Albums
                </Button>
            </div>

            <Col xs={1}>
                <FontAwesomeIcon
                    icon={faChevronLeft}
                    size="2x"
                    onClick={atStart ? undefined : prev}
                    style={{ color: atStart ? '#ccc' : undefined, cursor: atStart ? 'not-allowed' : 'pointer' }}
                />
            </Col>

            <Col xs={1}>
                <FontAwesomeIcon
                    icon={faRotateLeft}
                    size="2x"
                    onClick={() =>
                        setRotation(r => {
                            const key = images[index];
                            const cur = r[key] ?? 0; // quarter-turns 0..3
                            const next = (cur + 3) % 4; // -90°
                            const newRot = { ...r };
                            if (next === 0) delete newRot[key]; else newRot[key] = next;
                            return newRot;
                        })
                    }
                    style={{ cursor: 'pointer' }}
                />
            </Col>

            <Col xs={8} className="text-center">
                {src && (
                    <img
                        src={src}
                        // multiply by 90 to get degrees
                        style={{ transform: `rotate(${(rotation[images[index]] ?? 0) * 90}deg)`, width: '100%' }}
                        onContextMenu={(e) => {
                            e.preventDefault(); // stop the browser's default context menu
                            console.log("Right-clicked:", image);
                            // Rotate the image on right-click
                            const r = { ...rotation };
                            if (r[images[index]] === undefined)
                                r[images[index]] = 1;
                            else if (r[images[index]] === 3) {
                                delete r[images[index]];
                            } else {
                                r[images[index]] = (r[images[index]] + 1) % 4;
                            }
                            setRotation(r);
                        }}
                    />
                )}
            </Col>

            <Col xs={1}>
                <FontAwesomeIcon
                    icon={faRotateRight}
                    size="2x"
                    onClick={() =>
                        setRotation(r => {
                            const key = images[index];
                            const cur = r[key] ?? 0;
                            const next = (cur + 1) % 4; // +90°
                            const newRot = { ...r };
                            if (next === 0) delete newRot[key]; else newRot[key] = next;
                            return newRot;
                        })
                    }
                    style={{ cursor: 'pointer' }}
                />
            </Col>

            <Col xs={1}>
                <FontAwesomeIcon
                    icon={faChevronRight}
                    size="2x"
                    onClick={atEnd ? undefined : next}
                    style={{ color: atEnd ? '#ccc' : undefined, cursor: atEnd ? 'not-allowed' : 'pointer' }}
                />
            </Col>
        </Row>
    );
}