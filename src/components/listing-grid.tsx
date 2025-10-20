'use client'

import { type Listing } from "@/types";
import { ListingCard } from "./listing-card";
import { cn } from "@/lib/utils";

type ListingGridProps = {
  listings: Listing[];
  columns?: 3 | 4;
};

export function ListingGrid({ listings, columns = 3 }: ListingGridProps) {
  return (
    <div>
      {listings.length > 0 ? (
        <div className={cn(
            "grid grid-cols-1 sm:grid-cols-2 gap-8",
            columns === 3 ? "lg:grid-cols-3" : "lg:grid-cols-3 xl:grid-cols-4"
        )}>
          {listings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-card rounded-xl shadow-md">
          <p className="text-lg text-muted-foreground">
            No properties match your current filters.
          </p>
          <p className="text-sm text-muted-foreground/80 mt-2">
            Try adjusting your search criteria, or check back later for new listings!
          </p>
        </div>
      )}
    </div>
  );
}
