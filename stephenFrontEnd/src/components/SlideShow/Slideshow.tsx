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
const images = [img1, img2, img3, img4, img5, img6, img7, img8, img9];

const delay = 4500;

export const Slideshow = () => {
    const [index, setIndex] = useState(0);
    const timeoutRef = useRef(null);

    function resetTimeout() {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
    }

    React.useEffect(() => {
        resetTimeout();
        timeoutRef.current = setTimeout(
            () =>
                setIndex((prevIndex) =>
                    prevIndex === images.length - 1 ? 0 : prevIndex + 1
                ),
            delay
        );

        return () => {
            resetTimeout();
        };
    }, [index]);

    return (
        <div className="mx-auto overflow-hidden max-w-[500px] pt-10">
            <div
                className="whitespace-nowrap transition-all duration-1000 ease-in-out"
                style={{ transform: `translate3d(${-index * 100}%, 0, 0)` }}
            >
                {images.map((backgroundColor, index) => (
                    <div className="inline-block h-[400px] w-full" key={index}>
                        <img className="pt-5 rounded-[40px] w-full" src={images[index]} alt="" />
                    </div>
                ))}
            </div>

            <div className="text-center">
                {images.map((_, idx) => (
                    <div
                        key={idx}
                        className={`inline-block h-5 w-5 rounded-full cursor-pointer mt-[15px] mx-[7px] mb-0 ${index === idx ? 'bg-[#6a0dad]' : 'bg-[#c4c4c4]'}`}
                        onClick={() => setIndex(idx)}
                    />
                ))}
            </div>
        </div>
    );
}
