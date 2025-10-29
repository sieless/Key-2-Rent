'use client';

import { useState } from 'react';
import { doc } from 'firebase/firestore';
import { useFirestore, useDoc, useMemoFirebase, useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { ImageGallery } from '@/components/image-gallery';
import Link from 'next/link';

import { type Listing } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Bed,
  MapPin,
  CheckCircle,
  Phone,
  Building,
  ArrowLeft,
  Wallet,
  Store,
  CalendarClock,
  Briefcase,
  FileText,
  Copy,
  MessageCircle,
  Share2,
  Tag
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { AddListingModal } from '@/components/add-listing-modal';
import { useToast } from '@/hooks/use-toast';
import { getPropertyIcon, getStatusClass } from '@/lib/utils';
import { DefaultPlaceholder } from '@/components/default-placeholder';
import { getListingWhatsAppLink } from '@/lib/whatsapp';

type ListingDetailClientProps = {
  listingId: string;
};

function ListingDetailSkeleton() {
  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <Skeleton className="h-8 w-48 mb-6" />
      <Card className="overflow-hidden">
        <Skeleton className="w-full h-[400px] md:h-[500px]" />
        <CardContent className="p-6 md:p-8">
          <div className="flex flex-col md:flex-row justify-between md:items-center mb-4">
            <Skeleton className="h-9 w-3/4 md:w-1/2 mb-2 md:mb-0" />
            <Skeleton className="h-7 w-1/4 md:w-1/5" />
          </div>
          <div className="flex items-center gap-6 text-sm text-muted-foreground mb-6">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-5 w-24" />
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <Skeleton className="h-6 w-32 mb-4" />
              <div className="flex flex-wrap gap-2">
                <Skeleton className="h-7 w-20 rounded-full" />
                <Skeleton className="h-7 w-28 rounded-full" />
                <Skeleton className="h-7 w-24 rounded-full" />
              </div>
            </div>
            <div>
              <Skeleton className="h-6 w-32 mb-4" />
              <Skeleton className="h-12 w-full" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function ListingDetailClient({ listingId }: ListingDetailClientProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const { user, isUserLoading } = useUser();

  const listingRef = useMemoFirebase(() => {
    if (!db) return null;
    return doc(db, 'listings', listingId);
  }, [listingId, db]);

  const { data: listing, isLoading: loading, error: listingError } = useDoc<Listing>(listingRef);

  const handleShare = async () => {
    const url = window.location.href;
    const isForSale = listing?.status === 'For Sale';
    const sharePrice = isForSale
      ? typeof listing?.salePrice === 'number' ? listing?.salePrice : undefined
      : typeof listing?.price === 'number' ? listing?.price : undefined;
    const formattedSharePrice = typeof sharePrice === 'number'
      ? ` KES ${sharePrice.toLocaleString()}${isForSale ? '' : '/month'}`
      : '';
    if (navigator.share) {
      try {
        await navigator.share({
          title: listing?.name || `${listing?.type} in ${listing?.location}`,
          text: sharePrice ? `Check out this property listed at${formattedSharePrice}` : 'Check out this property',
          url: url,
        });
      } catch {
        // User cancelled share
      }
    } else {
      navigator.clipboard.writeText(url);
      toast({
        title: 'Link Copied!',
        description: typeof sharePrice === 'number'
          ? `Share this listing priced at${formattedSharePrice}.`
          : 'Share this listing with others',
      });
    }
  };

  const handleWhatsApp = () => {
    if (!listing) return;
    const whatsappUrl = getListingWhatsAppLink(listing);
    if (!whatsappUrl) {
      toast({
        title: 'Contact unavailable',
        description: 'We could not prepare the WhatsApp message right now. Please call the landlord instead.',
        variant: 'destructive',
      });
      return;
    }
    window.open(whatsappUrl, '_blank');
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

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header onPostClick={handlePostClick} />
        <main className="flex-grow">
          <ListingDetailSkeleton />
        </main>
        <Footer />
      </div>
    );
  }

  if (!listing || listingError) {
    return (
       <div className="flex flex-col min-h-screen">
        <Header onPostClick={handlePostClick} />
        <main className="flex-grow text-center py-20">
          <p className="text-lg text-muted-foreground">Listing not found.</p>
          <Button asChild variant="link" className="mt-4">
            <Link href="/">Go back home</Link>
          </Button>
        </main>
        <Footer />
      </div>
    );
  }

  const hasImages = listing.images && listing.images.length > 0;
  const isForSale = listing.status === 'For Sale';
  const formattedSalePrice = typeof listing.salePrice === 'number'
    ? `Ksh ${listing.salePrice.toLocaleString()}`
    : null;
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(listing.location + ", Machakos")}`;

  return (
    <div className="flex flex-col min-h-screen">
      <Header onPostClick={handlePostClick} />
      <main className="flex-grow bg-background">
        <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <Button
            variant="ghost"
            size="sm"
            className="mb-6 inline-flex items-center gap-2 text-muted-foreground"
            onClick={() => window.history.length > 1 ? window.history.back() : router.push('/')}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to listings
          </Button>

          <div className="grid gap-8 lg:grid-cols-[2fr,1fr]">
            <section className="space-y-6">
              <Card className="overflow-hidden">
                <CardContent className="p-0">
                  {hasImages ? (
                    <ImageGallery images={listing.images} alt={listing.name || listing.type} />
                  ) : (
                    <div className="w-full h-[320px] sm:h-[400px] bg-muted flex items-center justify-center">
                      <DefaultPlaceholder type={listing.type} />
                    </div>
                  )}

                  <div className="p-6 sm:p-8 space-y-6">
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-wrap items-center gap-3">
                        <Badge variant="secondary" className={cn('text-base', getStatusClass(listing.status))}>
                          <CheckCircle className="mr-1 h-4 w-4" />
                          {listing.status}
                        </Badge>
                        <Badge variant="outline" className="text-sm">
                          <Tag className="mr-1 h-3.5 w-3.5" />
                          {listing.type}
                        </Badge>
                      </div>
                      <h1 className="text-3xl font-bold text-foreground">
                        {listing.name || `${listing.type} in ${listing.location}`}
                      </h1>
                      <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
                        <span className="inline-flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          {listing.location}
                        </span>
                        {typeof listing.price === 'number' && !isForSale && (
                          <span className="inline-flex items-center gap-2">
                            <Wallet className="h-4 w-4" />
                            Ksh {listing.price.toLocaleString()} / month
                          </span>
                        )}
                        {isForSale && formattedSalePrice && (
                          <span className="inline-flex items-center gap-2">
                            <Wallet className="h-4 w-4" />
                            {formattedSalePrice}
                          </span>
                        )}
                      </div>
                    </div>

                    {listing.description && (
                      <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none">
                        <h2 className="text-lg font-semibold text-foreground">About this property</h2>
                        <p>{listing.description}</p>
                      </div>
                    )}

                    <div className="grid gap-6 sm:grid-cols-2">
                      <div className="space-y-4">
                        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                          <Bed className="h-5 w-5" /> Features
                        </h2>
                        {listing.features && listing.features.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {listing.features.map(feature => (
                              <Badge key={feature} variant="outline" className="text-sm">
                                {feature}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">No additional features provided.</p>
                        )}
                      </div>

                      <div className="space-y-4">
                        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                          <Building className="h-5 w-5" /> Property details
                        </h2>
                        <div className="space-y-3 text-sm text-muted-foreground">
                          {listing.locationDescription && (
                            <div>
                              <p className="font-medium text-foreground">Location details</p>
                              <p>{listing.locationDescription}</p>
                            </div>
                          )}
                          {listing.deposit && (
                            <div>
                              <p className="font-medium text-foreground">Deposit</p>
                              <p>Ksh {listing.deposit.toLocaleString()}</p>
                            </div>
                          )}
                          {listing.depositMonths && (
                            <div>
                              <p className="font-medium text-foreground">Deposit months</p>
                              <p>{listing.depositMonths}</p>
                            </div>
                          )}
                          {listing.businessTerms && (
                            <div>
                              <p className="font-medium text-foreground">Business terms</p>
                              <p>{listing.businessTerms}</p>
                            </div>
                          )}
                          {listing.totalUnits && (
                            <div>
                              <p className="font-medium text-foreground">Total units</p>
                              <p>{listing.totalUnits}</p>
                            </div>
                          )}
                          {listing.availableUnits && (
                            <div>
                              <p className="font-medium text-foreground">Available units</p>
                              <p>{listing.availableUnits}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-6 sm:grid-cols-2">
                      <div className="space-y-4">
                        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                          <CalendarClock className="h-5 w-5" /> Availability
                        </h2>
                        <div className="space-y-3 text-sm text-muted-foreground">
                          <div>
                            <p className="font-medium text-foreground">Current status</p>
                            <p>{listing.status}</p>
                          </div>
                          {listing.createdAt && (
                            <div>
                              <p className="font-medium text-foreground">Listed on</p>
                              <p>{listing.createdAt.toDate().toLocaleDateString()}</p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                          <Store className="h-5 w-5" /> Nearby amenities
                        </h2>
                        <div className="grid grid-cols-2 gap-3 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            {getPropertyIcon('School')}
                            <span>Schools</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {getPropertyIcon('Shopping')}
                            <span>Shopping</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {getPropertyIcon('Hospital')}
                            <span>Healthcare</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {getPropertyIcon('Transport')}
                            <span>Transport</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                        <FileText className="h-5 w-5" /> Additional information
                      </h2>
                      <div className="space-y-3 text-sm text-muted-foreground">
                        <p>This property is listed on Timelaine by the landlord. Please verify details before making any payments.</p>
                        <p>Use the contact options below to reach out directly and schedule a viewing.</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>

            <aside className="space-y-6">
              <Card>
                <CardContent className="p-6 space-y-6">
                  <div className="space-y-2">
                    <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                      <Phone className="h-5 w-5" /> Contact landlord
                    </h2>
                    {listing.contact ? (
                      <Button className="w-full" onClick={handleWhatsApp}>
                        <MessageCircle className="mr-2 h-4 w-4" />
                        Message on WhatsApp
                      </Button>
                    ) : (
                      <p className="text-sm text-muted-foreground">Contact information will be available after the landlord updates their profile.</p>
                    )}
                    <Button variant="outline" className="w-full" onClick={handleShare}>
                      <Share2 className="mr-2 h-4 w-4" />
                      Share listing
                    </Button>
                  </div>

                  {listing.contact && (
                    <div className="rounded-md border border-dashed border-primary/40 bg-primary/5 p-4 text-sm text-muted-foreground space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-foreground">Phone number</span>
                        <button
                          type="button"
                          className="inline-flex items-center gap-2 text-primary"
                          onClick={() => {
                            navigator.clipboard.writeText(listing.contact);
                            toast({ title: 'Copied!', description: 'Phone number copied to clipboard.' });
                          }}
                        >
                          <Copy className="h-4 w-4" /> Copy
                        </button>
                      </div>
                      <p className="font-mono text-base text-foreground">{listing.contact}</p>
                    </div>
                  )}

                  <div className="space-y-3 text-sm text-muted-foreground">
                    <p>Prefer a call? Dial the number above and mention you found the property on Timelaine.</p>
                    <p>
                      Want to visit? Use the map link below to get directions.
                    </p>
                    <Link href={googleMapsUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-primary">
                      <MapPin className="h-4 w-4" />
                      View on Google Maps
                    </Link>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6 space-y-4">
                  <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <Briefcase className="h-5 w-5" /> Become a landlord
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Do you have a property to list? Reach thousands of tenants actively searching on Timelaine.
                  </p>
                  <Button onClick={() => setIsModalOpen(true)} className="w-full">
                    Post your listing
                  </Button>
                  <Button variant="outline" asChild className="w-full">
                    <Link href="/become-landlord">Learn more</Link>
                  </Button>
                </CardContent>
              </Card>
            </aside>
          </div>
        </div>
      </main>
      <Footer />
      {isModalOpen && (
        <AddListingModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      )}
    </div>
  );
}

export default ListingDetailClient;
