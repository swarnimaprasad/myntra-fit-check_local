/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AnalysisResult, WardrobeItem, ChatbotContext } from '../types';
import { getChatbotResponse } from '../services/geminiService';
import { MessageSquareIcon, XIcon, PaperAirplaneIcon, ImageIcon, Volume2Icon, VolumeXIcon, SparklesIcon, MicIcon, ChevronRightIcon } from './icons';
import Spinner from './Spinner';
import { allWardrobeItems } from '../wardrobe';
import { View } from '../App';

interface ChatbotProps {
    analysis: AnalysisResult | null;
    wardrobe: WardrobeItem[];
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    magicMirrorContext: ChatbotContext | null;
    onNavigate: (view: View, options?: { query?: string }) => void;
    onTryOnItem: (item: WardrobeItem) => void;
    onAddToWishlist: (item: WardrobeItem) => void;
    wishlist: WardrobeItem[];
    gender: 'men' | 'women' | null;
    showAccessoryNudge: boolean;
    setShowAccessoryNudge: (show: boolean) => void;
}

interface Message {
    id: string;
    sender: 'user' | 'bot';
    text: string;
    imagePreview?: string;
    suggestions?: string[];
}

interface ProductSuggestionCardProps {
    product: WardrobeItem;
    onNavigate: (view: View, options: { query: string }) => void;
    onTryOnItem: (item: WardrobeItem) => void;
}

const ProductSuggestionCard: React.FC<ProductSuggestionCardProps> = ({ product, onNavigate, onTryOnItem }) => (
    <div className="bg-white border border-gray-200 rounded-lg p-2 my-2 shadow-sm hover:shadow-md transition-shadow">
        <div 
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => onNavigate('search', { query: product.name })}
            title={`View ${product.name}`}
        >
            <img src={product.url} alt={product.name} className="w-16 h-16 object-cover rounded-md" />
            <div className="flex-grow">
                <p className="text-sm font-semibold text-gray-800">{product.name}</p>
                <p className="text-xs text-gray-600">{product.price}</p>
            </div>
        </div>
        <button 
            onClick={(e) => { e.stopPropagation(); onTryOnItem(product); }}
            className="text-xs font-semibold text-primary-600 hover:underline mt-2 w-full text-left pl-1"
        >
            Try in Magic Mirror
        </button>
    </div>
);


const TypingIndicator = () => (
    <div className="flex items-center justify-center gap-1.5 p-3">
        <motion.div
            className="w-2 h-2 bg-gray-400 rounded-full"
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
            className="w-2 h-2 bg-gray-400 rounded-full"
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 1, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
        />
        <motion.div
            className="w-2 h-2 bg-gray-400 rounded-full"
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 1, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
        />
    </div>
);

const Chatbot: React.FC<ChatbotProps> = ({ analysis, wardrobe, isOpen, setIsOpen, magicMirrorContext, onNavigate, onTryOnItem, onAddToWishlist, wishlist, gender, showAccessoryNudge, setShowAccessoryNudge }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isMuted, setIsMuted] = useState(true);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isListening, setIsListening] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const recognitionRef = useRef<any | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            const scrollHeight = textareaRef.current.scrollHeight;
            textareaRef.current.style.height = `${scrollHeight}px`;
        }
    }, [inputValue]);

    // Speech Recognition setup
    useEffect(() => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRecognition) {
            const recognition = new SpeechRecognition();
            recognition.continuous = false;
            recognition.interimResults = false;
            recognition.lang = 'en-US';

            recognition.onresult = (event: any) => {
                const transcript = event.results[0][0].transcript;
                setInputValue(prev => prev ? `${prev} ${transcript}` : transcript);
            };
            recognition.onerror = (event: any) => {
                console.error("Speech recognition error:", event.error);
                setIsListening(false);
            };
            recognition.onend = () => {
                setIsListening(false);
            };
            recognitionRef.current = recognition;
        }
    }, []);
    
    const handleMicClick = () => {
        if (!recognitionRef.current) return;
        if (isListening) {
            recognitionRef.current.stop();
        } else {
            recognitionRef.current.start();
            setIsListening(true);
        }
    };

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        return () => {
            window.speechSynthesis.cancel();
        };
    }, []);

    const speak = useCallback((text: string) => {
        if (isMuted || !('speechSynthesis' in window)) return;
        
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        
        const voices = window.speechSynthesis.getVoices();
        const femaleVoice = voices.find(voice => voice.name.includes('Female') || (voice as any).gender === 'female' || voice.lang.startsWith('en-'));
        if (femaleVoice) {
            utterance.voice = femaleVoice;
        }

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);
        window.speechSynthesis.speak(utterance);
    }, [isMuted]);
    
    useEffect(() => {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.onvoiceschanged = () => {};
        }
    }, []);

    useEffect(() => {
        if (!isOpen) {
            window.speechSynthesis.cancel();
            setIsSpeaking(false);
        }
    }, [isOpen]);

    const handleSendMessage = useCallback(async (messageText?: string, messageImageFile?: File, messageImagePreview?: string) => {
        const textToSend = messageText ?? inputValue.trim();
        const imageToSend = messageImageFile ?? imageFile;
        const imagePreviewToSend = messageImagePreview ?? imagePreview;
        
        if (!textToSend && !imageToSend) return;

        if (messageText === undefined) { // Only add user message if it's a real user action
            const userMessage: Message = {
                id: `user-${Date.now()}`,
                sender: 'user',
                text: textToSend,
                imagePreview: imagePreviewToSend || undefined,
            };
            setMessages(prev => [...prev, userMessage]);
        }
        
        setInputValue('');
        setImageFile(null);
        setImagePreview(null);
        setIsLoading(true);

        try {
            const botResponseText = await getChatbotResponse(textToSend, imageToSend, analysis, wardrobe, magicMirrorContext, wishlist, gender);
            
            const ttsRegex = /tts:"(.*?)"/;
            const ttsMatch = botResponseText.match(ttsRegex);
            const ttsText = ttsMatch ? ttsMatch[1] : '';
            
            let displayText = botResponseText.replace(/tts:".*?"\s*,?\s*/, '').trim();
            displayText = displayText.replace(/\*\*/g, '').replace(/^\s*[\*-]\s*/gm, '');

            const botMessage: Message = {
                id: `bot-${Date.now()}`,
                sender: 'bot',
                text: displayText,
            };
            setMessages(prev => [...prev, botMessage]);
            if(ttsText) speak(ttsText);

            if (botMessage.text.includes('[action:close_chat]')) {
                // The close action is handled by the render function.
                // We also clear messages after a delay to ensure a fresh start on reopen.
                setTimeout(() => {
                    setMessages([]);
                }, 2000); // Delay should be > close animation delay (1500ms)
            }

        } catch (error) {
            console.error("Chatbot error:", error);
            const errorMessage: Message = {
                id: `bot-error-${Date.now()}`,
                sender: 'bot',
                text: "I'm having a little trouble right now. Please try again in a moment.",
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    }, [inputValue, imageFile, imagePreview, analysis, wardrobe, magicMirrorContext, speak, wishlist, gender]);
    
    // Auto-critique and Welcome Message logic
    useEffect(() => {
        if (isOpen && messages.length === 0 && !isLoading) {
            if (magicMirrorContext) {
                // Magic Mirror Auto-Critique
                const critiquePrompt = "This is an automatic request. Based on my current outfit in the Magic Mirror, give me a brief, constructive opinion and suggest 1-2 tweaks or specific alternative items from the catalog.";
                handleSendMessage(critiquePrompt, null, null);
            } else {
                // General Welcome with suggested prompts
                const suggestedPrompts = [
                    'Analyze my photo & suggest colors',
                    'Build a look for a beach trip under ₹2000',
                    'Help me style an item from my wishlist',
                    'What should I wear for an evening party?',
                    'Recommend 3 jeans that flatter Rectangle body type',
                ];

                const welcomeMessage: Message = {
                    id: `bot-welcome-${Date.now()}`,
                    sender: 'bot',
                    text: "Hi! I'm Stylo, your AI stylist. Here are a few ideas to get started:",
                    suggestions: suggestedPrompts,
                };
                
                const followUpMessage: Message = {
                    id: `bot-followup-${Date.now()}`,
                    sender: 'bot',
                    text: "Send a photo or paste product IDs to get tailored picks."
                }
                
                setMessages([welcomeMessage, followUpMessage]);
                speak("Hi! I'm Stylo, your AI stylist. How can I help you today?");
            }
        }
    }, [isOpen, magicMirrorContext, messages.length, isLoading, handleSendMessage, speak]);


    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };
    
    const handleWishlistItemSelect = (selectedItem: WardrobeItem) => {
        const userText = `Style my "${selectedItem.name}"`;

        const userMessage: Message = {
            id: `user-${Date.now()}`,
            sender: 'user',
            text: userText,
        };
        setMessages(prev => [...prev, userMessage]);
        handleSendMessage(userText, undefined, undefined);
    };

    const WishlistChoiceCard: React.FC<{ item: WardrobeItem, onSelect: (item: WardrobeItem) => void }> = ({ item, onSelect }) => (
        <button 
            onClick={() => onSelect(item)}
            className="w-full flex items-center gap-3 p-2 my-2 bg-white rounded-lg border border-gray-200 hover:bg-gray-50 text-left transition-colors"
        >
            <img src={item.url} alt={item.name} className="w-12 h-12 object-cover rounded-md flex-shrink-0" />
            <div className="flex-grow overflow-hidden">
                <p className="font-semibold text-sm text-gray-800 truncate">{item.name}</p>
            </div>
            <ChevronRightIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
        </button>
    );

    const parseAndRenderText = (text: string) => {
        const closeChatMatch = text.match(/\[action:close_chat\]/);
        if (closeChatMatch) {
            setTimeout(() => {
                setIsOpen(false);
            }, 1500); // 1.5 second delay
        }

        const regex = /(\[product:[\w-]+\]|\[action:[\w-]+:[\w-]+\]|\[wishlist_choice:[\w-]+\]|\[action:close_chat\])/g;
        const parts = text.split(regex);
    
        return parts.map((part, index) => {
            if (!part) return null;
    
            if (part === '[action:close_chat]') {
                return null; // Don't render the action token
            }

            const productMatch = part.match(/\[product:(.*?)\]/);
            if (productMatch) {
                const productId = productMatch[1];
                const product = allWardrobeItems.find(p => p.id === productId);
                if (product) {
                    return <ProductSuggestionCard key={`${productId}-${index}`} product={product} onNavigate={onNavigate} onTryOnItem={onTryOnItem} />;
                }
                return null;
            }
    
            const actionMatch = part.match(/\[action:(\w+):([\w-]+)\]/);
            if (actionMatch) {
                const actionType = actionMatch[1];
                
                if (actionType === 'close_chat') {
                    return null; // Don't render the token
                }

                const itemId = actionMatch[2];
                const item = allWardrobeItems.find(p => p.id === itemId);
                if (!item) return null;
    
                if (actionType === 'try_on') {
                    return <button key={`${part}-${index}`} onClick={() => onTryOnItem(item)} className="text-primary-600 font-semibold hover:underline">Try it on</button>;
                }
                if (actionType === 'add_to_wishlist') {
                    return <button key={`${part}-${index}`} onClick={() => onAddToWishlist(item)} className="text-primary-600 font-semibold hover:underline">Add to wishlist</button>;
                }
            }
            
            const wishlistChoiceMatch = part.match(/\[wishlist_choice:(.*?)\]/);
            if (wishlistChoiceMatch) {
                const itemId = wishlistChoiceMatch[1];
                const item = wishlist.find(p => p.id === itemId);
                if (item) {
                    return <WishlistChoiceCard key={`${itemId}-${index}`} item={item} onSelect={handleWishlistItemSelect} />;
                }
                return null;
            }
    
            return <span key={index}>{part}</span>;
        });
    };

    return (
        <>
            <AnimatePresence>
                {showAccessoryNudge && !isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.9 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                        className="fixed bottom-24 right-6 z-[60] origin-bottom-right"
                    >
                        <button 
                            onClick={() => { setIsOpen(true); setShowAccessoryNudge(false); }}
                            className="bg-white rounded-lg shadow-lg p-3 flex items-center gap-2 border border-primary-200 hover:bg-primary-50 transition-colors"
                        >
                             <SparklesIcon className="w-5 h-5 text-primary-500 flex-shrink-0" />
                             <p className="text-sm font-semibold text-gray-800 whitespace-nowrap">See accessory recommendations</p>
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
            <motion.button
                whileHover={{ scale: 1.1, rotate: 5 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => {
                    setIsOpen(!isOpen);
                    setShowAccessoryNudge(false);
                }}
                className="fixed bottom-6 right-6 z-[60] bg-primary-600 text-white w-16 h-16 rounded-full shadow-lg flex items-center justify-center group"
                aria-label="Open chatbot"
            >
                <span className="absolute -top-8 -left-2 bg-gray-800 text-white text-xs font-bold px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">AI Stylist</span>
                <AnimatePresence mode="wait">
                    <motion.div
                        key={isOpen ? 'close' : 'open'}
                        initial={{ opacity: 0, rotate: -90, scale: 0.5 }}
                        animate={{ opacity: 1, rotate: 0, scale: 1 }}
                        exit={{ opacity: 0, rotate: 90, scale: 0.5 }}
                        transition={{ duration: 0.2 }}
                    >
                        {isOpen ? <XIcon className="w-8 h-8" /> : <MessageSquareIcon className="w-8 h-8" />}
                    </motion.div>
                </AnimatePresence>
            </motion.button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        className="fixed bottom-24 right-6 z-[55] w-80 h-[440px] bg-white rounded-2xl shadow-2xl border flex flex-col overflow-hidden"
                    >
                        <header className="flex-shrink-0 p-4 bg-gray-50 border-b flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <SparklesIcon className="w-6 h-6 text-primary-500" />
                                <h2 className="text-lg font-bold font-serif text-gray-800">Your AI Stylist</h2>
                            </div>
                             <button onClick={() => setIsMuted(!isMuted)} className="text-gray-500 hover:text-gray-800">
                                {isMuted ? <VolumeXIcon className="w-5 h-5" /> : <Volume2Icon className="w-5 h-5" />}
                             </button>
                        </header>

                        <div className="flex-grow p-4 overflow-y-auto">
                            <div className="space-y-4">
                                {messages.map(msg => (
                                    <motion.div
                                        key={msg.id}
                                        layout
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className={`flex items-end gap-2 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                                    >
                                        {msg.sender === 'bot' && <div className="w-7 h-7 bg-primary-100 rounded-full flex-shrink-0 flex items-center justify-center"><SparklesIcon className="w-4 h-4 text-primary-500" /></div>}
                                        <div className={`max-w-[80%] p-3 rounded-2xl ${msg.sender === 'user' ? 'bg-primary-600 text-white rounded-br-lg' : 'bg-gray-100 text-gray-800 rounded-bl-lg'}`}>
                                            {msg.imagePreview && <img src={msg.imagePreview} alt="upload preview" className="rounded-lg mb-2 max-h-40" />}
                                            <div className="text-sm whitespace-pre-wrap">{parseAndRenderText(msg.text)}</div>
                                            {msg.suggestions && msg.sender === 'bot' && (
                                                <div className="mt-3 flex flex-wrap gap-2">
                                                    {msg.suggestions.map((suggestion, index) => (
                                                        <motion.button
                                                            key={index}
                                                            onClick={() => {
                                                                setInputValue(suggestion);
                                                                textareaRef.current?.focus();
                                                            }}
                                                            className="bg-white text-primary-700 text-xs font-semibold px-3 py-1 rounded-full border border-primary-200 hover:bg-primary-100 transition-colors"
                                                            whileHover={{ scale: 1.05 }}
                                                            whileTap={{ scale: 0.95 }}
                                                        >
                                                            {suggestion}
                                                        </motion.button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                ))}
                                {isLoading && (
                                    <motion.div
                                        layout
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="flex items-end gap-2 justify-start"
                                    >
                                        <div className="w-7 h-7 bg-primary-100 rounded-full flex-shrink-0 flex items-center justify-center"><SparklesIcon className="w-4 h-4 text-primary-500" /></div>
                                        <div className="rounded-2xl bg-gray-100 rounded-bl-lg">
                                            <TypingIndicator />
                                        </div>
                                    </motion.div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>
                        </div>

                        <footer className="flex-shrink-0 p-3 bg-gray-50 border-t">
                            {imagePreview && (
                                <div className="relative w-20 h-20 mb-2 p-1 border rounded-lg">
                                    <img src={imagePreview} alt="preview" className="w-full h-full object-cover rounded" />
                                    <button onClick={() => {setImageFile(null); setImagePreview(null);}} className="absolute -top-2 -right-2 bg-gray-700 text-white rounded-full p-0.5"><XIcon className="w-3 h-3"/></button>
                                </div>
                            )}
                            <div className="relative w-full flex items-center">
                                <textarea
                                    ref={textareaRef}
                                    value={inputValue}
                                    onChange={e => setInputValue(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                                    placeholder="Ask for style advice..."
                                    rows={1}
                                    className="w-full text-sm rounded-lg border-gray-300 shadow-sm pl-4 pr-32 py-2.5 resize-none focus:ring-primary-500 focus:border-primary-500"
                                />
                                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                    <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />
                                    <button onClick={() => fileInputRef.current?.click()} className="p-2 text-gray-500 hover:text-primary-600">
                                        <ImageIcon className="w-5 h-5"/>
                                    </button>
                                    <button onClick={handleMicClick} className={`p-2 text-gray-500 hover:text-primary-600 ${isListening ? 'text-primary-600 animate-pulse' : ''}`}>
                                        <MicIcon className="w-5 h-5"/>
                                    </button>
                                    <button
                                        onClick={() => handleSendMessage()}
                                        disabled={(!inputValue.trim() && !imageFile) || isLoading}
                                        className="p-2 bg-primary-600 text-white rounded-full hover:bg-primary-700 disabled:bg-primary-300"
                                    >
                                        <PaperAirplaneIcon className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        </footer>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default Chatbot;