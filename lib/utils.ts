/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { WardrobeItem } from "../types";
 
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getFriendlyErrorMessage(error: unknown, context: string): string {
    let rawMessage = 'An unknown error occurred.';
    if (error instanceof Error) {
        rawMessage = error.message;
    } else if (typeof error === 'string') {
        rawMessage = error;
    } else if (error) {
        rawMessage = String(error);
    }

    // Check for specific unsupported MIME type error from Gemini API
    if (rawMessage.includes("Unsupported MIME type")) {
        try {
            // It might be a JSON string like '{"error":{"message":"..."}}'
            const errorJson = JSON.parse(rawMessage);
            const nestedMessage = errorJson?.error?.message;
            if (nestedMessage && nestedMessage.includes("Unsupported MIME type")) {
                const mimeType = nestedMessage.split(': ')[1] || 'unsupported';
                return `File type '${mimeType}' is not supported. Please use a format like PNG, JPEG, or WEBP.`;
            }
        } catch (e) {
            // Not a JSON string, but contains the text. Fallthrough to generic message.
        }
        // Generic fallback for any "Unsupported MIME type" error
        return `Unsupported file format. Please upload an image format like PNG, JPEG, or WEBP.`;
    }
    
    return `${context}. ${rawMessage}`;
}

// Helper to convert image URL to a File object using a canvas to bypass potential CORS issues.
export const urlToFile = (url: string, filename: string): Promise<File> => {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.setAttribute('crossOrigin', 'anonymous');

        image.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = image.naturalWidth;
            canvas.height = image.naturalHeight;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
                return reject(new Error('Could not get canvas context.'));
            }
            ctx.drawImage(image, 0, 0);

            canvas.toBlob((blob) => {
                if (!blob) {
                    return reject(new Error('Canvas toBlob failed.'));
                }
                const mimeType = blob.type || 'image/png';
                const file = new File([blob], filename, { type: mimeType });
                resolve(file);
            }, 'image/png');
        };

        image.onerror = (error) => {
            reject(new Error(`Could not load image from URL for canvas conversion. Error: ${error}`));
        };

        image.src = url;
    });
};

export const searchProductsAndCategories = (
    query: string,
    products: WardrobeItem[],
    limit: number = 8
) => {
    const lowerCaseQuery = query.toLowerCase().trim();
    if (lowerCaseQuery.length < 2) {
        return { products: [], categories: [] };
    }

    // Gracefully handle legacy searches for removed categories
    const legacyTerms = ['jewellery', 'earrings', 'necklace', 'pendant'];
    if (legacyTerms.some(term => lowerCaseQuery.includes(term))) {
        return { products: [], categories: ['SUGGESTION_ACCESSORIES'] };
    }

    const productResults: (WardrobeItem & { score: number })[] = [];
    const categoryResults = new Set<string>();

    products.forEach(item => {
        const lowerCaseName = item.name.toLowerCase();
        const lowerCaseCategory = item.category.replace(/-/g, ' ').toLowerCase();
        const lowerCaseSubcategory = (item.subcategory || '').toLowerCase();
        const lowerCaseBrand = (item.brand || '').toLowerCase();
        const tags = (item.tags || []).join(' ').toLowerCase();

        let score = 0;

        if (lowerCaseName.startsWith(lowerCaseQuery)) score = 5;
        else if (lowerCaseName.includes(lowerCaseQuery)) score = 2;
        
        if (lowerCaseBrand.includes(lowerCaseQuery)) score += 3;
        if (lowerCaseSubcategory.includes(lowerCaseQuery)) score += 2;
        if (tags.includes(lowerCaseQuery)) score += 1;

        if (lowerCaseCategory.startsWith(lowerCaseQuery)) {
            score += 1;
            categoryResults.add(item.category);
        }
        
        if (item.category === 'accessories' && lowerCaseSubcategory.startsWith(lowerCaseQuery)) {
             categoryResults.add(item.subcategory!);
        }

        if (score > 0) {
            productResults.push({ ...item, score });
        }
    });

    if (productResults.some(p => p.category === 'accessories' && 'accessories'.includes(lowerCaseQuery))) {
        categoryResults.add('accessories');
    }

    const sortedProducts = productResults.sort((a, b) => b.score - a.score);
    const uniqueProducts = Array.from(new Map(sortedProducts.map(item => [item.id, item])).values());
    
    return {
        products: uniqueProducts.slice(0, limit),
        categories: Array.from(categoryResults).slice(0, 3), // Limit categories
    };
};

export const highlightText = (text: string, query: string) => {
  if (!query.trim()) return text;
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const startIndex = lowerText.indexOf(lowerQuery);
  if (startIndex === -1) return text;

  const endIndex = startIndex + lowerQuery.length;
  return React.createElement(
    React.Fragment,
    null,
    text.substring(0, startIndex),
    React.createElement('span', { className: 'font-bold' }, text.substring(startIndex, endIndex)),
    text.substring(endIndex)
  );
};

// --- IndexedDB Session Storage ---

const DB_NAME = 'MyntraFitCheckDB';
const DB_VERSION = 1;
const STORE_NAME = 'sessions';

let db: IDBDatabase;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (db) {
      return resolve(db);
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('IndexedDB error:', request.error);
      reject('Error opening IndexedDB');
    };

    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = () => {
      const dbInstance = request.result;
      if (!dbInstance.objectStoreNames.contains(STORE_NAME)) {
        dbInstance.createObjectStore(STORE_NAME);
      }
    };
  });
}

export async function setSessionData(key: string, value: any): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(value, key);

    request.onsuccess = () => resolve();
    request.onerror = () => {
        console.error('Error saving to IndexedDB:', request.error);
        reject('Error saving session data');
    };
  });
}

export async function getSessionData<T>(key: string): Promise<T | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(key);

    request.onsuccess = () => {
      resolve(request.result as T | undefined);
    };
    request.onerror = () => {
        console.error('Error fetching from IndexedDB:', request.error);
        reject('Error fetching session data');
    };
  });
}

export async function clearSessionData(key: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(key);
    
    request.onsuccess = () => resolve();
    request.onerror = () => {
        console.error('Error deleting from IndexedDB:', request.error);
        reject('Error clearing session data');
    };
  });
}