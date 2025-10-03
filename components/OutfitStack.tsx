/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';
import { OutfitLayer } from '../types';
import { Trash2Icon } from './icons';

interface OutfitStackProps {
  outfitHistory: OutfitLayer[];
  onRemoveGarment: (garmentId: string) => void;
  onSetComparisonIndex: (index: number) => void;
  currentOutfitIndex: number;
  disabled: boolean;
}

const OutfitStack: React.FC<OutfitStackProps> = ({ outfitHistory, onRemoveGarment, disabled }) => {
  return (
    <div className="h-full flex flex-col">
      <div className="space-y-2 flex-grow">
        {outfitHistory.map((layer, index) => {
          const garment = layer.garment;

          return (
            <div
              key={garment?.id || `base-${index}`}
              className="flex items-center justify-between bg-white/50 p-2 rounded-lg animate-fade-in border border-gray-200/80 shadow-sm"
            >
              <div className="flex items-center overflow-hidden">
                  <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 mr-3 text-xs font-bold text-gray-600 bg-gray-200 rounded-full">
                    {index}
                  </span>
                  {garment && (
                      <img src={garment.url} alt={garment.name} className="flex-shrink-0 w-12 h-12 object-cover rounded-md mr-3" />
                  )}
                  <span className="font-semibold text-gray-800 truncate" title={garment?.name}>
                    {garment ? garment.name : 'Base Model'}
                  </span>
              </div>
              {garment && (
                 <button
                  onClick={() => onRemoveGarment(garment!.id)}
                  disabled={disabled}
                  className="flex-shrink-0 text-gray-500 hover:text-red-600 transition-colors p-2 rounded-md hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label={`Remove ${garment?.name}`}
                >
                  <Trash2Icon className="w-5 h-5" />
                </button>
              )}
            </div>
          );
        })}
        {outfitHistory.length <= 1 && (
            <p className="text-center text-sm text-gray-500 pt-4">Your stacked items will appear here. Add items from the shared wishlist.</p>
        )}
      </div>
    </div>
  );
};

export default OutfitStack;