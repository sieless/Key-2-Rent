'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { doc, getDoc, type Firestore } from 'firebase/firestore';
import { MapPin, Home, ArrowUpRight } from 'lucide-react';
import { useFirebase } from '@/firebase';
import type { FeaturedProperty, Listing, FeaturedDisplayMode } from '@/types';
import { subscribeToFeaturedProperties } from '@/lib/featured-properties';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

function ListingHeroImage({ listing }: { listing: Listing }) {
  const cover = listing.images?.[0];
  if (!cover) {
    return (
      <div className="flex h-full items-center justify-center bg-muted text-muted-foreground">
        No image available
      </div>
    );
  }

  return (
    <Image
      src={cover}
      alt={listing.name ?? listing.location ?? 'Featured property'}
      fill
      className="object-cover"
      sizes="(min-width: 768px) 66vw, 100vw"
      priority
      unoptimized
    />
  );
}

function ListingSummary({ listing }: { listing: Listing }) {
  const title = listing.name || listing.type || 'Featured property';
  const detail = listing.description?.trim() || listing.businessTerms?.trim();
  return (
    <div className="flex h-full flex-col justify-between space-y-6">
      <div className="space-y-3">
        <Badge variant="outline" className="w-max text-xs uppercase tracking-wide">
          Featured listing
        </Badge>
        <h3 className="text-2xl font-bold text-foreground">{title}</h3>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Home className="h-4 w-4" />
            {listing.type ?? 'Rental'}
          </span>
          <span className="flex items-center gap-1">
            <MapPin className="h-4 w-4" />
            {listing.location ?? 'Machakos'}
          </span>
        </div>
        {detail && (
          <p className="text-sm text-muted-foreground whitespace-pre-line line-clamp-4">
            {detail}
          </p>
        )}
        {!detail && listing.features?.length > 0 && (
          <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
            {listing.features.slice(0, 4).map(feature => (
              <Badge key={feature} variant="secondary" className="font-normal">
                {feature}
              </Badge>
            ))}
            {listing.features.length > 4 && (
              <Badge variant="outline">+{listing.features.length - 4}</Badge>
            )}
          </div>
        )}
        {!detail && (!listing.features || listing.features.length === 0) && (
          <p className="text-sm text-muted-foreground">
            Owner details will appear once provided.
          </p>
        )}
      </div>
      <div className="flex flex-col gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Monthly rent</p>
          <p className="text-2xl font-semibold text-primary">
            KES {Number(listing.price ?? 0).toLocaleString()}
          </p>
        </div>
        <Button asChild className="w-full sm:w-auto">
          <Link href={`/listings/${listing.id}`} className="inline-flex items-center gap-2">
            View details
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

type FeaturedEntry = {
  record: FeaturedProperty;
  listing: Listing | null;
};

type RenderableEntry = {
  record: FeaturedProperty;
  listing: Listing;
};

const MODE_INTERVAL: Record<FeaturedDisplayMode, number> = {
  single: 12000,
  double: 12000,
};

const isExpired = (record: FeaturedProperty) => {
  const now = Date.now();
  const end = record.endDate?.toMillis?.();
  if (!end) return true;
  return now > end;
};

const shouldDisplay = (entry: FeaturedEntry): entry is RenderableEntry =>
  entry.record.status === 'active' && entry.record.agreementVerified && !isExpired(entry.record) && !!entry.listing;

type FirestoreListing = Omit<Listing, 'id'>;

async function hydrateListing(db: Firestore, listingId: string): Promise<Listing | null> {
  const listingRef = doc(db, 'listings', listingId);
  const listingSnap = await getDoc(listingRef);
  if (!listingSnap.exists()) {
    return null;
  }
  const data = listingSnap.data() as FirestoreListing;
  return { id: listingSnap.id, ...data };
}

export function FeaturedProperties() {
  const { firestore } = useFirebase();
  const [records, setRecords] = useState<FeaturedProperty[]>([]);
  const [listingCache, setListingCache] = useState<Record<string, Listing>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    if (!firestore) {
      return;
    }
    const unsubscribe = subscribeToFeaturedProperties(firestore, entries => {
      setRecords(entries);
      setIsLoading(false);
    });
    return unsubscribe;
  }, [firestore]);

  useEffect(() => {
    if (!firestore) {
      return;
    }

    let cancelled = false;

    const loadListings = async () => {
      const activeRecords = records.filter(record => !isExpired(record));
      const missing = activeRecords
        .map(record => record.listingId)
        .filter(listingId => !listingCache[listingId]);

      if (missing.length === 0) {
        return;
      }

      const lookups = await Promise.all(missing.map(id => hydrateListing(firestore, id)));
      if (cancelled) return;

      setListingCache(prev => {
        const next = { ...prev };
        lookups.forEach((listing, idx) => {
          const listingId = missing[idx];
          if (listing) {
            next[listingId] = listing;
          }
        });
        return next;
      });
    };

    loadListings();

    return () => {
      cancelled = true;
    };
  }, [firestore, records, listingCache]);

  const entries = useMemo<RenderableEntry[]>(() => {
    return records
      .sort((a, b) => {
        const aStart = a.startDate?.toMillis?.() ?? 0;
        const bStart = b.startDate?.toMillis?.() ?? 0;
        return aStart - bStart;
      })
      .map(record => ({
        record,
        listing: listingCache[record.listingId] ?? null,
      }))
      .filter(shouldDisplay);
  }, [records, listingCache]);

  const displayMode: FeaturedDisplayMode = entries[0]?.record.displayMode ?? 'single';

  const slides = useMemo<RenderableEntry[][]>(() => {
    if (entries.length === 0) return [];
    if (displayMode === 'double') {
      const grouped: RenderableEntry[][] = [];
      for (let i = 0; i < entries.length; i += 2) {
        grouped.push(entries.slice(i, i + 2));
      }
      return grouped;
    }
    return entries.map(entry => [entry]);
  }, [entries, displayMode]);

  useEffect(() => {
    setCurrentSlide(0);
  }, [displayMode, slides.length]);

  useEffect(() => {
    if (slides.length <= 1) {
      return;
    }

    const duration = MODE_INTERVAL[displayMode];
    if (!Number.isFinite(duration)) {
      return;
    }

    const timer = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % slides.length);
    }, duration);

    return () => clearInterval(timer);
  }, [slides.length, displayMode]);

  const goToPrevious = useCallback(() => {
    setCurrentSlide(prev => (prev - 1 + slides.length) % slides.length);
  }, [slides.length]);

  const goToNext = useCallback(() => {
    setCurrentSlide(prev => (prev + 1) % slides.length);
  }, [slides.length]);

  if (isLoading) {
    return null;
  }

  if (slides.length === 0) {
    return null;
  }

  return (
    <section className="bg-muted/40 py-8 rounded-2xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-5">
          <div>
            <h2 className="text-3xl font-bold text-foreground">Featured Properties</h2>
            <p className="text-muted-foreground">
              Premium listings.
            </p>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-xl border bg-card shadow-lg">
          <div
            className="flex transition-transform duration-700 ease-out"
            style={{ transform: `translateX(-${currentSlide * 100}%)` }}
          >
            {slides.map((group, index) => (
              <div key={index} className="min-w-full flex flex-col gap-5 p-5">
                {group.map(({ record, listing }) => (
                  <div
                    key={record.id}
                    className={cn(
                      'grid w-full gap-5 rounded-lg border bg-background/60 p-5 shadow-inner md:grid-cols-[2fr,1fr]',
                      displayMode === 'double' ? 'md:grid-cols-[1.5fr,1fr]' : ''
                    )}
                  >
                    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-black/10">
                      <ListingHeroImage listing={listing as Listing} />
                    </div>
                    <div className="flex flex-col justify-between space-y-4">
                      <ListingSummary listing={listing as Listing} />
                    </div>
                  </div>
                ))}
                {displayMode === 'double' && group.length === 1 && (
                  <div className="hidden md:block" />
                )}
              </div>
            ))}
          </div>

          {slides.length > 1 && (
            <>
              <button
                type="button"
                onClick={goToPrevious}
                className="absolute left-4 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white transition hover:bg-black/70"
                aria-label="Previous featured property"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={goToNext}
                className="absolute right-4 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white transition hover:bg-black/70"
                aria-label="Next featured property"
              >
                ›
              </button>
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2">
            {slides.map((_, idx) => (
                  <span
                    key={idx}
                    className={cn(
                      'h-2 w-2 rounded-full transition-colors',
                      idx === currentSlide ? 'bg-primary' : 'bg-muted-foreground/40',
                    )}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
