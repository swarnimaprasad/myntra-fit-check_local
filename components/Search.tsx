/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SearchIcon, AccessoriesIcon } from './icons';
import { WardrobeItem } from '../types';
import { allWardrobeItems } from '../wardrobe';
import { searchProductsAndCategories, highlightText } from '../lib/utils';
import { View } from '../App';

type Suggestion = 
    | { type: 'product'; data: WardrobeItem }
    | { type: 'category'; data: string }
    | { type: 'query'; data: string }
    | { type: 'message'; data: string };

interface SearchTypeaheadProps {
    onNavigate: (view: View, options?: { query?: string }) => void;
}

export const SearchTypeahead: React.FC<SearchTypeaheadProps> = ({ onNavigate }) => {
    const [query, setQuery] = useState('');
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);
    const searchRef = useRef<HTMLDivElement>(null);

    const performSearch = useCallback((currentQuery: string) => {
        const { products, categories } = searchProductsAndCategories(currentQuery, allWardrobeItems);
        const results: Suggestion[] = [];
        
        if (categories.includes('SUGGESTION_ACCESSORIES')) {
            results.push({ type: 'message', data: 'Looking for jewellery? Try searching for our other accessories like Sunglasses, Hats, or Belts!' });
            setSuggestions(results);
            setIsOpen(true);
            return;
        }

        if (products.length > 0 || categories.length > 0) {
            results.push({ type: 'query', data: currentQuery });
        }
        categories.forEach(c => results.push({ type: 'category', data: c }));
        products.forEach(p => results.push({ type: 'product', data: p }));
        setSuggestions(results);
        setIsOpen(results.length > 0);
    }, []);

    useEffect(() => {
        setActiveIndex(-1); // Reset index on new suggestions
        if (query.length < 2) {
            setSuggestions([]);
            setIsOpen(false);
            return;
        }
        const handler = setTimeout(() => {
            performSearch(query);
        }, 250);

        return () => clearTimeout(handler);
    }, [query, performSearch]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleNavigate = (suggestion: Suggestion) => {
        if (suggestion.type === 'message') return;

        let searchQuery = '';
        if (suggestion.type === 'product') searchQuery = suggestion.data.name;
        else if (suggestion.type === 'category') searchQuery = suggestion.data.replace(/-/g, ' ');
        else searchQuery = suggestion.data;
        
        setQuery(searchQuery);
        setIsOpen(false);
        onNavigate('search', { query: searchQuery });
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!isOpen) return;
        const nonNavigableCount = suggestions.filter(s => s.type === 'message').length;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setActiveIndex(prev => (prev + 1) % (suggestions.length - nonNavigableCount));
                break;
            case 'ArrowUp':
                e.preventDefault();
                setActiveIndex(prev => (prev - 1 + (suggestions.length - nonNavigableCount)) % (suggestions.length - nonNavigableCount));
                break;
            case 'Enter':
                e.preventDefault();
                if (activeIndex > -1) {
                    const activeSuggestion = suggestions.find((_, i) => i === activeIndex + nonNavigableCount);
                    if (activeSuggestion) handleNavigate(activeSuggestion);
                } else {
                    handleSubmit(e as any);
                }
                break;
            case 'Escape':
                setIsOpen(false);
                break;
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (query.trim().length >= 2) {
            setIsOpen(false);
            onNavigate('search', { query });
        }
    };

    const renderSuggestion = (suggestion: Suggestion) => {
        switch (suggestion.type) {
            case 'product':
                const item = suggestion.data;
                if (item.category === 'accessories') {
                    return (
                        <div className="flex items-center gap-3">
                            <img src={item.url} alt={item.name} className="w-10 h-10 object-cover rounded"/>
                            <div>
                                <span className="text-gray-800">{highlightText(item.name, query)}</span>
                                <div className="text-xs text-gray-500 flex items-center gap-1">
                                    <AccessoriesIcon className="w-3 h-3" />
                                    <span className="capitalize">{item.subcategory} &bull; {item.category}</span>
                                </div>
                            </div>
                        </div>
                    );
                }
                return (
                    <div className="flex items-center gap-3">
                        <img src={item.url} alt={item.name} className="w-10 h-10 object-cover rounded"/>
                        <span className="text-gray-800">{highlightText(item.name, query)}</span>
                    </div>
                );
            case 'category':
                const categoryName = suggestion.data.replace(/-/g, ' ');
                if (suggestion.data === 'accessories') {
                     return (
                        <div className="flex items-center gap-2">
                            <AccessoriesIcon className="w-4 h-4 text-gray-400" />
                            <p className="text-gray-600">in <span className="font-semibold capitalize text-gray-800">{highlightText(categoryName, query)}</span></p>
                        </div>
                    );
                }
                return <p className="text-gray-600">in <span className="font-semibold capitalize text-gray-800">{highlightText(categoryName, query)}</span></p>;
            case 'query':
                return (
                    <div className="flex items-center gap-2">
                        <SearchIcon className="w-4 h-4 text-gray-400"/>
                        <p className="text-primary-700 font-semibold">{highlightText(suggestion.data, query)}</p>
                    </div>
                );
            case 'message':
                return <p className="text-sm text-gray-600 bg-blue-50 p-3 rounded-md">{suggestion.data}</p>;
            default:
                return null;
        }
    }

    return (
        <div className="relative hidden sm:block" ref={searchRef}>
            <form onSubmit={handleSubmit} role="search" className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <SearchIcon className="w-4 h-4 text-gray-500" />
                </div>
                <input
                    type="text"
                    placeholder="Search for products, brands and more"
                    className="bg-gray-100 rounded-md py-2 pl-10 pr-4 w-48 md:w-72 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 transition-all"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => query.length >= 2 && setIsOpen(true)}
                    onKeyDown={handleKeyDown}
                    aria-autocomplete="list"
                    aria-expanded={isOpen}
                    aria-controls="search-suggestions"
                />
            </form>
            <AnimatePresence>
                {isOpen && (
                    <motion.ul
                        id="search-suggestions"
                        role="listbox"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute top-full mt-2 w-full md:w-96 bg-white rounded-md shadow-lg border z-50 overflow-hidden"
                    >
                        {suggestions.map((suggestion, index) => {
                            const isClickable = suggestion.type !== 'message';
                            const isActive = isClickable && (index - suggestions.filter(s=>s.type==='message').length) === activeIndex;
                            
                            return (
                                <li
                                    key={
                                        suggestion.type === 'product' ? `product-${suggestion.data.id}`
                                        : suggestion.type === 'message' ? `message-${index}`
                                        : `${suggestion.type}-${suggestion.data}`
                                    }
                                    id={`suggestion-${index}`}
                                    role="option"
                                    aria-selected={isActive}
                                    onMouseEnter={() => isClickable && setActiveIndex(index - suggestions.filter(s=>s.type==='message').length)}
                                    onClick={() => isClickable && handleNavigate(suggestion)}
                                    className={`px-4 py-2 transition-colors text-sm ${isClickable ? 'cursor-pointer' : ''} ${isActive ? 'bg-primary-50' : isClickable ? 'hover:bg-gray-50' : ''}`}
                                >
                                    {renderSuggestion(suggestion)}
                                </li>
                            );
                        })}
                    </motion.ul>
                )}
            </AnimatePresence>
        </div>
    );
};