'use client';

// Force dynamic rendering (disable static generation)
export const dynamic = 'force-dynamic';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import {
  collection,
  onSnapshot,
  query,
  orderBy,
} from 'firebase/firestore';
import { useFirestore, useUser } from '@/firebase';
import { type Listing } from '@/types';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { FilterPanel } from '@/components/filter-panel';
import { ListingGrid } from '@/components/listing-grid';
import { AddListingModal } from '@/components/add-listing-modal';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter, useSearchParams } from 'next/navigation';
import type { ReadonlyURLSearchParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { houseTypes, locations } from '@/lib/constants';

const STATUS_OPTIONS = ['All', 'Vacant', 'Occupied', 'Available Soon', 'For Sale'] as const;
type FilterStatus = (typeof STATUS_OPTIONS)[number];

type FilterState = {
  location: string;
  type: string;
  maxPrice: number;
  status: FilterStatus;
};

const LOCATION_OPTIONS = ['All', ...locations.filter((loc) => loc !== 'All Counties')];

const DEFAULT_FILTERS: FilterState = {
  location: 'All',
  type: 'All',
  maxPrice: 50000,
  status: 'All',
};

function parseFiltersFromSearchParams(searchParams: ReadonlyURLSearchParams): FilterState {
  const typeParam = searchParams.get('type');
  const locationParam = searchParams.get('location');
  const statusParam = searchParams.get('status');
  const maxPriceParam = searchParams.get('maxPrice');

  const nextFilters: FilterState = {
    location:
      locationParam && LOCATION_OPTIONS.includes(locationParam)
        ? locationParam
        : DEFAULT_FILTERS.location,
    type:
      typeParam && houseTypes.includes(typeParam)
        ? typeParam
        : DEFAULT_FILTERS.type,
    status:
      statusParam && STATUS_OPTIONS.includes(statusParam as FilterStatus)
        ? (statusParam as FilterStatus)
        : DEFAULT_FILTERS.status,
    maxPrice: DEFAULT_FILTERS.maxPrice,
  };

  if (maxPriceParam) {
    const parsed = Number(maxPriceParam);
    if (!Number.isNaN(parsed)) {
      nextFilters.maxPrice = Math.min(Math.max(parsed, 3000), 100000);
    }
  }

  return nextFilters;
}

function FiltersInitializer({ applyFilters }: { applyFilters: (filters: FilterState) => void }) {
  const searchParams = useSearchParams();

  const nextFilters = useMemo(() => parseFiltersFromSearchParams(searchParams), [searchParams]);

  useEffect(() => {
    applyFilters(nextFilters);
  }, [applyFilters, nextFilters]);

  return null;
}

function LoadingSkeletons() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
      {Array.from({ length: 12 }).map((_, i) => (
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

export default function AllPropertiesPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);

  const db = useFirestore();
  const { user, isUserLoading } = useUser();
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

  const applyFiltersFromParams = useCallback((nextFilters: FilterState) => {
    setFilters(prev => {
      if (
        prev.location === nextFilters.location &&
        prev.type === nextFilters.type &&
        prev.status === nextFilters.status &&
        prev.maxPrice === nextFilters.maxPrice
      ) {
        return prev;
      }
      return nextFilters;
    });
  }, []);

  const handleFilterChange = (name: string, value: string | number) => {
    setFilters(prev => {
      if (name === 'maxPrice' && typeof value === 'number') {
        return { ...prev, maxPrice: Math.min(Math.max(value, 3000), 100000) };
      }

      if (name === 'status' && typeof value === 'string') {
        if (!STATUS_OPTIONS.includes(value as FilterStatus)) {
          return prev;
        }
        return { ...prev, status: value as FilterStatus };
      }

      if ((name === 'location' || name === 'type') && typeof value === 'string') {
        return { ...prev, [name]: value } as FilterState;
      }

      return prev;
    });
  };

  const handlePostClick = () => {
    if (isUserLoading) return;
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'Please log in to post a new listing.',
        variant: 'destructive',
      });
      router.push('/login');
    } else {
      setIsModalOpen(true);
    }
  };

  const filteredListings = useMemo(() => {
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

    return filtered.sort((a, b) => {
      if (a.isFeatured && !b.isFeatured) return -1;
      if (!a.isFeatured && b.isFeatured) return 1;

      if (a.isBoosted && !b.isBoosted) return -1;
      if (!a.isBoosted && b.isBoosted) return 1;

      const statusPriority: Record<Listing['status'], number> = {
        Vacant: 4,
        'For Sale': 3,
        'Available Soon': 2,
        Occupied: 1,
      };
      const aPriority = statusPriority[a.status as Listing['status']] || 0;
      const bPriority = statusPriority[b.status as Listing['status']] || 0;

      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }

      const aTime = a.createdAt?.toMillis() || 0;
      const bTime = b.createdAt?.toMillis() || 0;
      return bTime - aTime;
    });
  }, [listings, filters]);

  return (
    <div className="flex flex-col min-h-screen">
      <Header onPostClick={handlePostClick} />
      <Suspense fallback={null}>
        <FiltersInitializer applyFilters={applyFiltersFromParams} />
      </Suspense>
      <main className="flex-grow w-full">
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <Button variant="ghost" asChild className="mb-6">
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Link>
          </Button>

          {loading ? (
            <LoadingSkeletons />
          ) : (
            <div className="space-y-12">
              <div>
                <FilterPanel
                  filters={filters}
                  onFilterChange={handleFilterChange}
                />
                <h1 className="text-3xl font-bold text-foreground mb-6">
                  All Properties ({filteredListings.length})
                </h1>
                <ListingGrid
                  listings={filteredListings}
                  columns={4}
                />
              </div>
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
