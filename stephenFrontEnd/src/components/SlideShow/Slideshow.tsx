import React, { useState, useRef } from "react"

import img1 from "../../images/SlideShow/Brandenburg.png"
import img2 from "../../images/SlideShow/Daughters.png"
import img3 from "../../images/SlideShow/Hernhutter.jpg"
import img4 from "../../images/SlideShow/kandinsky.jpg"
import img5 from "../../images/SlideShow/Kauai.jpg"
import img6 from "../../images/SlideShow/paragliding.png"
import img7 from "../../images/SlideShow/Redwoods.jpg"
import img8 from "../../images/SlideShow/SwissLake.jpg"
import img9 from "../../images/SlideShow/SwissVillage.jpg"
import img10 from "../../images/SlideShow/Us.jpg"

const images = [img1, img2, img3, img4, img5, img6, img7, img8, img9, img10]
const delay = 4500

interface SlideshowProps {
    /** CSS classes for the outermost container — controls width/layout from parent */
    containerClassName?: string
}

export const Slideshow = ({ containerClassName = "mx-auto overflow-hidden max-w-[500px] pt-10" }: SlideshowProps) => {
    const [index, setIndex] = useState(0)
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    function resetTimeout() {
        if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }

    React.useEffect(() => {
        resetTimeout()
        timeoutRef.current = setTimeout(
            () => setIndex(prev => prev === images.length - 1 ? 0 : prev + 1),
            delay
        )
        return () => resetTimeout()
    }, [index])

    return (
        <div className={containerClassName}>
            {/* Strip */}
            <div
                className="whitespace-nowrap transition-all duration-1000 ease-in-out"
                style={{ transform: `translate3d(${-index * 100}%, 0, 0)` }}
            >
                {images.map((src, i) => (
                    <div className="inline-block w-full" key={i} style={{ aspectRatio: '4/3', verticalAlign: 'top' }}>
                        <img
                            src={src}
                            alt=""
                            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        />
                    </div>
                ))}
            </div>

            {/* Dot navigation */}
            <div style={{ textAlign: 'center', paddingTop: '12px', display: 'flex', justifyContent: 'center', gap: '8px' }}>
                {images.map((_, idx) => (
                    <button
                        key={idx}
                        onClick={() => setIndex(idx)}
                        aria-label={`Slide ${idx + 1}`}
                        style={{
                            width: index === idx ? '24px' : '8px',
                            height: '8px',
                            borderRadius: '4px',
                            background: index === idx ? '#f59e0b' : '#1c3050',
                            border: 'none',
                            padding: 0,
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                        }}
                    />
                ))}
            </div>
        </div>
    )
}
