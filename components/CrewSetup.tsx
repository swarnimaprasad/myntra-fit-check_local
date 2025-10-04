/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ref, set, get, onValue } from "firebase/database";
import { db } from "../firebaseConfig";

// Generate a random member ID
function generateMemberId() {
  return 'member_' + Math.random().toString(36).substr(2, 9);
}

// To create a crew session with first member
async function createCrewSession(sessionData: { name: string; vibe: string }, memberId: string) {
  const crewId = Date.now().toString();
  await set(ref(db, `crews/${crewId}`), {
    ...sessionData,
    members: {
      [memberId]: { 
        name: "Creator",
        joinedAt: Date.now(),
        modelImageUrl: null,
        hasCreatedModel: false
      }
    },
    createdAt: Date.now(),
    status: 'active'
  });
  return crewId;
}

// To join a crew session as a new member
async function joinCrewSession(crewId: string, memberId: string, memberCount: number) {
  const memberRef = ref(db, `crews/${crewId}/members/${memberId}`);
  await set(memberRef, { 
    name: `Member ${memberCount + 1}`,
    joinedAt: Date.now(),
    modelImageUrl: null,
    hasCreatedModel: false
  });
}

interface CrewSetupProps {
  onCreateCrew: (name: string, vibe: string, crewId?: string, memberId?: string, isJoining?: boolean) => void;
}

const CrewSetup: React.FC<CrewSetupProps> = ({ onCreateCrew }) => {
  const [name, setName] = useState('');
  const [vibe, setVibe] = useState('');
  const [crewId, setCrewId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [memberId, setMemberId] = useState<string>(() => generateMemberId());
  const [members, setMembers] = useState<any>({});
  const [isJoining, setIsJoining] = useState(false);
  const [crewData, setCrewData] = useState<{ name: string; vibe: string } | null>(null);

  // Listen for crew members in real time
  useEffect(() => {
    if (!crewId) return;
    const membersRef = ref(db, `crews/${crewId}/members`);
    const unsubscribe = onValue(membersRef, (snapshot) => {
      setMembers(snapshot.val() || {});
    });
    return () => unsubscribe();
  }, [crewId]);

  // Function to share crew link on WhatsApp
  function shareCrewLink(crewId: string) {
    const link = `${window.location.origin}/crew/${crewId}`;
    const message = `Join my Style Crew! Let's coordinate our outfits together: ${link}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`);
  }

  // Handle form submit and create crew session in Firebase
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && vibe.trim()) {
      setCreating(true);
      try {
        const id = await createCrewSession({ name: name.trim(), vibe: vibe.trim() }, memberId);
        setCrewId(id);
      } catch (err) {
        console.error(err);
        alert("Failed to create crew. Please try again.");
      }
      setCreating(false);
    }
  };

  // If joining via link, add member to crew
  useEffect(() => {
    // Check if URL contains /crew/:crewId
    const match = window.location.pathname.match(/\/crew\/(\w+)/);
    const urlCrewId = match ? match[1] : null;
    if (urlCrewId && !crewId) {
      setIsJoining(true);
      setCrewId(urlCrewId);
      
      // Fetch crew data first
      get(ref(db, `crews/${urlCrewId}`)).then((snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          setCrewData({ name: data.name, vibe: data.vibe });
          const memberCount = Object.keys(data.members || {}).length;
          joinCrewSession(urlCrewId, memberId, memberCount);
        } else {
          alert("Crew not found. Please check the link.");
        }
      }).catch((error) => {
        console.error("Error fetching crew data:", error);
        alert("Failed to join crew. Please try again.");
      });
    }
  }, [crewId, memberId]);

  // Handle proceeding to model creation
  const handleProceedToModelCreation = () => {
    if (crewId) {
      onCreateCrew(
        crewData?.name || name, 
        crewData?.vibe || vibe, 
        crewId, 
        memberId, 
        isJoining
      );
    }
  };

  const vibeSuggestions = [
    "Beach vacation in Miami",
    "A friend's wedding",
    "Music festival weekend",
    "Casual city sightseeing",
    "Formal dinner party",
  ];

  return (
    <div className="w-full flex-grow grid grid-cols-1 lg:grid-cols-2 bg-white">
      {/* Left Column - Info */}
      <div className="hidden lg:flex flex-col items-center justify-center p-12 bg-white">
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="max-w-md"
        >
          <img 
            src="https://i.postimg.cc/NjLHkzGp/Frame-42973.png" 
            alt="Family in coordinated outfits for an event" 
            className="rounded-lg shadow-2xl object-cover mb-8"
          />
          <h2 className="text-4xl font-serif font-medium text-gray-800 leading-tight">
            Style Together, <br /> From Anywhere <br /> in the World.
          </h2>
          <p className="mt-4 text-base text-gray-600 leading-relaxed">
            Our group styling feature lets you coordinate outfits for everyone, no matter where they are. Virtually try on styles together, preview your look against the wedding venue's background, and create a flawless, unforgettable memory.
          </p>
        </motion.div>
      </div>

      {/* Right Column - Form */}
      <div className="w-full flex items-center justify-center p-8 bg-gray-50">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="w-full max-w-md bg-white p-10 rounded-2xl shadow-xl border border-gray-200/80"
        >
          {/* Joining an existing crew */}
          {isJoining && crewData ? (
            <div className="text-center">
              <h1 className="text-4xl font-serif font-bold text-gray-800 mb-2">Join Style Crew</h1>
              <div className="mb-6 p-4 bg-primary-50 border border-primary-200 rounded-lg">
                <h2 className="text-xl font-semibold text-primary-800">{crewData.name}</h2>
                <p className="text-sm text-primary-600 mt-1">{crewData.vibe}</p>
              </div>
              
              <div className="mb-6">
                <h3 className="text-lg font-bold mb-2 text-gray-800">Crew Members:</h3>
                <ul className="space-y-2">
                  {Object.entries(members).map(([mid, member]: [string, any], idx) => (
                    <li key={mid} className={`flex items-center justify-between p-2 rounded-lg border ${mid === memberId ? "bg-primary-100 border-primary-300" : "bg-gray-50 border-gray-200"}`}>
                      <span className={`font-medium ${mid === memberId ? "text-primary-700" : "text-gray-700"}`}>
                        {member.name} {mid === memberId ? "(You)" : ""}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded-full ${member.hasCreatedModel ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                        {member.hasCreatedModel ? "Model Ready" : "Joining"}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              
              <button
                onClick={handleProceedToModelCreation}
                className="w-full py-3 px-4 text-base font-semibold text-white bg-primary-600 rounded-md hover:bg-primary-700 transition-all duration-300 transform hover:scale-105 shadow-lg shadow-primary-500/30 hover:shadow-xl hover:shadow-primary-500/40"
              >
                Create Your Model & Join Studio
              </button>
            </div>
          ) : crewId && !isJoining ? (
            /* Crew created successfully - show sharing options */
            <div className="text-center">
              <h1 className="text-4xl font-serif font-bold text-gray-800 mb-2">Crew Created!</h1>
              <p className="text-green-700 font-semibold mb-4">Share this link with your friends:</p>
              
              <div className="mb-6">
                <div className="flex flex-col items-center gap-3">
                  <input
                    type="text"
                    value={`${window.location.origin}/crew/${crewId}`}
                    readOnly
                    className="w-full px-3 py-2 border rounded text-gray-700 text-sm"
                    onClick={e => (e.target as HTMLInputElement).select()}
                  />
                  <div className="flex gap-2 w-full">
                    <button
                      type="button"
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 font-semibold text-sm"
                      onClick={() => shareCrewLink(crewId)}
                    >
                      Share on WhatsApp
                    </button>
                    <button
                      type="button"
                      className="flex-1 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 font-semibold text-sm"
                      onClick={() => {
                        const link = `${window.location.origin}/crew/${crewId}`;
                        if (navigator.clipboard && navigator.clipboard.writeText) {
                          navigator.clipboard.writeText(link).catch(err => {
                            console.error('Failed to copy to clipboard:', err);
                            // Fallback: create a temporary input element
                            const textArea = document.createElement('textarea');
                            textArea.value = link;
                            document.body.appendChild(textArea);
                            textArea.select();
                            document.execCommand('copy');
                            document.body.removeChild(textArea);
                          });
                        } else {
                          // Fallback for older browsers
                          const textArea = document.createElement('textarea');
                          textArea.value = link;
                          document.body.appendChild(textArea);
                          textArea.select();
                          document.execCommand('copy');
                          document.body.removeChild(textArea);
                        }
                      }}
                    >
                      Copy Link
                    </button>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-lg font-bold mb-2 text-gray-800">Crew Members:</h3>
                <ul className="space-y-2">
                  {Object.entries(members).map(([mid, member]: [string, any], idx) => (
                    <li key={mid} className={`flex items-center justify-between p-2 rounded-lg border ${mid === memberId ? "bg-primary-100 border-primary-300" : "bg-gray-50 border-gray-200"}`}>
                      <span className={`font-medium ${mid === memberId ? "text-primary-700" : "text-gray-700"}`}>
                        {member.name} {mid === memberId ? "(You)" : ""}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded-full ${member.hasCreatedModel ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                        {member.hasCreatedModel ? "Model Ready" : "Joining"}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              
              <button
                onClick={handleProceedToModelCreation}
                className="w-full py-3 px-4 text-base font-semibold text-white bg-primary-600 rounded-md hover:bg-primary-700 transition-all duration-300 transform hover:scale-105 shadow-lg shadow-primary-500/30 hover:shadow-xl hover:shadow-primary-500/40"
              >
                Create Your Model & Enter Studio
              </button>
            </div>
          ) : (
            /* Initial crew creation form */
            <div>
              <div className="text-center mb-8">
                  <h1 className="text-4xl font-serif font-bold text-gray-800">Create your Crew</h1>
                  <p className="mt-1 text-gray-600">Plan the perfect group look.</p>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label htmlFor="crew-name" className="text-sm font-semibold text-gray-700 mb-1.5 block">Crew Name</label>
                    <input
                      id="crew-name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g., Miami Trip, Sarah's Wedding"
                      className="block w-full rounded-md bg-white text-gray-800 placeholder-gray-400 px-4 py-3 border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                      required
                    />
                </div>
                <div>
                    <label htmlFor="crew-vibe" className="text-sm font-semibold text-gray-700 mb-1.5 block">Event Vibe</label>
                    <textarea
                      id="crew-vibe"
                      value={vibe}
                      onChange={(e) => setVibe(e.target.value)}
                      placeholder="Describe the occasion or style..."
                      rows={3}
                      className="block w-full rounded-md bg-white text-gray-800 placeholder-gray-400 px-4 py-3 border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                      required
                    />
                    <div className="pt-3">
                        <p className="text-xs font-semibold text-gray-500 mb-2">Or get inspired:</p>
                        <div className="flex flex-wrap gap-2">
                            {vibeSuggestions.map((suggestion) => (
                                <motion.button
                                    key={suggestion}
                                    type="button"
                                    onClick={() => setVibe(suggestion)}
                                    className="px-3 py-1 text-xs font-medium text-primary-700 bg-primary-100/60 border border-primary-200 rounded-full hover:bg-primary-100 transition-colors"
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    {suggestion}
                                </motion.button>
                            ))}
                        </div>
                    </div>
                </div>
                <button
                  type="submit"
                  disabled={!name.trim() || !vibe.trim() || creating}
                  className="w-full flex items-center justify-center px-8 py-3 text-base font-semibold text-white bg-primary-600 rounded-md hover:bg-primary-700 transition-all duration-300 transform hover:scale-105 disabled:bg-primary-300 disabled:cursor-not-allowed disabled:scale-100 shadow-lg shadow-primary-500/30 hover:shadow-xl hover:shadow-primary-500/40"
                >
                  {creating ? "Creating..." : "Start Styling Together"}
                </button>
              </form>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default CrewSetup;
