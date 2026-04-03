import React, { useState, useRef } from "react"
import "./slideshow.css"


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

// const colors = ["#0088FE", "#00C49F", "#FFBB28"];
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
        <div className="slideshow">
            {/* {images && images.map((image, i) => {
                return (
                    <img src={image} alt="" />
                )
            })} */}

            <div
                className="slideshowSlider"
                style={{ transform: `translate3d(${-index * 100}%, 0, 0)` }}
            >
                {images.map((backgroundColor, index) => (
                    <div
                        className="slide"
                        key={index}
                    // style={{ backgroundImage: `url(${images[index]})` }}
                    ><img className="slideshowImage" src={images[index]} alt="" /></div>
                ))}
            </div>

            <div className="slideshowDots">
                {images.map((_, idx) => (
                    <div
                        key={idx}
                        className={`slideshowDot${index === idx ? " active" : ""}`}
                        onClick={() => {
                            setIndex(idx);
                        }}
                    ></div>
                ))}
            </div>
        </div>
    );
}
