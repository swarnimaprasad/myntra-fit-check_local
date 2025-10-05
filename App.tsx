/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ref, get } from 'firebase/database';
import { db } from './firebaseConfig';
import StartScreen from './components/StartScreen';
import { StylistResult, Crew, ChatMessage, SharedWishlistItem, WardrobeItem, AnalysisResult, CartItem, SavedOutfit, ChatbotContext } from './types';
import { allWardrobeItems } from './wardrobe';
import Header from './components/Header';
import { getFriendlyErrorMessage, searchProductsAndCategories } from './lib/utils';
import { getStylistRecommendations } from './services/geminiService';
import CrewSetup from './components/CrewSetup';
import CrewStudio from './components/CrewStudio';
import MagicMirrorView from './components/MagicMirrorView';
import Spinner from './components/Spinner';
import FilterPanel from './components/FilterPanel';
import { HeartIcon, HeartIconFilled, XIcon, SparklesIcon, MessageSquareIcon, PaperAirplaneIcon, ImageIcon, StarIcon, ShoppingBagIcon, Trash2Icon, PlusIcon, ChevronDownIcon, SearchIcon, UsersIcon, DressIcon, AccessoriesIcon } from './components/icons';
import FeatureHero from './components/FeatureHero';
import Chatbot from './components/Chatbot';
import OutfitsView from './components/OutfitsView';
import BagSidepanel from './components/BagSidepanel';
import { cn } from './lib/utils';
import { ProductCard } from './components/ProductCard';


export type View =
    'welcome' |
    'products' |
    'magic_mirror' |
    'wishlist' |
    'search' |
    'crew_setup' |
    'crew_studio' |
    'outfits' |
    'accessories';

// --- Sub-Components for Different Views ---

const WelcomeView = ({ onSelectGender, onNavigate, promptForGender }: { onSelectGender: (gender: 'men' | 'women') => void; onNavigate: (view: View) => void; promptForGender?: boolean }) => (
  <div className="w-full flex-grow flex flex-col items-center bg-white">
    <FeatureHero onNavigate={onNavigate} />
    <div 
      className="w-full flex flex-col items-center justify-center p-4 py-16 relative"
    >
      <AnimatePresence>
        {promptForGender && (
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mb-8 p-4 bg-primary-50 border border-primary-200 rounded-lg text-center"
            >
                <p className="text-lg font-semibold text-primary-700">Please select a collection to continue.</p>
            </motion.div>
        )}
      </AnimatePresence>
      <div className="text-center mb-12 relative z-10">
        <h1 className="text-5xl md:text-6xl font-serif font-bold text-gray-900 leading-tight animate-dropIn">
          Or, Start Exploring
        </h1>
        <p className="mt-4 text-xl text-gray-600">Pick a collection to begin your journey.</p>
      </div>
      <div className="flex flex-col md:flex-row gap-8 relative z-10">
        <motion.div 
          whileHover={{ scale: 1.05, y: -10, boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}
          transition={{ type: 'spring', stiffness: 300 }}
          className="relative rounded-lg overflow-hidden shadow-xl cursor-pointer"
          onClick={() => onSelectGender('women')}
        >
          <img src="https://i.postimg.cc/mD4D2Z5B/vicky-hladynets-C8-Ta0gw-Pb-Q-unsplash.jpg" alt="Women's Collection" className="w-full md:w-80 h-96 object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-6">
            <h2 className="text-3xl font-serif font-bold text-white">Women's Collection</h2>
          </div>
        </motion.div>
        <motion.div
          whileHover={{ scale: 1.05, y: -10, boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}
          transition={{ type: 'spring', stiffness: 300 }}
          className="relative rounded-lg overflow-hidden shadow-xl cursor-pointer"
          onClick={() => onSelectGender('men')}
        >
          <img src="https://i.postimg.cc/W3d7b7k8/christian-bolt-Db-I2-Ka-FXv-Q-unsplash.jpg" alt="Men's Collection" className="w-full md:w-80 h-96 object-cover" />
           <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-6">
            <h2 className="text-3xl font-serif font-bold text-white">Men's Collection</h2>
          </div>
        </motion.div>
      </div>
    </div>
  </div>
);

const AccessoriesView = ({ products, onAddToWishlist, wishlist, onAddToBag, cartItems, onRemoveFromBag }: {
    products: WardrobeItem[],
    onAddToWishlist: (item: WardrobeItem) => void,
    wishlist: WardrobeItem[],
    onAddToBag: (item: WardrobeItem) => void,
    cartItems: CartItem[],
    onRemoveFromBag: (itemId: string) => void,
}) => {
    const [filters, setFilters] = useState<{ colors: string[]; categories: string[] }>({ colors: [], categories: [] });
    const [sortOption, setSortOption] = useState('default');
    const wishlistIds = useMemo(() => new Set(wishlist.map(item => item.id)), [wishlist]);

    const filteredProducts = useMemo(() => {
        let filtered = products.filter(p => p.category === 'accessories');

        if (filters.colors.length > 0) {
            filtered = filtered.filter(p => filters.colors.includes(p.color));
        }
        if (filters.categories.length > 0) {
            filtered = filtered.filter(p => p.subcategory && filters.categories.includes(p.subcategory));
        }

        return filtered.sort((a, b) => {
            if (sortOption === 'price-asc') return parseFloat(a.price.replace('₹', '')) - parseFloat(b.price.replace('₹', ''));
            if (sortOption === 'price-desc') return parseFloat(b.price.replace('₹', '')) - parseFloat(a.price.replace('₹', ''));
            if (sortOption === 'rating-desc') return (b.rating?.value ?? 0) - (a.rating?.value ?? 0);
            return 0;
        });
    }, [products, filters, sortOption]);

    return (
        <div className="w-full max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <h1 className="text-3xl font-bold font-serif text-gray-900">Accessories</h1>
            <FilterPanel products={products} filters={filters} onFilterChange={setFilters} sortOption={sortOption} onSortChange={setSortOption} categorySourceKey="subcategory" />
            <motion.div
                layout
                className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-6 gap-y-10"
            >
                <AnimatePresence>
                    {filteredProducts.map(item => (
                        <ProductCard
                            key={item.id}
                            item={item}
                            isWishlisted={wishlistIds.has(item.id)}
                            onAddToWishlist={onAddToWishlist}
                            onAddToBag={onAddToBag}
                            onRemoveFromBag={onRemoveFromBag}
                            cartItems={cartItems}
                        />
                    ))}
                </AnimatePresence>
            </motion.div>
        </div>
    );
};

// --- WishlistView Component ---
const WishlistView = ({ wishlist, onRemoveFromWishlist, onMoveToCart, cartItems, onRemoveFromBag }: {
    wishlist: WardrobeItem[],
    onRemoveFromWishlist: (item: WardrobeItem) => void,
    onMoveToCart: (item: WardrobeItem) => void,
    cartItems: CartItem[],
    onRemoveFromBag: (itemId: string) => void,
}) => (
    <div className="w-full max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold font-serif text-gray-900">My Wishlist</h1>
        {wishlist.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-6 gap-y-10 mt-8">
                {wishlist.map((item) => (
                    <ProductCard
                        key={item.id}
                        item={item}
                        isWishlisted={true}
                        onAddToWishlist={onRemoveFromWishlist}
                        onMoveToCart={onMoveToCart}
                        onRemoveFromBag={onRemoveFromBag}
                        cartItems={cartItems}
                    />
                ))}
            </div>
        ) : (
            <div className="text-center py-20">
                 <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center">
                    <HeartIcon className="h-8 w-8 text-gray-400" />
                </div>
                <h2 className="mt-4 text-lg font-medium text-gray-900">Your wishlist is empty</h2>
                <p className="mt-1 text-sm text-gray-500">Add your favorite items to your wishlist to see them here.</p>
            </div>
        )}
    </div>
);


// --- SearchResultsView component ---
const SearchResultsView = ({ query, products, onAddToWishlist, wishlist, onAddToBag, cartItems, onRemoveFromBag }: {
    query: string,
    products: WardrobeItem[],
    onAddToWishlist: (item: WardrobeItem) => void,
    wishlist: WardrobeItem[],
    onAddToBag: (item: WardrobeItem) => void,
    cartItems: CartItem[],
    onRemoveFromBag: (itemId: string) => void,
}) => {
    const wishlistIds = useMemo(() => new Set(wishlist.map(item => item.id)), [wishlist]);
    const { products: searchResults } = searchProductsAndCategories(query, products, 100);

    return (
         <div className="w-full max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <h1 className="text-2xl font-bold font-serif text-gray-900">Search results for "{query}"</h1>
            <p className="text-sm text-gray-500 mt-1">{searchResults.length} items found</p>
            {searchResults.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-6 gap-y-10 mt-8">
                    {searchResults.map((item) => (
                        <ProductCard
                            key={item.id}
                            item={item}
                            isWishlisted={wishlistIds.has(item.id)}
                            onAddToWishlist={onAddToWishlist}
                            onAddToBag={onAddToBag}
                            onRemoveFromBag={onRemoveFromBag}
                            cartItems={cartItems}
                        />
                    ))}
                </div>
            ) : (
                <div className="text-center py-20">
                    <p>No products found matching your search.</p>
                </div>
            )}
        </div>
    )
};


const ProductsView = ({ products, onAddToWishlist, wishlist, onAddToBag, cartItems, onRemoveFromBag }: {
    products: WardrobeItem[],
    onAddToWishlist: (item: WardrobeItem) => void,
    wishlist: WardrobeItem[],
    onAddToBag: (item: WardrobeItem) => void,
    cartItems: CartItem[],
    onRemoveFromBag: (itemId: string) => void,
}) => {
    const [filters, setFilters] = useState<{ colors: string[]; categories: string[] }>({ colors: [], categories: [] });
    const [sortOption, setSortOption] = useState('default');
    const wishlistIds = useMemo(() => new Set(wishlist.map(item => item.id)), [wishlist]);

    const filteredProducts = useMemo(() => {
        let filtered = products;

        if (filters.colors.length > 0) {
            filtered = filtered.filter(p => filters.colors.includes(p.color));
        }
        if (filters.categories.length > 0) {
            filtered = filtered.filter(p => filters.categories.includes(p.category));
        }

        return filtered.sort((a, b) => {
            if (sortOption === 'price-asc') return parseFloat(a.price.replace('₹', '')) - parseFloat(b.price.replace('₹', ''));
            if (sortOption === 'price-desc') return parseFloat(b.price.replace('₹', '')) - parseFloat(a.price.replace('₹', ''));
            if (sortOption === 'rating-desc') return (b.rating?.value ?? 0) - (a.rating?.value ?? 0);
            return 0;
        });
    }, [products, filters, sortOption]);

    return (
        <div className="w-full max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <h1 className="text-3xl font-bold font-serif text-gray-900 capitalize">{products[0]?.gender}'s Collection</h1>
            <FilterPanel products={products} filters={filters} onFilterChange={setFilters} sortOption={sortOption} onSortChange={setSortOption}/>
            <motion.div
                layout
                className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-6 gap-y-10"
            >
                <AnimatePresence>
                    {filteredProducts.map(item => (
                        <ProductCard
                            key={item.id}
                            item={item}
                            isWishlisted={wishlistIds.has(item.id)}
                            onAddToWishlist={onAddToWishlist}
                            onAddToBag={onAddToBag}
                            onRemoveFromBag={onRemoveFromBag}
                            cartItems={cartItems}
                        />
                    ))}
                </AnimatePresence>
            </motion.div>
        </div>
    );
};

// --- Toast Component ---

// FIX: Define a type for the Toast component's props and explicitly type it as a React.FC
// This resolves a TypeScript error where the special 'key' prop was not recognized.
interface ToastProps {
  message: string;
  onUndo?: () => void;
  onDismiss: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, onUndo, onDismiss }) => {
    useEffect(() => {
        const timer = setTimeout(onDismiss, 4000);
        return () => clearTimeout(timer);
    }, [onDismiss]);

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 50, scale: 0.3 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.5 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gray-800 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-4"
        >
            <span>{message}</span>
            {onUndo && <button onClick={() => { onUndo(); onDismiss(); }} className="font-bold text-primary-300 hover:underline">Undo</button>}
        </motion.div>
    );
};


// --- Main App Component ---

export const App = () => {
    const [view, setView] = useState<View>('welcome');
    const [currentGender, setCurrentGender] = useState<'men' | 'women' | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
    const [wishlist, setWishlist] = useState<WardrobeItem[]>([]);
    const [cartItems, setCartItems] = useState<CartItem[]>([]);
    const [isBagOpen, setIsBagOpen] = useState(false);
    const [crew, setCrew] = useState<Crew | null>(null);
    const [savedOutfits, setSavedOutfits] = useState<SavedOutfit[]>([]);
    const [outfitToLoad, setOutfitToLoad] = useState<SavedOutfit | null>(null);
    const [itemToTryOn, setItemToTryOn] = useState<WardrobeItem | null>(null);
    const [forceMagicMirrorReset, setForceMagicMirrorReset] = useState(false);

    // Chatbot state
    const [isChatbotOpen, setIsChatbotOpen] = useState(false);
    const [chatbotContext, setChatbotContext] = useState<ChatbotContext | null>(null);
    const [showAccessoryNudge, setShowAccessoryNudge] = useState(false);

    const [toast, setToast] = useState<{ id: number, message: string, onUndo?: () => void } | null>(null);

    // Handle incoming crew share links
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const crewSession = params.get('crew_session');

        if (crewSession) {
            try {
                // Use decodeURIComponent instead of atob to handle Unicode characters
                const decodedCrew = JSON.parse(decodeURIComponent(crewSession));
                // Basic validation
                if (decodedCrew && decodedCrew.name && Array.isArray(decodedCrew.members)) {
                    setCrew(decodedCrew);
                    setView('crew_studio');
                    // Clean up the URL
                    window.history.replaceState({}, document.title, window.location.pathname);
                }
            } catch (e) {
                console.error("Failed to parse crew session from URL", e);
                // Optional: show a toast/error message to the user
            }
        }
    }, []); // Run only on mount

    // Keep the main user's crew wishlist in sync with the app's wishlist
    useEffect(() => {
        if (crew && crew.members.length > 0) {
          if (JSON.stringify(crew.members[0].wishlist) !== JSON.stringify(wishlist)) {
            setCrew(prevCrew => {
              if (!prevCrew) return null;
              const newMembers = [...prevCrew.members];
              newMembers[0] = { ...newMembers[0], wishlist: wishlist };
              return { ...prevCrew, members: newMembers };
            });
          }
        }
    }, [wishlist, crew]);


    const showToast = (message: string, onUndo?: () => void) => {
        setToast({ id: Date.now(), message, onUndo });
    };

    const handleNavigate = (targetView: View, options: { gender?: 'men' | 'women'; query?: string } = {}) => {
        if (options.gender) {
            setCurrentGender(options.gender);
        }
        if (options.query) {
            setSearchQuery(options.query);
        }
        
        // Set force reset flag when navigating to magic_mirror from outside
        if (targetView === 'magic_mirror' && view !== 'magic_mirror') {
            setForceMagicMirrorReset(true);
        }
        
        setView(targetView);
    };

    const handleSelectGender = (gender: 'men' | 'women') => {
        setCurrentGender(gender);
        setView('products');
    };

    const handleAnalysisComplete = (result: AnalysisResult) => {
        setAnalysis(result);
        if (result.gender) {
            setCurrentGender(result.gender);
        }
    };
    
    // Wishlist handlers
    const handleAddToWishlist = (item: WardrobeItem) => {
        setWishlist(prev => {
            if (prev.find(i => i.id === item.id)) {
                return prev.filter(i => i.id !== item.id); // Remove if exists
            } else {
                return [...prev, item]; // Add if not
            }
        });
    };

    const handleRemoveFromWishlist = (itemToRemove: WardrobeItem) => {
        setWishlist(prev => prev.filter(item => item.id !== itemToRemove.id));
    };

    const handleMoveToCart = (item: WardrobeItem) => {
        handleAddToCart(item);
        handleRemoveFromWishlist(item);
    };
    
    // Cart Handlers
    const handleAddToCart = (item: WardrobeItem) => {
        setCartItems(prev => {
            const existingItem = prev.find(i => i.id === item.id);
            if (existingItem) {
                return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
            }
            return [...prev, { ...item, quantity: 1 }];
        });
    };

    const handleUpdateCartQuantity = (itemId: string, newQuantity: number) => {
        if (newQuantity <= 0) {
            handleRemoveFromCart(itemId);
            return;
        }
        setCartItems(prev => prev.map(item => item.id === itemId ? { ...item, quantity: newQuantity } : item));
    };

    const handleRemoveFromCart = (itemId: string) => {
        setCartItems(prev => prev.filter(item => item.id !== itemId));
    };

    const handleAddOutfitToBag = (outfit: SavedOutfit) => {
        outfit.items.forEach(item => {
            const isInCart = cartItems.some(cartItem => cartItem.id === item.id);
            if (!isInCart) {
                handleAddToCart(item);
            }
        });
        setIsBagOpen(true);
    };

    // Crew Handlers
    const handleCreateCrew = async (name: string, vibe: string, crewId?: string, memberId?: string, isJoining?: boolean) => {
        if (crewId && memberId) {
            // Firebase-based crew - fetch real crew data and convert to local format
            try {
                const crewRef = ref(db, `crews/${crewId}`);
                const snapshot = await get(crewRef);
                const firebaseCrewData = snapshot.val();
                
                if (firebaseCrewData) {
                    // Convert Firebase crew structure to local crew structure
                    const members = Object.entries(firebaseCrewData.members || {}).map(([id, memberData]: [string, any]) => ({
                        id,
                        name: memberData.name,
                        modelImageUrl: memberData.modelImageUrl || null,
                        outfitHistory: [],
                        poseIndex: 0,
                        wishlist: id === memberId ? wishlist : [], // Only current user gets the wishlist
                    }));
                    
                    const newCrew: Crew = {
                        id: crewId,
                        name: firebaseCrewData.name,
                        vibe: firebaseCrewData.vibe,
                        members,
                        messages: [],
                        sharedWishlist: [],
                    };
                    setCrew(newCrew);
                    setView('crew_studio');
                }
            } catch (error) {
                console.error('Failed to fetch crew data:', error);
                // Fallback to local crew creation
                createLocalCrew(name, vibe);
            }
        } else {
            // Local crew creation
            createLocalCrew(name, vibe);
        }
    };

    const createLocalCrew = (name: string, vibe: string) => {
        const newCrew: Crew = {
            name,
            vibe,
            members: [{
                id: 'member-1',
                name: 'Me',
                modelImageUrl: null,
                outfitHistory: [],
                poseIndex: 0,
                wishlist: wishlist,
            }],
            messages: [],
            sharedWishlist: [],
        };
        setCrew(newCrew);
        setView('crew_studio');
    };

    // Outfit Handlers
    const handleSaveOutfit = (items: WardrobeItem[], previewUrl: string) => {
        const newOutfit: SavedOutfit = {
            id: `outfit-${Date.now()}`,
            name: `Styled Look ${savedOutfits.length + 1}`,
            items,
            previewUrl,
        };
        setSavedOutfits(prev => [newOutfit, ...prev]);
    };
    
    const handleUpdateOutfitName = (outfitId: string, newName: string) => {
        setSavedOutfits(prev => prev.map(o => o.id === outfitId ? { ...o, name: newName } : o));
    };

    const handleDeleteOutfit = (outfitId: string) => {
        setSavedOutfits(prev => prev.filter(o => o.id !== outfitId));
    };
    
    const handleTryOnOutfit = (outfit: SavedOutfit) => {
        setOutfitToLoad(outfit);
        setView('magic_mirror');
    };
    
    useEffect(() => {
        let timer: number | undefined;
        if (showAccessoryNudge) {
            timer = window.setTimeout(() => {
                setShowAccessoryNudge(false);
            }, 12000);
        }
        return () => {
            if (timer) {
                clearTimeout(timer);
            }
        };
    }, [showAccessoryNudge]);


    const renderCurrentView = () => {
        const props = {
            onNavigate: handleNavigate,
            onSelectGender: handleSelectGender,
            wishlist: wishlist,
            onAddToWishlist: handleAddToWishlist,
            cartItems: cartItems,
            onAddToBag: handleAddToCart,
            onRemoveFromBag: handleRemoveFromCart,
        };

        switch (view) {
            case 'welcome':
                return <WelcomeView {...props} />;
            case 'products':
                if (!currentGender) {
                    setView('welcome');
                    return <WelcomeView {...props} promptForGender={true} />;
                }
                const productsForGender = allWardrobeItems.filter(item => item.gender === currentGender && item.category !== 'accessories');
                return <ProductsView products={productsForGender} {...props} />;
            case 'accessories':
                return <AccessoriesView products={allWardrobeItems} {...props} />;
            case 'magic_mirror':
                return <MagicMirrorView
                    {...props}
                    poseInstructions={["Front-facing, neutral stance", "Slightly turned, 3/4 view", "Walking towards camera", "Hands on hips", "Side profile view"]}
                    gender={currentGender}
                    onAnalysisComplete={handleAnalysisComplete}
                    onSaveOutfit={handleSaveOutfit}
                    outfitToLoad={outfitToLoad}
                    onOutfitLoaded={() => setOutfitToLoad(null)}
                    onChatbotContextUpdate={setChatbotContext}
                    setIsChatbotOpen={setIsChatbotOpen}
                    itemToTryOn={itemToTryOn}
                    onItemTriedOn={() => setItemToTryOn(null)}
                    showToast={showToast}
                    setShowAccessoryNudge={setShowAccessoryNudge}
                    forceReset={forceMagicMirrorReset}
                    onResetProcessed={() => setForceMagicMirrorReset(false)}
                    currentView={view}
                />;
            case 'wishlist':
                return <WishlistView wishlist={wishlist} onRemoveFromWishlist={handleRemoveFromWishlist} onMoveToCart={handleMoveToCart} {...props} />;
            case 'search':
                return <SearchResultsView query={searchQuery} products={allWardrobeItems} {...props} />;
            case 'crew_setup':
                return <CrewSetup onCreateCrew={handleCreateCrew} />;
            case 'crew_studio':
                return <CrewStudio
                    crew={crew}
                    setCrew={setCrew}
                    wishlist={wishlist}
                    poseInstructions={["Front-facing, neutral stance", "Slightly turned, 3/4 view", "Walking towards camera", "Hands on hips", "Side profile view"]}
                    onSaveOutfit={handleSaveOutfit}
                />;
            case 'outfits':
                 return <OutfitsView 
                    outfits={savedOutfits}
                    onUpdateName={handleUpdateOutfitName}
                    onDelete={handleDeleteOutfit}
                    onTryOn={handleTryOnOutfit}
                    onAddOutfitToBag={handleAddOutfitToBag}
                    onContinueShopping={() => handleNavigate('products', { gender: currentGender || 'women' })}
                    onAddToCart={handleAddToCart}
                    {...props}
                />;
            default:
                return <WelcomeView {...props} />;
        }
    };
    
    return (
        <div className="min-h-screen w-full flex flex-col font-sans bg-gray-50">
            <Header
                onNavigate={handleNavigate}
                wishlistCount={wishlist.length}
                bagCount={cartItems.reduce((acc, item) => acc + item.quantity, 0)}
                onToggleBag={() => setIsBagOpen(!isBagOpen)}
                currentGender={currentGender}
                currentView={view}
            />
            <main className="flex-grow flex flex-col">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={view}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="flex-grow flex flex-col"
                    >
                        {renderCurrentView()}
                    </motion.div>
                </AnimatePresence>
            </main>
            <Chatbot 
                analysis={analysis}
                wardrobe={allWardrobeItems}
                isOpen={isChatbotOpen}
                setIsOpen={setIsChatbotOpen}
                magicMirrorContext={chatbotContext}
                onNavigate={handleNavigate}
                onTryOnItem={(item) => {
                    setView('magic_mirror');
                    setItemToTryOn(item);
                }}
                onAddToWishlist={handleAddToWishlist}
                wishlist={wishlist}
                gender={currentGender}
                showAccessoryNudge={showAccessoryNudge}
                setShowAccessoryNudge={setShowAccessoryNudge}
            />
             <BagSidepanel
                isOpen={isBagOpen}
                onClose={() => setIsBagOpen(false)}
                cartItems={cartItems}
                onUpdateQuantity={handleUpdateCartQuantity}
                onRemoveItem={handleRemoveFromCart}
            />
            <AnimatePresence>
                {toast && (
                    <Toast
                        key={toast.id}
                        message={toast.message}
                        onUndo={toast.onUndo}
                        onDismiss={() => setToast(null)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};