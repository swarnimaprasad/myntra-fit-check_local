/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crew, WardrobeItem, OutfitLayer, ChatMessage, CrewMember, SavedOutfit } from '../types';
import StartScreen from './StartScreen';
import Canvas from './Canvas';
import SharedWishlistPanel from './SharedWishlistPanel';
import OutfitStack from './OutfitStack';
import { generateVirtualTryOnImage, generatePoseVariation, generateGroupPhoto } from '../services/geminiService';
import { getFriendlyErrorMessage, urlToFile } from '../lib/utils';
import { UserIcon, UsersIcon, XIcon, Share2Icon, PaperAirplaneIcon, MessageSquareIcon, CameraIcon, ChevronLeftIcon, CheckIcon, PencilIcon, PlusIcon } from './icons'; 
import Spinner from './Spinner';

const ShareModal = ({ isOpen, onClose, crew }: { isOpen: boolean, onClose: () => void, crew: Crew }) => {
    const [copySuccess, setCopySuccess] = useState('');
    
    const shareUrl = useMemo(() => {
        if (!crew) return '';
        try {
            const encoded = btoa(JSON.stringify(crew));
            return `${window.location.origin}${window.location.pathname}?crew_session=${encoded}`;
        } catch (e) {
            console.error("Failed to create share URL", e);
            return 'Could not generate share link.';
        }
    }, [crew]);

    const handleCopy = () => {
        navigator.clipboard.writeText(shareUrl).then(() => {
            setCopySuccess('Copied!');
            setTimeout(() => setCopySuccess(''), 2000);
        }, () => {
            setCopySuccess('Failed to copy.');
        });
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
                <h2 className="text-2xl font-serif font-bold text-gray-800 mb-2">Share your Style Crew</h2>
                <p className="text-sm text-gray-600 mb-4">Anyone with this link can join and see your crew's session.</p>
                <div className="relative">
                    <input type="text" value={shareUrl} readOnly className="w-full bg-gray-100 border-gray-300 rounded-md shadow-inner text-sm p-2 pr-24"/>
                    <button onClick={handleCopy} className="absolute inset-y-0 right-0 m-1 px-4 text-sm font-semibold text-white bg-primary-600 rounded hover:bg-primary-700">
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
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');

  const activeMember = useMemo(() => crew?.members.find(m => m.id === activeMemberId), [crew, activeMemberId]);
  
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [crew?.messages, rightPanelTab]);
  
  const currentOutfitLayer = activeMember?.outfitHistory[activeMember.outfitHistory.length - 1];
  const displayImageUrl = currentOutfitLayer?.poseImages[poseInstructions[activeMember?.poseIndex || 0]] || null;
  const availablePoseKeys = currentOutfitLayer ? Object.keys(currentOutfitLayer.poseImages).sort((a,b) => poseInstructions.indexOf(a) - poseInstructions.indexOf(b)) : [];

  const handleModelFinalized = (memberId: string, url: string, file: File) => {
    setCrew(prevCrew => {
      if (!prevCrew) return null;
      return {
        ...prevCrew,
        members: prevCrew.members.map(m =>
          m.id === memberId ? { ...m, modelImageUrl: url, outfitHistory: [{ garments: [], poseImages: { [poseInstructions[0]]: url } }] } : m
        ),
      };
    });
    // Only set localStorage for the primary user
    if (memberId === crew?.members[0]?.id) {
        try {
            localStorage.setItem('previousModelUrl', url);
        } catch (e) {
            console.error("Failed to save model URL to localStorage", e);
        }
    }
    const nextMemberWithoutModel = crew?.members.find(m => m.id !== memberId && !m.modelImageUrl);
    if (nextMemberWithoutModel) {
        setMemberForModelCreation(nextMemberWithoutModel.id);
    } else {
        setMemberForModelCreation(null);
    }
    setActiveMemberId(memberId);
  };

  const handleGarmentSelect = async (garmentFile: File, garmentInfo: WardrobeItem) => {
    if (!activeMember || !activeMember.modelImageUrl) return;

    setError(null);
    setIsLoading(true);
    setLoadingMessage(`Adding ${garmentInfo.name}...`);

    try {
      const currentOutfit = activeMember.outfitHistory[activeMember.outfitHistory.length - 1];
      const baseImage = currentOutfit.poseImages[poseInstructions[activeMember.poseIndex ?? 0]];
      if (!baseImage) throw new Error("Could not find base image for try-on.");

      const garmentsToApply = [...currentOutfit.garments, garmentInfo];
      const garmentFiles = await Promise.all(garmentsToApply.map(g => urlToFile(g.url, g.name).then(file => ({ file, info: g }))));

      const newTryOnUrl = await generateVirtualTryOnImage(activeMember.modelImageUrl, garmentFiles);
      const newLayer: OutfitLayer = {
        garments: garmentsToApply,
        poseImages: { [poseInstructions[activeMember.poseIndex ?? 0]]: newTryOnUrl },
      };
      
      setCrew(prev => !prev ? null : ({
        ...prev,
        members: prev.members.map(m => m.id === activeMemberId ? {...m, outfitHistory: [...m.outfitHistory, newLayer]} : m)
      }));
    } catch (err) {
      setError(getFriendlyErrorMessage(err, 'Failed to apply garment'));
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
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
    
    setCrew(prev => {
        if (!prev) return null;
        return {
            ...prev,
            members: prev.members.map(m => {
                if (m.id === activeMemberId) {
                    const newHistory = m.outfitHistory.slice(0, -1);
                    return { ...m, outfitHistory: newHistory.length > 0 ? newHistory : m.outfitHistory };
                }
                return m;
            })
        };
    });
  }, [activeMemberId, setCrew]);
  
  const handleGenerateGroupPhoto = async () => {
    if (!crew) return;
    const allMembersHaveModel = crew.members.every(m => m.modelImageUrl);
    if (!allMembersHaveModel) {
        setGroupPhotoError("All members must have a model assigned before generating a group photo.");
        setIsGroupPhotoModalOpen(true);
        return;
    }
    
    setIsGroupPhotoModalOpen(true);
    setIsGeneratingGroupPhoto(true);
    setGroupPhotoError(null);
    setGroupPhotoUrl(null);

    try {
        const memberImages = crew.members.map(m => {
            const currentOutfit = m.outfitHistory[m.outfitHistory.length - 1];
            const outfitUrl = currentOutfit?.poseImages[poseInstructions[m.poseIndex ?? 0]] 
                           || Object.values(currentOutfit?.poseImages ?? {})[0] 
                           || m.modelImageUrl;
            if (!outfitUrl) {
                throw new Error(`Could not find a suitable image for member ${m.name}.`);
            }
            return outfitUrl;
        });
        
        const resultUrl = await generateGroupPhoto(crew.vibe, memberImages);
        setGroupPhotoUrl(resultUrl);
    } catch (err) {
        setGroupPhotoError(getFriendlyErrorMessage(err, "Group photo generation failed"));
    } finally {
        setIsGeneratingGroupPhoto(false);
    }
  };

  const handleUpdateCrew = (updatedCrew: Crew) => {
    setCrew(updatedCrew);
  };
  
  const handleMemberNameSave = (memberId: string, newName: string) => {
    setCrew(prev => {
        if (!prev) return null;
        return {
            ...prev,
            members: prev.members.map(m => m.id === memberId ? {...m, name: newName} : m),
        };
    });
    setEditingMemberId(null);
  };

  const handleSendChatMessage = () => {
    if (!chatMessage.trim() || !crew || !activeMember) return;
    const newMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        sender: activeMember.name,
        text: chatMessage.trim(),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setCrew({ ...crew, messages: [...crew.messages, newMessage] });
    setChatMessage('');
  };

  const handleSaveOutfitClick = () => {
    if (!activeMember || !displayImageUrl) return;
    const itemsToSave = activeMember.outfitHistory.flatMap(layer => layer.garments);
    if (itemsToSave.length > 0) {
        setSaveState('saving');
        onSaveOutfit(itemsToSave, displayImageUrl);
        setTimeout(() => {
            setSaveState('saved');
            setTimeout(() => setSaveState('idle'), 2000);
        }, 500);
    }
  };


  if (!crew) return <div className="w-full h-full flex items-center justify-center"><Spinner /></div>;

  const memberToCreateModelFor = crew.members.find(m => m.id === memberForModelCreation);
  if (memberForModelCreation && memberToCreateModelFor) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-white">
        <h2 className="text-3xl font-serif mb-4">Create a model for <span className="text-primary-600">{memberToCreateModelFor.name}</span></h2>
        <StartScreen 
          onModelFinalized={(url, file) => handleModelFinalized(memberForModelCreation, url, file)}
          allowPreviousModel={memberForModelCreation === crew.members[0].id}
        />
      </div>
    );
  }
  
  return (
    <div className="w-full h-full grid grid-cols-1 md:grid-cols-10 bg-gray-50 md:overflow-hidden overflow-y-auto relative">
      <AnimatePresence>
        <ShareModal isOpen={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} crew={crew}/>
      </AnimatePresence>
      {/* Left Sidebar: Crew Members */}
      <aside className="md:col-span-2 bg-white border-r border-gray-200 p-4 flex flex-col">
        <div className="border-b border-gray-300 pb-3 mb-3">
            <h1 className="text-xl font-bold font-serif tracking-wide">{crew.name}</h1>
            <p className="text-xs text-gray-500 italic">&ldquo;{crew.vibe}&rdquo;</p>
        </div>

        <div className="space-y-1 mb-4 flex-grow overflow-y-auto">
            <h2 className="text-sm font-bold tracking-wider uppercase text-gray-600 px-2">Crew Members</h2>
            {crew.members.map((member) => (
                <div 
                    key={member.id} 
                    className={`p-2 rounded-lg cursor-pointer flex items-center gap-3 transition-colors group ${activeMemberId === member.id ? 'bg-primary-100' : 'hover:bg-gray-100'}`} 
                    onClick={() => setActiveMemberId(member.id)}
                >
                    {member.modelImageUrl ? (
                        <img src={member.modelImageUrl} alt={member.name} className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm"/>
                    ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0">
                            <UserIcon className="w-5 h-5 text-gray-600"/>
                        </div>
                    )}
                    <div className="flex-grow overflow-hidden">
                        {editingMemberId === member.id ? (
                            <MemberNameEditor member={member} onSave={(newName) => handleMemberNameSave(member.id, newName)} />
                        ) : (
                             <p className={`font-semibold text-sm truncate ${activeMemberId === member.id ? 'text-primary-800' : 'text-gray-800'}`}>{member.name}</p>
                        )}
                        {!member.modelImageUrl && (
                            <button onClick={() => setMemberForModelCreation(member.id)} className="text-xs text-primary-600 font-semibold hover:underline">Add Model</button>
                        )}
                    </div>
                    {member.id !== 'member-1' && (
                        <button onClick={() => setEditingMemberId(member.id)} className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-gray-800 p-1">
                            <PencilIcon className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
            ))}
        </div>
        
        <div className="flex-shrink-0 flex flex-col gap-2">
            <button onClick={handleGenerateGroupPhoto} disabled={isGeneratingGroupPhoto || !crew.members.every(m => m.modelImageUrl)} className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors disabled:bg-primary-300">
                <CameraIcon className="w-5 h-5"/>
                Group Photo
            </button>
            <button onClick={() => setIsShareModalOpen(true)} className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors">
                <Share2Icon className="w-5 h-5"/>
                <span>Share Crew</span>
            </button>
        </div>
      </aside>

      {/* Center: Canvas */}
      <main className="md:col-span-5 h-full bg-gray-100 relative flex flex-col p-4">
        {activeMember?.modelImageUrl ? (
             <div className="w-full h-full mx-auto flex items-center justify-center">
                <Canvas
                    displayImageUrl={displayImageUrl}
                    onStartOver={() => {}} // Not applicable here
                    isLoading={isLoading}
                    loadingMessage={loadingMessage}
                    onSelectPose={handleSelectPose}
                    poseInstructions={poseInstructions}
                    currentPoseIndex={activeMember.poseIndex ?? 0}
                    availablePoseKeys={availablePoseKeys}
                    isComparing={false}
                    comparisonImageUrl={null}
                    onExitCompare={() => {}}
                />
            </div>
        ) : (
            <div className="w-full h-full flex items-center justify-center p-8">
                <div className="text-center">
                    <UsersIcon className="w-16 h-16 text-gray-300 mx-auto mb-4"/>
                    <h2 className="text-2xl font-serif text-gray-700">Select a crew member to start styling</h2>
                    <p className="text-gray-500">Add a model for each member to begin.</p>
                </div>
            </div>
        )}
      </main>
      
      {/* Right Sidebar: Wishlists and Interactions */}
      <aside className="md:col-span-3 bg-white border-l border-gray-200 p-4 flex flex-col">
        {activeMember ? (
            <div className="flex flex-col h-full">
                <div className="flex border-b border-gray-200 flex-shrink-0">
                    <button onClick={() => setRightPanelTab('wishlist')} className={`flex-1 py-2 text-sm font-semibold text-center transition-colors ${rightPanelTab === 'wishlist' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-gray-500 hover:text-gray-800'}`}>Outfit &amp; Wishlist</button>
                    <button onClick={() => setRightPanelTab('chat')} className={`flex-1 py-2 text-sm font-semibold text-center transition-colors ${rightPanelTab === 'chat' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-gray-500 hover:text-gray-800'}`}>Crew Chat</button>
                </div>

                <AnimatePresence mode="wait">
                    {rightPanelTab === 'wishlist' ? (
                        <motion.div key="wishlist" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col h-full overflow-hidden pt-4">
                            <div className="pb-4 border-b border-gray-200 flex-shrink-0">
                                <div className="flex justify-between items-center px-2 mb-2">
                                     <h3 className="text-lg font-bold font-serif">Outfit for {activeMember.name}</h3>
                                     <button
                                        onClick={handleSaveOutfitClick}
                                        disabled={saveState !== 'idle' || !activeMember || activeMember.outfitHistory.flatMap(l => l.garments).length === 0}
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
                                 <OutfitStack
                                    outfitHistory={activeMember.outfitHistory}
                                    onRemoveGarment={handleRemoveGarment}
                                    onSetComparisonIndex={() => {}}
                                    currentOutfitIndex={activeMember.outfitHistory.length - 1}
                                    disabled={isLoading}
                                />
                            </div>
                             <div className="flex-grow overflow-y-auto">
                                <SharedWishlistPanel
                                    crew={crew}
                                    activeMemberId={activeMemberId}
                                    onUpdateCrew={handleUpdateCrew}
                                    onTryOnItem={handleGarmentSelect}
                                    isLoading={isLoading}
                                />
                             </div>
                        </motion.div>
                    ) : (
                         <motion.div key="chat" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col h-full overflow-hidden pt-4">
                            <div className="flex-grow space-y-3 overflow-y-auto p-2">
                                {crew.messages.map(msg => {
                                    const isMe = msg.sender === activeMember.name;
                                    return (
                                        <div key={msg.id} className={`flex items-end gap-2 ${isMe ? 'justify-end' : ''}`}>
                                            {!isMe && <div className="w-6 h-6 rounded-full bg-gray-200 text-xs flex items-center justify-center font-bold text-gray-600 flex-shrink-0">{msg.sender.charAt(0)}</div>}
                                            <div className={`max-w-xs md:max-w-sm p-2.5 rounded-2xl ${isMe ? 'bg-primary-600 text-white rounded-br-lg' : 'bg-gray-200 text-gray-800 rounded-bl-lg'}`}>
                                                <p className="text-sm">{msg.text}</p>
                                                <p className={`text-xs mt-1 ${isMe ? 'text-primary-100' : 'text-gray-500'}`}>{msg.timestamp}</p>
                                            </div>
                                        </div>
                                    )
                                })}
                                <div ref={chatEndRef} />
                            </div>
                            <div className="flex-shrink-0 pt-2 border-t mt-2">
                                 <div className="relative">
                                    <input 
                                        type="text" 
                                        value={chatMessage}
                                        onChange={e => setChatMessage(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleSendChatMessage()}
                                        placeholder={`Message as ${activeMember.name}...`}
                                        className="w-full text-sm rounded-md border-gray-300 shadow-sm pl-3 pr-10 py-2 focus:ring-primary-500 focus:border-primary-500"/>
                                    <button onClick={handleSendChatMessage} disabled={!chatMessage.trim()} className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 hover:text-primary-600 disabled:text-gray-300">
                                        <PaperAirplaneIcon className="w-5 h-5"/>
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        ) : (
             <div className="w-full h-full flex items-center justify-center">
                <p className="text-gray-500">Select a member to start.</p>
            </div>
        )}
      </aside>
      
      {/* Group Photo Modal */}
      <AnimatePresence>
        {isGroupPhotoModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setIsGroupPhotoModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-xl shadow-2xl w-full max-w-2xl p-6 relative"
              onClick={(e) => e.stopPropagation()}
            >
              <button onClick={() => setIsGroupPhotoModalOpen(false)} className="absolute top-3 right-3 p-1 text-gray-400 hover:text-gray-800 rounded-full hover:bg-gray-100">
                <XIcon className="w-5 h-5"/>
              </button>
              <div className="flex items-center gap-3 mb-4">
                <CameraIcon className="w-8 h-8 text-primary-500"/>
                <div>
                    <h2 className="text-2xl font-serif font-bold text-gray-800">Group Photoshoot</h2>
                    <p className="text-sm text-gray-500 italic">Vibe: &ldquo;{crew.vibe}&rdquo;</p>
                </div>
              </div>
              {isGeneratingGroupPhoto && (
                <div className="flex flex-col items-center justify-center h-64">
                    <Spinner/>
                    <p className="mt-4 text-gray-600 font-serif">Stylo is generating your group photo...</p>
                    <p className="text-sm text-gray-500">This can take a moment.</p>
                </div>
              )}
              {groupPhotoError && <p className="text-red-600 bg-red-50 p-3 rounded-md">{groupPhotoError}</p>}
              {groupPhotoUrl && (
                 <div className="mt-4">
                    <img src={groupPhotoUrl} alt="Generated group photo" className="rounded-lg w-full"/>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CrewStudio;