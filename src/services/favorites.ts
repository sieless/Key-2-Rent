'use client';

/**
 * Favorites Service
 *
 * Manages saved/favorite listings using localStorage for quick implementation.
 * Features:
 * - Add/remove favorites
 * - Check if listing is favorited
 * - Get all favorites
 * - Sync across tabs (storage event)
 *
 * Future enhancement: Move to Firestore for cross-device sync
 */

const FAVORITES_KEY = 'timelaine_favorites';

/**
 * Get all favorite listing IDs from localStorage
 */
export function getFavorites(): string[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(FAVORITES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error reading favorites:', error);
    return [];
  }
}

/**
 * Check if a listing is in favorites
 */
export function isFavorited(listingId: string): boolean {
  const favorites = getFavorites();
  return favorites.includes(listingId);
}

/**
 * Add listing to favorites
 */
export function addFavorite(listingId: string): boolean {
  try {
    const favorites = getFavorites();
    if (!favorites.includes(listingId)) {
      favorites.push(listingId);
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));

      // Dispatch custom event for real-time updates across components
      window.dispatchEvent(new CustomEvent('favoritesChanged', { detail: favorites }));
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error adding favorite:', error);
    return false;
  }
}

/**
 * Remove listing from favorites
 */
export function removeFavorite(listingId: string): boolean {
  try {
    const favorites = getFavorites();
    const filtered = favorites.filter(id => id !== listingId);

    if (filtered.length !== favorites.length) {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(filtered));

      // Dispatch custom event for real-time updates
      window.dispatchEvent(new CustomEvent('favoritesChanged', { detail: filtered }));
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error removing favorite:', error);
    return false;
  }
}

/**
 * Toggle favorite status
 */
export function toggleFavorite(listingId: string): boolean {
  const isCurrentlyFavorited = isFavorited(listingId);

  if (isCurrentlyFavorited) {
    return removeFavorite(listingId);
  } else {
    return addFavorite(listingId);
  }
}

/**
 * Clear all favorites
 */
export function clearFavorites(): void {
  try {
    localStorage.removeItem(FAVORITES_KEY);
    window.dispatchEvent(new CustomEvent('favoritesChanged', { detail: [] }));
  } catch (error) {
    console.error('Error clearing favorites:', error);
  }
}

/**
 * Get count of favorites
 */
export function getFavoritesCount(): number {
  return getFavorites().length;
}
