/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SavedOutfit, WardrobeItem, CartItem } from '../types';
import { PencilIcon, Trash2Icon, CheckIcon, XIcon, PlusIcon, ShoppingBagIcon } from './icons';
import { ProductCard } from './ProductCard';

interface OutfitCardProps {
  outfit: SavedOutfit;
  isExpanded: boolean;
  onExpand: () => void;
  onUpdateName: (outfitId: string, newName: string) => void;
  onDelete: (outfitId: string) => void;
  onTryOn: (outfit: SavedOutfit) => void;
  onAddOutfitToBag: (outfit: SavedOutfit) => void;
  wishlist: WardrobeItem[];
  onAddToWishlist: (item: WardrobeItem) => void;
  cartItems: CartItem[];
  onAddToCart: (item: WardrobeItem) => void;
  // FIX: Changed prop name to onRemoveFromBag for consistency.
  onRemoveFromBag: (itemId: string) => void;
}

const OutfitCard: React.FC<OutfitCardProps> = ({ 
    outfit, 
    isExpanded,
    onExpand,
    onUpdateName, 
    onDelete, 
    onTryOn, 
    onAddOutfitToBag,
    wishlist,
    onAddToWishlist,
    cartItems,
    onAddToCart,
    // FIX: Changed prop name to onRemoveFromBag for consistency.
    onRemoveFromBag
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState(outfit.name);
    const inputRef = useRef<HTMLInputElement>(null);
    const wishlistIds = useMemo(() => new Set(wishlist.map(item => item.id)), [wishlist]);

    useEffect(() => {
        if (isEditing) {
            inputRef.current?.focus();
            inputRef.current?.select();
        }
    }, [isEditing]);

    const handleSave = () => {
        if (name.trim() && name.trim() !== outfit.name) {
            onUpdateName(outfit.id, name.trim());
        }
        setIsEditing(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleSave();
        if (e.key === 'Escape') {
            setName(outfit.name);
            setIsEditing(false);
        }
    };
    
    return (
        <motion.div 
            layout
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="group relative flex flex-col bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden"
            whileHover={{ scale: 1.03, boxShadow: '0 8px 25px rgba(0,0,0,0.1)' }}
        >
            <div className="relative aspect-[2/3] w-full overflow-hidden cursor-pointer" onClick={onExpand}>
                <img src={outfit.previewUrl} alt={outfit.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"/>
            </div>

            <div className="p-4 flex flex-col flex-grow">
                <div className="flex items-start justify-between gap-2">
                    {isEditing ? (
                        <div className="relative flex-grow">
                            <input
                                ref={inputRef}
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                onBlur={handleSave}
                                onKeyDown={handleKeyDown}
                                className="text-sm font-semibold text-gray-900 bg-white border border-primary-300 rounded-md px-2 py-1 w-full"
                            />
                        </div>
                    ) : (
                        <h3 className="text-sm font-semibold text-gray-900 flex-grow cursor-pointer" onClick={onExpand} onDoubleClick={() => setIsEditing(true)}>
                            {outfit.name}
                        </h3>
                    )}
                     <button onClick={() => setIsEditing(!isEditing)} className="flex-shrink-0 text-gray-500 hover:text-primary-600 p-1">
                        <PencilIcon className="w-4 h-4" />
                    </button>
                </div>
                
                <div className="flex flex-wrap gap-2 mt-3 cursor-pointer" onClick={onExpand}>
                    {outfit.items.map(item => (
                        <img key={item.id} src={item.url} alt={item.name} title={item.name} className="w-8 h-8 rounded-full object-cover border-2 border-white shadow-sm" />
                    ))}
                </div>

                <div className="mt-auto pt-4 flex flex-col gap-2">
                    <button
                        onClick={() => onAddOutfitToBag(outfit)}
                        className="w-full text-sm font-semibold py-2 px-3 rounded-md transition-all duration-200 ease-in-out border-2 border-primary-600 bg-primary-600 text-white hover:bg-primary-700 hover:border-primary-700 flex items-center justify-center gap-2"
                    >
                        <ShoppingBagIcon className="w-4 h-4" />
                        <span>Add All to Bag</span>
                    </button>
                    <div className="flex gap-2">
                        <button
                            onClick={() => onTryOn(outfit)}
                            className="flex-grow text-sm font-semibold py-2 px-3 rounded-md transition-all duration-200 ease-in-out border-2 border-gray-300 text-gray-800 hover:bg-gray-100"
                        >
                            Try On
                        </button>
                        <button
                            onClick={() => onDelete(outfit.id)}
                            className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-md border-2 border-gray-300 text-gray-500 hover:bg-red-50 hover:text-red-600 hover:border-red-300 transition-all"
                        >
                            <Trash2Icon className="w-4 h-4"/>
                        </button>
                    </div>
                </div>
            </div>
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                        className="overflow-hidden"
                    >
                        <div className="p-4 border-t bg-gray-50 grid grid-cols-2 gap-4">
                           {outfit.items.map(item => (
                               <ProductCard
                                   key={item.id}
                                   item={item}
                                   isWishlisted={wishlistIds.has(item.id)}
                                   onAddToWishlist={onAddToWishlist}
                                   onAddToBag={onAddToCart}
                                   onRemoveFromBag={onRemoveFromBag}
                                   cartItems={cartItems}
                               />
                           ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};


interface OutfitsViewProps {
    outfits: SavedOutfit[];
    onUpdateName: (outfitId: string, newName: string) => void;
    onDelete: (outfitId: string) => void;
    onTryOn: (outfit: SavedOutfit) => void;
    onAddOutfitToBag: (outfit: SavedOutfit) => void;
    onContinueShopping: () => void;
    wishlist: WardrobeItem[];
    onAddToWishlist: (item: WardrobeItem) => void;
    cartItems: CartItem[];
    onAddToCart: (item: WardrobeItem) => void;
    // FIX: Changed prop name to onRemoveFromBag for consistency.
    onRemoveFromBag: (itemId: string) => void;
}

const OutfitsView: React.FC<OutfitsViewProps> = (props) => {
    const [expandedOutfitId, setExpandedOutfitId] = useState<string | null>(null);

    return (
        <div className="w-full max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <h1 className="text-3xl font-bold font-serif text-gray-900">My Saved Outfits</h1>
            {props.outfits.length > 0 ? (
                <motion.div 
                    layout
                    className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 mt-8"
                >
                    <AnimatePresence>
                        {props.outfits.map(outfit => (
                            <OutfitCard
                                key={outfit.id}
                                outfit={outfit}
                                isExpanded={expandedOutfitId === outfit.id}
                                onExpand={() => setExpandedOutfitId(prev => prev === outfit.id ? null : outfit.id)}
                                {...props}
                            />
                        ))}
                    </AnimatePresence>
                </motion.div>
            ) : (
                <div className="text-center py-20">
                    <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center">
                        <PlusIcon className="h-8 w-8 text-gray-400" />
                    </div>
                    <h2 className="mt-4 text-lg font-medium text-gray-900">No saved outfits yet</h2>
                    <p className="mt-1 text-sm text-gray-500">Go to the Magic Mirror to create and save your favorite looks.</p>
                    <button onClick={props.onContinueShopping} className="mt-6 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700">
                        Explore Collections
                    </button>
                </div>
            )}
        </div>
    );
};

export default OutfitsView;
