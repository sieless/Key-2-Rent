'use client';

// Force dynamic rendering (disable static generation)
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, documentId } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { useFavorites } from '@/hooks/use-favorites';
import { type Listing } from '@/types';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { ListingCard } from '@/components/listing-card';
import { Button } from '@/components/ui/button';
import { Heart, Loader2 } from 'lucide-react';
import Link from 'next/link';

/**
 * Favorites Page
 *
 * Displays all listings the user has saved to favorites.
 * Uses localStorage for storage, Firestore to fetch listing details.
 *
 * Features:
 * - Real-time sync with favorites changes
 * - Empty state with CTA
 * - Loading state
 * - Grid layout matching homepage
 */
export default function FavoritesPage() {
  const { favorites, count } = useFavorites();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const db = useFirestore();

  useEffect(() => {
    async function fetchFavoriteListings() {
      if (favorites.length === 0) {
        setListings([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // Firestore 'in' queries support max 10 items at a time
        // Split into batches if needed
        const batches: string[][] = [];
        for (let i = 0; i < favorites.length; i += 10) {
          batches.push(favorites.slice(i, i + 10));
        }

        const allListings: Listing[] = [];

        for (const batch of batches) {
          const q = query(
            collection(db, 'listings'),
            where(documentId(), 'in', batch)
          );
          const snapshot = await getDocs(q);

          snapshot.forEach(doc => {
            allListings.push({ id: doc.id, ...doc.data() } as Listing);
          });
        }

        setListings(allListings);
      } catch (error) {
        console.error('Error fetching favorite listings:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchFavoriteListings();
  }, [favorites, db]);

  return (
    <div className="flex flex-col min-h-screen">
      <Header onPostClick={() => {}} />

      <main className="flex-grow bg-background">
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <Heart className="h-8 w-8 text-red-500 fill-red-500" />
              <h1 className="text-4xl font-bold">Saved Listings</h1>
            </div>
            <p className="text-muted-foreground text-lg">
              {count === 0
                ? 'You haven\'t saved any listings yet'
                : `You have ${count} saved ${count === 1 ? 'listing' : 'listings'}`
              }
            </p>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
          )}

          {/* Empty State */}
          {!loading && count === 0 && (
            <div className="text-center py-20">
              <Heart className="h-20 w-20 text-muted-foreground mx-auto mb-6" />
              <h2 className="text-2xl font-semibold mb-3">No Saved Listings Yet</h2>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Start exploring properties and save your favorites by clicking the heart icon on any listing.
              </p>
              <Button asChild size="lg">
                <Link href="/">Browse Listings</Link>
              </Button>
            </div>
          )}

          {/* Listings Grid */}
          {!loading && listings.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {listings.map(listing => (
                <ListingCard
                  key={listing.id}
                  listing={listing}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
