/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Types
import { WardrobeItem, OutfitLayer, AnalysisResult, SavedOutfit, ChatbotContext, CartItem, ClothingCategory, BackgroundTheme } from '../types';
import { View } from '../App';

// Services
import { 
    generateVirtualTryOnImage, 
    generatePoseVariation, 
    analyzeUserProfile, 
    getStylistRecommendations,
    getAccessoryNudgeDecision,
    generateBackgroundChange
} from '../services/geminiService';

// Components
import StartScreen from './StartScreen';
import Canvas from './Canvas';
import WardrobePanel from './WardrobeModal';
import AnalysisPanel from './AnalysisPanel';
import RecommendationCarousel from './RecommendationCarousel';
import { getFriendlyErrorMessage, urlToFile, setSessionData, getSessionData, clearSessionData } from '../lib/utils';
import { allWardrobeItems, BACKGROUND_THEMES } from '../wardrobe';
import { SparklesIcon, XIcon, CheckIcon, ChevronRightIcon, PlusIcon, Trash2Icon, HeartIconFilled, HeartIcon, ShoppingBagIcon } from './icons';
import { SwatchShuffleLoader } from './EngagingLoader';
import Spinner from './Spinner';
import { ProductCard } from './ProductCard';

// --- Sub-Components for Magic Mirror Flow ---

type MagicMirrorStep = 'start' | 'analyzing' | 'analysis_report' | 'recommendations' | 'studio';
const STEPS_CONFIG = ['Create Model', 'AI Analysis', 'Recommendations', 'Studio'];

const stepMapping: Record<MagicMirrorStep, number> = {
    start: 0,
    analyzing: 1,
    analysis_report: 1,
    recommendations: 2,
    studio: 3,
};

const StepIndicator = ({ currentStep, steps }: { currentStep: number; steps: string[] }) => (
    <div className="w-full max-w-2xl mx-auto py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
            {steps.map((label, index) => (
                <React.Fragment key={label}>
                    <div className="flex flex-col items-center text-center w-24">
                        <motion.div
                            className={`w-8 h-8 rounded-full flex items-center justify-center border-2 font-bold transition-all duration-500 ${index === currentStep ? 'animate-pulse-bright shadow-lg' : ''}`}
                            animate={{
                                backgroundColor: index <= currentStep ? '#ff3f6c' : '#ffffff',
                                borderColor: index <= currentStep ? '#ff3f6c' : '#d1d5db',
                                color: index <= currentStep ? '#ffffff' : '#4b5563',
                            }}
                        >
                             <AnimatePresence mode="wait" initial={false}>
                                {index < currentStep ? (
                                    <motion.div
                                    key="check"
                                    initial={{ scale: 0.5, rotate: -90, opacity: 0 }}
                                    animate={{ scale: 1, rotate: 0, opacity: 1 }}
                                    exit={{ scale: 0.5, rotate: 90, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    >
                                    <CheckIcon className="h-5 w-5" />
                                    </motion.div>
                                ) : (
                                    <motion.span
                                    key="number"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    >
                                    {index + 1}
                                    </motion.span>
                                )}
                            </AnimatePresence>
                        </motion.div>
                        <p className={`mt-2 text-xs font-semibold transition-colors ${index <= currentStep ? 'text-gray-800' : 'text-gray-500'}`}>{label}</p>
                    </div>
                    {index < steps.length - 1 && (
                        <motion.div 
                            className="flex-1 h-0.5 bg-gray-300"
                            initial={false}
                            animate={{
                                background: `linear-gradient(to right, #ff3f6c ${index < currentStep ? 100 : 0}%, #d1d5db ${index < currentStep ? 100 : 0}%)`
                            }}
                            transition={{ duration: 0.5, ease: "easeInOut" as const }}
                        />
                    )}
                </React.Fragment>
            ))}
        </div>
    </div>
);

const AnalysisReportView = ({ analysis, onNext, modelImageUrl }: {
    analysis: AnalysisResult,
    onNext: () => void,
    modelImageUrl: string | null
}) => {
    return (
        <div className="w-full h-full flex flex-col items-center justify-center p-4 sm:p-8 bg-transparent overflow-y-auto">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { staggerChildren: 0.2, delayChildren: 0.2 } }}
                className="w-full max-w-6xl mx-auto flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-12"
            >
                <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, ease: 'easeOut' as const }}
                    className="w-full max-w-sm lg:w-2/5 flex-shrink-0"
                >
                    <img
                        src={modelImageUrl!}
                        alt="Your AI Model"
                        className="rounded-2xl shadow-xl aspect-[2/3] w-full object-cover"
                    />
                </motion.div>

                <div className="w-full lg:w-3/5 flex flex-col items-center lg:items-start text-center lg:text-left">
                     <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, ease: 'easeOut' as const }}
                    >
                        <SparklesIcon className="w-16 h-16 text-primary-500" />
                    </motion.div>
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, ease: 'easeOut' as const, delay: 0.1 }}
                        className="text-4xl md:text-5xl font-serif font-bold text-gray-900 mt-4"
                    >
                        Your AI Style Profile is Ready!
                    </motion.h1>
                    <motion.p
                         initial={{ opacity: 0, y: 20 }}
                         animate={{ opacity: 1, y: 0 }}
                         transition={{ duration: 0.5, ease: 'easeOut' as const, delay: 0.2 }}
                        className="mt-2 max-w-2xl text-lg text-gray-600"
                    >
                         We've analyzed your photo to create a personalized style profile. This will help us recommend items that perfectly suit you.
                    </motion.p>
                     <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, ease: 'easeOut' as const, delay: 0.3 }}
                        className="mt-8 w-full max-w-3xl"
                    >
                        <div className="p-8 rounded-xl bg-primary-50 border border-primary-200 w-full grid grid-cols-1 sm:grid-cols-3 gap-6 text-left">
                            <div>
                                <p className="text-xs font-bold text-primary-700 uppercase">Gender</p>
                                <p className="font-semibold text-gray-800 text-lg capitalize">{analysis.gender}</p>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-primary-700 uppercase">Body Type</p>
                                <p className="font-semibold text-gray-800 text-lg capitalize">{analysis.bodyType}</p>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-primary-700 uppercase">Skin Undertone</p>
                                <p className="font-semibold text-gray-800 text-lg capitalize">{analysis.skinTone}</p>
                            </div>
                            <div className="sm:col-span-3">
                                <p className="text-xs font-bold text-primary-700 uppercase">Recommended Styles</p>
                                <p className="text-sm text-gray-800 capitalize">{analysis.recommendedStyles.join(', ')}</p>
                            </div>
                            <div className="sm:col-span-3">
                                <p className="text-xs font-bold text-primary-700 uppercase mb-2">Flattering Colors</p>
                                <div className="flex flex-wrap gap-3">
                                    {analysis.recommendedColors.map(color => (
                                        <div key={color.hex} className="flex items-center gap-2" title={color.name}>
                                            <div className="w-6 h-6 rounded-full border border-black/10 shadow-sm" style={{ backgroundColor: color.hex }} />
                                            <span className="text-sm text-gray-700 capitalize">{color.name}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </motion.div>

                     <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, ease: 'easeOut' as const, delay: 0.4 }}
                        className="mt-10"
                    >
                        <motion.button
                            onClick={onNext}
                            className="w-full sm:w-auto px-10 py-3 text-base font-semibold text-white bg-primary-600 rounded-md cursor-pointer hover:bg-primary-700 transition-colors"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            See My Recommendations <ChevronRightIcon className="inline w-5 h-5 ml-1" />
                        </motion.button>
                    </motion.div>
                </div>
            </motion.div>
        </div>
    );
};

const RecommendationView = ({ items, onAddToWishlist, wishlist, onFinish, cartItems, onAddToBag, onRemoveFromBag }: { 
    items: WardrobeItem[], 
    onAddToWishlist: (item: WardrobeItem) => void, 
    wishlist: WardrobeItem[], 
    onFinish: () => void,
    cartItems: CartItem[],
    onAddToBag: (item: WardrobeItem) => void,
    onRemoveFromBag: (itemId: string) => void,
}) => {
    const wishlistIds = useMemo(() => new Set(wishlist.map(item => item.id)), [wishlist]);

    return (
        <div className="w-full h-full flex flex-col items-center p-8 bg-transparent overflow-y-auto">
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="text-center max-w-2xl mx-auto"
            >
                <h1 className="text-4xl md:text-5xl font-serif font-bold text-gray-900 leading-tight">Styled For You</h1>
                <p className="mt-2 text-lg text-gray-600">Based on your AI analysis, we think you'll love these. Add your favorites to your wishlist before heading to the studio!</p>
            </motion.div>
            <motion.div
                className="w-full max-w-6xl mx-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-6 gap-y-10 mt-12"
                initial="hidden"
                animate="visible"
                variants={{
                    hidden: {},
                    visible: { transition: { staggerChildren: 0.05 } }
                }}
            >
                {items.map(item => (
                    <ProductCard
                        key={item.id}
                        item={item}
                        isWishlisted={wishlistIds.has(item.id)}
                        onAddToWishlist={onAddToWishlist}
                        cartItems={cartItems}
                        onAddToBag={onAddToBag}
                        onRemoveFromBag={onRemoveFromBag}
                    />
                ))}
            </motion.div>
            <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: items.length * 0.05 }}
                onClick={onFinish}
                className="mt-12 relative inline-flex items-center justify-center px-10 py-4 text-lg font-semibold text-white bg-primary-600 rounded-md cursor-pointer group hover:bg-primary-700 transition-colors"
            >
                Enter Studio
            </motion.button>
        </div>
    );
};

const CurrentOutfitStack = ({ outfitHistory, onRemoveGarment, disabled, onAddToBag, onSaveOutfit, currentPreviewUrl }: {
    outfitHistory: OutfitLayer[];
    onRemoveGarment: (garmentId: string) => void;
    disabled: boolean;
    onAddToBag: (item: WardrobeItem) => void;
    onSaveOutfit: (items: WardrobeItem[], previewUrl: string) => void;
    currentPreviewUrl: string | null;
}) => {
    const wornItems = outfitHistory.slice(1); // Exclude the base model layer
    const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');

    const handleSave = () => {
        const itemsToSave = wornItems.map(layer => layer.garment).filter(Boolean) as WardrobeItem[];
        if (itemsToSave.length > 0 && currentPreviewUrl) {
            setSaveState('saving');
            onSaveOutfit(itemsToSave, currentPreviewUrl);
            setTimeout(() => {
                setSaveState('saved');
                setTimeout(() => setSaveState('idle'), 2000);
            }, 500);
        }
    };

    return (
        <motion.div layout className={`transition-opacity ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
            <div className="flex justify-between items-center border-b border-gray-400/50 pb-2 mb-4">
                <h2 className="text-base font-bold text-gray-800 tracking-wider uppercase">Current Outfit</h2>
                <button
                    onClick={handleSave}
                    disabled={wornItems.length === 0 || saveState !== 'idle'}
                    className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-all duration-200 ease-in-out border-2 border-gray-300 text-gray-800 hover:bg-gray-800 hover:text-white hover:border-gray-800 disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-200 disabled:cursor-not-allowed"
                >
                    <AnimatePresence mode="wait" initial={false}>
                        <motion.div
                            key={saveState}
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -5 }}
                            transition={{ duration: 0.2 }}
                            className="flex items-center gap-1.5"
                        >
                            {saveState === 'idle' && <><PlusIcon className="w-3 h-3"/> Save Outfit</>}
                            {saveState === 'saving' && <><Spinner /> Saving...</>}
                            {saveState === 'saved' && <><CheckIcon className="w-3 h-3"/> Saved!</>}
                        </motion.div>
                    </AnimatePresence>
                </button>
            </div>
            <div className="space-y-2">
                 <AnimatePresence>
                    {wornItems.length === 0 ? (
                         <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="text-sm text-gray-500 text-center py-2"
                        >
                            Your outfit is empty. Try on an item!
                        </motion.p>
                    ) : (
                        wornItems.map(({ garment }) => garment && (
                            <motion.div
                                key={garment.id}
                                layout
                                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, x: -20, transition: { duration: 0.2 } }}
                                className="flex items-center justify-between bg-white/50 p-2 rounded-lg border border-gray-200/80 shadow-sm"
                            >
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <img src={garment.url} alt={garment.name} className="w-12 h-12 object-cover rounded-md flex-shrink-0" />
                                    <span className="font-semibold text-sm text-gray-800 truncate">{garment.name}</span>
                                </div>
                                <div className="flex items-center">
                                    <button
                                        onClick={() => onAddToBag(garment)}
                                        className="flex-shrink-0 text-gray-500 hover:text-primary-600 p-2 rounded-md hover:bg-primary-50 transition-colors"
                                        aria-label={`Add ${garment.name} to bag`}
                                    >
                                        <ShoppingBagIcon className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => onRemoveGarment(garment.id)}
                                        className="flex-shrink-0 text-gray-500 hover:text-red-600 p-2 rounded-md hover:bg-red-50 transition-colors"
                                        aria-label={`Remove ${garment.name}`}
                                    >
                                        <Trash2Icon className="w-4 h-4" />
                                    </button>
                                </div>
                            </motion.div>
                        ))
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
};

const StudioSidebar = ({
    analysis,
    outfitHistory,
    onRemoveGarment,
    wishlist,
    onGarmentChange,
    isLoading,
    currentTheme,
    onSelectBackground,
    onAddToBag,
    onSaveOutfit,
    currentPreviewUrl,
}: {
    analysis: AnalysisResult | null;
    outfitHistory: OutfitLayer[];
    onRemoveGarment: (garmentId: string) => void;
    wishlist: WardrobeItem[];
    onGarmentChange: (item: WardrobeItem) => void;
    isLoading: boolean;
    currentTheme: BackgroundTheme;
    onSelectBackground: (theme: BackgroundTheme) => void;
    onAddToBag: (item: WardrobeItem) => void;
    onSaveOutfit: (items: WardrobeItem[], previewUrl: string) => void;
    currentPreviewUrl: string | null;
}) => (
     <aside className="w-full md:w-80 lg:w-96 flex-shrink-0 bg-white/60 backdrop-blur-xl border-r border-gray-200/80 p-6 flex flex-col">
        {/* Non-scrolling part */}
        <div className="flex-shrink-0 space-y-6">
             <AnalysisPanel analysis={analysis} />
             <div>
                <h2 className="text-base font-bold text-gray-800 tracking-wider uppercase mb-3">Backgrounds</h2>
                <div className="grid grid-cols-3 gap-2">
                    {BACKGROUND_THEMES.map(theme => (
                        <button
                            key={theme.id}
                            onClick={() => onSelectBackground(theme)}
                            disabled={isLoading}
                            className={`relative aspect-video rounded-md overflow-hidden border-2 transition-all hover:scale-105 ${currentTheme.id === theme.id ? 'border-primary-600 ring-2 ring-primary-300' : 'border-gray-300 hover:border-primary-400'}`}
                        >
                            <img src={theme.thumbnailUrl} alt={theme.name} className="w-full h-full object-cover"/>
                            <div className="absolute inset-0 bg-black/30 flex items-end p-1.5">
                                <p className="text-white text-[10px] font-bold leading-tight">{theme.name}</p>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
        {/* Scrolling part */}
        <div className="flex-grow overflow-y-auto mt-6 space-y-6 pt-6 border-t border-gray-400/50">
            <CurrentOutfitStack 
                outfitHistory={outfitHistory} 
                onRemoveGarment={onRemoveGarment} 
                disabled={isLoading} 
                onAddToBag={onAddToBag}
                onSaveOutfit={onSaveOutfit}
                currentPreviewUrl={currentPreviewUrl}
            />
            <WardrobePanel
                onGarmentSelect={(_, garmentInfo) => onGarmentChange(garmentInfo)}
                activeGarmentIds={outfitHistory.slice(1).map(l => l.garment?.id).filter((id): id is string => !!id)}
                isLoading={isLoading}
                wardrobe={wishlist}
            />
        </div>
     </aside>
);

// --- Main MagicMirrorView Component ---

interface MagicMirrorViewProps {
    onNavigate: (view: View, options?: { gender?: 'men' | 'women'; query?: string }) => void;
    wishlist: WardrobeItem[];
    onAddToWishlist: (item: WardrobeItem) => void;
    cartItems: CartItem[];
    onAddToBag: (item: WardrobeItem) => void;
    onRemoveFromBag: (itemId: string) => void;
    poseInstructions: string[];
    gender: 'men' | 'women' | null;
    onAnalysisComplete: (result: AnalysisResult) => void;
    onSaveOutfit: (items: WardrobeItem[], previewUrl: string) => void;
    outfitToLoad: SavedOutfit | null;
    onOutfitLoaded: () => void;
    onChatbotContextUpdate: (context: ChatbotContext | null) => void;
    setIsChatbotOpen: (isOpen: boolean) => void;
    itemToTryOn: WardrobeItem | null;
    onItemTriedOn: () => void;
    showToast: (message: string, onUndo?: () => void) => void;
    setShowAccessoryNudge: (show: boolean) => void;
    forceReset?: boolean;
    onResetProcessed?: () => void;
    currentView?: View;
}

interface MagicMirrorSession {
    step: MagicMirrorStep;
    userImageFile: File;
    modelImageUrl: string;
    outfitHistory: OutfitLayer[];
    currentPoseIndex: number;
    analysis: AnalysisResult;
    recommendations: WardrobeItem[];
}

const SESSION_KEY = 'magicMirrorSession';

const MagicMirrorView: React.FC<MagicMirrorViewProps> = (props) => {
    // State
    const [step, setStep] = useState<MagicMirrorStep>('start');
    const [sessionLoaded, setSessionLoaded] = useState(false);
    const [isImageUploadedInStart, setIsImageUploadedInStart] = useState(false);
    
    const [userImageFile, setUserImageFile] = useState<File | null>(null);
    const [modelImageUrl, setModelImageUrl] = useState<string | null>(null);
    const [outfitHistory, setOutfitHistory] = useState<OutfitLayer[]>([]);
    const [currentPoseIndex, setCurrentPoseIndex] = useState(0);
    const [currentTheme, setCurrentTheme] = useState<BackgroundTheme>(BACKGROUND_THEMES[0]);

    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [error, setError] = useState<string | null>(null);

    const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
    const [recommendations, setRecommendations] = useState<WardrobeItem[]>([]);

    // Derived State
    const currentOutfitLayer = useMemo(() => outfitHistory[outfitHistory.length - 1], [outfitHistory]);
    const displayImageUrl = useMemo(() => currentOutfitLayer?.poseImages[props.poseInstructions[currentPoseIndex]] || null, [currentOutfitLayer, props.poseInstructions, currentPoseIndex]);
    const availablePoseKeys = useMemo(() => currentOutfitLayer ? Object.keys(currentOutfitLayer.poseImages).sort((a, b) => props.poseInstructions.indexOf(a) - props.poseInstructions.indexOf(b)) : [], [currentOutfitLayer, props.poseInstructions]);
    
    // Session Management
    useEffect(() => {
        const loadSession = async () => {
            try {
                // If forceReset is true, clear any existing session and start fresh
                if (props.forceReset) {
                    await clearSessionData(SESSION_KEY);
                    setSessionLoaded(true);
                    props.onResetProcessed?.(); // Notify parent that reset was processed
                    return;
                }
                
                const session: MagicMirrorSession | undefined = await getSessionData(SESSION_KEY);
                if (session) {
                    setStep(session.step);
                    setUserImageFile(session.userImageFile);
                    setModelImageUrl(session.modelImageUrl);
                    setOutfitHistory(session.outfitHistory);
                    setCurrentPoseIndex(session.currentPoseIndex);
                    setAnalysis(session.analysis);
                    setRecommendations(session.recommendations);
                    props.onAnalysisComplete(session.analysis);
                }
            } catch (e) {
                console.error("Failed to load session:", e);
                await clearSessionData(SESSION_KEY);
            } finally {
                setSessionLoaded(true);
            }
        };
        loadSession();
    }, [props.forceReset]);

    const saveSession = useCallback(async () => {
        if (step !== 'start' && userImageFile && modelImageUrl && outfitHistory.length > 0 && analysis && recommendations.length > 0) {
            const session: MagicMirrorSession = {
                step,
                userImageFile,
                modelImageUrl,
                outfitHistory,
                currentPoseIndex,
                analysis,
                recommendations,
            };
            try {
                await setSessionData(SESSION_KEY, session);
            } catch (e) {
                console.error("Failed to save magic mirror session", e);
            }
        }
    }, [step, userImageFile, modelImageUrl, outfitHistory, currentPoseIndex, analysis, recommendations]);

    useEffect(() => {
        if (sessionLoaded) {
            saveSession();
        }
    }, [sessionLoaded, saveSession]);
    
    // Update chatbot context when outfit or analysis changes
    useEffect(() => {
        props.onChatbotContextUpdate({
            outfit: currentOutfitLayer || null,
            latestTryOnImage: displayImageUrl,
            analysis: analysis,
        });
    }, [currentOutfitLayer, displayImageUrl, analysis, props.onChatbotContextUpdate]);

    // Handlers
    const handleStartOver = async (reason?: string) => {
        if (reason) console.log(`Starting over due to: ${reason}`);
        await clearSessionData(SESSION_KEY);
        setStep('start');
        setIsImageUploadedInStart(false);
        setUserImageFile(null);
        setModelImageUrl(null);
        setOutfitHistory([]);
        setCurrentPoseIndex(0);
        setAnalysis(null);
        setRecommendations([]);
        setError(null);
        setLoadingMessage('');
    };

    const handleModelFinalized = async (url: string, file: File, isResumed: boolean = false) => {
        if (isResumed) {
            const session: MagicMirrorSession | undefined = await getSessionData(SESSION_KEY);
            if (session) {
                setStep(session.step);
                setUserImageFile(session.userImageFile);
                setModelImageUrl(session.modelImageUrl);
                setOutfitHistory(session.outfitHistory);
                setCurrentPoseIndex(session.currentPoseIndex);
                setAnalysis(session.analysis);
                setRecommendations(session.recommendations);
                props.onAnalysisComplete(session.analysis);
                setStep('studio');
                return;
            } else {
                isResumed = false; 
            }
        }
        
        setModelImageUrl(url);
        setUserImageFile(file);
        const firstPose = props.poseInstructions[0];
        setOutfitHistory([{ garment: null, poseImages: { [firstPose]: url } }]);
        
        setStep('analyzing');
        setError(null);
        
        try {
            setLoadingMessage('Analyzing Your Style Profile...');
            const analysisResult = await analyzeUserProfile(file);
            
            setLoadingMessage('Curating Your Recommendations...');
            const detectedGender = analysisResult.gender;
            const wardrobeForGender = allWardrobeItems.filter(item => item.gender === detectedGender && item.category !== 'accessories');
            const stylistPrompt = `Based on my AI-driven body and skin tone analysis, suggest a few complete outfits for me, a ${detectedGender}, from the available wardrobe that would be most flattering.`;
            const stylistResult = await getStylistRecommendations(stylistPrompt, wardrobeForGender, detectedGender, undefined, analysisResult);
            const recommendedIds = new Set(stylistResult.recommendedProductIds);
            const recommendedItems = wardrobeForGender.filter(item => recommendedIds.has(item.id));
            
            console.log('📋 Analysis result received:', analysisResult);
            console.log('🎯 Recommendations received:', recommendedItems.length, 'items');
            
            // Set data and immediately set step to analysis_report
            setAnalysis(analysisResult);
            props.onAnalysisComplete(analysisResult);
            setRecommendations(recommendedItems);
            setStep('analysis_report');
            
            console.log('✅ Step set to analysis_report');

        } catch (err) {
            const friendlyError = getFriendlyErrorMessage(err, "Analysis failed");
            setError(friendlyError);
            console.error(err);
            setTimeout(() => handleStartOver(friendlyError), 3000); 
        } finally {
            setLoadingMessage('');
        }
    };
    
    const updateOutfit = useCallback(async (newGarmentList: WardrobeItem[]) => {
        if (!modelImageUrl || !outfitHistory[0]) return;
        
        setIsLoading(true);
        setError(null);
    
        try {
            const baseLayer = outfitHistory[0];
            const newHistory: OutfitLayer[] = [baseLayer];
            let lastImageUrl = baseLayer.poseImages[props.poseInstructions[0]] || modelImageUrl;
    
            for (let i = 0; i < newGarmentList.length; i++) {
                const garmentToApply = newGarmentList[i];
                setLoadingMessage(`Applying ${garmentToApply.name}...`);
                const garmentFile = await urlToFile(garmentToApply.url, garmentToApply.name);
                const newTryOnUrl = await generateVirtualTryOnImage(lastImageUrl, garmentFile, garmentToApply);
    
                const newLayer: OutfitLayer = {
                    garment: garmentToApply,
                    poseImages: { [props.poseInstructions[0]]: newTryOnUrl },
                };
                newHistory.push(newLayer);
                lastImageUrl = newTryOnUrl;
            }
    
            setOutfitHistory(newHistory);
            setCurrentPoseIndex(0);
            
            // FIX: The accessory nudge check is now non-blocking, so it doesn't delay the UI.
            if (newGarmentList.length > 0) {
                const accessories = allWardrobeItems.filter(i => i.category === 'accessories');
                getAccessoryNudgeDecision(newGarmentList, analysis, accessories).then(shouldNudge => {
                    if (shouldNudge) {
                        props.setShowAccessoryNudge(true);
                    }
                });
            }
    
        } catch (err) {
            setError(getFriendlyErrorMessage(err, 'Failed to update outfit'));
        } finally {
            setIsLoading(false);
            setLoadingMessage('');
        }
    }, [modelImageUrl, outfitHistory, analysis, props.poseInstructions, props.setShowAccessoryNudge]);

    const handleGarmentChange = (garment: WardrobeItem) => {
        let currentGarments = outfitHistory.slice(1).map(l => l.garment!);

        if (garment.category === 'accessories') {
            // For accessories, we replace based on subcategory to allow multiple different accessories.
            currentGarments = currentGarments.filter(g => g.subcategory !== garment.subcategory);
        } else if (garment.category === 'dresses') {
            // A dress replaces any clothing that isn't outerwear or another accessory.
            currentGarments = currentGarments.filter(g => g.category === 'accessories' || g.category === 'jackets' || g.category === 'coats');
        } else {
            // For other clothing items (tops, bottoms, outerwear)...
            // If we're adding a top or bottom, remove any existing dress.
            if (['tops', 't-shirts', 'shirts', 'sweaters', 'pants', 'skirts'].includes(garment.category)) {
                currentGarments = currentGarments.filter(g => g.category !== 'dresses');
            }
            // Replace any other item in the same category slot.
            currentGarments = currentGarments.filter(g => g.category !== garment.category);
        }
        
        currentGarments.push(garment);
        updateOutfit(currentGarments);
    };

    const handleRemoveGarment = (garmentId: string) => {
        const newGarmentList = outfitHistory.slice(1).map(l => l.garment!).filter(g => g.id !== garmentId);
        updateOutfit(newGarmentList);
    };

    const handleSelectPose = async (newPoseIndex: number) => {
        if (isLoading || newPoseIndex === currentPoseIndex || !currentOutfitLayer) return;
        const targetPoseInstruction = props.poseInstructions[newPoseIndex];

        if (currentOutfitLayer.poseImages[targetPoseInstruction]) {
            setCurrentPoseIndex(newPoseIndex);
            return;
        }

        setError(null);
        setIsLoading(true);
        setLoadingMessage(`Changing pose to: ${targetPoseInstruction}`);
        try {
          const baseImage = currentOutfitLayer.poseImages[props.poseInstructions[currentPoseIndex]];
          if (!baseImage) throw new Error("No base image available.");
    
          const newPoseImageUrl = await generatePoseVariation(baseImage, targetPoseInstruction);
    
          setOutfitHistory(prev => {
              const newHistory = [...prev];
              newHistory[newHistory.length - 1].poseImages[targetPoseInstruction] = newPoseImageUrl;
              return newHistory;
          });
          setCurrentPoseIndex(newPoseIndex);

        } catch (err) {
          setError(getFriendlyErrorMessage(err, 'Failed to change pose'));
        } finally {
          setIsLoading(false);
          setLoadingMessage('');
        }
    };

    const handleSelectBackground = async (theme: BackgroundTheme) => {
        if (isLoading || theme.id === currentTheme.id || !currentOutfitLayer || !userImageFile) return;
    
        setError(null);
        setIsLoading(true);
        setLoadingMessage(`Changing background to ${theme.name}...`);
        try {
            const baseImage = outfitHistory[outfitHistory.length - 1].poseImages[props.poseInstructions[currentPoseIndex]];
            if (!baseImage) throw new Error("Current outfit image not available for background change.");
    
            const newImageUrl = await generateBackgroundChange(baseImage, theme.prompt);
    
            setOutfitHistory(prev => {
              const newHistory = [...prev];
              const lastLayer = { ...newHistory[newHistory.length - 1] };
              lastLayer.poseImages[props.poseInstructions[currentPoseIndex]] = newImageUrl;
              newHistory[newHistory.length - 1] = lastLayer;
              return newHistory;
            });
    
            setCurrentTheme(theme);
        } catch (err) {
            setError(getFriendlyErrorMessage(err, 'Failed to change background'));
        } finally {
            setIsLoading(false);
            setLoadingMessage('');
        }
    };
    
    useEffect(() => {
        if (props.outfitToLoad && modelImageUrl) {
            updateOutfit(props.outfitToLoad.items);
            props.onOutfitLoaded();
        }
    }, [props.outfitToLoad, modelImageUrl, updateOutfit, props.onOutfitLoaded]);

    useEffect(() => {
        if (props.itemToTryOn) {
            handleGarmentChange(props.itemToTryOn);
            props.onItemTriedOn();
        }
    }, [props.itemToTryOn, props.onItemTriedOn]);

    const renderContent = () => {
        const motionProps = {
            key: step,
            initial: { opacity: 0, x: 30 },
            animate: { opacity: 1, x: 0 },
            exit: { opacity: 0, x: -30 },
            transition: { duration: 0.5, ease: 'easeInOut' as const },
            className: "w-full h-full flex flex-col items-center justify-center"
        };
    
        switch(step) {
          case 'start':
            return <motion.div {...motionProps}><StartScreen onModelFinalized={handleModelFinalized} onImageUpload={() => setIsImageUploadedInStart(true)} /></motion.div>;
          case 'analyzing':
            return (
                <motion.div {...motionProps}>
                    <SwatchShuffleLoader message={loadingMessage} />
                    {error && <p className="text-red-600 bg-red-100 p-2 rounded-md text-sm mt-2">{error}</p>}
                </motion.div>
            );
          case 'analysis_report':
            if (!analysis) return null;
            return <motion.div {...motionProps}><AnalysisReportView analysis={analysis} onNext={() => setStep('recommendations')} modelImageUrl={modelImageUrl} /></motion.div>;
          case 'recommendations':
            return <motion.div {...motionProps}><RecommendationView items={recommendations} onAddToWishlist={props.onAddToWishlist} wishlist={props.wishlist} onFinish={() => setStep('studio')} cartItems={props.cartItems} onAddToBag={props.onAddToBag} onRemoveFromBag={props.onRemoveFromBag} /></motion.div>;
          case 'studio':
            if (!modelImageUrl || !currentOutfitLayer) return null;
            return (
              <motion.div {...motionProps} className="w-full h-full">
                <div className="w-full h-full flex flex-col md:flex-row bg-transparent overflow-hidden">
                    <StudioSidebar
                        analysis={analysis}
                        outfitHistory={outfitHistory}
                        onRemoveGarment={handleRemoveGarment}
                        wishlist={props.wishlist}
                        onGarmentChange={handleGarmentChange}
                        isLoading={isLoading}
                        currentTheme={currentTheme}
                        onSelectBackground={handleSelectBackground}
                        onAddToBag={props.onAddToBag}
                        onSaveOutfit={props.onSaveOutfit}
                        currentPreviewUrl={displayImageUrl}
                    />
                    <main className="flex-grow h-full flex flex-col bg-transparent min-h-0 min-w-0">
                        <Canvas
                          displayImageUrl={displayImageUrl}
                          onStartOver={() => handleStartOver()}
                          isLoading={isLoading}
                          loadingMessage={loadingMessage}
                          onSelectPose={handleSelectPose}
                          poseInstructions={props.poseInstructions}
                          currentPoseIndex={currentPoseIndex}
                          availablePoseKeys={availablePoseKeys}
                          isComparing={false}
                          comparisonImageUrl={null}
                          onExitCompare={() => {}}
                        />
                        {recommendations.length > 0 && (
                          <RecommendationCarousel
                            items={recommendations}
                            onSelect={handleGarmentChange}
                            wishlist={props.wishlist}
                            onAddToWishlist={props.onAddToWishlist}
                            currentGarmentId={currentOutfitLayer.garment?.id}
                          />
                        )}
                    </main>
                </div>
              </motion.div>
            );
          default:
            return null;
        }
    };
    
    if (!sessionLoaded) {
        return <div className="w-full h-full flex items-center justify-center"><Spinner /></div>;
    }

    return (
        <div className="w-full h-full flex-grow flex flex-col bg-transparent relative overflow-hidden">
          {(step !== 'start' || isImageUploadedInStart) && <StepIndicator currentStep={stepMapping[step]} steps={STEPS_CONFIG} />}
          <div className="flex-grow flex items-center justify-center p-4 relative z-10 overflow-hidden">
            <AnimatePresence mode="wait">
                {renderContent()}
            </AnimatePresence>
          </div>
          
          {/* Top-level overlay for analysis report to ensure visibility above other overlays */}
          {props.currentView === 'magic_mirror' && step === 'analysis_report' && analysis && (
            <div className="fixed top-20 left-0 right-0 bottom-0 z-[80] bg-white/95 backdrop-blur-sm">
              <div className="w-full h-full flex items-center justify-center p-4">
                <AnalysisReportView 
                  analysis={analysis} 
                  onNext={() => setStep('recommendations')} 
                  modelImageUrl={modelImageUrl} 
                />
              </div>
            </div>
          )}
          
          {/* Top-level overlay for recommendations to ensure visibility above other overlays */}
          {props.currentView === 'magic_mirror' && step === 'recommendations' && recommendations.length > 0 && (
            <div className="fixed top-20 left-0 right-0 bottom-0 z-[80] bg-white/95 backdrop-blur-sm">
              <div className="w-full h-full flex items-center justify-center p-4">
                <RecommendationView 
                  items={recommendations} 
                  onAddToWishlist={props.onAddToWishlist} 
                  wishlist={props.wishlist} 
                  onFinish={() => setStep('studio')} 
                  cartItems={props.cartItems} 
                  onAddToBag={props.onAddToBag} 
                  onRemoveFromBag={props.onRemoveFromBag} 
                />
              </div>
            </div>
          )}
          
          {/* Top-level overlay for studio to ensure visibility above other overlays */}
          {props.currentView === 'magic_mirror' && step === 'studio' && modelImageUrl && currentOutfitLayer && (
            <div className="fixed top-20 left-0 right-0 bottom-0 z-[80] bg-white overflow-auto">
              <div className="w-full min-h-full flex flex-col md:flex-row bg-transparent">
                <StudioSidebar
                  analysis={analysis}
                  outfitHistory={outfitHistory}
                  onRemoveGarment={handleRemoveGarment}
                  wishlist={props.wishlist}
                  onGarmentChange={handleGarmentChange}
                  isLoading={isLoading}
                  currentTheme={currentTheme}
                  onSelectBackground={handleSelectBackground}
                  onAddToBag={props.onAddToBag}
                  onSaveOutfit={props.onSaveOutfit}
                  currentPreviewUrl={displayImageUrl}
                />
                <main className="flex-grow min-h-0 flex flex-col bg-transparent">
                  <Canvas
                    displayImageUrl={displayImageUrl}
                    onStartOver={() => handleStartOver()}
                    isLoading={isLoading}
                    loadingMessage={loadingMessage}
                    onSelectPose={handleSelectPose}
                    poseInstructions={props.poseInstructions}
                    currentPoseIndex={currentPoseIndex}
                    availablePoseKeys={availablePoseKeys}
                    isComparing={false}
                    comparisonImageUrl={null}
                    onExitCompare={() => {}}
                  />
                  {recommendations.length > 0 && (
                    <RecommendationCarousel
                      items={recommendations}
                      onSelect={handleGarmentChange}
                      wishlist={props.wishlist}
                      onAddToWishlist={props.onAddToWishlist}
                      currentGarmentId={currentOutfitLayer.garment?.id}
                    />
                  )}
                </main>
              </div>
            </div>
          )}
        </div>
    );
};

export default MagicMirrorView;