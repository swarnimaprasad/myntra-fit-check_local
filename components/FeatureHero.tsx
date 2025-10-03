/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { View } from '../App';
import { SparklesIcon, UsersIcon } from './icons';

const slides = [
    {
        image: "https://i.postimg.cc/rphb557W/Generated-Image-September-22-2025-1-41-PM.png",
        alt: "Fashion collage with diverse models",
        heading: <>Curated for Your <br className="hidden md:block" /> Silhouette.<br />Colored for <br className="hidden md:block" /> Your Skin Tone</>,
        caption: "Stop searching. Start discovering clothes made to flatter you. Just as nature creates perfect harmony in shape, our AI finds the styles that harmonize with you. By analyzing your unique profile, we curate a collection that lets your natural beauty blossom.",
        palette: ['#E58B72', '#E38891', '#B2A0C7', '#83A2C2', '#849685', '#6A9A95'],
        buttonText: 'Try the Magic Mirror',
        targetView: 'magic_mirror' as View,
        icon: SparklesIcon,
    },
    {
        image: "https://i.postimg.cc/NjLHkzGp/Frame-42973.png",
        alt: "Family in coordinated outfits for an event",
        heading: <>Style Together, <br className="hidden md:block" /> From Anywhere <br className="hidden md:block" /> in the World.</>,
        caption: "Our group styling feature lets you coordinate outfits for everyone, no matter where they are. Virtually try on styles together, preview your look against the wedding venue's background, and create a flawless, unforgettable memory. Bring the family together in your shared virtual studio.",
        palette: null,
        buttonText: 'Create a Style Crew',
        targetView: 'crew_setup' as View,
        icon: UsersIcon,
    }
];

interface FeatureHeroProps {
    onNavigate: (view: View) => void;
}

const FeatureHero: React.FC<FeatureHeroProps> = ({ onNavigate }) => {
    const [activeIndex, setActiveIndex] = useState(0);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const slideRefs = useRef<(HTMLDivElement | null)[]>([]);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (entry.isIntersecting) {
                        const index = slideRefs.current.findIndex(ref => ref === entry.target);
                        if (index !== -1) {
                            setActiveIndex(index);
                            return; // Found the intersecting slide
                        }
                    }
                }
            },
            {
                root: scrollContainerRef.current,
                threshold: 0.6, // Trigger when 60% of the slide is visible
            }
        );

        const currentRefs = slideRefs.current;
        currentRefs.forEach(ref => {
            if (ref) observer.observe(ref);
        });

        return () => {
            currentRefs.forEach(ref => {
                if (ref) observer.unobserve(ref);
            });
        };
    }, []);

    const scrollToSlide = (index: number) => {
        slideRefs.current[index]?.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
            inline: 'start',
        });
    };

    return (
        <section className="w-full bg-white py-16 overflow-hidden">
            <div ref={scrollContainerRef} className="flex overflow-x-auto snap-x snap-mandatory hide-scrollbar">
                {slides.map((slide, index) => (
                    <div 
                        key={index} 
                        ref={el => { slideRefs.current[index] = el; }}
                        className="flex-shrink-0 w-full snap-center"
                    >
                        <div className="max-w-screen-xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center px-4 sm:px-6 lg:px-8">
                            {/* Image Collage */}
                            <motion.div
                                initial={{ opacity: 0, x: -50 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true, amount: 0.5 }}
                                transition={{ duration: 0.8, ease: 'easeOut' }}
                            >
                                <img 
                                    src={slide.image} 
                                    alt={slide.alt} 
                                    className="rounded-lg shadow-2xl object-cover"
                                />
                            </motion.div>

                            {/* Text Content */}
                            <motion.div
                                className="flex flex-col justify-center"
                                initial={{ opacity: 0, y: -50 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, amount: 0.5 }}
                                transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
                            >
                                <h2 className="text-4xl md:text-5xl font-serif font-medium text-gray-900 leading-tight">
                                    {slide.heading}
                                </h2>
                                <p className="mt-6 text-base text-gray-700 leading-relaxed max-w-lg">
                                    {slide.caption}
                                </p>
                                {slide.palette && (
                                    <div className="flex items-center gap-3 mt-8">
                                        {slide.palette.map((color, pIndex) => (
                                            <motion.div
                                                key={color}
                                                className="w-8 h-8 rounded-full border-2 border-white shadow-md"
                                                style={{ backgroundColor: color }}
                                                initial={{ opacity: 0, scale: 0.5 }}
                                                whileInView={{ opacity: 1, scale: 1 }}
                                                viewport={{ once: true }}
                                                transition={{ duration: 0.5, delay: 0.5 + pIndex * 0.1 }}
                                            />
                                        ))}
                                    </div>
                                )}
                                {slide.buttonText && (
                                    <div className="mt-8">
                                        <motion.button
                                            onClick={() => onNavigate(slide.targetView)}
                                            className="inline-flex items-center justify-center px-8 py-3 text-base font-semibold text-white bg-primary-600 rounded-md cursor-pointer group hover:bg-primary-700 transition-all duration-300 transform hover:scale-105 shadow-lg"
                                            whileHover={{ scale: 1.05, boxShadow: '0 10px 20px rgba(255, 63, 108, 0.3)' }}
                                            whileTap={{ scale: 0.98 }}
                                        >
                                            <slide.icon className="w-5 h-5 mr-3" />
                                            <span>{slide.buttonText}</span>
                                        </motion.button>
                                    </div>
                                )}
                            </motion.div>
                        </div>
                    </div>
                ))}
            </div>
             {/* Dots */}
            <div className="flex justify-center items-center gap-3 pt-8">
                {slides.map((_, index) => (
                    <button
                        key={index}
                        onClick={() => scrollToSlide(index)}
                        className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${activeIndex === index ? 'bg-gray-800 scale-125' : 'bg-gray-400 hover:bg-gray-500'}`}
                        aria-label={`Go to slide ${index + 1}`}
                    />
                ))}
            </div>
        </section>
    );
};

export default FeatureHero;
