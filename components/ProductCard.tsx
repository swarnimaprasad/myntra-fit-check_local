/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WardrobeItem, CartItem } from '../types';
import { HeartIcon, HeartIconFilled, StarIcon, ShoppingBagIcon, Trash2Icon, DressIcon } from './icons';
import { cn } from '../lib/utils';

// --- AddToBagButton Component ---

interface AddToBagButtonProps {
  item: WardrobeItem;
  cartItems: CartItem[];
  onClick: (item: WardrobeItem) => void;
  onRemove?: (itemId: string) => void;
  disabled?: boolean;
}

const AddToBagButton: React.FC<AddToBagButtonProps> = ({ item, cartItems, onClick, onRemove, disabled = false }) => {
  const cartItem = cartItems.find(cartItem => cartItem.id === item.id);
  const qty = cartItem?.quantity || 0;
  const inBag = qty > 0;
  
  const isOnePiece = item.category === 'dresses';

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!disabled) {
      onClick(item);
    }
  };

  return (
    <motion.button
      onClick={handleClick}
      disabled={disabled}
      className={cn(
        "w-full mt-3 text-sm font-semibold py-2 px-3 rounded-md transition-all duration-250 ease-in-out border-2 flex items-center justify-center gap-2 relative focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500",
        {
          'bg-white text-gray-800 border-gray-300 hover:bg-primary-600 hover:text-white hover:border-primary-600': !inBag && !disabled,
          'bg-primary-600 text-white border-primary-600': inBag && !disabled,
          'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed': disabled,
        }
      )}
      whileHover={!disabled ? { scale: 1.03, boxShadow: '0 5px 15px rgba(0,0,0,0.1)' } : {}}
      whileTap={!disabled ? { scale: 0.98, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' } : {}}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      aria-pressed={inBag}
      aria-label={inBag ? `In Bag, quantity ${qty}` : 'Add to Bag'}
    >
      <AnimatePresence mode="wait">
        <motion.div
            key={inBag ? 'inBag' : 'default'}
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            transition={{ duration: 0.2 }}
            className="flex items-center justify-center gap-2"
        >
            {!inBag && <ShoppingBagIcon className="w-4 h-4" />}
            {inBag && isOnePiece && (
                <DressIcon className="w-4 h-4" />
            )}
            <span>{inBag ? 'In Bag' : 'Add to Bag'}</span>
        </motion.div>
      </AnimatePresence>
      <AnimatePresence>
        {inBag && (
            <motion.div 
                className="flex items-center gap-1.5 ml-auto"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 15, delay: 0.1 }}
            >
                {onRemove && (
                    <motion.button
                        onClick={(e) => {
                            e.stopPropagation();
                            onRemove(item.id);
                        }}
                        className="p-1 rounded-full hover:bg-white/20 transition-colors"
                        aria-label={`Remove ${item.name} from bag`}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                    >
                        <Trash2Icon className="w-4 h-4" />
                    </motion.button>
                )}
                <span
                    className="bg-white text-primary-600 text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center"
                >
                    {qty}
                </span>
            </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
};


const ProductImageRenderer = ({ url, alt }: { url: string, alt: string }) => {
    const isPinterestEmbed = url.includes('pinterest.com/ext/embed');

    if (isPinterestEmbed) {
        return (
            <iframe
                src={url}
                title={alt}
                className="h-full w-full object-cover object-center pointer-events-none"
                frameBorder="0"
                scrolling="no"
                loading="lazy"
            ></iframe>
        );
    }

    return (
        <img
            src={url}
            alt={alt}
            className="h-full w-full object-cover object-center"
        />
    );
};

interface ProductCardProps {
    item: WardrobeItem;
    onAddToWishlist: (item: WardrobeItem) => void;
    isWishlisted: boolean;
    onMoveToCart?: (item: WardrobeItem) => void;
    onAddToBag?: (item: WardrobeItem) => void;
    onRemoveFromBag: (itemId: string) => void;
    cartItems: CartItem[];
}

export const ProductCard: React.FC<ProductCardProps> = ({ item, onAddToWishlist, isWishlisted, onMoveToCart, onAddToBag, onRemoveFromBag, cartItems }) => (
    <motion.div 
        className="group relative flex flex-col"
        layout
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        whileHover={{ y: -5 }}
        transition={{ duration: 0.3 }}
    >
        <div className="w-full overflow-hidden rounded-md bg-gray-200 group-hover:opacity-75 aspect-[2/3] transition-opacity">
            <ProductImageRenderer url={item.url} alt={item.name} />
        </div>
        <div className="mt-2 flex justify-between flex-grow">
            <div className="flex-grow pr-2">
                <h3 className="text-sm text-gray-700 font-semibold truncate max-w-[150px]">
                    {item.name}
                </h3>
                {item.rating ? (
                    <div className="mt-1 flex items-center" title={`${item.rating.value.toFixed(1)} stars`}>
                        <div className="flex items-center">
                            {[...Array(5)].map((_, i) => (
                                <StarIcon
                                    key={i}
                                    className={`h-4 w-4 ${item.rating!.value > i + 0.5 ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                                />
                            ))}
                        </div>
                        <span className="ml-2 text-xs text-gray-600 font-medium">{item.rating.value.toFixed(1)}</span>
                        {item.rating.count && <span className="text-xs text-gray-400 ml-1">({item.rating.count})</span>}
                    </div>
                ) : (
                    <div className="mt-1">
                        <p className="text-xs text-gray-500">No ratings yet</p>
                    </div>
                )}
                <p className="text-sm text-gray-900 font-medium">{item.price}</p>
            </div>
             <motion.button
                onClick={() => onAddToWishlist(item)}
                className="p-1.5 text-gray-500 hover:text-primary-600 transition-colors flex-shrink-0"
                aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
                whileTap={{ scale: 0.8 }}
            >
                <AnimatePresence mode="wait">
                    <motion.div
                        key={isWishlisted ? 'filled' : 'empty'}
                        initial={{ scale: 0.5, opacity: 0, rotate: -90 }}
                        animate={{ scale: 1, opacity: 1, rotate: 0 }}
                        exit={{ scale: 0.5, opacity: 0, rotate: 90 }}
                        transition={{ duration: 0.2 }}
                    >
                        {isWishlisted ? <HeartIconFilled className="w-5 h-5 text-primary-600" /> : <HeartIcon className="w-5 h-5" />}
                    </motion.div>
                </AnimatePresence>
            </motion.button>
        </div>
        {onAddToBag && (
            <AddToBagButton item={item} cartItems={cartItems} onClick={onAddToBag} onRemove={onRemoveFromBag} />
        )}
        {onMoveToCart && (
            <AddToBagButton item={item} cartItems={cartItems} onClick={onMoveToCart} onRemove={onRemoveFromBag} />
        )}
    </motion.div>
);
