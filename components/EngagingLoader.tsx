/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, animate, PanInfo } from 'framer-motion';
import { ShirtIcon, BeltIcon, ShoesIcon, PantsIcon, SkirtIcon } from './icons';

// --- Shared Styling Tips Component ---

const STYLING_TIPS = [
  "Balance is key. Pair a voluminous top with fitted bottoms, or vice versa.",
  "The 'third piece' rule: Add a jacket, blazer, or sweater to instantly elevate a simple look.",
  "When in doubt, monochrome outfits look chic and put-together.",
  "Use the color wheel. Colors opposite each other (like blue and orange) create a bold, complementary look.",
  "Don't be afraid to mix patterns. Start by pairing a bold pattern with a more subtle one.",
  "A belt can redefine your silhouette. Cinch a dress or an oversized shirt at the waist for a flattering shape.",
  "Accessorize strategically. A statement necklace or bold earrings can be the focal point of your outfit.",
  "Pay attention to proportions. Cropped jackets work well with high-waisted pants or skirts.",
  "Invest in timeless classics: a great pair of jeans, a white t-shirt, a leather jacket, and a trench coat.",
  "Texture adds depth. Mix materials like denim, silk, leather, and knits for a more interesting outfit."
];

const StylingTips = () => {
  const [tipIndex, setTipIndex] = useState(0);

  useEffect(() => {
    const tipInterval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % STYLING_TIPS.length);
    }, 4500);
    return () => clearInterval(tipInterval);
  }, []);

  return (
    <div className="relative h-16 w-full mt-4">
      <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">Styling Tip</p>
      <AnimatePresence mode="wait">
        <motion.p
          key={tipIndex}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.4, ease: 'easeInOut' }}
          className="text-gray-600 italic mt-1 absolute w-full px-4"
        >
          &ldquo;{STYLING_TIPS[tipIndex]}&rdquo;
        </motion.p>
      </AnimatePresence>
    </div>
  );
};


// --- Swatch Shuffle Loader ---

const FASHION_PALETTE = [
  '#D3C2B3', '#8E9B90', '#7C899B', '#F5EAE0',
  '#4A4A4A', '#E6A473', '#B2837A', '#9B7A5C',
  '#D7BFA8', '#6D6D6D', '#C9A989', '#FFFFFF'
];

const BRAND_PALETTE = [
    '#ff3f6c', '#ffe2e9', '#282C3F', '#F5F5F6',
    '#ff3f6c', '#ffe2e9', '#282C3F', '#F5F5F6',
    '#ff3f6c', '#ffe2e9', '#282C3F', '#F5F5F6',
];

const shuffleArray = (array: string[]) => {
  let currentIndex = array.length, randomIndex;
  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
  }
  return array;
};

export const SwatchShuffleLoader = ({ message }: { message: string }) => {
  const [swatches, setSwatches] = useState(() => [...FASHION_PALETTE]);
  const [lockedCount, setLockedCount] = useState(0);
  const [isBrandTheme, setIsBrandTheme] = useState(false);

  useEffect(() => {
    const cycle = () => {
        // Lock in animation
        for (let i = 0; i <= FASHION_PALETTE.length; i++) {
            setTimeout(() => setLockedCount(i), i * 150);
        }
        
        // Transition to brand theme
        setTimeout(() => setIsBrandTheme(true), (FASHION_PALETTE.length * 150) + 500);
        
        // Shuffle and reset
        setTimeout(() => {
            setIsBrandTheme(false);
            setLockedCount(0);
            setSwatches(shuffleArray([...FASHION_PALETTE]));
        }, (FASHION_PALETTE.length * 150) + 1500);
    };

    cycle(); // Initial cycle
    const interval = setInterval(cycle, (FASHION_PALETTE.length * 150) + 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center gap-6 text-center w-full max-w-sm p-4">
      <div className="grid grid-cols-4 gap-2 w-48 h-36">
        {swatches.map((color, index) => {
          const isLocked = index < lockedCount;
          const finalColor = isBrandTheme ? BRAND_PALETTE[index] : color;

          return (
            <motion.div
              key={`${swatches.toString()}-${index}`} // Key change triggers shuffle animation
              layout
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="w-full h-full"
            >
              <motion.div
                className="w-full h-full rounded-md border-2"
                animate={{
                  backgroundColor: finalColor,
                  borderColor: isLocked && !isBrandTheme ? '#ff3f6c' : '#ffffff',
                  scale: isLocked && !isBrandTheme ? 1.1 : 1,
                  boxShadow: isLocked && !isBrandTheme ? '0px 0px 8px rgba(255, 63, 108, 0.5)' : '0px 0px 0px rgba(0,0,0,0)',
                }}
                transition={{ duration: 0.4 }}
              />
            </motion.div>
          );
        })}
      </div>
      <h1 className="text-xl font-serif font-semibold text-gray-800">{message}</h1>
      <StylingTips />
    </div>
  );
};

// --- Stitch Card Loader ---

export const StitchCardLoader = ({ message }: { message: string }) => {
    return (
        <div className="flex flex-col items-center justify-center gap-6 text-center w-full max-w-sm p-4">
            <div className="w-48 h-48 relative">
                <svg className="w-full h-full" viewBox="0 0 192 192" fill="none" xmlns="http://www.w3.org/2000/svg">
                    {/* The faint outline of the skirt */}
                    <path d="M60 40 H132 L172 148 H20 L60 40 Z" fill="#F3F4F6" stroke="#E5E7EB" strokeWidth="2" />
                    
                    {/* The animated stitching */}
                    <motion.path
                      d="M60 40 H132 L172 148 H20 L60 40"
                      stroke="#ff3f6c"
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeDasharray="10 10"
                      initial={{ pathLength: 0, strokeDashoffset: 10 }}
                      animate={{ pathLength: 1, strokeDashoffset: 0 }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    />
                     {/* The knot animation at the end */}
                    <motion.g
                        transform="translate(60, 40)"
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: [0, 1, 1, 0] }}
                        transition={{ duration: 2, repeat: Infinity, times: [0, 0.1, 0.9, 1] }}
                    >
                        <circle cx="0" cy="0" r="5" fill="#ff3f6c" />
                    </motion.g>
                </svg>
            </div>
            <h1 className="text-xl font-serif font-semibold text-gray-800">{message}</h1>
            <StylingTips />
        </div>
    );
};


// --- Outfit Slot Machine Loader ---

const tops = ['👕', '👚', '👗', '👘', '🧥'];
const bottoms = ['👖', '🩳', '👢', '🥻', '🩱'];
const extras = ['👠', '👟', '👜', '👒', '🕶'];

const Reel = ({ icons, duration, isSpinning }: { icons: string[], duration: number, isSpinning: boolean }) => {
  const reelHeight = icons.length * 96; // 6rem (h-24) per icon
  const animation = { y: `-${reelHeight}px` };
  const transition = {
    duration,
    ease: 'linear' as const,
    repeat: Infinity,
  };

  return (
    <div className="h-24 w-24 overflow-hidden bg-gray-100/50 rounded-lg shadow-inner">
      <motion.div
        className="flex flex-col"
        animate={isSpinning ? animation : { y: 0 }}
        transition={isSpinning ? transition : { duration: 0 }}
      >
        {[...icons, ...icons].map((icon, i) => (
          <div key={i} className="w-24 h-24 flex items-center justify-center flex-shrink-0 text-6xl">
            {icon}
          </div>
        ))}
      </motion.div>
    </div>
  );
};

export const OutfitSlotMachineLoader = ({ message }: { message: string }) => {
    const [isSpinning, setIsSpinning] = useState(false);
    const leverY = useMotionValue(0);

    const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        // If pulled down sufficiently and not already spinning, start the reels
        if (info.offset.y > 40 && !isSpinning) {
            setIsSpinning(true);
        }
        // Animate the lever back to its starting position with a spring effect
        animate(leverY, 0, {
            type: 'spring',
            stiffness: 500,
            damping: 15,
        });
    };

    return (
        <div className="flex flex-col items-center justify-center gap-6 text-center w-full max-w-sm p-4">
            <div className="flex gap-4 items-center">
                <div className="flex gap-4">
                    <Reel icons={tops} duration={0.5} isSpinning={isSpinning} />
                    <Reel icons={bottoms} duration={0.7} isSpinning={isSpinning} />
                    <Reel icons={extras} duration={0.9} isSpinning={isSpinning} />
                </div>
                {/* Interactive Lever */}
                <div className="ml-4 h-32 flex flex-col items-center justify-start pt-3">
                    <div className="w-1.5 h-16 bg-gray-300 rounded-t-full relative">
                        {/* The draggable handle of the lever */}
                        <motion.div
                            style={{ y: leverY }}
                            drag="y"
                            dragConstraints={{ top: 0, bottom: 50 }}
                            dragElastic={0.1}
                            onDragEnd={handleDragEnd}
                            className="absolute -top-3 -left-2.5 w-7 h-7 bg-red-500 rounded-full border-2 border-red-700 shadow-lg cursor-grab active:cursor-grabbing"
                            whileTap={{ scale: 1.1 }}
                        />
                    </div>
                    {/* The base of the lever */}
                    <div className="w-10 h-10 rounded-full bg-gray-400 border-2 border-gray-500 -mt-2 flex items-center justify-center shadow-inner">
                         <div className="w-2 h-2 rounded-full bg-gray-600"></div>
                    </div>
                </div>
            </div>

            <h1 className="text-xl font-serif font-semibold text-gray-800">
                {isSpinning ? message : "Outfit on the way..."}
            </h1>
            
            <AnimatePresence>
                {!isSpinning && (
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1, transition: { delay: 0.2 } }}
                        exit={{ opacity: 0 }}
                        className="text-sm text-gray-500 -mt-2"
                    >
                        Pull the lever to start!
                    </motion.p>
                )}
            </AnimatePresence>

            <StylingTips />
        </div>
    );
};