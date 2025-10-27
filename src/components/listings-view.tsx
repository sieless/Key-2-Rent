'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  collection,
  onSnapshot,
  query,
  orderBy,
} from 'firebase/firestore';
import { useFirebase } from '@/firebase';
import { type Listing } from '@/types';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { FilterPanel } from '@/components/filter-panel';
import { ListingGrid } from '@/components/listing-grid';
import { CategorizedListingGrid } from '@/components/categorized-listing-grid';
import { AddListingModal } from '@/components/add-listing-modal';
import { Skeleton } from '@/components/ui/skeleton';
import { RentalTypes } from './rental-types';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Hero } from './hero';
import { Button } from './ui/button';
import Link from 'next/link';
import { FeaturedProperties } from '@/components/featured-properties';


function LoadingSkeletons() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="bg-card rounded-xl shadow-lg overflow-hidden flex flex-col p-5 space-y-4"
        >
          <Skeleton className="h-56 w-full" />
          <div className="flex justify-between">
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="h-5 w-1/4" />
          </div>
          <Skeleton className="h-8 w-1/2" />
          <div className="space-y-2 pt-4 border-t">
            <Skeleton className="h-4 w-1/4" />
            <div className="flex gap-2">
              <Skeleton className="h-6 w-24 rounded-full" />
              <Skeleton className="h-6 w-24 rounded-full" />
            </div>
          </div>
          <div className="pt-4 border-t">
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

const INITIAL_VISIBLE_COUNT = 6;

export function ListingsView() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'categorized'>('categorized');

  const [filters, setFilters] = useState({
    location: 'All',
    type: 'All',
    maxPrice: 100000,
    status: 'All',
  });

  // Get Firebase context to check if services are available
  const { firestore, user, isUserLoading } = useFirebase();
  const db = firestore;
  const router = useRouter();
  const { toast } = useToast();


  useEffect(() => {
    // Don't try to fetch listings if Firestore isn't initialized yet
    if (!db) {
      return;
    }

    setLoading(true);
    const listingsCollection = collection(db, 'listings');
    const q = query(listingsCollection, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, snapshot => {
      const listingsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Listing[];
      setListings(listingsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [db]);

  const handleFilterChange = (name: string, value: string | number) => {
    setFilters(prev => ({ ...prev, [name]: value }));
  };
  
  const handleTypeSelect = (type: string) => {
    handleFilterChange('type', type);
  };

  const handleStatusToggle = (status: string) => {
    setFilters(prev => {
      const isActive = prev.status === status;
      const nextStatus = isActive ? 'All' : status;

      return {
        ...prev,
        status: nextStatus,
        ...(status === 'For Sale' && !isActive ? { type: 'All' } : {}),
      };
    });
  };

  const handlePostClick = () => {
    if (isUserLoading) return;
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to post a new listing.",
        variant: "destructive"
      })
      router.push('/login');
    } else {
      setIsModalOpen(true);
    }
  };

  const regularListings = useMemo(() => {
    const normalize = (value?: string) => value?.trim().toLowerCase() ?? '';
    const filtered = listings.filter(listing => {
        const locationMatch =
            filters.location === 'All' || listing.location === filters.location;
        const typeMatch = filters.type === 'All' || listing.type === filters.type;
        let priceMatch = true;
        if (normalize(listing.status) !== 'for sale') {
          priceMatch = typeof listing.price !== 'number'
            ? true
            : listing.price <= filters.maxPrice;
        }
        const statusMatch = filters.status === 'All'
          ? true
          : normalize(listing.status) === normalize(filters.status);
        return locationMatch && typeMatch && priceMatch && statusMatch;
    });
    const statusPriority: Record<string, number> = {
      'for sale': 5,
      vacant: 4,
      'available soon': 3,
      occupied: 2,
    };
    return filtered.sort((a, b) => {
      const aPriority = statusPriority[normalize(a.status)] ?? 0;
      const bPriority = statusPriority[normalize(b.status)] ?? 0;
      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }
      const aTime = a.createdAt?.toMillis?.() ?? 0;
      const bTime = b.createdAt?.toMillis?.() ?? 0;
      return bTime - aTime;
    });
  }, [listings, filters]);

  const visibleListings = useMemo(() => {
    return regularListings.slice(0, INITIAL_VISIBLE_COUNT);
  }, [regularListings]);

  const hasMore = regularListings.length > INITIAL_VISIBLE_COUNT;

  // Show loading skeleton while Firebase is initializing
  if (!db && loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header onPostClick={() => {}} />
        <Hero />
        <main className="flex-grow w-full">
          <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
            <LoadingSkeletons />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header onPostClick={handlePostClick} />
      <Hero />
      <main className="flex-grow w-full">
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          {loading ? (
            <LoadingSkeletons />
          ) : (
            <div className="space-y-12">
              <RentalTypes
                onTypeSelect={handleTypeSelect}
                onStatusSelect={handleStatusToggle}
                selectedType={filters.type}
                selectedStatus={filters.status}
              />
              <FeaturedProperties />

              <FilterPanel filters={filters} onFilterChange={handleFilterChange} />
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-3xl font-bold text-foreground">
                  All Properties ({regularListings.length})
                </h2>
                <div className="flex gap-2">
                  <Button
                    variant={viewMode === 'categorized' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('categorized')}
                  >
                    By Category
                  </Button>
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                  >
                    All Listings
                  </Button>
                </div>
              </div>

              {viewMode === 'categorized' ? (
                <CategorizedListingGrid
                  listings={regularListings}
                  showCategories={filters.type === 'All'}
                  maxPerCategory={6}
                />
              ) : (
                <>
                  <ListingGrid listings={visibleListings} />
                  {hasMore && (
                    <div className="text-center mt-10">
                      <Button size="lg" asChild>
                        <Link href="/all-properties">View All</Link>
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </main>
      <Footer />
      {isModalOpen && (
        <AddListingModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </div>
  );
}
