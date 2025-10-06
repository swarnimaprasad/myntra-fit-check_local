/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

export type ClothingCategory = 't-shirts' | 'shirts' | 'pants' | 'dresses' | 'tops' | 'accessories' | 'jackets' | 'coats' | 'skirts' | 'sweaters';
export type AccessorySubcategory = 'sunglasses' | 'hats' | 'belts' | 'shoes';
export type AnchorType = 'face' | 'head' | 'waist' | 'feet' | null;

export interface AccessoryMeta {
  anchor: AnchorType;
  vtoSupported: boolean;
  material?: 'metal' | 'plastic' | 'fabric' | 'leather';
  occlusionHints?: ('hair' | 'face' | 'torso' | 'pants' | 'floor')[];
  defaults?: { scale?: number; offsetX?: number; offsetY?: number; tilt?: number };
}

export interface WardrobeItem {
  id: string;
  name: string;
  url: string;
  gender: 'men' | 'women';
  category: ClothingCategory;
  price: string;
  color: string;
  rating?: {
    value: number;
    count?: number;
  };
  brand?: string;
  subcategory?: AccessorySubcategory;
  tags?: string[];
  vtoSupported?: boolean;
  anchors?: { type: AnchorType }; // Legacy, replaced by accessoryMeta
  accessoryMeta?: AccessoryMeta;
}

export interface CartItem extends WardrobeItem {
  quantity: number;
}

export interface OutfitLayer {
  garment: WardrobeItem | null; // Garment for this layer. null for base model.
  poseImages: Record<string, string>; // Maps pose instruction to image URL
}

export interface SavedOutfit {
  id: string;
  name: string;
  items: WardrobeItem[];
  previewUrl: string;
}

export interface StylistResult {
  stylistResponse: string;
  recommendedProductIds: string[];
}

export interface ColorRecommendation {
    name: string;
    hex: string;
}

export interface AnalysisResult {
  bodyType: string;
  skinTone: string;
  gender: 'men' | 'women';
  proportions: {
    chest: string;
    waist: string;
    hips: string;
  };
  recommendedColors: ColorRecommendation[];
  recommendedStyles: string[];
}

export interface CrewMember {
  id:string;
  name: string;
  modelImageUrl: string | null;
  hasCreatedModel: boolean;
  outfitHistory: OutfitLayer[];
  poseIndex: number;
  wishlist: WardrobeItem[]; // Each member has their own personal wishlist
}

export interface ChatMessage {
  id: string;
  sender: string; // 'Me', 'Stylo', or a member's name
  text: string;
  timestamp: string;
  threadId?: string; // Links to a WardrobeItem ID for threaded discussion
  imageUrl?: string;
}

export interface WishlistComment {
  id: string;
  sender: string;
  text: string;
  timestamp: string;
}

export interface SharedWishlistItem extends WardrobeItem {
  ratings: { memberId: string, value: number }[]; // Track who gave what rating
  reactions: { [emoji: string]: string[] }; // Map of emoji to array of member IDs who reacted
  comments: WishlistComment[];
  addedBy: string; // Name of the member who added it
}

export interface Crew {
  id?: string; // Optional crew ID for Firebase real-time sync
  name: string;
  vibe: string;
  members: CrewMember[];
  messages: ChatMessage[];
  sharedWishlist: SharedWishlistItem[];
}

export interface BackgroundTheme {
  id: string;
  name: string;
  thumbnailUrl: string;
  prompt: string;
}

export interface ChatbotContext {
  outfit: OutfitLayer | null;
  latestTryOnImage: string | null;
  analysis: AnalysisResult | null;
}