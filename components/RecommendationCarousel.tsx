/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';
import { motion } from 'framer-motion';
import { WardrobeItem } from '../types';
import { HeartIcon, HeartIconFilled } from './icons';

interface RecommendationCarouselProps {
  items: WardrobeItem[];
  onSelect: (item: WardrobeItem) => void;
  wishlist: WardrobeItem[];
  onAddToWishlist: (item: WardrobeItem) => void;
  currentGarmentId?: string | null;
}

const RecommendationCarousel: React.FC<RecommendationCarouselProps> = ({ items, onSelect, wishlist, onAddToWishlist, currentGarmentId }) => {
    const wishlistIds = new Set(wishlist.map(item => item.id));

    return (
        <div className="w-full bg-white/90 backdrop-blur-lg border-t border-gray-200 p-4 flex-shrink-0">
            <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wider mb-3 px-2">AI Recommendations</h3>
            <div className="min-w-0">
                <div className="flex flex-nowrap space-x-4 overflow-x-auto -mx-4 px-4 pb-2 hide-scrollbar">
                    {items.map((item, index) => {
                        const isWishlisted = wishlistIds.has(item.id);
                        const isSelected = currentGarmentId === item.id;
                        return (
                            <motion.div
                                key={item.id}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.3, delay: index * 0.05 }}
                                className="group relative flex-shrink-0 w-32"
                            >
                                <button
                                    onClick={() => onSelect(item)}
                                    className={`w-full aspect-[2/3] rounded-lg overflow-hidden border-2 transition-colors ${isSelected ? 'border-primary-500' : 'border-gray-300 hover:border-gray-400'}`}
                                >
                                    <img
                                        src={item.url}
                                        alt={item.name}
                                        className="w-full h-full object-cover"
                                    />
                                </button>
                                <button
                                    onClick={() => onAddToWishlist(item)}
                                    className="absolute top-2 right-2 p-1.5 rounded-full bg-white/70 backdrop-blur-sm text-gray-600 hover:text-primary-500 transition-colors"
                                    aria-label="Add to wishlist"
                                >
                                    {isWishlisted ? <HeartIconFilled className="w-4 h-4 text-primary-500" /> : <HeartIcon className="w-4 h-4" />}
                                </button>
                                <div className="mt-2 text-center">
                                    <p className="text-xs text-gray-800 font-semibold truncate">{item.name}</p>
                                    <p className="text-xs text-gray-500">{item.price}</p>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default RecommendationCarousel;