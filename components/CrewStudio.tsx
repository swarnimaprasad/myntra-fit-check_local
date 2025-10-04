/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crew, WardrobeItem, OutfitLayer, ChatMessage, CrewMember, SavedOutfit, SharedWishlistItem } from '../types';
import StartScreen from './StartScreen';
import Canvas from './Canvas';
import SharedWishlistPanel from './SharedWishlistPanel';
import OutfitStack from './OutfitStack';
import { generateVirtualTryOnImage, generatePoseVariation, generateGroupPhoto } from '../services/geminiService';
import { getFriendlyErrorMessage, urlToFile } from '../lib/utils';
import { UserIcon, UsersIcon, XIcon, Share2Icon, PaperAirplaneIcon, MessageSquareIcon, CameraIcon, ChevronLeftIcon, CheckIcon, PencilIcon, PlusIcon } from './icons'; 
import Spinner from './Spinner';
import { StitchCardLoader } from './EngagingLoader';
import { db } from '../firebaseConfig';
import { ref, push, onValue, set, off } from 'firebase/database';

const ShareModal = ({ isOpen, onClose, crew }: { isOpen: boolean, onClose: () => void, crew: Crew }) => {
    const [copySuccess, setCopySuccess] = useState('');
    
    const shareUrl = useMemo(() => {
        if (!crew) return '';
        try {
            // Use encodeURIComponent instead of btoa to handle Unicode characters
            const encoded = encodeURIComponent(JSON.stringify(crew));
            return `${window.location.origin}${window.location.pathname}?crew_session=${encoded}`;
        } catch (e) {
            console.error("Failed to create share URL", e);
            return 'Could not generate share link.';
        }
    }, [crew]);

    const handleCopy = () => {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(shareUrl).then(() => {
                setCopySuccess('Copied!');
                setTimeout(() => setCopySuccess(''), 2000);
            }).catch(() => {
                // Fallback
                const textArea = document.createElement('textarea');
                textArea.value = shareUrl;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                setCopySuccess('Copied!');
                setTimeout(() => setCopySuccess(''), 2000);
            });
        } else {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = shareUrl;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            setCopySuccess('Copied!');
            setTimeout(() => setCopySuccess(''), 2000);
        }
    };

    if (!isOpen) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 relative"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-start mb-4">
                    <h2 className="text-2xl font-serif font-bold text-gray-800">Share your Style Crew</h2>
                    <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:text-gray-800 hover:bg-gray-100 -mt-2 -mr-2">
                        <XIcon className="w-5 h-5"/>
                    </button>
                </div>
                <p className="text-sm text-gray-600 mb-4">Anyone with this link can join and see your crew's session.</p>
                <div className="relative">
                    <input type="text" value={shareUrl} readOnly className="w-full bg-gray-100 border-gray-300 rounded-md shadow-inner text-sm p-3 pr-28"/>
                    <button onClick={handleCopy} className="absolute inset-y-0 right-0 m-1.5 px-4 text-sm font-semibold text-white bg-primary-600 rounded hover:bg-primary-700 active:bg-primary-800 transition-colors">
                        {copySuccess || 'Copy Link'}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};


const MemberNameEditor = ({ member, onSave }: { member: CrewMember, onSave: (newName: string) => void }) => {
    const [name, setName] = useState(member.name);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
    }, []);
    
    const handleSave = () => {
        if (name.trim() && name.trim() !== member.name) {
            onSave(name.trim());
        } else {
            onSave(member.name); // Revert or do nothing
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSave();
        } else if (e.key === 'Escape') {
            onSave(member.name); // Revert on escape
        }
    };

    return (
        <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            className="font-semibold text-gray-900 bg-white border border-primary-300 rounded-md px-1 -ml-1 w-full"
        />
    );
};

const SendToChatModal = ({
    isOpen,
    onClose,
    imageUrl,
    message,
    setMessage,
    onSend,
}: {
    isOpen: boolean;
    onClose: () => void;
    imageUrl: string | null;
    message: string;
    setMessage: (msg: string) => void;
    onSend: () => void;
}) => {
    if (!isOpen) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 relative flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                <h2 className="text-xl font-serif font-bold text-gray-800 mb-4">Share Outfit to Crew</h2>
                {imageUrl && (
                    <img src={imageUrl} alt="Outfit preview" className="w-full aspect-[2/3] object-cover rounded-lg mb-4 bg-gray-100" />
                )}
                <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Add a message... (optional)"
                    rows={2}
                    className="w-full text-sm rounded-md border-gray-300 shadow-sm p-2 focus:ring-primary-500 focus:border-primary-500"
                />
                <div className="flex gap-2 mt-4">
                    <button onClick={onClose} className="flex-1 text-sm font-semibold py-2 px-3 rounded-md border-2 border-gray-300 text-gray-800 hover:bg-gray-100">
                        Cancel
                    </button>
                    <button onClick={onSend} className="flex-1 text-sm font-semibold py-2 px-3 rounded-md bg-primary-600 text-white hover:bg-primary-700 flex items-center justify-center gap-2">
                        <PaperAirplaneIcon className="w-4 h-4" />
                        Send
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};

const GroupPhotoModal = ({ isOpen, onClose, onGenerate, isGenerating, error, photoUrl, vibe }: {
    isOpen: boolean;
    onClose: () => void;
    onGenerate: () => void;
    isGenerating: boolean;
    error: string | null;
    photoUrl: string | null;
    vibe: string;
}) => {
    if (!isOpen) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 relative"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-serif font-bold text-gray-800">Group Photoshoot</h2>
                    <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:text-gray-800 hover:bg-gray-100">
                        <XIcon className="w-5 h-5"/>
                    </button>
                </div>
                <div className="flex flex-col items-center justify-center min-h-[400px]">
                    {isGenerating ? (
                        <StitchCardLoader message="Creating your group photo..." />
                    ) : error ? (
                        <div className="text-center text-red-600">
                            <p className="font-semibold">Generation Failed</p>
                            <p className="text-sm">{error}</p>
                            <button onClick={onGenerate} className="mt-4 px-4 py-2 text-sm font-semibold text-white bg-primary-600 rounded-md hover:bg-primary-700">
                                Try Again
                            </button>
                        </div>
                    ) : photoUrl ? (
                        <img src={photoUrl} alt="Group photo" className="rounded-lg max-h-[400px] w-full object-contain" />
                    ) : (
                        <div className="text-center">
                            <p className="mb-4 text-gray-600">Generate a group photo based on the crew's current outfits and the event vibe: <span className="font-semibold">"{vibe}"</span>.</p>
                            <button onClick={onGenerate}  className="inline-flex items-center justify-center px-6 py-3 text-base font-semibold text-white bg-primary-600 rounded-md cursor-pointer group hover:bg-primary-700 transition-colors">
                                <CameraIcon className="w-5 h-5 mr-2"/>
                                Generate Photo
                            </button>
                        </div>
                    )}
                </div>
                {photoUrl && !isGenerating && (
                    <div className="mt-4 flex gap-2 justify-center">
                        <button onClick={onGenerate} className="px-4 py-2 text-sm font-semibold text-gray-800 bg-gray-200 rounded-md hover:bg-gray-300">
                            Regenerate
                        </button>
                        <a href={photoUrl} download="style-crew-photo.png" className="px-4 py-2 text-sm font-semibold text-white bg-primary-600 rounded-md hover:bg-primary-700">
                            Download
                        </a>
                    </div>
                )}
            </motion.div>
        </motion.div>
    );
};

interface CrewStudioProps {
  crew: Crew | null;
  setCrew: React.Dispatch<React.SetStateAction<Crew | null>>;
  wishlist: WardrobeItem[];
  poseInstructions: string[];
  onSaveOutfit: (items: WardrobeItem[], previewUrl: string) => void;
}

const CrewStudio: React.FC<CrewStudioProps> = ({ crew, setCrew, wishlist, poseInstructions, onSaveOutfit }) => {
  const [activeMemberId, setActiveMemberId] = useState<string | null>(crew?.members[0]?.id || null);
  const [memberForModelCreation, setMemberForModelCreation] = useState<string | null>(() => 
    crew?.members.find(m => !m.modelImageUrl)?.id || null
  );

  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const [isGroupPhotoModalOpen, setIsGroupPhotoModalOpen] = useState(false);
  const [groupPhotoUrl, setGroupPhotoUrl] = useState<string | null>(null);
  const [isGeneratingGroupPhoto, setIsGeneratingGroupPhoto] = useState(false);
  const [groupPhotoError, setGroupPhotoError] = useState<string | null>(null);

  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [rightPanelTab, setRightPanelTab] = useState<'wishlist' | 'chat'>('wishlist');
  const [chatMessage, setChatMessage] = useState('');
  const [isSendToChatModalOpen, setIsSendToChatModalOpen] = useState(false);
  const [sendToChatMessage, setSendToChatMessage] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Generate or get crew ID for Firebase real-time sync
  const crewId = useMemo(() => {
    if (crew?.id) return crew.id;
    return `crew_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, [crew?.id]);

  const activeMember = useMemo(() => crew?.members.find(m => m.id === activeMemberId), [crew, activeMemberId]);

  // Real-time Firebase synchronization for chat messages
  useEffect(() => {
    if (!crew || !crewId) return;

    const messagesRef = ref(db, `crews/${crewId}/messages`);
    
    const unsubscribe = onValue(messagesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const messages = Object.values(data) as ChatMessage[];
        const sortedMessages = messages.sort((a, b) => 
          new Date(`1970/01/01 ${a.timestamp}`).getTime() - new Date(`1970/01/01 ${b.timestamp}`).getTime()
        );
        
        // Only update if messages have actually changed to avoid infinite loops
        if (JSON.stringify(sortedMessages) !== JSON.stringify(crew.messages)) {
          setCrew(prevCrew => prevCrew ? { ...prevCrew, messages: sortedMessages } : prevCrew);
        }
      }
    });

    return () => off(messagesRef, 'value', unsubscribe);
  }, [crewId, crew?.id, setCrew]);

  // Real-time Firebase synchronization for shared wishlist
  useEffect(() => {
    if (!crew || !crewId) return;

    const sharedWishlistRef = ref(db, `crews/${crewId}/sharedWishlist`);
    
    const unsubscribe = onValue(sharedWishlistRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const sharedWishlist = Object.values(data) as SharedWishlistItem[];
        // Sort by order in the array (most recently added first)
        const sortedWishlist = [...sharedWishlist];
        
        // Only update if shared wishlist has actually changed to avoid infinite loops
        if (JSON.stringify(sortedWishlist) !== JSON.stringify(crew.sharedWishlist)) {
          setCrew(prevCrew => prevCrew ? { ...prevCrew, sharedWishlist: sortedWishlist } : prevCrew);
        }
      }
    });

    return () => off(sharedWishlistRef, 'value', unsubscribe);
  }, [crewId, crew?.id, setCrew]);

  // Sync crew data to Firebase when it changes
  useEffect(() => {
    if (!crew || !crewId) return;

    const crewRef = ref(db, `crews/${crewId}`);
    const crewData = {
      ...crew,
      id: crewId,
      lastUpdated: Date.now()
    };
    
    set(crewRef, crewData).catch(error => {
      console.error('Failed to sync crew data to Firebase:', error);
    });
  }, [crew, crewId]);
  
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [crew?.messages, rightPanelTab]);
  
  const currentOutfitLayer = activeMember?.outfitHistory[activeMember.outfitHistory.length - 1];
  const displayImageUrl = currentOutfitLayer?.poseImages[poseInstructions[activeMember?.poseIndex || 0]] || null;
  const availablePoseKeys = currentOutfitLayer ? Object.keys(currentOutfitLayer.poseImages).sort((a,b) => poseInstructions.indexOf(a) - poseInstructions.indexOf(b)) : [];

  // This effect handles advancing to the next member for model creation after one is finished.
  // This prevents the stale closure problem and fixes the creation loop.
  useEffect(() => {
    if (memberForModelCreation && crew) {
        const memberToCreateFor = crew.members.find(m => m.id === memberForModelCreation);
        
        // If the member we are supposed to be creating a model for now has one...
        if (memberToCreateFor && memberToCreateFor.modelImageUrl) {
            // ...find the next member that doesn't, and set them for model creation.
            const nextMemberWithoutModel = crew.members.find(m => !m.modelImageUrl);
            setMemberForModelCreation(nextMemberWithoutModel ? nextMemberWithoutModel.id : null);
        }
    }
  }, [crew, memberForModelCreation]);

  const handleModelFinalized = (memberId: string, url: string, file: File) => {
    setCrew(prevCrew => {
      if (!prevCrew) return null;
      return {
        ...prevCrew,
        members: prevCrew.members.map(m =>
          m.id === memberId ? { ...m, modelImageUrl: url, outfitHistory: [{ garment: null, poseImages: { [poseInstructions[0]]: url } }] } : m
        ),
      };
    });
    if (memberId === crew?.members[0]?.id) {
        try {
            localStorage.setItem('previousModelUrl', url);
        } catch (e) {
            console.error("Failed to save model URL to localStorage", e);
        }
    }
    // The useEffect hook will handle advancing to the next member for creation.
    setActiveMemberId(memberId);
  };

  const updateOutfitForMember = useCallback(async (newGarmentList: WardrobeItem[]) => {
    if (!activeMember || !activeMember.modelImageUrl) return;
    
    setError(null);
    setIsLoading(true);

    try {
        const oldGarments = activeMember.outfitHistory.slice(1).map(l => l.garment!);
        let firstChangeIndex = 0;
        while (
            firstChangeIndex < newGarmentList.length &&
            firstChangeIndex < oldGarments.length &&
            newGarmentList[firstChangeIndex].id === oldGarments[firstChangeIndex].id
        ) {
            firstChangeIndex++;
        }

        const newHistory = activeMember.outfitHistory.slice(0, firstChangeIndex + 1);
        let lastImageUrl = newHistory[newHistory.length - 1].poseImages[poseInstructions[0]];
        if (!lastImageUrl) throw new Error("Base image for regeneration is missing.");

        for (let i = firstChangeIndex; i < newGarmentList.length; i++) {
            const garmentToApply = newGarmentList[i];
            setLoadingMessage(`Applying ${garmentToApply.name}...`);
            const garmentFile = await urlToFile(garmentToApply.url, garmentToApply.name);
            const newTryOnUrl = await generateVirtualTryOnImage(lastImageUrl, garmentFile, garmentToApply);

            const newLayer: OutfitLayer = {
                garment: garmentToApply,
                poseImages: { [poseInstructions[0]]: newTryOnUrl },
            };
            newHistory.push(newLayer);
            lastImageUrl = newTryOnUrl;
        }

        setCrew(prev => !prev ? null : ({
            ...prev,
            members: prev.members.map(m => m.id === activeMemberId ? { ...m, outfitHistory: newHistory, poseIndex: 0 } : m)
        }));
    } catch (err) {
        setError(getFriendlyErrorMessage(err, 'Failed to update outfit'));
    } finally {
        setIsLoading(false);
        setLoadingMessage('');
    }
}, [activeMember, activeMemberId, setCrew, poseInstructions]);


    const handleGarmentSelect = async (garmentFile: File, garmentInfo: WardrobeItem) => {
        if (!activeMember || !activeMember.modelImageUrl) return;

        let currentGarments = activeMember.outfitHistory.slice(1).map(l => l.garment!);
        currentGarments.push(garmentInfo); // Simplified: just add, no complex replacement for crew.
        
        await updateOutfitForMember(currentGarments);
    };
  
  const handleSelectPose = async (newPoseIndex: number) => {
    if (isLoading || !activeMember || newPoseIndex === activeMember.poseIndex) return;
    const targetPoseInstruction = poseInstructions[newPoseIndex];
    const currentOutfit = activeMember.outfitHistory[activeMember.outfitHistory.length - 1];

    if (currentOutfit?.poseImages[targetPoseInstruction]) {
        setCrew(prev => !prev ? null : ({ ...prev, members: prev.members.map(m => m.id === activeMemberId ? {...m, poseIndex: newPoseIndex} : m)}));
        return;
    }

    setError(null);
    setIsLoading(true);
    setLoadingMessage(`Changing pose to: ${targetPoseInstruction}`);
    try {
      const baseImage = currentOutfit?.poseImages[poseInstructions[activeMember.poseIndex ?? 0]] || activeMember.modelImageUrl;
      if (!baseImage) throw new Error("No base image available.");

      const newPoseImageUrl = await generatePoseVariation(baseImage, targetPoseInstruction);

      setCrew(prev => {
        if (!prev) return null;
        const newMembers = prev.members.map(m => {
          if (m.id === activeMemberId) {
            const newHistory = [...m.outfitHistory];
            newHistory[newHistory.length - 1].poseImages[targetPoseInstruction] = newPoseImageUrl;
            return { ...m, poseIndex: newPoseIndex, outfitHistory: newHistory };
          }
          return m;
        });
        return { ...prev, members: newMembers };
      });
    } catch (err) {
      setError(getFriendlyErrorMessage(err, 'Failed to change pose'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveGarment = useCallback((garmentId: string) => {
    if (!activeMember || activeMember.outfitHistory.length <= 1) return;
    
    const newGarmentList = activeMember.outfitHistory
        .slice(1) // skip base model layer
        .map(l => l.garment!)
        .filter(g => g.id !== garmentId);

    updateOutfitForMember(newGarmentList);
  }, [activeMember, updateOutfitForMember]);

    const handleGenerateGroupPhoto = async () => {
        if (!crew || crew.members.some(m => !m.modelImageUrl)) {
            setGroupPhotoError("All members must have a model before creating a group photo.");
            return;
        }
        setIsGeneratingGroupPhoto(true);
        setGroupPhotoError(null);
        try {
            const memberImages = crew.members.map(member => {
                const currentLayer = member.outfitHistory[member.outfitHistory.length - 1];
                return currentLayer.poseImages[poseInstructions[member.poseIndex]] || member.modelImageUrl!;
            });
            const url = await generateGroupPhoto(crew.vibe, memberImages);
            setGroupPhotoUrl(url);
        } catch (err) {
            setGroupPhotoError(getFriendlyErrorMessage(err, "Failed to create group photo"));
        } finally {
            setIsGeneratingGroupPhoto(false);
        }
    };
    
    const handleAddMember = () => {
        setCrew(prev => {
            if (!prev) return null;
            const newMember: CrewMember = {
                id: `member-${Date.now()}`,
                name: `Member ${prev.members.length + 1}`,
                modelImageUrl: null,
                outfitHistory: [],
                poseIndex: 0,
                wishlist: [],
            };
            const newCrew = { ...prev, members: [...prev.members, newMember] };
            setMemberForModelCreation(newMember.id);
            setActiveMemberId(newMember.id);
            return newCrew;
        });
    };
    
    const handleSaveMemberName = (memberId: string, newName: string) => {
        setCrew(prev => !prev ? null : ({
            ...prev,
            members: prev.members.map(m => m.id === memberId ? { ...m, name: newName } : m)
        }));
        setEditingMemberId(null);
    };

    const handleSendMessage = async (text: string, imageUrl?: string) => {
        if (!text.trim() && !imageUrl) return;
        if (!activeMember || !crew) return;
    
        const newMessage: ChatMessage = {
            id: `msg-${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            sender: activeMember.name,
            text: text.trim(),
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            ...(imageUrl && { imageUrl }), // Only include imageUrl if it exists
        };

        try {
            // Push message to Firebase real-time database
            const messagesRef = ref(db, `crews/${crewId}/messages`);
            await push(messagesRef, newMessage);
            
            // Clear chat input
            setChatMessage('');
        } catch (error) {
            console.error('Failed to send message:', error);
            // Fallback to local state update if Firebase fails
            setCrew({ ...crew, messages: [...crew.messages, newMessage] });
            setChatMessage('');
        }
    };

    const handleSendOutfitToChat = async () => {
        if (!displayImageUrl) return;
        await handleSendMessage(sendToChatMessage, displayImageUrl);
        setSendToChatMessage('');
        setIsSendToChatModalOpen(false);
        setRightPanelTab('chat');
    };

    if (!crew) {
        return (
            <div className="flex-grow flex items-center justify-center">
                <p>Crew not found. Please create a new crew.</p>
            </div>
        );
    }
    
    const memberForModel = crew.members.find(m => m.id === memberForModelCreation);

    if (memberForModel) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center p-4 sm:p-8 bg-white relative">
                <button
                    onClick={() => setMemberForModelCreation(null)}
                    className="absolute top-4 left-4 flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900"
                >
                    <ChevronLeftIcon className="w-4 h-4" />
                    Back to Studio
                </button>
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-serif font-bold">Create Model for {memberForModel.name}</h1>
                </div>
                <StartScreen 
                    onModelFinalized={(url, file) => handleModelFinalized(memberForModel.id, url, file)}
                    allowPreviousModel={false}
                />
            </div>
        );
    }
    
    return (
        <div className="w-full h-full flex-grow flex flex-col bg-gray-100/50 relative overflow-hidden">
             <AnimatePresence>
                <ShareModal isOpen={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} crew={crew}/>
             </AnimatePresence>
             <AnimatePresence>
                <SendToChatModal 
                    isOpen={isSendToChatModalOpen}
                    onClose={() => setIsSendToChatModalOpen(false)}
                    imageUrl={displayImageUrl}
                    message={sendToChatMessage}
                    setMessage={setSendToChatMessage}
                    onSend={handleSendOutfitToChat}
                />
             </AnimatePresence>
              <AnimatePresence>
                <GroupPhotoModal
                    isOpen={isGroupPhotoModalOpen}
                    onClose={() => setIsGroupPhotoModalOpen(false)}
                    onGenerate={handleGenerateGroupPhoto}
                    isGenerating={isGeneratingGroupPhoto}
                    error={groupPhotoError}
                    photoUrl={groupPhotoUrl}
                    vibe={crew.vibe}
                />
             </AnimatePresence>
            <div className="flex-shrink-0 w-full p-4 border-b bg-white/80 backdrop-blur-md flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold font-serif text-gray-800">{crew.name}</h1>
                    <p className="text-sm text-gray-500">{crew.vibe}</p>
                </div>
                <div className="flex items-center gap-2">
                     <button onClick={() => setIsShareModalOpen(true)} className="px-4 py-2 text-sm font-semibold text-gray-800 bg-white border rounded-md shadow-sm hover:bg-gray-100 flex items-center gap-2">
                        <Share2Icon className="w-4 h-4"/> Share
                    </button>
                    <button
                        onClick={() => setIsGroupPhotoModalOpen(true)}
                        className="px-4 py-2 text-sm font-semibold text-white bg-primary-600 border rounded-md shadow-sm hover:bg-primary-700 flex items-center gap-2"
                    >
                        <CameraIcon className="w-4 h-4"/> Create Group Photo
                    </button>
                </div>
            </div>
            
            <div className="flex-grow flex overflow-hidden">
                <aside className="w-64 bg-white/60 backdrop-blur-xl border-r p-4 flex-shrink-0 overflow-y-auto">
                    <h2 className="text-sm font-bold text-gray-600 uppercase mb-3">Crew Members</h2>
                    <div className="space-y-2">
                        {crew.members.map(member => (
                            <button
                                key={member.id}
                                onClick={() => setActiveMemberId(member.id)}
                                className={`w-full p-2 rounded-lg flex items-center gap-3 text-left transition-colors group ${activeMemberId === member.id ? 'bg-primary-100/80' : 'hover:bg-gray-100/80'}`}
                            >
                                <div className="w-10 h-10 rounded-full bg-gray-200 flex-shrink-0 flex items-center justify-center overflow-hidden border-2 border-white shadow-sm">
                                    {member.modelImageUrl ? <img src={member.modelImageUrl} alt={member.name} className="w-full h-full object-cover"/> : <UserIcon className="w-5 h-5 text-gray-500"/>}
                                </div>
                                <div className="flex-grow overflow-hidden">
                                     {editingMemberId === member.id ? (
                                        <MemberNameEditor member={member} onSave={(newName) => handleSaveMemberName(member.id, newName)} />
                                    ) : (
                                        <p className="font-semibold text-gray-900 truncate">{member.name}</p>
                                    )}
                                </div>
                                {member.id !== crew.members[0].id && editingMemberId !== member.id && (
                                     <div onClick={(e) => {e.stopPropagation(); setEditingMemberId(member.id); }} className="text-gray-400 hover:text-gray-800 p-1 opacity-0 group-hover:opacity-100 cursor-pointer rounded hover:bg-gray-200 transition-colors">
                                        <PencilIcon className="w-3 h-3"/>
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                    <button onClick={handleAddMember} className="w-full mt-4 p-2 rounded-lg flex items-center gap-3 text-left text-sm font-semibold text-gray-600 hover:bg-gray-200 transition-colors">
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex-shrink-0 flex items-center justify-center border-2 border-dashed border-gray-400">
                            <PlusIcon className="w-5 h-5 text-gray-500"/>
                        </div>
                        <span>Add Member</span>
                    </button>
                </aside>

                <main className="flex-grow flex flex-col bg-gray-100/50 relative">
                     {activeMember && activeMember.modelImageUrl ? (
                        <>
                            <Canvas
                                displayImageUrl={displayImageUrl}
                                onStartOver={() => setMemberForModelCreation(activeMemberId)}
                                isLoading={isLoading}
                                loadingMessage={loadingMessage}
                                onSelectPose={handleSelectPose}
                                poseInstructions={poseInstructions}
                                currentPoseIndex={activeMember.poseIndex}
                                availablePoseKeys={availablePoseKeys}
                                isComparing={false}
                                comparisonImageUrl={null}
                                onExitCompare={() => {}}
                            />
                            <button
                                onClick={() => setIsSendToChatModalOpen(true)}
                                className="absolute bottom-6 right-6 z-30 flex items-center justify-center text-center bg-white border border-gray-300 text-gray-800 font-semibold py-2 px-4 rounded-full transition-all duration-200 ease-in-out hover:bg-gray-100 hover:border-gray-400 active:scale-95 text-sm shadow-md"
                            >
                                <PaperAirplaneIcon className="w-4 h-4 mr-2" />
                                Send to Chat
                            </button>
                        </>
                     ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center p-8">
                             <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center mb-4">
                                <UserIcon className="w-12 h-12 text-gray-400"/>
                             </div>
                            <h2 className="text-xl font-semibold text-gray-800">No model for {activeMember?.name}</h2>
                            <p className="text-gray-500 mt-1">Please create a model to start styling this member.</p>
                            <button onClick={() => setMemberForModelCreation(activeMemberId)} className="mt-4 px-4 py-2 text-sm font-semibold text-white bg-primary-600 rounded-md hover:bg-primary-700">
                                Create Model
                            </button>
                        </div>
                     )}
                </main>

                <aside className="w-96 bg-white/60 backdrop-blur-xl border-l p-4 flex-shrink-0 flex flex-col">
                    <div className="flex-shrink-0 flex border-b">
                        <button onClick={() => setRightPanelTab('wishlist')} className={`flex-1 py-2 text-sm font-semibold text-center transition-colors flex items-center justify-center gap-2 ${rightPanelTab === 'wishlist' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-gray-500 hover:text-gray-800'}`}>
                            <UsersIcon className="w-4 h-4"/> Wishlist & Outfits
                        </button>
                        <button onClick={() => setRightPanelTab('chat')} className={`flex-1 py-2 text-sm font-semibold text-center transition-colors flex items-center justify-center gap-2 ${rightPanelTab === 'chat' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-gray-500 hover:text-gray-800'}`}>
                            <MessageSquareIcon className="w-4 h-4"/> Chat
                        </button>
                    </div>

                    <div className="flex-grow overflow-y-auto">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={rightPanelTab}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.2 }}
                                className="h-full"
                            >
                                {rightPanelTab === 'wishlist' ? (
                                    <div className="h-full flex flex-col">
                                        <div className="flex-grow pt-2">
                                            {activeMember?.modelImageUrl && (
                                                <div className="h-1/2">
                                                    <h3 className="text-sm font-bold text-gray-600 uppercase mb-2">Outfit</h3>
                                                    <OutfitStack 
                                                        outfitHistory={activeMember.outfitHistory} 
                                                        onRemoveGarment={handleRemoveGarment}
                                                        currentOutfitIndex={activeMember.outfitHistory.length - 1}
                                                        onSetComparisonIndex={() => {}}
                                                        disabled={isLoading}
                                                    />
                                                </div>
                                            )}
                                            <div className="h-1/2">
                                                 <h3 className="text-sm font-bold text-gray-600 uppercase mb-2 pt-2 border-t">Wishlists</h3>
                                                <SharedWishlistPanel 
                                                    crew={crew} 
                                                    activeMemberId={activeMemberId} 
                                                    onUpdateCrew={setCrew} 
                                                    onTryOnItem={handleGarmentSelect}
                                                    isLoading={isLoading}
                                                    crewId={crewId}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="h-full flex flex-col pt-4">
                                        <div className="flex-grow space-y-4 overflow-y-auto pr-2">
                                            {crew.messages.map(msg => {
                                                 const isMe = msg.sender === activeMember?.name;
                                                 return (
                                                    <div key={msg.id} className={`flex items-end gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
                                                        {!isMe && <div className="w-6 h-6 rounded-full bg-gray-300 text-xs flex items-center justify-center font-bold text-gray-600 flex-shrink-0" title={msg.sender}>{msg.sender.charAt(0)}</div>}
                                                        <div className={`max-w-[85%] p-2 rounded-lg ${isMe ? 'bg-primary-600 text-white rounded-br-lg' : 'bg-gray-200 text-gray-800 rounded-bl-lg'}`}>
                                                            {!isMe && <p className="font-bold text-primary-700 text-[10px] mb-0.5">{msg.sender}</p>}
                                                            {msg.imageUrl && (
                                                                <img src={msg.imageUrl} alt="Shared outfit" className="rounded-lg mb-2 cursor-pointer" onClick={() => {}}/>
                                                            )}
                                                            {msg.text && <p className="text-sm">{msg.text}</p>}
                                                            <p className={`text-[10px] mt-1 text-right ${isMe ? 'text-primary-100' : 'text-gray-500'}`}>{msg.timestamp}</p>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                            <div ref={chatEndRef} />
                                        </div>
                                        <div className="relative flex-shrink-0 mt-4">
                                            <input 
                                                type="text" 
                                                value={chatMessage} 
                                                onChange={e => setChatMessage(e.target.value)} 
                                                onKeyDown={async (e) => {
                                                    if (e.key === 'Enter' && !e.shiftKey) {
                                                        e.preventDefault();
                                                        if (chatMessage.trim()) {
                                                            await handleSendMessage(chatMessage);
                                                        }
                                                    }
                                                }}
                                                placeholder="Send a message..." 
                                                className="w-full text-sm rounded-md border-gray-300 shadow-sm pl-3 pr-10 py-2 focus:ring-primary-500 focus:border-primary-500"
                                            />
                                            <button 
                                                onClick={async () => {
                                                    if (chatMessage.trim()) {
                                                        await handleSendMessage(chatMessage);
                                                    }
                                                }} 
                                                disabled={!chatMessage.trim()} 
                                                className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 hover:text-primary-600 disabled:text-gray-300"
                                            >
                                                <PaperAirplaneIcon className="w-4 h-4"/>
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </aside>
            </div>
        </div>
    );
};

export default CrewStudio;
