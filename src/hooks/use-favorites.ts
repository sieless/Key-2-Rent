'use client';

import { useState, useEffect } from 'react';
import {
  getFavorites,
  isFavorited,
  addFavorite,
  removeFavorite,
  toggleFavorite,
  getFavoritesCount,
} from '@/services/favorites';

/**
 * React hook for managing favorite listings
 *
 * Features:
 * - Real-time sync across components via custom events
 * - Automatic updates when favorites change
 * - Simple toggle function
 *
 * Usage:
 * ```tsx
 * const { favorites, isFavorite, toggle, count } = useFavorites();
 *
 * <Button onClick={() => toggle(listingId)}>
 *   {isFavorite(listingId) ? 'Unsave' : 'Save'}
 * </Button>
 * ```
 */
export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [count, setCount] = useState(0);

  useEffect(() => {
    // Initial load
    const initialFavorites = getFavorites();
    setFavorites(initialFavorites);
    setCount(initialFavorites.length);

    // Listen for changes (from other components or tabs)
    const handleFavoritesChange = (event: Event) => {
      const customEvent = event as CustomEvent<string[]>;
      const updatedFavorites = customEvent.detail || getFavorites();
      setFavorites(updatedFavorites);
      setCount(updatedFavorites.length);
    };

    window.addEventListener('favoritesChanged', handleFavoritesChange);

    // Listen for storage changes (cross-tab sync)
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'timelaine_favorites') {
        const updatedFavorites = getFavorites();
        setFavorites(updatedFavorites);
        setCount(updatedFavorites.length);
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('favoritesChanged', handleFavoritesChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const isFavorite = (listingId: string): boolean => {
    return favorites.includes(listingId);
  };

  const toggle = (listingId: string): boolean => {
    return toggleFavorite(listingId);
  };

  const add = (listingId: string): boolean => {
    return addFavorite(listingId);
  };

  const remove = (listingId: string): boolean => {
    return removeFavorite(listingId);
  };

  return {
    favorites,       // Array of listing IDs
    count,          // Number of favorites
    isFavorite,     // Check if listing is favorited
    toggle,         // Toggle favorite status
    add,            // Add to favorites
    remove,         // Remove from favorites
  };
}

/**
 * Simplified hook for single listing favorite status
 *
 * Usage in listing card:
 * ```tsx
 * const { isFavorited, toggle } = useListingFavorite(listing.id);
 * ```
 */
export function useListingFavorite(listingId: string) {
  const [favorited, setFavorited] = useState(false);

  useEffect(() => {
    setFavorited(isFavorited(listingId));

    const handleChange = () => {
      setFavorited(isFavorited(listingId));
    };

    window.addEventListener('favoritesChanged', handleChange);
    return () => window.removeEventListener('favoritesChanged', handleChange);
  }, [listingId]);

  const toggle = () => {
    toggleFavorite(listingId);
  };

  return {
    isFavorited: favorited,
    toggle,
  };
}
