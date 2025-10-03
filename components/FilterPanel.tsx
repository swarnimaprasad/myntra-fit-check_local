/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WardrobeItem } from '../types';
import { XIcon, ChevronDownIcon, CheckIcon } from './icons';
import { cn } from '../lib/utils';

interface FilterPanelProps {
  products: WardrobeItem[];
  filters: { colors: string[]; categories: string[] };
  onFilterChange: (newFilters: { colors: string[]; categories: string[] }) => void;
  sortOption: string;
  onSortChange: (newSort: string) => void;
  // FIX: Add a prop to specify the source for category filters, making the component more flexible.
  categorySourceKey?: 'category' | 'subcategory';
}

const COLOR_MAP: { [key: string]: string } = {
  Black: 'bg-black',
  White: 'bg-white',
  Green: 'bg-green-500',
  Blue: 'bg-blue-500',
  Gray: 'bg-gray-500',
  Beige: 'bg-yellow-200',
  Red: 'bg-red-500',
  Multi: 'bg-gradient-to-r from-red-500 via-yellow-500 to-blue-500',
};


const FilterPanel: React.FC<FilterPanelProps> = ({ products, filters, onFilterChange, sortOption, onSortChange, categorySourceKey = 'category' }) => {
    const [isColorOpen, setIsColorOpen] = useState(false);
    const [isCategoryOpen, setIsCategoryOpen] = useState(false);
    const [isSortOpen, setIsSortOpen] = useState(false);
    
    const colorRef = useRef<HTMLDivElement>(null);
    const categoryRef = useRef<HTMLDivElement>(null);
    const sortRef = useRef<HTMLDivElement>(null);

    const availableColors = useMemo(() => [...new Set(products.map(p => p.color))].sort(), [products]);
    // FIX: Use the `categorySourceKey` prop to dynamically determine which property to use for category options.
    const availableCategories = useMemo(() => {
        const categories = products.map(p => {
            const catValue = categorySourceKey === 'subcategory' ? p.subcategory : p.category;
            return catValue ? catValue.replace(/-/g, ' ') : '';
        });
        return [...new Set(categories.filter(Boolean))].sort();
    }, [products, categorySourceKey]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (colorRef.current && !colorRef.current.contains(event.target as Node)) setIsColorOpen(false);
            if (categoryRef.current && !categoryRef.current.contains(event.target as Node)) setIsCategoryOpen(false);
            if (sortRef.current && !sortRef.current.contains(event.target as Node)) setIsSortOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleColorToggle = (color: string) => {
        const newColors = filters.colors.includes(color)
            ? filters.colors.filter(c => c !== color)
            : [...filters.colors, color];
        onFilterChange({ ...filters, colors: newColors });
    };

    const handleCategoryToggle = (category: string) => {
        const originalCategory = category.replace(/ /g, '-');
        const newCategories = filters.categories.includes(originalCategory)
            ? filters.categories.filter(c => c !== originalCategory)
            : [...filters.categories, originalCategory];
        onFilterChange({ ...filters, categories: newCategories });
    };

    const clearFilters = () => onFilterChange({ colors: [], categories: [] });
    
    const activeFilterCount = filters.colors.length + filters.categories.length;

    const sortOptions = [
        { value: 'default', label: 'Default' },
        { value: 'rating-desc', label: 'Rating: High to Low' },
        { value: 'price-desc', label: 'Price: High to Low' },
        { value: 'price-asc', label: 'Price: Low to High' },
    ];
    const currentSortLabel = sortOptions.find(opt => opt.value === sortOption)?.label || 'Default';
    
    const dropdownVariants = {
        hidden: { opacity: 0, scale: 0.95, y: -10 },
        visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.2, ease: "easeOut" as const } },
        exit: { opacity: 0, scale: 0.95, y: -10, transition: { duration: 0.15, ease: "easeIn" as const } },
    };

    return (
        <div className="mb-6">
            <div className="flex items-center gap-2">
                <div className="relative" ref={colorRef}>
                    <button onClick={() => setIsColorOpen(p => !p)} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-gray-700 bg-white border rounded-md shadow-sm hover:bg-gray-50">
                        <span>Color</span>
                        {filters.colors.length > 0 && <span className="bg-primary-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">{filters.colors.length}</span>}
                        <ChevronDownIcon className={`w-4 h-4 transition-transform ${isColorOpen ? 'rotate-180' : ''}`} />
                    </button>
                    <AnimatePresence>
                        {isColorOpen && (
                            <motion.div variants={dropdownVariants} initial="hidden" animate="visible" exit="exit" className="absolute top-full mt-2 w-60 bg-white border rounded-lg shadow-lg z-20 p-4">
                                <h3 className="text-sm font-bold text-gray-800 mb-3">Filter by Color</h3>
                                <div className="grid grid-cols-5 gap-3">
                                    {availableColors.map(color => {
                                        const isActive = filters.colors.includes(color);
                                        return (
                                            <button key={color} onClick={() => handleColorToggle(color)} className={`relative w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${isActive ? 'border-primary-600 ring-2 ring-primary-300' : 'border-gray-300'}`}>
                                                <div className={cn('w-full h-full rounded-full', COLOR_MAP[color] || 'bg-gray-200')} />
                                                {isActive && <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-full"><CheckIcon className="w-4 h-4 text-white" /></div>}
                                                <span className="sr-only">{color}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div className="relative" ref={categoryRef}>
                    <button onClick={() => setIsCategoryOpen(p => !p)} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-gray-700 bg-white border rounded-md shadow-sm hover:bg-gray-50">
                        <span>Category</span>
                        {filters.categories.length > 0 && <span className="bg-primary-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">{filters.categories.length}</span>}
                        <ChevronDownIcon className={`w-4 h-4 transition-transform ${isCategoryOpen ? 'rotate-180' : ''}`} />
                    </button>
                    <AnimatePresence>
                        {isCategoryOpen && (
                            <motion.div variants={dropdownVariants} initial="hidden" animate="visible" exit="exit" className="absolute top-full mt-2 w-60 bg-white border rounded-lg shadow-lg z-20 p-4">
                                 <h3 className="text-sm font-bold text-gray-800 mb-3">Filter by Category</h3>
                                <div className="space-y-2">
                                    {availableCategories.map(cat => {
                                        const originalCat = cat.replace(/ /g, '-');
                                        const isActive = filters.categories.includes(originalCat);
                                        return (
                                            <label key={cat} className="flex items-center gap-2 cursor-pointer p-1 rounded-md hover:bg-gray-100">
                                                <input type="checkbox" checked={isActive} onChange={() => handleCategoryToggle(cat)} className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"/>
                                                <span className="text-sm text-gray-700 capitalize">{cat}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
                
                <div className="relative ml-auto" ref={sortRef}>
                     <button onClick={() => setIsSortOpen(!isSortOpen)} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-gray-700 bg-white border rounded-md shadow-sm hover:bg-gray-50">
                        <span className="text-gray-500">Sort by:</span>
                        <span className="font-bold text-gray-800">{currentSortLabel}</span>
                        <ChevronDownIcon className={`w-4 h-4 transition-transform ${isSortOpen ? 'rotate-180' : ''}`} />
                    </button>
                    <AnimatePresence>
                        {isSortOpen && (
                             <motion.div variants={dropdownVariants} initial="hidden" animate="visible" exit="exit" className="absolute top-full right-0 mt-2 w-56 bg-white border rounded-lg shadow-lg z-20 overflow-hidden">
                                {sortOptions.map(opt => (
                                    <button 
                                        key={opt.value} 
                                        onClick={() => { onSortChange(opt.value); setIsSortOpen(false); }} 
                                        className={`w-full text-left px-4 py-2 text-sm font-medium transition-colors ${sortOption === opt.value ? 'bg-primary-50 text-primary-700' : 'text-gray-700 hover:bg-gray-100'}`}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {activeFilterCount > 0 && (
                <div className="mt-4 flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-gray-600">Active Filters:</span>
                    {filters.colors.map(color => (
                        <motion.div key={color} layout initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                            <button onClick={() => handleColorToggle(color)} className="flex items-center gap-1.5 bg-primary-100 text-primary-800 text-xs font-semibold px-2 py-1 rounded-full hover:bg-red-100 hover:text-red-700">
                                {color} <XIcon className="w-3 h-3"/>
                            </button>
                        </motion.div>
                    ))}
                    {filters.categories.map(cat => (
                        <motion.div key={cat} layout initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                            <button onClick={() => handleCategoryToggle(cat.replace(/-/g, ' '))} className="flex items-center gap-1.5 bg-primary-100 text-primary-800 text-xs font-semibold px-2 py-1 rounded-full hover:bg-red-100 hover:text-red-700 capitalize">
                                {cat.replace(/-/g, ' ')} <XIcon className="w-3 h-3"/>
                            </button>
                        </motion.div>
                    ))}
                    <button onClick={clearFilters} className="text-sm font-semibold text-gray-600 hover:underline ml-auto">Clear All</button>
                </div>
            )}
        </div>
    );
};

export default FilterPanel;
