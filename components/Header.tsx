/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useEffect } from 'react';
import { UserIcon, HeartIcon, ShoppingBagIcon, UsersIcon, SparklesIcon, AccessoriesIcon, HangerIcon } from './icons';
import { motion, AnimatePresence } from 'framer-motion';
import { SearchTypeahead } from './Search';
import { View } from '../App';


interface HeaderProps {
    onNavigate: (view: View, options?: { gender?: 'men' | 'women'; query?: string }) => void;
    wishlistCount: number;
    bagCount: number;
    onToggleBag: () => void;
    currentGender: 'men' | 'women' | null;
    currentView: View;
}

// FIX: Refactored the `NavItem` component to use a dedicated `NavItemProps` interface for its props. This improves code clarity and can resolve subtle type-checking issues that may cause incorrect errors about missing properties like `children`.
interface NavItemProps {
    children: React.ReactNode;
    isActive: boolean;
    onClick: () => void;
}
// FIX: Explicitly typed NavItem as a React.FC to ensure TypeScript correctly handles the 'children' prop passed via JSX.
const NavItem: React.FC<NavItemProps> = ({ children, isActive, onClick }) => (
  <motion.button 
    onClick={onClick}
    className={`relative group text-sm font-bold text-gray-800 tracking-wider uppercase pb-2 transition-colors`}
    whileHover={{ y: -2 }}
  >
    {children}
    {isActive && (
        <motion.div
            className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600"
            layoutId="underline"
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        />
    )}
     <div className={`absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600/50 transition-transform duration-300 scale-x-0 group-hover:scale-x-100 ${isActive ? 'scale-x-100' : ''}`} />

  </motion.button>
);

const UserAction = ({ Icon, label, children }: { Icon: React.FC<React.SVGProps<SVGSVGElement>>, label: string, children?: React.ReactNode }) => (
  <motion.button 
    className="relative flex flex-col items-center text-gray-800 hover:text-primary-600 transition-colors"
    whileHover={{ y: -2 }}
    >
    <Icon className="w-5 h-5" />
    <span className="text-xs font-bold mt-1">{label}</span>
    {children}
  </motion.button>
);

const Header: React.FC<HeaderProps> = ({ onNavigate, wishlistCount, bagCount, onToggleBag, currentGender, currentView }) => {
  const [prevWishlistCount, setPrevWishlistCount] = useState(wishlistCount);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (wishlistCount !== prevWishlistCount) {
        setIsAnimating(true);
        const timer = setTimeout(() => setIsAnimating(false), 300); // Animation duration
        setPrevWishlistCount(wishlistCount);
        return () => clearTimeout(timer);
    }
  }, [wishlistCount, prevWishlistCount]);

  const isWishlistActive = currentView === 'wishlist';

  return (
    <header className="w-full py-4 px-4 md:px-8 bg-white sticky top-0 z-40 shadow-sm">
      <div className="flex items-center justify-between max-w-screen-2xl mx-auto">
        <div className="flex items-center gap-8">
          <button onClick={() => onNavigate('welcome')} aria-label="Home">
            <img 
                src="https://thumbs2.imgbox.com/d7/bd/AO28ZMWF_t.png" 
                alt="Myntra Logo" 
                className="h-9"
                onError={(e) => {
                    const target = e.currentTarget;
                    console.error(`Myntra logo failed to load. The requested URL '${target.src}' returned a 404. This environment requires paths to start with '/public'. Ensure the file exists at 'public/images/myntra-logo-color.png'.`);
                }}
            />
          </button>
          <nav className="hidden md:flex items-center gap-6">
            <NavItem isActive={currentView === 'products' && currentGender === 'men'} onClick={() => onNavigate('products', { gender: 'men' })}>Men</NavItem>
            <NavItem isActive={currentView === 'products' && currentGender === 'women'} onClick={() => onNavigate('products', { gender: 'women' })}>Women</NavItem>
            <NavItem isActive={currentView === 'accessories'} onClick={() => onNavigate('accessories')}>
                Accessories
            </NavItem>
            <NavItem isActive={currentView === 'outfits'} onClick={() => onNavigate('outfits')}>
                <div className="flex items-center gap-1.5">
                    <HangerIcon className="w-5 h-5" />
                    <span>Outfits</span>
                </div>
            </NavItem>
            <NavItem isActive={currentView === 'magic_mirror'} onClick={() => onNavigate('magic_mirror')}>
                 <div className="flex items-center gap-1.5">
                    <SparklesIcon className="w-4 h-4 text-gray-800 group-hover:text-primary-600 transition-colors animate-sparkle [animation-duration:3s]" />
                    <span>Magic Mirror</span>
                </div>
            </NavItem>
             <motion.button 
                whileHover={{ y: -2 }}
                onClick={() => onNavigate('crew_setup')}
                className={`relative group text-sm font-bold tracking-wider uppercase pb-2 transition-colors flex items-center gap-1.5 ${currentView.startsWith('crew') ? 'text-primary-600' : 'text-gray-800'}`}
            >
                <UsersIcon className="w-5 h-5" />
                <span>Style Crew</span>
                {currentView.startsWith('crew') && (
                     <motion.div
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600"
                        layoutId="underline"
                        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                    />
                )}
                 <div className={`absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600/50 transition-transform duration-300 scale-x-0 group-hover:scale-x-100 ${currentView.startsWith('crew') ? 'scale-x-100' : ''}`} />
            </motion.button>
          </nav>
        </div>
        <div className="flex items-center gap-4 md:gap-8">
          <SearchTypeahead onNavigate={onNavigate} />
          <div className="flex items-center gap-4">
            <UserAction Icon={UserIcon} label="Profile" />
             <motion.button 
                onClick={() => onNavigate('wishlist')}
                className={`relative flex flex-col items-center transition-colors ${isWishlistActive ? 'text-primary-600' : 'text-gray-800 hover:text-primary-600'}`}
                whileHover={{ y: -2 }}
                aria-label="Wishlist"
            >
                <HeartIcon className="w-5 h-5" />
                <span className="text-xs font-bold mt-1">Wishlist</span>
                 <AnimatePresence>
                    {wishlistCount > 0 && (
                        <motion.span
                            key={wishlistCount}
                            className="absolute -top-1.5 -right-1.5 text-white bg-primary-600 text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center"
                            initial={{ scale: 0 }}
                            animate={{ scale: isAnimating ? [1, 1.3, 1] : 1 }}
                            exit={{ scale: 0 }}
                            transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                        >
                            {wishlistCount}
                        </motion.span>
                    )}
                </AnimatePresence>
            </motion.button>
            <motion.button 
                onClick={onToggleBag}
                className="relative flex flex-col items-center text-gray-800 hover:text-primary-600 transition-colors"
                whileHover={{ y: -2 }}
                aria-label="Shopping Bag"
            >
                <ShoppingBagIcon className="w-5 h-5" />
                <span className="text-xs font-bold mt-1">Bag</span>
                <AnimatePresence>
                    {bagCount > 0 && (
                        <motion.span
                            key={bagCount}
                            className="absolute -top-1.5 -right-1.5 text-white bg-primary-600 text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0 }}
                            transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                        >
                            {bagCount}
                        </motion.span>
                    )}
                </AnimatePresence>
            </motion.button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;