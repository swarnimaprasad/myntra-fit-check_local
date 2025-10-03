/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crew, WardrobeItem, SharedWishlistItem, CrewMember } from '../types';
import { StarIcon, PlusIcon, PaperAirplaneIcon, XIcon, Share2Icon } from './icons';
import { urlToFile } from '../lib/utils';
import { cn } from '../lib/utils';

const REACTIONS = ['👍', '❤️', '🔥', '😂'];

const ShareItemsModal = ({
    isOpen,
    onClose,
    personalWishlist,
    sharedWishlistIds,
    onShareItem
}: {
    isOpen: boolean,
    onClose: () => void,
    personalWishlist: WardrobeItem[],
    sharedWishlistIds: Set<string>,
    onShareItem: (item: WardrobeItem) => void
}) => {
    if (!isOpen) return null;
    
    const availableItems = personalWishlist.filter(i => !sharedWishlistIds.has(i.id));

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
                className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 relative flex flex-col max-h-[80vh]"
                onClick={(e) => e.stopPropagation()}
            >
                <div className='flex justify-between items-start mb-4'>
                    <div>
                        <h2 className="text-2xl font-serif font-bold text-gray-800">Share to Crew Wishlist</h2>
                        <p className="text-sm text-gray-500">Select items from your personal wishlist.</p>
                    </div>
                     <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:text-gray-800 hover:bg-gray-100">
                        <XIcon className="w-5 h-5"/>
                    </button>
                </div>
                {availableItems.length > 0 ? (
                    <div className="grid grid-cols-4 gap-4 overflow-y-auto">
                        {availableItems.map(item => (
                            <button key={item.id} onClick={() => { onShareItem(item); onClose(); }} className="group relative aspect-square border rounded-lg overflow-hidden focus:outline-none focus:ring-2 focus:ring-primary-500">
                                <img src={item.url} alt={item.name} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <PlusIcon className="w-8 h-8 text-white"/>
                                </div>
                            </button>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <p className="text-gray-600">All your wishlisted items have been shared.</p>
                    </div>
                )}
            </motion.div>
        </motion.div>
    );
};

interface SharedWishlistPanelProps {
    crew: Crew;
    activeMemberId: string | null;
    onUpdateCrew: (updatedCrew: Crew) => void;
    onTryOnItem: (garmentFile: File, garmentInfo: WardrobeItem) => void;
    isLoading: boolean;
}

const SharedWishlistPanel: React.FC<SharedWishlistPanelProps> = ({ crew, activeMemberId, onUpdateCrew, onTryOnItem, isLoading }) => {
    const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
    const [comment, setComment] = useState('');
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'shared' | 'personal'>('shared');

    const activeMember = useMemo(() => crew.members.find(m => m.id === activeMemberId), [crew, activeMemberId]);

    const selectedItem = useMemo(() => {
        return crew.sharedWishlist.find(item => item.id === selectedItemId) || null;
    }, [crew.sharedWishlist, selectedItemId]);

    const handleRateItem = (rating: number) => {
        if (!selectedItemId || !activeMember) return;
        const newWishlist = crew.sharedWishlist.map(item => {
            if (item.id === selectedItemId) {
                // Allow user to change their rating
                const existingRatingIndex = item.ratings.findIndex(r => r.memberId === activeMember.id);
                const newRatings = [...item.ratings];
                if (existingRatingIndex > -1) {
                    newRatings[existingRatingIndex] = { memberId: activeMember.id, value: rating };
                } else {
                    newRatings.push({ memberId: activeMember.id, value: rating });
                }
                return { ...item, ratings: newRatings };
            }
            return item;
        });
        onUpdateCrew({ ...crew, sharedWishlist: newWishlist });
    };

    const handleReactToItem = (emoji: string) => {
        if (!selectedItemId || !activeMember) return;
        const newWishlist = crew.sharedWishlist.map(item => {
            if (item.id === selectedItemId) {
                const newReactions = { ...item.reactions };
                const reactors = newReactions[emoji] || [];
                const memberId = activeMember.id;
                
                // Allow toggling reaction
                if (reactors.includes(memberId)) {
                    newReactions[emoji] = reactors.filter(id => id !== memberId);
                } else {
                    newReactions[emoji] = [...reactors, memberId];
                }
                return { ...item, reactions: newReactions };
            }
            return item;
        });
        onUpdateCrew({ ...crew, sharedWishlist: newWishlist });
    };
    
    const handleCommentOnItem = () => {
        if (!selectedItemId || !comment.trim() || !activeMember) return;
        const newWishlist = crew.sharedWishlist.map(item => {
            if (item.id === selectedItemId) {
                const newComment = {
                    id: `c-${Date.now()}`,
                    sender: activeMember.name,
                    text: comment.trim(),
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                };
                return { ...item, comments: [...(item.comments || []), newComment] };
            }
            return item;
        });
        onUpdateCrew({ ...crew, sharedWishlist: newWishlist });
        setComment('');
    };

    const handleAddItemToShared = (item: WardrobeItem) => {
        if (!activeMember) return;
        const newItem: SharedWishlistItem = {
            ...item,
            addedBy: activeMember.name,
            ratings: [],
            reactions: {},
            comments: [],
        };
        onUpdateCrew({ ...crew, sharedWishlist: [newItem, ...crew.sharedWishlist] });
    };
    
    const handleTryOn = async (item: WardrobeItem) => {
        try {
            const file = await urlToFile(item.url, item.name);
            onTryOnItem(file, item);
            setSelectedItemId(null); // Close detail view after trying on
        } catch (error) {
            console.error("Failed to prepare garment for try-on", error);
        }
    };
    
    const getAverageRating = (ratings: { memberId: string, value: number }[]) => {
        if (ratings.length === 0) return 0;
        return ratings.reduce((acc, r) => acc + r.value, 0) / ratings.length;
    };
    
    const myRating = selectedItem?.ratings.find(r => r.memberId === activeMember?.id)?.value || 0;

    const renderTabs = () => (
        <div className="flex border-b border-gray-300 mb-2">
            <button onClick={() => setActiveTab('shared')} className={`flex-1 py-2 text-sm font-semibold text-center transition-colors ${activeTab === 'shared' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-gray-500 hover:text-gray-800'}`}>Shared Wishlist</button>
            <button onClick={() => setActiveTab('personal')} className={`flex-1 py-2 text-sm font-semibold text-center transition-colors ${activeTab === 'personal' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-gray-500 hover:text-gray-800'}`}>Personal Wishlist</button>
        </div>
    );

    const renderSharedWishlist = () => (
        <div className="space-y-1">
            {crew.sharedWishlist.map((item) => {
                const avgRating = getAverageRating(item.ratings);
                return (
                    <div key={item.id}>
                        <button
                            onClick={() => setSelectedItemId(selectedItemId === item.id ? null : item.id)}
                            className={cn(
                                "w-full flex items-center gap-3 p-2 rounded-lg text-left transition-all",
                                selectedItemId === item.id ? "bg-primary-100" : "hover:bg-gray-100"
                            )}
                        >
                            <img src={item.url} alt={item.name} className="w-14 h-14 object-cover rounded-md flex-shrink-0" />
                            <div className="flex-grow overflow-hidden">
                                <p className="font-semibold text-sm text-gray-800 truncate">{item.name}</p>
                                <div className="flex items-center gap-1 text-yellow-500">
                                    <StarIcon className={`w-3.5 h-3.5 ${avgRating > 0 ? 'fill-current' : ''}`} />
                                    <span className="text-xs font-bold text-gray-600">{avgRating.toFixed(1)}</span>
                                    <span className="text-gray-400 text-xs">({item.ratings.length})</span>
                                </div>
                                <div className="flex items-center gap-1 mt-1 flex-wrap">
                                    {/* FIX: Added a type assertion for the `reactors` variable to ensure it's treated as a string array, resolving errors with accessing the `.length` property. */}
                                    {Object.entries(item.reactions).map(([emoji, reactors]) => {
                                        const reactorList = reactors as string[];
                                        return reactorList.length > 0 && (
                                            <div key={emoji} className="flex items-center gap-0.5 text-xs bg-gray-200 rounded-full px-1.5 py-0.5">
                                                <span>{emoji}</span>
                                                <span className="font-semibold text-gray-700 text-[10px]">{reactorList.length}</span>
                                            </div>
                                        )
                                    }
                                    )}
                                </div>
                            </div>
                        </button>

                        <AnimatePresence>
                            {selectedItemId === item.id && selectedItem && activeMember && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="bg-gray-50 rounded-b-lg overflow-hidden"
                                >
                                    <div className="p-3 flex flex-col min-h-[380px]">
                                        <div className="flex-shrink-0 space-y-3">
                                            <div className="flex justify-around items-center bg-white p-2 rounded-lg border">
                                                <div className="flex items-center gap-1" title={`Your rating: ${myRating > 0 ? myRating : 'None'}`}>
                                                    {[1, 2, 3, 4, 5].map(star => (
                                                        <button key={star} onClick={() => handleRateItem(star)} className="text-gray-300 hover:text-yellow-400 transition-colors">
                                                            <StarIcon className={`w-5 h-5 ${myRating >= star ? 'text-yellow-400 fill-current' : ''}`} />
                                                        </button>
                                                    ))}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {REACTIONS.map(emoji => (
                                                        <button key={emoji} onClick={() => handleReactToItem(emoji)} className={cn("p-1 rounded-full transition-transform text-xl leading-none", (item.reactions[emoji] || []).includes(activeMember.id) ? 'bg-primary-100 scale-110' : 'hover:bg-gray-200 hover:scale-110')}>
                                                            {emoji}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex-grow space-y-3 overflow-y-auto p-2 my-3 bg-white rounded-lg border min-h-[120px]">
                                            {item.comments.length > 0 ? item.comments.map(c => {
                                                const isMe = c.sender === activeMember.name;
                                                return (
                                                    <div key={c.id} className={`flex items-end gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
                                                        {!isMe && <div className="w-5 h-5 rounded-full bg-gray-300 text-[10px] flex items-center justify-center font-bold text-gray-600 flex-shrink-0" title={c.sender}>{c.sender.charAt(0)}</div>}
                                                        <div className={`max-w-[85%] p-2 rounded-lg ${isMe ? 'bg-primary-600 text-white rounded-br-lg' : 'bg-gray-200 text-gray-800 rounded-bl-lg'}`}>
                                                            {!isMe && <p className="font-bold text-primary-700 text-[10px] mb-0.5">{c.sender}</p>}
                                                            <p className="text-xs">{c.text}</p>
                                                            <p className={`text-[10px] mt-1 text-right ${isMe ? 'text-primary-100' : 'text-gray-500'}`}>{c.timestamp}</p>
                                                        </div>
                                                    </div>
                                                )
                                            }) : <p className="text-xs text-gray-500 text-center py-4">Start the conversation!</p>}
                                        </div>
                                        
                                        <div className="relative flex-shrink-0">
                                            <input type="text" value={comment} onChange={e => setComment(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCommentOnItem()} placeholder="Add a comment..." className="w-full text-sm rounded-md border-gray-300 shadow-sm pl-3 pr-10 py-2 focus:ring-primary-500 focus:border-primary-500"/>
                                            <button onClick={handleCommentOnItem} disabled={!comment.trim()} className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 hover:text-primary-600 disabled:text-gray-300">
                                                <PaperAirplaneIcon className="w-4 h-4"/>
                                            </button>
                                        </div>
                                        <button onClick={() => handleTryOn(item)} className="w-full text-center bg-gray-800 text-white font-semibold py-2 px-4 rounded-lg text-sm hover:bg-black transition-colors mt-3 flex-shrink-0">Try On</button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                );
            })}
             {crew.sharedWishlist.length === 0 && (
                <div className="text-center py-10">
                    <p className="text-sm text-gray-500">The shared wishlist is empty.</p>
                    <p className="text-xs text-gray-400 mt-1">Add items from your personal list to collaborate.</p>
                </div>
            )}
        </div>
    );

    const renderPersonalWishlist = () => {
        if (!activeMember) return null;
        const sharedIds = new Set(crew.sharedWishlist.map(i => i.id));
        return (
             <div>
                 <button onClick={() => setIsShareModalOpen(true)} className="w-full flex items-center justify-center gap-2 mb-2 px-3 py-1.5 text-sm font-semibold text-white bg-primary-600 rounded-md hover:bg-primary-700 transition-colors">
                    <Share2Icon className="w-4 h-4"/> Share Items with Crew
                </button>
                {activeMember.wishlist && activeMember.wishlist.length > 0 ? (
                    <div className="min-w-0">
                        <div className="flex flex-nowrap gap-3 overflow-x-auto hide-scrollbar py-2">
                            {activeMember.wishlist.map(item => {
                                const isShared = sharedIds.has(item.id);
                                return (
                                    <div key={item.id} className="flex flex-col gap-2 p-2 rounded-lg bg-white border w-32 flex-shrink-0">
                                        <img src={item.url} alt={item.name} className="w-full aspect-square object-cover rounded-md flex-shrink-0" />
                                        <div className="flex-grow overflow-hidden">
                                            <p className="font-semibold text-xs text-gray-800 truncate">{item.name}</p>
                                            <p className="text-xs text-gray-500">{item.price}</p>
                                        </div>
                                        <button
                                            onClick={() => handleAddItemToShared(item)}
                                            disabled={isShared}
                                            className="w-full px-2.5 py-1 text-xs font-semibold rounded-md transition-colors disabled:bg-gray-200 disabled:text-gray-500 disabled:cursor-not-allowed bg-primary-100 text-primary-700 hover:bg-primary-200"
                                        >
                                            {isShared ? 'Shared' : 'Share'}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-10">
                        <p className="text-sm text-gray-500">{activeMember.name}'s personal wishlist is empty.</p>
                    </div>
                )}
             </div>
        );
    };

    return (
        <div className={`flex flex-col h-full pt-4 transition-opacity ${isLoading ? 'opacity-50 pointer-events-none' : ''}`}>
            <AnimatePresence>
                <ShareItemsModal 
                    isOpen={isShareModalOpen}
                    onClose={() => setIsShareModalOpen(false)}
                    personalWishlist={activeMember?.wishlist || []}
                    sharedWishlistIds={new Set(crew.sharedWishlist.map(i => i.id))}
                    onShareItem={handleAddItemToShared}
                />
            </AnimatePresence>
           
           {renderTabs()}

            <div className="flex-grow overflow-y-auto pr-1 mt-2">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                    >
                        {activeTab === 'shared' ? renderSharedWishlist() : renderPersonalWishlist()}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
};

export default SharedWishlistPanel;