'use client';

import { useMemo } from 'react';
import { type Listing } from '@/types';
import { ListingCard } from './listing-card';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';
import { ChevronRight, Building, Home, School, Store } from 'lucide-react';
import Link from 'next/link';

type CategorizedListingGridProps = {
  listings: Listing[];
  showCategories?: boolean;
  maxPerCategory?: number;
};

export function CategorizedListingGrid({
  listings,
  showCategories = true,
  maxPerCategory = 6,
}: CategorizedListingGridProps) {
  // Group listings by type
  const categorizedListings = useMemo(() => {
    const categories: Record<string, Listing[]> = {};

    listings.forEach((listing) => {
      const type = listing.type;
      if (!categories[type]) {
        categories[type] = [];
      }
      categories[type].push(listing);
    });

    return categories;
  }, [listings]);

  // Define category metadata
  const categoryMeta: Record<
    string,
    { icon: React.ReactNode; color: string; description: string }
  > = {
    Business: {
      icon: <Store className="h-5 w-5" />,
      color: 'text-purple-600 dark:text-purple-400',
      description: 'Commercial spaces and shops',
    },
    Bedsitter: {
      icon: <Home className="h-5 w-5" />,
      color: 'text-blue-600 dark:text-blue-400',
      description: 'Compact, all-in-one living spaces',
    },
    'Single Room': {
      icon: <Building className="h-5 w-5" />,
      color: 'text-green-600 dark:text-green-400',
      description: 'Single room rentals',
    },
    '1 Bedroom': {
      icon: <Building className="h-5 w-5" />,
      color: 'text-orange-600 dark:text-orange-400',
      description: 'One bedroom apartments',
    },
    '2 Bedroom': {
      icon: <Building className="h-5 w-5" />,
      color: 'text-red-600 dark:text-red-400',
      description: 'Two bedroom apartments',
    },
    House: {
      icon: <Home className="h-5 w-5" />,
      color: 'text-indigo-600 dark:text-indigo-400',
      description: 'Standalone houses',
    },
    Hostel: {
      icon: <School className="h-5 w-5" />,
      color: 'text-teal-600 dark:text-teal-400',
      description: 'Student and shared accommodation',
    },
  };

  if (!showCategories) {
    // Simple grid without categorization
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {listings.map((listing) => (
          <ListingCard key={listing.id} listing={listing} />
        ))}
      </div>
    );
  }

  if (listings.length === 0) {
    return (
      <div className="text-center py-16 bg-card rounded-xl shadow-md border border-dashed">
        <p className="text-lg text-muted-foreground font-semibold">
          No properties match your current filters.
        </p>
        <p className="text-sm text-muted-foreground/80 mt-2">
          Try adjusting your search criteria, or check back later for new listings!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {Object.entries(categorizedListings).map(([category, categoryListings]) => {
        const meta = categoryMeta[category] || {
          icon: <Building className="h-5 w-5" />,
          color: 'text-gray-600',
          description: category,
        };

        const displayListings = categoryListings.slice(0, maxPerCategory);
        const hasMore = categoryListings.length > maxPerCategory;

        return (
          <section key={category} className="space-y-6">
            {/* Category Header */}
            <div className="flex items-center justify-between border-b pb-4">
              <div className="flex items-center gap-3">
                <div className={cn('p-2 rounded-lg bg-muted', meta.color)}>
                  {meta.icon}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-foreground font-headline">
                    {category}
                  </h2>
                  <p className="text-sm text-muted-foreground">{meta.description}</p>
                </div>
                <div className="ml-4 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-semibold">
                  {categoryListings.length} {categoryListings.length === 1 ? 'listing' : 'listings'}
                </div>
              </div>

              {hasMore && (
                <Button variant="ghost" size="sm" asChild>
                  <Link
                    href={`/all-properties?type=${encodeURIComponent(category)}`}
                    className="group"
                  >
                    View All
                    <ChevronRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </Button>
              )}
            </div>

            {/* Category Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {displayListings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>

            {/* View More Button (Mobile) */}
            {hasMore && (
              <div className="flex justify-center pt-4 sm:hidden">
                <Button variant="outline" asChild>
                  <Link href={`/all-properties?type=${encodeURIComponent(category)}`}>
                    View All {category} ({categoryListings.length})
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
