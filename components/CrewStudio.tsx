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
import { db } from '../firebaseConfig';
import { ref, set, get, onValue } from 'firebase/database';

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
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-xl p-6 w-full max-w-md"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Share Crew</h3>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
                        <XIcon className="w-5 h-5" />
                    </button>
                </div>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Share Link</label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={shareUrl}
                                readOnly
                                className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm"
                                onClick={e => (e.target as HTMLInputElement).select()}
                            />
                            <button
                                onClick={handleCopy}
                                className="px-3 py-2 bg-primary-600 text-white rounded text-sm hover:bg-primary-700"
                            >
                                {copySuccess || 'Copy'}
                            </button>
                        </div>
                    </div>
                    <p className="text-sm text-gray-600">
                        Share this link with friends to invite them to your styling session.
                    </p>
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
  isJoining?: boolean; // Flag to indicate if user is joining via shared link
  crewId?: string; // Firebase crew ID for real-time sync
  memberId?: string; // Current user's member ID
}

const CrewStudio: React.FC<CrewStudioProps> = ({ 
  crew, 
  setCrew, 
  wishlist, 
  poseInstructions, 
  onSaveOutfit, 
  isJoining = false,
  crewId,
  memberId 
}) => {
  const [activeMemberId, setActiveMemberId] = useState<string | null>(crew?.members[0]?.id || null);
  const [memberForModelCreation, setMemberForModelCreation] = useState<string | null>(() => 
    // When joining, always start with model creation for the new member
    isJoining ? memberId || crew?.members[crew.members.length - 1]?.id : crew?.members.find(m => !m.modelImageUrl)?.id || null
  );
  const [showModelCreationIntro, setShowModelCreationIntro] = useState(isJoining);
  const [hasCreatedModel, setHasCreatedModel] = useState(false);
  
  const [currentOutfit, setCurrentOutfit] = useState<OutfitLayer[]>([]);
  const [background, setBackground] = useState('studio');
  const [currentPose, setCurrentPose] = useState('standing_straight');
  const [showSharedWishlist, setShowSharedWishlist] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [crewChatVisible, setCrewChatVisible] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [isGeneratingGroupPhoto, setIsGeneratingGroupPhoto] = useState(false);
  const [groupPhotoUrl, setGroupPhotoUrl] = useState<string | null>(null);
  const [isShowingOutfits, setIsShowingOutfits] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);

  // Firebase real-time sync
  useEffect(() => {
    if (!crewId) return;
    
    const crewRef = ref(db, `crews/${crewId}`);
    const unsubscribe = onValue(crewRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        // Convert Firebase data back to Crew format
        const updatedCrew: Crew = {
          name: data.name,
          vibe: data.vibe,
          members: Object.keys(data.members || {}).map(mid => ({
            id: mid,
            name: `Member ${Object.keys(data.members || {}).indexOf(mid) + 1}`,
            modelImageUrl: data.members[mid].modelImageUrl || null,
            outfitHistory: [],
            poseIndex: 0,
            wishlist: data.members[mid].wishlist || []
          })),
          messages: data.messages ? Object.values(data.messages) : [],
          sharedWishlist: data.sharedWishlist ? Object.values(data.sharedWishlist) : []
        };
        setCrew(updatedCrew);
      }
    });

    return () => unsubscribe();
  }, [crewId, setCrew]);

  // Update Firebase when crew data changes
  const updateFirebaseCrew = useCallback(async (updatedCrew: Crew) => {
    if (!crewId) return;
    
    try {
      const crewRef = ref(db, `crews/${crewId}`);
      await set(crewRef, {
        name: updatedCrew.name,
        vibe: updatedCrew.vibe,
        members: updatedCrew.members.reduce((acc, member) => {
          acc[member.id] = {
            joinedAt: Date.now(),
            modelImageUrl: member.modelImageUrl || null,
            wishlist: member.wishlist || []
          };
          return acc;
        }, {} as any),
        messages: updatedCrew.messages?.reduce((acc, msg, index) => {
          acc[index] = msg;
          return acc;
        }, {} as any) || {},
        sharedWishlist: updatedCrew.sharedWishlist?.reduce((acc, item, index) => {
          acc[index] = item;
          return acc;
        }, {} as any) || {}
      });
    } catch (error) {
      console.error('Failed to update Firebase crew:', error);
    }
  }, [crewId]);

  // Check if all crew members have created their models
  const allMembersHaveModels = useMemo(() => {
    return crew?.members.every(member => member.modelImageUrl) || false;
  }, [crew?.members]);

  // Check if the active member has a model
  const activeMember = useMemo(() => {
    return crew?.members.find(m => m.id === activeMemberId) || null;
  }, [crew?.members, activeMemberId]);

  // If there's a member needing model creation, handle model creation process
  const handleModelCreated = useCallback((imageDataUrl: string) => {
    if (!crew || !memberForModelCreation) return;
    
    const updatedCrew = {
      ...crew,
      members: crew.members.map(member => 
        member.id === memberForModelCreation 
          ? { ...member, modelImageUrl: imageDataUrl }
          : member
      )
    };
    
    setCrew(updatedCrew);
    updateFirebaseCrew(updatedCrew);
    
    setMemberForModelCreation(null);
    setShowModelCreationIntro(false);
    setHasCreatedModel(true);
    
    // Set this member as active
    setActiveMemberId(memberForModelCreation);
  }, [crew, memberForModelCreation, setCrew, updateFirebaseCrew]);

  // Chat functionality
  const handleSendMessage = useCallback(() => {
    if (!newMessage.trim() || !crew || !activeMemberId) return;
    
    const message: ChatMessage = {
      id: Date.now().toString(),
      sender: crew.members.find(m => m.id === activeMemberId)?.name || 'Unknown',
      text: newMessage.trim(),
      timestamp: Date.now().toString()
    };
    
    const updatedCrew = {
      ...crew,
      messages: [...(crew.messages || []), message]
    };
    
    setCrew(updatedCrew);
    updateFirebaseCrew(updatedCrew);
    setNewMessage('');
  }, [newMessage, crew, activeMemberId, setCrew, updateFirebaseCrew]);

  // Generate group photo functionality
  const handleGenerateGroupPhoto = useCallback(async () => {
    if (!crew?.members || !allMembersHaveModels) return;
    
    setIsGeneratingGroupPhoto(true);
    
    try {
      const memberImages = crew.members
        .filter(m => m.modelImageUrl)
        .map(m => m.modelImageUrl!);
      
      const groupPhotoDataUrl = await generateGroupPhoto(crew.vibe, memberImages);
      setGroupPhotoUrl(groupPhotoDataUrl);
    } catch (error) {
      console.error('Failed to generate group photo:', error);
      alert('Failed to generate group photo. Please try again.');
    }
    
    setIsGeneratingGroupPhoto(false);
  }, [crew?.members, allMembersHaveModels, background]);

  const handleMemberNameSave = useCallback((newName: string) => {
    if (!editingMemberId || !crew) return;
    
    const updatedCrew = {
      ...crew,
      members: crew.members.map(member => 
        member.id === editingMemberId 
          ? { ...member, name: newName }
          : member
      )
    };
    
    setCrew(updatedCrew);
    updateFirebaseCrew(updatedCrew);
    setEditingMemberId(null);
  }, [editingMemberId, crew, setCrew, updateFirebaseCrew]);

  // Handle adding items to active member's personal wishlist
  const handleAddToPersonalWishlist = useCallback((item: WardrobeItem) => {
    if (!activeMemberId || !crew) return;
    
    const updatedCrew = {
      ...crew,
      members: crew.members.map(member => {
        if (member.id === activeMemberId) {
          const existingIndex = member.wishlist.findIndex(w => w.id === item.id);
          if (existingIndex > -1) {
            // Remove if already exists
            return {
              ...member,
              wishlist: member.wishlist.filter(w => w.id !== item.id)
            };
          } else {
            // Add if not exists
            return {
              ...member,
              wishlist: [...member.wishlist, item]
            };
          }
        }
        return member;
      })
    };
    
    setCrew(updatedCrew);
    updateFirebaseCrew(updatedCrew);
  }, [activeMemberId, crew, setCrew, updateFirebaseCrew]);

  // Show model creation screen if there's a member who needs to create a model
  if (memberForModelCreation && showModelCreationIntro) {
    const memberName = crew?.members.find(m => m.id === memberForModelCreation)?.name || 'Member';
    
    return (
      <div className="flex-1 flex flex-col">
        <div className="bg-white border-b px-6 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Create Your Model - {memberName}</h1>
          <p className="text-gray-600 mt-1">Upload your photo to join the crew styling session</p>
        </div>
        
        <div className="flex-1 bg-gray-50">
          <StartScreen 
            onModelFinalized={(modelUrl) => handleModelCreated(modelUrl)}
            allowPreviousModel={false}
          />
        </div>
      </div>
    );
  }

  // If no crew data, show loading
  if (!crew) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Loading Crew Studio...</h2>
          <p className="text-gray-600">Setting up your collaborative styling session</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{crew.name}</h1>
            <p className="text-gray-600 text-sm">{crew.vibe}</p>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Generate Group Photo Button */}
            {allMembersHaveModels && (
              <motion.button
                onClick={handleGenerateGroupPhoto}
                disabled={isGeneratingGroupPhoto}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
              >
                <CameraIcon className="w-4 h-4" />
                {isGeneratingGroupPhoto ? 'Generating...' : 'Group Photo'}
              </motion.button>
            )}
            
            {/* Chat Toggle */}
            <motion.button
              onClick={() => setCrewChatVisible(!crewChatVisible)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                crewChatVisible 
                  ? 'bg-primary-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <MessageSquareIcon className="w-4 h-4" />
              Chat
            </motion.button>
            
            {/* Share Button */}
            <motion.button
              onClick={() => setShowShareModal(true)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <Share2Icon className="w-4 h-4" />
              Share
            </motion.button>
          </div>
        </div>
        
        {/* Member Pills */}
        <div className="flex items-center gap-2 mt-4">
          <span className="text-sm font-medium text-gray-700">Members:</span>
          {crew.members.map((member) => (
            <div key={member.id} className="flex items-center">
              {editingMemberId === member.id ? (
                <MemberNameEditor 
                  member={member} 
                  onSave={handleMemberNameSave}
                />
              ) : (
                <motion.button
                  onClick={() => setEditingMemberId(member.id)}
                  whileHover={{ scale: 1.05 }}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                    member.id === activeMemberId
                      ? 'bg-primary-100 text-primary-800 border border-primary-300'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <div className={`w-2 h-2 rounded-full ${
                    member.modelImageUrl ? 'bg-green-500' : 'bg-gray-400'
                  }`} />
                  {member.name}
                  <PencilIcon className="w-3 h-3 opacity-60" />
                </motion.button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 flex">
        {/* Main Content */}
        <div className="flex-1 flex">
          {activeMember?.modelImageUrl ? (
            <>
              {/* Model Display Area */}
              <div className="flex-1 p-6">
                <div className="h-full flex items-center justify-center">
                  <img
                    src={activeMember.modelImageUrl}
                    alt={`${activeMember.name}'s model`}
                    className="max-h-full max-w-full object-contain rounded-lg shadow-lg"
                  />
                </div>
              </div>
              
              {/* Right Sidebar */}
              <div className="w-96 border-l border-gray-200 flex flex-col">
                {isShowingOutfits ? (
                  <div className="flex-1 p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold">Saved Outfits</h3>
                      <button
                        onClick={() => setIsShowingOutfits(false)}
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        <XIcon className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="text-center text-gray-500 py-8">
                      <p>No saved outfits yet.</p>
                      <p className="text-sm">Save outfits to see them here!</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="p-4 border-b">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-semibold">Wardrobe</h3>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setIsShowingOutfits(true)}
                            className="text-sm px-3 py-1 bg-primary-100 text-primary-700 rounded-lg hover:bg-primary-200"
                          >
                            Saved Outfits
                          </button>
                          <button
                            onClick={() => setShowSharedWishlist(true)}
                            className="text-sm px-3 py-1 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200"
                          >
                            Wishlists
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-4">
                      {/* Personal Wishlist Items */}
                      {activeMember?.wishlist && activeMember.wishlist.length > 0 ? (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 mb-3">Your Personal Wishlist</h4>
                          <div className="grid grid-cols-2 gap-3 mb-6">
                            {activeMember.wishlist.slice(0, 4).map((item) => (
                              <div key={item.id} className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow">
                                <img 
                                  src={item.url} 
                                  alt={item.name}
                                  className="w-full h-20 object-cover rounded mb-2"
                                />
                                <p className="text-xs font-medium text-gray-800 truncate">{item.name}</p>
                                <p className="text-xs text-gray-500">{item.price}</p>
                              </div>
                            ))}
                          </div>
                          {activeMember.wishlist.length > 4 && (
                            <button
                              onClick={() => setShowSharedWishlist(true)}
                              className="w-full text-sm text-primary-600 hover:text-primary-700 font-medium"
                            >
                              View all {activeMember.wishlist.length} wishlist items →
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="text-center text-gray-500 py-8">
                          <p>No personal wishlist items yet.</p>
                          <p className="text-sm">Add items from the shared wishlist!</p>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Create Your Model</h2>
                <p className="text-gray-600 mb-4">Upload a photo to start styling</p>
                <button
                  onClick={() => {
                    setMemberForModelCreation(activeMemberId);
                    setShowModelCreationIntro(true);
                  }}
                  className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  Upload Photo
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Chat Sidebar */}
        <AnimatePresence>
          {crewChatVisible && (
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.3 }}
              className="w-80 bg-white border-l border-gray-200 flex flex-col"
            >
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Crew Chat</h3>
                  <button
                    onClick={() => setCrewChatVisible(false)}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    <XIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4">
                {crew.messages && crew.messages.length > 0 ? (
                  <div className="space-y-3">
                    {crew.messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.sender === crew.members.find(m => m.id === activeMemberId)?.name ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-xs px-3 py-2 rounded-lg ${
                            message.sender === crew.members.find(m => m.id === activeMemberId)?.name
                              ? 'bg-primary-600 text-white'
                              : 'bg-gray-100 text-gray-900'
                          }`}
                        >
                          {message.sender !== crew.members.find(m => m.id === activeMemberId)?.name && (
                            <p className="text-xs font-medium opacity-75 mb-1">
                              {message.sender}
                            </p>
                          )}
                          <p className="text-sm">{message.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    <p>No messages yet.</p>
                    <p className="text-sm">Start the conversation!</p>
                  </div>
                )}
              </div>
              
              <div className="p-4 border-t border-gray-200">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Type a message..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                  <motion.button
                    onClick={handleSendMessage}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    disabled={!newMessage.trim()}
                    className="p-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <PaperAirplaneIcon className="w-5 h-5" />
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Shared Wishlist Modal */}
      <AnimatePresence>
        {showSharedWishlist && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowSharedWishlist(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-6 max-w-4xl max-h-[90vh] overflow-auto w-full"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-2xl font-bold text-gray-900">Crew Wishlists</h3>
                <button
                  onClick={() => setShowSharedWishlist(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <XIcon className="w-6 h-6" />
                </button>
              </div>
              
              <SharedWishlistPanel
                crew={crew}
                activeMemberId={activeMemberId}
                onUpdateCrew={(updatedCrew) => {
                  setCrew(updatedCrew);
                  updateFirebaseCrew(updatedCrew);
                }}
                onTryOnItem={(garmentFile, garmentInfo) => {
                  // Handle try-on logic here
                  console.log('Try-on:', garmentFile, garmentInfo);
                }}
                isLoading={false}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Share Modal */}
      <AnimatePresence>
        {showShareModal && (
          <ShareModal
            isOpen={showShareModal}
            onClose={() => setShowShareModal(false)}
            crew={crew}
          />
        )}
      </AnimatePresence>

      {/* Group Photo Modal */}
      <AnimatePresence>
        {groupPhotoUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setGroupPhotoUrl(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-6 max-w-4xl max-h-[90vh] overflow-auto"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-2xl font-bold text-gray-900">Group Photo</h3>
                <button
                  onClick={() => setGroupPhotoUrl(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <XIcon className="w-6 h-6" />
                </button>
              </div>
              
              <div className="text-center">
                <img
                  src={groupPhotoUrl}
                  alt="Group photo"
                  className="max-w-full max-h-[60vh] object-contain rounded-lg shadow-lg mx-auto"
                />
                <div className="mt-4 flex gap-3 justify-center">
                  <button
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = groupPhotoUrl;
                      link.download = `${crew.name}_group_photo.png`;
                      link.click();
                    }}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    Download
                  </button>
                  <button
                    onClick={() => {
                      navigator.share?.({
                        title: `${crew.name} Group Photo`,
                        text: 'Check out our group styling session!',
                        url: groupPhotoUrl
                      }).catch(() => {
                        // Fallback for browsers without Web Share API
                        navigator.clipboard.writeText(groupPhotoUrl);
                        alert('Image URL copied to clipboard!');
                      });
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Share
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CrewStudio;