/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState } from 'react';
import type { WardrobeItem } from '../types';
import { UploadCloudIcon, CheckCircleIcon } from './icons';
import { urlToFile } from '../lib/utils';

interface WardrobePanelProps {
  onGarmentSelect: (garmentFile: File, garmentInfo: WardrobeItem) => void;
  activeGarmentIds: string[];
  isLoading: boolean;
  wardrobe: WardrobeItem[];
}

const WardrobePanel: React.FC<WardrobePanelProps> = ({ onGarmentSelect, activeGarmentIds, isLoading, wardrobe }) => {
    const [error, setError] = useState<string | null>(null);
    const [addUrl, setAddUrl] = useState('');
    const [isAddingFromUrl, setIsAddingFromUrl] = useState(false);
    const [addUrlError, setAddUrlError] = useState<string | null>(null);


    const handleGarmentClick = async (item: WardrobeItem) => {
        if (isLoading) return;
        setError(null);
        try {
            // This now just toggles the item in the staging area.
            // The file conversion is now handled by the apply action.
            onGarmentSelect(new File([], ""), item);
        } catch (err) {
            const detailedError = `Failed to stage wardrobe item.`;
            setError(detailedError);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (!file.type.startsWith('image/')) {
                setError('Please select an image file.');
                return;
            }
            const customGarmentInfo: WardrobeItem = {
                id: `custom-${Date.now()}`,
                name: file.name,
                url: URL.createObjectURL(file),
                gender: 'women',
                category: 'tops',
                price: '',
                // FIX: Added missing 'color' property to satisfy the WardrobeItem type.
                color: 'Custom',
            };
            onGarmentSelect(file, customGarmentInfo);
        }
    };

    const handleAddItemFromUrl = async () => {
        if (!addUrl) return;
        setIsAddingFromUrl(true);
        setAddUrlError(null);

        try {
            // Basic validation: ensure it's a plausible URL.
            const url = new URL(addUrl);
            const filename = url.pathname.split('/').pop() || 'imported-garment.png';

            const file = await urlToFile(addUrl, filename);

            const newItem: WardrobeItem = {
                id: `url-${Date.now()}`,
                name: 'Imported Garment',
                url: addUrl, // Use the provided URL for the new item
                gender: 'women',
                category: 'tops',
                price: '',
                // FIX: Added missing 'color' property to satisfy the WardrobeItem type.
                color: 'Imported',
            };

            onGarmentSelect(file, newItem);
            setAddUrl('');
        } catch (err) {
            console.error("Error adding from URL:", err);
            setAddUrlError("Could not load image. Please check the URL or try a different one. The website may be blocking direct image access (CORS).");
        } finally {
            setIsAddingFromUrl(false);
        }
    };

  return (
    <div>
        {/* Add from Web Section */}
        <div className="pt-6 border-t border-gray-400/50">
            <h2 className="text-base font-bold text-gray-800 tracking-wider uppercase mb-2">Try from Web</h2>
            <p className="text-sm text-gray-600 mb-4">
                Find an item online, right-click the image, select &ldquo;Copy Image Address&rdquo;, and paste it here.
            </p>
            <div className="flex gap-2">
                <input
                    type="url"
                    value={addUrl}
                    onChange={(e) => setAddUrl(e.target.value)}
                    placeholder="Paste image URL..."
                    className="flex-grow block w-full rounded-md border-gray-300 bg-gray-200/50 text-gray-800 placeholder-gray-500 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm disabled:opacity-50"
                    disabled={isLoading || isAddingFromUrl}
                />
                <button
                    onClick={handleAddItemFromUrl}
                    disabled={isLoading || isAddingFromUrl || !addUrl}
                    className="inline-flex items-center justify-center rounded-md border border-transparent bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isAddingFromUrl && (
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    )}
                    <span>Add</span>
                </button>
            </div>
            {addUrlError && <p className="text-red-600 text-sm mt-2">{addUrlError}</p>}
        </div>

        {/* Wardrobe Section */}
        <div className="pt-6 mt-6 border-t border-gray-400/50">
            <h2 className="text-base font-bold text-gray-800 tracking-wider uppercase mb-4">Wardrobe (from Wishlist)</h2>
            <div className="grid grid-cols-3 gap-3">
                {wardrobe.map((item) => {
                const isActive = activeGarmentIds.includes(item.id);
                return (
                    <button
                    key={item.id}
                    onClick={() => handleGarmentClick(item)}
                    disabled={isLoading}
                    className="relative aspect-square border border-gray-400/50 rounded-md overflow-hidden transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-600 group disabled:opacity-60 disabled:cursor-not-allowed"
                    aria-label={`Select ${item.name}`}
                    >
                    <img src={item.url} alt={item.name} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <p className="text-white text-xs font-bold text-center p-1">{item.name}</p>
                    </div>
                    {isActive && (
                        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center border-2 border-primary-600 rounded-md">
                            <CheckCircleIcon className="w-8 h-8 text-primary-600" />
                        </div>
                    )}
                    </button>
                );
                })}
                <label htmlFor="custom-garment-upload" className={`relative aspect-square border-2 border-dashed border-gray-400/80 rounded-md flex flex-col items-center justify-center text-gray-600 transition-colors ${isLoading ? 'cursor-not-allowed bg-gray-200' : 'hover:border-primary-500 hover:text-primary-600 cursor-pointer'}`}>
                    <UploadCloudIcon className="w-6 h-6 mb-1"/>
                    <span className="text-xs text-center">Upload</span>
                    <input id="custom-garment-upload" type="file" className="hidden" accept="image/png, image/jpeg, image/webp, image/avif, image/heic, image/heif" onChange={handleFileChange} disabled={isLoading}/>
                </label>
            </div>
            {wardrobe.length === 0 && (
                 <p className="text-center text-sm text-gray-500 mt-4">Add items to your wishlist to see them here.</p>
            )}
            {error && <p className="text-red-600 text-sm mt-4">{error}</p>}
        </div>
    </div>
  );
};

export default WardrobePanel;