'use client';

// Force dynamic rendering (disable static generation)
export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { doc } from 'firebase/firestore';
import { useFirestore, useDoc, useMemoFirebase, useUser } from '@/firebase';
import { useParams, useRouter } from 'next/navigation';
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
  School,
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


export default function ListingDetailPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const db = useFirestore();
  const params = useParams();
  const router = useRouter();
  const { id } = params;
  const { toast } = useToast();
  const { user, isUserLoading } = useUser();

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
      } catch (err) {
        // User cancelled share
      }
    } else {
      // Fallback: copy to clipboard
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

  const listingRef = useMemoFirebase(() => {
    if (typeof id !== 'string') return null;
    if (!db) return null;
    return doc(db, 'listings', id);
  }, [id, db]);

  const { data: listing, isLoading: loading, error: listingError } = useDoc<Listing>(listingRef);

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
  const contactLabel = isForSale ? 'Contact Seller' : 'Contact Landlord';
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(listing.location + ", Machakos")}`;

  return (
    <div className="flex flex-col min-h-screen">
      <Header onPostClick={handlePostClick} />
      <main className="flex-grow bg-background">
        <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-6"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Listings
          </Button>

          <Card className="overflow-hidden shadow-lg">
            <div className="relative p-6">
              {hasImages ? (
                <ImageGallery
                  images={listing.images}
                  alt={listing.name || listing.type}
                  showThumbnails={true}
                />
              ) : (
                <div className="aspect-[16/10] w-full bg-muted flex items-center justify-center rounded-lg">
                  <DefaultPlaceholder type={listing.type} />
                </div>
              )}
              <Badge
                className={cn(
                  "absolute top-10 right-10 text-base z-20",
                  getStatusClass(listing.status)
                )}
              >
                {listing.status === 'Available Soon' ? (
                  <CalendarClock className="mr-1.5 h-4 w-4" />
                ) : listing.status === 'For Sale' ? (
                  <Tag className="mr-1.5 h-4 w-4" />
                ) : null}
                {listing.status}
              </Badge>
            </div>

            <CardContent className="p-6 md:p-8">
              <div className="flex flex-col md:flex-row justify-between md:items-start mb-4 gap-4">
                <div>
                   {listing.name && (
                    <h1 className="text-3xl font-bold text-foreground leading-tight mb-2">
                      {listing.name}
                    </h1>
                  )}
                  {isForSale && formattedSalePrice ? (
                    <div>
                      <h2 className="text-4xl font-extrabold text-foreground mb-1">
                        {formattedSalePrice}
                      </h2>
                      <p className="text-sm font-medium text-muted-foreground">
                        Sale price
                      </p>
                    </div>
                  ) : (
                    <h2 className="text-4xl font-extrabold text-foreground mb-1">
                      Ksh {listing.price?.toLocaleString() || '0'}
                      <span className="text-xl font-medium text-muted-foreground">
                        /month
                      </span>
                    </h2>
                  )}
                    {listing.deposit && !isForSale && (
                      <div className="flex items-center text-muted-foreground">
                          <Wallet className="w-4 h-4 mr-2" />
                          <span>Deposit: Ksh {listing.deposit.toLocaleString()}
                          {listing.depositMonths && ` (${listing.depositMonths} months)`}
                          </span>
                      </div>
                    )}
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span className="font-mono">{listing.adminListingId ?? listing.id}</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(listing.adminListingId ?? listing.id);
                        toast({ title: 'Copied!', description: 'Property ID copied to clipboard.' });
                      } catch {
                        toast({ title: 'Copy failed', description: 'Try again.', variant: 'destructive' });
                      }
                    }}
                    className="h-7 px-2"
                  >
                    <Copy className="h-3.5 w-3.5" /> Copy ID
                  </Button>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground mb-6 border-b pb-6">
                <p className="font-semibold flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" /> {listing.location}
                </p>
                <p className="font-semibold flex items-center gap-2">
                  {getPropertyIcon(listing.type)}
                  {listing.type}
                </p>
                <Button variant="link" size="sm" asChild className="p-0 h-auto">
                  <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer">
                    <MapPin className="mr-1 h-4 w-4" /> View on Map
                  </a>
                </Button>
                <Button
                  variant="link"
                  size="sm"
                  className="p-0 h-auto"
                  onClick={() => router.push('/payment-info')}
                >
                  Learn how Featured Listings work
                </Button>
              </div>

              <div className="space-y-8">
                {listing.locationDescription && (
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center">
                      <MapPin className="mr-2 h-5 w-5 text-primary" /> Location Description
                    </h3>
                    <p className="text-sm text-muted-foreground whitespace-pre-line">
                      {listing.locationDescription}
                    </p>
                  </div>
                )}
                {listing.type === 'Business' && listing.businessTerms && (
                   <div>
                    <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center">
                      <FileText className="mr-2 h-5 w-5 text-primary" /> Business Terms
                    </h3>
                    <p className="text-sm text-muted-foreground whitespace-pre-line bg-muted/50 p-4 rounded-md">
                      {listing.businessTerms}
                    </p>
                  </div>
                )}
                <div className="grid md:grid-cols-2 gap-8">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center">
                       <CheckCircle className="mr-2 h-5 w-5 text-primary" /> Features
                    </h3>
                    {listing.features?.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {listing.features.map(feature => (
                          <Badge key={feature} variant="outline" className="font-normal text-sm">
                            {feature}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No extra features listed.
                      </p>
                    )}
                  </div>
                  <div className="space-y-3">
                    {isForSale && formattedSalePrice && (
                      <div className="rounded-md border border-primary/40 bg-primary/5 px-3 py-2">
                        <p className="text-xs uppercase tracking-wide text-primary">Sale price</p>
                        <p className="text-lg font-semibold text-primary">{formattedSalePrice}</p>
                      </div>
                    )}
                    <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center">
                      <Briefcase className="mr-2 h-5 w-5 text-primary" /> {contactLabel}
                    </h3>
                    {/* FEATURE FLAG: Show payment gate if admin enabled contact payments */}
                    <div className="space-y-2">
                      <Button
                        asChild
                        variant="secondary"
                        className="w-full text-lg font-semibold text-green-600 hover:text-green-700"
                      >
                        <a href={`tel:${listing.contact}`}>
                          <Phone className="mr-2 h-5 w-5" />
                          {listing.contact}
                        </a>
                      </Button>
                      <Button
                        onClick={handleWhatsApp}
                        variant="outline"
                        className="w-full"
                      >
                        <MessageCircle className="mr-2 h-4 w-4" />
                        Message on WhatsApp
                      </Button>
                    </div>

                    {/* Share Button */}
                    <Button
                      onClick={handleShare}
                      variant="ghost"
                      className="w-full"
                    >
                      <Share2 className="mr-2 h-4 w-4" />
                      Share Listing
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
       {isModalOpen && (
        <AddListingModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      )}

      {/* Payment modal removed per free contact access */}
    </div>
  );
}
