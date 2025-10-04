/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloudIcon, UserIcon, SparklesIcon } from './icons';
import { Compare } from './ui/compare';
import { generateModelImage } from '../services/geminiService';
import Spinner from './Spinner';
import { getFriendlyErrorMessage } from '../lib/utils';

interface StartScreenProps {
  onModelFinalized: (modelUrl: string, modelFile: File, isResumed?: boolean) => void;
  onImageUpload?: () => void;
  allowPreviousModel?: boolean;
}

const SparkleReveal = () => (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
      <svg width="100%" height="100%" viewBox="0 0 500 750" className="absolute opacity-50">
        <motion.path
          d="M250 375 L 250 0"
          fill="none"
          stroke="url(#sparkle-grad)"
          strokeWidth="2"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: [0, 1, 0] }}
          transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
        />
        <motion.path
          d="M250,375 C400,100 450,500 250,750 C50,500 100,100 250,375 Z"
          fill="none"
          stroke="url(#sparkle-grad)"
          strokeWidth="2"
          strokeDasharray="5 10"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: [0, 0.7, 0] }}
          transition={{ duration: 1.5, ease: 'easeInOut', delay: 0.3 }}
        />
        <defs>
          <linearGradient id="sparkle-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: 'rgba(255,210,0,0.8)', stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: 'rgba(255,60,111,0.8)', stopOpacity: 1 }} />
          </linearGradient>
        </defs>
      </svg>
    </div>
);

const StartScreen: React.FC<StartScreenProps> = ({ onModelFinalized, onImageUpload, allowPreviousModel = true }) => {
  const [userImageFile, setUserImageFile] = useState<File | null>(null);
  const [userImageUrl, setUserImageUrl] = useState<string | null>(null);
  const [generatedModelUrl, setGeneratedModelUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previousModelUrl, setPreviousModelUrl] = useState<string | null>(null);
  
  useEffect(() => {
    try {
      const savedModel = localStorage.getItem('previousModelUrl');
      if (savedModel) {
        setPreviousModelUrl(savedModel);
      }
    } catch (error) {
      console.error("Could not read from localStorage", error);
    }
  }, []);

  const handleFileSelect = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
        setError('Please select an image file.');
        return;
    }

    onImageUpload?.();
    setUserImageFile(file);
    const reader = new FileReader();
    reader.onload = async (e) => {
        const dataUrl = e.target?.result as string;
        setUserImageUrl(dataUrl);
        setIsGenerating(true);
        setGeneratedModelUrl(null);
        setError(null);
        try {
            const result = await generateModelImage(file);
            setGeneratedModelUrl(result);
        } catch (err) {
            setError(getFriendlyErrorMessage(err, 'Failed to create model'));
            setUserImageUrl(null);
        } finally {
            setIsGenerating(false);
        }
    };
    reader.readAsDataURL(file);
  }, [onImageUpload]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const usePreviousModel = async () => {
    if (previousModelUrl) {
        try {
            const response = await fetch(previousModelUrl);
            const blob = await response.blob();
            const file = new File([blob], 'previous-model.png', { type: blob.type });
            onModelFinalized(previousModelUrl, file, true);
        } catch (err) {
            setError("Could not load the previous model. Please upload a new photo.");
            localStorage.removeItem('previousModelUrl');
            setPreviousModelUrl(null);
        }
    }
  };

  const handleFinalize = () => {
      if (generatedModelUrl && userImageFile) {
          onModelFinalized(generatedModelUrl, userImageFile, false);
      }
  }

  const reset = () => {
    setUserImageFile(null);
    setUserImageUrl(null);
    setGeneratedModelUrl(null);
    setIsGenerating(false);
    setError(null);
  };

  const screenVariants = {
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0, transition: { staggerChildren: 0.1, delayChildren: 0.2 } },
    exit: { opacity: 0, x: 20 },
  };

  const itemVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 100 } },
  };

  const titleText = "Myntra’s Magical Mirror";
  const titleVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.5, // Stagger between lines
      },
    },
  };

  const lineVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05, // Stagger characters within a line
      },
    },
  };

  const letterVariants = {
    hidden: { opacity: 0, y: 20, filter: 'blur(6px)' },
    visible: {
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      transition: {
        type: 'tween' as const,
        duration: 0.6,
        ease: [0.25, 0.46, 0.45, 0.94],
      },
    },
  };

  const sparkleSweepVariant = {
      hidden: { left: '-10%', opacity: 0 },
      visible: { 
          left: '110%', 
          opacity: [0, 1, 0.5, 0],
          transition: { duration: 1.2, ease: 'easeInOut' as const, delay: 1.35 }
      }
  }

  return (
    <AnimatePresence mode="wait">
      {!userImageUrl ? (
        <motion.div
          key="uploader"
          className="w-full max-w-7xl mx-auto flex flex-col lg:flex-row items-center lg:items-start justify-center gap-8 lg:gap-16 p-8 lg:p-12 bg-gray-50/80 rounded-2xl shadow-inner"
          variants={screenVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.4, ease: "easeInOut" }}
        >
          <div className="lg:w-1/2 flex flex-col items-center lg:items-start text-center lg:text-left">
            <div className="max-w-lg">
              <div className="relative">
                <motion.h1
                  variants={titleVariants}
                  initial="hidden"
                  animate="visible"
                  className="text-6xl md:text-7xl font-serif font-bold text-gray-900 leading-tight"
                  aria-label={titleText}
                >
                  <motion.div variants={lineVariants}>
                    {"Myntra’s Magical".split("").map((char, index) => (
                      <motion.span
                        key={`l1-${index}`}
                        variants={letterVariants}
                        className="inline-block"
                      >
                        {char === " " ? "\u00A0" : char}
                      </motion.span>
                    ))}
                  </motion.div>
                  <motion.div variants={lineVariants}>
                    {"Mirror".split("").map((char, index) => (
                      <motion.span
                        key={`l2-${index}`}
                        variants={letterVariants}
                        className="inline-block"
                      >
                        {char}
                      </motion.span>
                    ))}
                  </motion.div>
                   <motion.div 
                    variants={sparkleSweepVariant}
                    className="absolute top-0 w-12 h-full bg-gradient-to-r from-transparent via-gray-400/50 to-transparent -skew-x-12"
                   />
                </motion.h1>
                <SparklesIcon className="absolute -top-5 -left-8 w-14 h-14 text-primary-400 animate-float" />
                <SparklesIcon className="absolute -bottom-5 -right-8 w-10 h-10 text-primary-400 animate-float [animation-delay:-3s]" />
              </div>
              <motion.p variants={itemVariants} className="mt-4 text-base text-gray-600">
                Step into a personalized styling experience. Create your AI model to get personalized recommendations and try on outfits instantly.
              </motion.p>
              <motion.hr variants={itemVariants} className="my-8 border-gray-300" />
              <motion.div variants={itemVariants} className="flex flex-col items-center lg:items-start w-full gap-3">
                <motion.label
                    htmlFor="image-upload-start"
                    className="w-full relative flex items-center justify-center px-7 py-3 text-base font-semibold text-white bg-primary-600 rounded-lg cursor-pointer group hover:bg-primary-700 transition-all duration-300 transform hover:scale-105 shadow-lg sparkle-accent"
                    whileHover={{ boxShadow: '0 10px 20px rgba(255, 63, 108, 0.3)' }}
                    whileTap={{ scale: 0.98 }}
                >
                  <UploadCloudIcon className="w-5 h-5 mr-3" />
                  Upload Your Photo
                </motion.label>
                {allowPreviousModel && previousModelUrl && (
                  <motion.button
                    onClick={usePreviousModel}
                    className="w-full relative flex items-center justify-center px-8 py-3 text-base font-semibold text-primary-600 bg-white border-2 border-primary-600 rounded-md cursor-pointer group hover:bg-primary-50 transition-all duration-300 transform hover:scale-105 shadow-lg sparkle-accent"
                    whileHover={{ boxShadow: '0 10px 20px rgba(0,0,0,0.1)' }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <UserIcon className="w-5 h-5 mr-3" />
                    Use Previous Model
                  </motion.button>
                )}
                <input id="image-upload-start" type="file" className="hidden" accept="image/png, image/jpeg, image/webp" onChange={handleFileChange} />
                <p className="text-gray-500 text-sm">Select a clear, full-body photo for the best results. Your AI stylist awaits.</p>
                {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
              </motion.div>
            </div>
          </div>
          <motion.div variants={itemVariants} className="w-full lg:w-1/2 flex flex-col items-center justify-start lg:pt-8">
             <motion.div 
              className="relative p-2 bg-gray-100 border border-gray-200 rounded-3xl shadow-xl animate-float group"
              whileHover={{ scale: 1.03, transition: { type: 'spring', stiffness: 300 } }}
            >
              <SparkleReveal />
              <Compare
                firstImage="https://i.postimg.cc/DZHrTz4R/Generated-Image-September-22-2025-1-34-PM.png"
                secondImage="https://i.postimg.cc/gJVzYSxd/image-1.png"
                slideMode="hover"
                className="w-full max-w-md aspect-[2/3] rounded-2xl bg-gray-200"
              />
              <div className="absolute inset-2 border-2 border-gray-300 rounded-2xl pointer-events-none group-hover:border-gray-400 transition-colors" />
            </motion.div>
            <p className="mt-6 text-lg font-serif text-gray-800 animate-fadeUp opacity-0 transition-colors hover:text-primary-600 cursor-default" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>“Mirror, mirror on the wall, find the fit that flatters all.”</p>
          </motion.div>
        </motion.div>
      ) : (
        <motion.div
          key="compare"
          className="w-full max-w-6xl mx-auto h-full flex flex-col md:flex-row items-center justify-center gap-8 md:gap-12"
          variants={screenVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.4, ease: "easeInOut" }}
        >
          <div className="md:w-1/2 flex-shrink-0 flex flex-col items-center md:items-start">
            <div className="text-center md:text-left">
              <motion.h1 variants={itemVariants} className="text-4xl md:text-5xl font-serif font-bold text-gray-900 leading-tight">
                Your AI Model is Ready
              </motion.h1>
              <motion.p variants={itemVariants} className="mt-2 text-md text-gray-600">
                Drag the slider to compare. When you're ready, enter the Magic Mirror.
              </motion.p>
            </div>
            
            {isGenerating && (
              <motion.div variants={itemVariants} className="flex items-center gap-3 text-lg text-gray-700 font-serif mt-6">
                <Spinner />
                <span>Generating your model...</span>
              </motion.div>
            )}

            {error && 
              <motion.div variants={itemVariants} className="text-center md:text-left text-red-600 max-w-md mt-6">
                <p className="font-semibold">Generation Failed</p>
                <p className="text-sm mb-4">{error}</p>
                <button onClick={reset} className="text-sm font-semibold text-gray-700 hover:underline">Try Again</button>
              </motion.div>
            }
            
            <AnimatePresence>
              {generatedModelUrl && !isGenerating && !error && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.5 }}
                  className="flex flex-col sm:flex-row items-center gap-4 mt-8"
                >
                  <motion.button 
                    onClick={reset}
                    className="w-full sm:w-auto px-6 py-3 text-base font-semibold text-gray-700 bg-gray-200 rounded-md cursor-pointer hover:bg-gray-300 transition-colors shadow-lg"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Try Another Photo
                  </motion.button>
                  <motion.button 
                    onClick={handleFinalize}
                    className="w-full sm:w-auto relative inline-flex items-center justify-center px-8 py-3 text-base font-semibold text-white bg-primary-600 rounded-md cursor-pointer group hover:bg-primary-700 transition-colors animate-pulse-bright shadow-lg sparkle-accent"
                    whileHover={{ scale: 1.05, boxShadow: '0 10px 20px rgba(255, 63, 108, 0.3)' }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Enter the Magic Mirror
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <motion.div variants={itemVariants} className="md:w-1/2 w-full flex items-center justify-center">
            <motion.div 
              className={`relative p-2 bg-gray-100 border rounded-3xl shadow-2xl animate-float group transition-all duration-700 ease-in-out ${isGenerating ? 'border border-gray-300' : 'border-2 border-gray-400'}`}
              whileHover={{ scale: 1.03, transition: { type: 'spring', stiffness: 300 } }}
            >
              <Compare
                firstImage={userImageUrl}
                secondImage={generatedModelUrl ?? userImageUrl}
                slideMode="drag"
                className="w-[280px] h-[420px] sm:w-[320px] sm:h-[480px] lg:w-[400px] lg:h-[600px] rounded-2xl bg-gray-200"
              />
              <AnimatePresence>
                {isGenerating && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-10"
                    >
                        <div className="mist-overlay rounded-2xl overflow-hidden"></div>
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent animate-shimmer bg-[length:200%_100%] rounded-2xl"/>
                    </motion.div>
                )}
              </AnimatePresence>
               <div className="absolute inset-2 border-2 border-gray-300 rounded-2xl pointer-events-none group-hover:border-gray-400 transition-colors" />
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default StartScreen;