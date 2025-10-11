'use client';

import { useState, type ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Phone, Hourglass, MapPin, Lock, Star, Zap, Heart, Building2, MessageCircle, CheckCircle2, XCircle } from "lucide-react";
import { type Listing } from "@/types";
import { cn, getPropertyIcon, getStatusClass } from "@/lib/utils";
import { DefaultPlaceholder } from "./default-placeholder";
import { useFeatureEnabled, usePlatformSettings } from "@/hooks/use-platform-settings";
import { useListingFavorite } from "@/hooks/use-favorites";
import { usePaymentStatus } from "@/hooks/use-payment-status";
import { PaymentModal } from "@/components/payment-modal";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/firebase";
import { useRouter } from "next/navigation";
import { useStartConversation } from "@/hooks/use-start-conversation";


type ListingCardProps = {
  listing: Listing;
  isSubscribed: boolean;
};


export function ListingCard({ listing }: ListingCardProps) {
  const hasImages = listing.images && listing.images.length > 0;
  const contactPaymentEnabled = useFeatureEnabled('contact');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const { isFavorited, toggle: toggleFavorite } = useListingFavorite(listing.id);
  const { toast } = useToast();
  const { user } = useUser();
  const router = useRouter();
  const paymentStatus = usePaymentStatus();
  const { startConversation, loading: startingConversation } = useStartConversation();

  const statusLabelMap: Record<Listing['status'], string> = {
    pending_approval: 'Coming Soon',
    published: 'Available',
    rented: 'Rented Out',
    rejected: 'Unavailable',
  };

  const statusIconMap: Record<Listing['status'], ReactNode> = {
    pending_approval: <Hourglass className="mr-1.5 h-4 w-4" />,
    published: <CheckCircle2 className="mr-1.5 h-4 w-4" />,
    rented: <Building2 className="mr-1.5 h-4 w-4" />,
    rejected: <XCircle className="mr-1.5 h-4 w-4" />,
  };

  const statusLabel = statusLabelMap[listing.status] ?? 'Unavailable';
  const statusIcon = statusIconMap[listing.status];
  const isContactable = listing.status === 'published';

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

    if (!isContactable) {
      toast({
        title: 'Listing unavailable',
        description: 'This property is not currently accepting inquiries.',
        variant: 'destructive',
      });
      return;
    }

    // Check if user is logged in
    if (!user) {
      toast({
        title: 'Sign in required',
        description: 'Please sign in to view contact information',
        variant: 'destructive',
      });
      router.push('/signup');
      return;
    }

    // If contact payment is enabled, check payment status
    if (contactPaymentEnabled) {
      if (paymentStatus.canViewContacts && !paymentStatus.needsRenewal) {
        // User has active subscription, show contact directly
        window.location.href = `tel:${listing.contact}`;
      } else {
        // User needs to pay or renew
        setShowPaymentModal(true);
      }
    } else {
      // Free mode, show contact directly
      window.location.href = `tel:${listing.contact}`;
    }
  };

  const handlePaymentSuccess = () => {
    toast({
      title: 'Payment successful!',
      description: 'You can now view all landlord contacts for 30 days',
    });
    setShowPaymentModal(false);
    // Refresh payment status
    window.location.reload();
  };

  const renderContactButton = () => {
    if (!isContactable) {
      return (
        <Button disabled className="flex-1" variant="outline">
          <Lock className="mr-2 h-4 w-4" />
          {statusLabel}
        </Button>
      );
    }

    if (contactPaymentEnabled) {
      if (paymentStatus.loading) {
        return (
          <Button disabled className="flex-1">
            <Phone className="mr-2 h-4 w-4 animate-pulse" />
            Loading...
          </Button>
        );
      }

      if (paymentStatus.canViewContacts && !paymentStatus.needsRenewal) {
        return (
          <Button
            onClick={handleContactClick}
            variant="secondary"
            className="flex-1 text-lg font-semibold text-green-600 hover:text-green-700"
          >
            <Phone className="mr-2 h-4 w-4" />
            {user ? listing.contact : 'Sign in to view'}
          </Button>
        );
      }

      return (
        <Button
          onClick={handleContactClick}
          className="flex-1"
          variant="default"
        >
          <Lock className="mr-2 h-4 w-4" />
          {user ? 'Unlock Contact - KES 100' : 'Sign in to view'}
        </Button>
      );
    }

    return (
      <Button
        onClick={handleContactClick}
        variant="secondary"
        className="flex-1 text-lg font-semibold text-green-600 hover:text-green-700"
      >
        <Phone className="mr-2 h-4 w-4" />
        {user ? listing.contact : 'Sign in to view contact'}
      </Button>
    );
  };

  return (
    <Card className="overflow-hidden group transform hover:-translate-y-1 transition-all duration-300 hover:shadow-xl flex flex-col h-full">
      <Link href={`/listings/${listing.id}`} className="flex flex-col h-full">
        <div className="relative w-full h-56 flex-shrink-0 overflow-hidden bg-muted rounded-t-lg">
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
              {statusLabel}
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
        <CardContent className="p-5 flex flex-col flex-grow">
          <div className="flex items-center justify-between mb-3 text-sm text-muted-foreground">
            <p className="font-semibold flex items-center gap-2">
              <MapPin className="w-4 h-4" /> {listing.location}
            </p>
            <p className="font-semibold flex items-center gap-2">
              {getPropertyIcon(listing.type)} {listing.type}
            </p>
          </div>
           {listing.name && (
            <h3 className="text-xl font-bold text-foreground leading-tight truncate mb-1">
              {listing.name}
            </h3>
          )}
          <h3 className="text-2xl font-bold text-foreground leading-tight">
            Ksh {listing.price?.toLocaleString() || "0"}
            <span className="text-base font-normal text-muted-foreground">/month</span>
          </h3>
          <div className="mt-4 border-t pt-4 flex-grow">
            <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">
              Features
            </p>
            <div className="flex flex-wrap gap-2">
              {listing.features?.length > 0 ? (
                listing.features.slice(0, 3).map((feature) => ( // Show max 3 features
                  <Badge key={feature} variant="secondary" className="font-normal">
                    {feature}
                  </Badge>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No extra features listed.</p>
              )}
              {listing.features?.length > 3 && (
                <Badge variant="outline">+{listing.features.length - 3} more</Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Link>
      <CardFooter className="p-5 mt-auto border-t">
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

          {/* M-Pesa Payment Modal */}
          <PaymentModal
            open={showPaymentModal}
            onOpenChange={setShowPaymentModal}
            amount={100}
            type="CONTACT_ACCESS"
            onSuccess={handlePaymentSuccess}
            title="Unlock Contact Access"
            description="Get unlimited access to all landlord contacts for 30 days"
          />
        </div>
      </CardFooter>
    </Card>
  );
}
