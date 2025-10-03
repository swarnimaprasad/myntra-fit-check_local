/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CartItem } from '../types';
import { XIcon, PlusIcon, Trash2Icon, ShoppingBagIcon } from './icons';

// FIX: Add missing MinusIcon component to support quantity adjustments in the cart.
export const MinusIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
);
  

interface BagSidepanelProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  onUpdateQuantity: (itemId: string, newQuantity: number) => void;
  onRemoveItem: (itemId: string) => void;
}

const BagSidepanel: React.FC<BagSidepanelProps> = ({ isOpen, onClose, cartItems, onUpdateQuantity, onRemoveItem }) => {
  const subtotal = cartItems.reduce((sum, item) => sum + (parseFloat(item.price.replace('₹', '').replace(',', '')) * item.quantity), 0);

  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  };

  const panelVariants = {
    hidden: { x: '100%' },
    // FIX: Added 'as const' to the transition type to fix a TypeScript error with framer-motion's Variants type.
    visible: { x: '0%', transition: { type: 'spring' as const, stiffness: 300, damping: 30 } },
    exit: { x: '100%', transition: { duration: 0.2 } },
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-black/40 z-50"
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
          onClick={onClose}
        >
          <motion.div
            className="fixed top-0 right-0 h-full w-full max-w-md bg-gray-50 shadow-2xl flex flex-col"
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <header className="flex items-center justify-between p-6 border-b flex-shrink-0 bg-white">
              <h2 className="text-2xl font-serif font-bold text-gray-800">Shopping Bag</h2>
              <button onClick={onClose} className="p-1 rounded-full text-gray-500 hover:bg-gray-100">
                <XIcon className="w-6 h-6"/>
              </button>
            </header>

            {cartItems.length > 0 ? (
                <>
                    {/* Body */}
                    <div className="flex-grow overflow-y-auto p-6 space-y-4">
                        <AnimatePresence>
                            {cartItems.map(item => (
                                <motion.div 
                                    key={item.id} 
                                    className="flex items-start gap-4 p-4 bg-white rounded-lg border"
                                    layout
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20, transition: { duration: 0.2 } }}
                                >
                                    <img src={item.url} alt={item.name} className="w-20 h-28 object-cover rounded-md" />
                                    <div className="flex-grow flex flex-col h-28">
                                        <div>
                                            <p className="font-bold text-base text-gray-800 leading-tight">{item.name}</p>
                                            <p className="text-sm text-gray-500 mt-1">Price: {item.price}</p>
                                        </div>
                                        <div className="mt-auto flex items-center justify-between">
                                            <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-md">
                                                <button onClick={() => onUpdateQuantity(item.id, item.quantity - 1)} className="px-2 py-1 text-gray-600 hover:bg-gray-100 rounded-l-md"><MinusIcon className="w-4 h-4"/></button>
                                                <span className="px-3 text-sm font-bold w-10 text-center">{item.quantity}</span>
                                                <button onClick={() => onUpdateQuantity(item.id, item.quantity + 1)} className="px-2 py-1 text-gray-600 hover:bg-gray-100 rounded-r-md"><PlusIcon className="w-4 h-4"/></button>
                                            </div>
                                            <button onClick={() => onRemoveItem(item.id)} className="text-gray-400 hover:text-red-500 p-1">
                                                <Trash2Icon className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>

                    {/* Footer */}
                    <footer className="p-6 border-t bg-white flex-shrink-0 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
                        <div className="flex justify-between items-center text-xl font-bold mb-4">
                        <span>Subtotal</span>
                        <span>₹{subtotal.toLocaleString('en-IN')}</span>
                        </div>
                        <p className="text-xs text-gray-500 text-center mb-4">Shipping, taxes, and discount codes calculated at checkout.</p>
                        <button className="w-full text-center bg-primary-600 text-white font-bold py-3 px-4 rounded-lg transition-colors hover:bg-primary-700">
                        Proceed to Checkout
                        </button>
                    </footer>
                </>
            ) : (
                <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 p-6">
                  <ShoppingBagIcon className="w-20 h-20 text-gray-300 mb-4" />
                  <h3 className="text-xl font-semibold text-gray-800">Your bag is waiting!</h3>
                  <p className="max-w-xs mt-2">Discover something new and add it to your bag to see it here.</p>
                  <button onClick={onClose} className="mt-8 w-full max-w-xs text-center bg-primary-600 text-white font-bold py-3 px-4 rounded-lg transition-colors hover:bg-primary-700">
                    Continue Shopping
                  </button>
                </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default BagSidepanel;