'use client';

import { useState, type ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Phone, Hourglass, MapPin, Star, Zap, Heart, Building2, MessageCircle, CheckCircle2 } from 'lucide-react';
import { type Listing } from '@/types';
import { cn, getPropertyIcon, getStatusClass } from '@/lib/utils';
import { DefaultPlaceholder } from './default-placeholder';
import { useListingFavorite } from '@/hooks/use-favorites';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { VacancyPaymentModal } from './vacancy-payment-modal';
import { useStartConversation } from '@/hooks/use-start-conversation';


type ListingCardProps = {
  listing: Listing;
};


export function ListingCard({ listing }: ListingCardProps) {
  const hasImages = listing.images && listing.images.length > 0;
  const { isFavorited, toggle: toggleFavorite } = useListingFavorite(listing.id);
  const { toast } = useToast();
  const { user } = useUser();
  const router = useRouter();
  const { startConversation, loading: startingConversation } = useStartConversation();
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const isContactable = Boolean(user && user.uid !== listing.userId);

  const statusIconMap: Record<Listing['status'], ReactNode> = {
    Vacant: <CheckCircle2 className="mr-1.5 h-4 w-4" />,
    Occupied: <Building2 className="mr-1.5 h-4 w-4" />,
    'Available Soon': <Hourglass className="mr-1.5 h-4 w-4" />,
  };

  const statusIcon = statusIconMap[listing.status];

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigation to listing detail
    e.stopPropagation();
    toggleFavorite();
    toast({
      title: isFavorited ? 'Removed from favorites' : 'Added to favorites',
      description: isFavorited ? 'Listing removed from your saved items' : 'View your saved listings anytime',
    });
  };

  const handleContactClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      toast({
        title: 'Sign in required',
        description: 'Create an account or log in to contact landlords.',
        variant: 'destructive',
      });
      router.push('/signup');
      return;
    }

    if (listing.status === 'Vacant') {
      setShowPaymentModal(true);
      return;
    }
    window.location.href = `tel:${listing.contact}`;
  };

  const renderContactButton = () => {
    if (listing.status === 'Vacant') {
      if (user && user.uid === listing.userId) {
        return (
          <Button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowPaymentModal(true);
            }}
            variant="default"
            className="flex-1 font-semibold"
          >
            <Phone className="mr-2 h-4 w-4" />
            Confirm Listing Payment
          </Button>
        );
      }

      return (
        <Button
          disabled
          variant="outline"
          className="flex-1 font-semibold"
        >
          <Phone className="mr-2 h-4 w-4" />
          Pending
        </Button>
      );
    }

    return (
      <Button
        onClick={handleContactClick}
        variant="secondary"
        className="flex-1 text-base font-semibold text-green-600 hover:text-green-700"
      >
        <Phone className="mr-2 h-4 w-4" />
        {user ? listing.contact : 'Sign in to view contact'}
      </Button>
    );
  };

  return (
    <>
      <Card className="overflow-hidden group transform hover:-translate-y-1 transition-all duration-300 hover:shadow-xl flex flex-col h-full">
        <Link href={`/listings/${listing.id}`} className="flex flex-col h-full">
        <div className="relative w-full h-64 flex-shrink-0 overflow-hidden bg-muted rounded-t-lg">
            {hasImages ? (
              <Image
                src={listing.images[0]}
                alt={listing.name || listing.type}
                fill
                className="object-cover w-full h-full"
                sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                unoptimized
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <DefaultPlaceholder type={listing.type} />
              </div>
            )}
           {/* Status Badge */}
            <Badge
              className={cn(
                "absolute top-3 right-3 text-sm z-10",
                getStatusClass(listing.status)
              )}
            >
              {statusIcon}
              {listing.status}
            </Badge>

            {/* Multi-unit Badge - shows availability for multi-unit properties */}
            {listing.totalUnits && listing.totalUnits > 1 && (
              <Badge className="absolute top-14 right-3 text-xs z-10 bg-blue-600 text-white hover:bg-blue-700">
                <Building2 className="mr-1 h-3 w-3" />
                {listing.availableUnits || 0} of {listing.totalUnits} available
              </Badge>
            )}

            {/* Featured Badge - shows if listing is featured */}
            {listing.isFeatured && (
              <Badge className="absolute top-3 left-3 text-sm z-10 bg-yellow-500 text-black hover:bg-yellow-600">
                <Star className="mr-1.5 h-4 w-4 fill-current" />
                Featured
              </Badge>
            )}

            {/* Boosted Badge - shows if vacancy is boosted */}
            {listing.isBoosted && !listing.isFeatured && (
              <Badge className="absolute top-3 left-3 text-sm z-10 bg-purple-500 hover:bg-purple-600">
                <Zap className="mr-1.5 h-4 w-4" />
                Boosted
              </Badge>
            )}
            {hasImages && listing.images.length > 1 && (
              <div className="absolute bottom-3 right-3 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
                {listing.images.length} photos
              </div>
            )}

            {/* Favorite Button */}
            <button
              onClick={handleFavoriteClick}
              className="absolute bottom-3 left-3 bg-white/90 hover:bg-white p-2 rounded-full shadow-lg transition-all z-10"
              aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
            >
              <Heart
                className={cn(
                  "h-5 w-5 transition-colors",
                  isFavorited ? "fill-red-500 text-red-500" : "text-gray-600"
                )}
              />
            </button>
        </div>
        <CardContent className="p-4 flex flex-col flex-grow">
          <div className="flex items-center justify-between mb-2 text-xs text-muted-foreground">
            <p className="font-semibold flex items-center gap-2">
              <MapPin className="w-4 h-4" /> {listing.location}
            </p>
            <p className="font-semibold flex items-center gap-2">
              {getPropertyIcon(listing.type)} {listing.type}
            </p>
          </div>
           {listing.name && (
            <h3 className="text-lg font-semibold text-foreground leading-tight truncate mb-1">
              {listing.name}
            </h3>
          )}
          <h3 className="text-xl font-semibold text-foreground leading-tight">
            Ksh {listing.price?.toLocaleString() || "0"}
            <span className="text-sm font-normal text-muted-foreground">/month</span>
          </h3>
          <div className="mt-3 border-t pt-3 flex-grow">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase mb-2">
              Features
            </p>
            <div className="flex flex-wrap gap-2">
              {listing.features?.length > 0 ? (
                listing.features.slice(0, 3).map((feature) => ( // Show max 3 features
                  <Badge key={feature} variant="secondary" className="font-normal text-xs px-2 py-1">
                    {feature}
                  </Badge>
                ))
              ) : (
                <p className="text-xs text-muted-foreground">No extra features listed.</p>
              )}
              {listing.features?.length > 3 && (
                <Badge variant="outline" className="text-xs px-2 py-1">+{listing.features.length - 3} more</Badge>
              )}
            </div>
          </div>
        </CardContent>
        </Link>
        <CardFooter className="p-4 mt-auto border-t">
          <div className="w-full space-y-2">
            {/* Contact Button */}
            <div className="flex gap-2">
              {renderContactButton()}

              {/* Message Button */}
              {user && user.uid !== listing.userId && (
                <Button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    startConversation(listing);
                  }}
                  variant="outline"
                  size="icon"
                  disabled={startingConversation || !isContactable}
                  title="Message Landlord"
                >
                  <MessageCircle className="h-4 w-4" />
                </Button>
              )}
            </div>

          </div>
        </CardFooter>
      </Card>
      <VacancyPaymentModal
        open={showPaymentModal}
        onOpenChange={setShowPaymentModal}
        propertyType={listing.type}
        monthlyRent={listing.price}
        listingStatus={listing.status}
        listingReference={listing.name || listing.location}
        successRedirectUrl={`/payments/vacancy/${listing.id}`}
        onPaymentConfirmed={async () => ({ redirectUrl: `/payments/vacancy/${listing.id}` })}
      />
    </>
  );
}
