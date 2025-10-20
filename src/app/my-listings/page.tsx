'use client';

// Force dynamic rendering (disable static generation)
export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  deleteDoc,
  updateDoc,
  arrayRemove,
  orderBy,
} from 'firebase/firestore';
import { useFirestore, useUser } from '@/firebase';
import { type Listing } from '@/types';
import { useUserProfile } from '@/hooks/use-user-profile';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';
import { MapPin, PlusCircle, Loader2, Hourglass, CheckCircle2, XCircle, BarChart3, LayoutGrid, Minus, Plus, Building2, ShieldAlert } from 'lucide-react';
import { DeleteListingDialog } from '@/components/delete-listing-dialog';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { AddListingModal } from '@/components/add-listing-modal';
import { getPropertyIcon, getStatusClass } from '@/lib/utils';
import { DefaultPlaceholder } from '@/components/default-placeholder';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LandlordAnalytics } from './analytics';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

function ListingSkeleton() {
  return (
    <Card className="overflow-hidden flex flex-col">
      <Skeleton className="h-56 w-full" />
      <CardHeader className="p-5 flex flex-col flex-grow">
        <div className="flex justify-between">
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="h-5 w-1/4" />
        </div>
        <Skeleton className="h-8 w-1/2 mt-3" />
      </CardHeader>
      <CardFooter className="p-5 mt-auto border-t">
        <Skeleton className="h-10 w-full" />
      </CardFooter>
    </Card>
  );
}


export default function MyListingsPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
  const [updatingUnitsId, setUpdatingUnitsId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const { profile, loading: profileLoading } = useUserProfile();
  const isLandlord = profile?.accountType === 'landlord';

  useEffect(() => {
    if (isUserLoading || profileLoading) {
      return;
    }

    if (!user) {
      router.push('/login');
      return;
    }

    if (!db || !isLandlord) {
      setListings([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const listingsQuery = query(
      collection(db, 'listings'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      listingsQuery,
      querySnapshot => {
        const userListings = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Listing[];
        setListings(userListings);
        setLoading(false);
      },
      error => {
        console.error('Error fetching user listings:', error);
        toast({
          variant: 'destructive',
          title: 'Error fetching listings',
          description: 'Could not load your properties. Please try again.',
        });
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, isUserLoading, profileLoading, db, router, toast, isLandlord]);

  const handleDelete = async (listingId: string) => {
    if (!user || !db) return;
    try {
      await deleteDoc(doc(db, 'listings', listingId));
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        listings: arrayRemove(listingId),
      });

      toast({
        title: 'Listing Deleted',
        description: 'Your property listing has been successfully removed.',
      });
    } catch (error) {
      console.error('Error deleting listing: ', error);
      toast({
        variant: 'destructive',
        title: 'Deletion Failed',
        description: 'Could not delete the listing. Please try again.',
      });
    }
  };

  const handleToggleAvailability = async (listing: Listing) => {
    if (!db) return;

    if (listing.status === 'Available Soon') {
      toast({
        title: 'Pending review',
        description: 'This listing is awaiting admin approval before it can go live.',
      });
      return;
    }

    if (listing.status === 'Occupied') {
      toast({
        variant: 'destructive',
        title: 'Listing rejected',
        description: 'Please update your listing details and contact support for another review.',
      });
      return;
    }

    const isCurrentlyPublished = listing.status === 'Vacant';
    const newStatus: Listing['status'] = isCurrentlyPublished ? 'Occupied' : 'Vacant';
    const total = listing.totalUnits ?? 1;
    const newAvailableUnits = newStatus === 'Vacant' ? Math.max(1, total) : 0;

    setUpdatingStatusId(listing.id);

    try {
      await updateDoc(doc(db, 'listings', listing.id), {
        status: newStatus,
        availableUnits: newAvailableUnits,
      });

      toast({
        title: newStatus === 'Vacant' ? 'Listing published' : 'Listing marked as rented',
        description: newStatus === 'Vacant'
          ? 'Your property is now visible to renters.'
          : 'Your property is no longer visible in search results.',
      });
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        variant: 'destructive',
        title: 'Update failed',
        description: 'Could not update the listing status. Please try again.',
      });
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const handleAdjustUnits = async (listingId: string, adjustment: number) => {
    if (!db) return;

    const listing = listings.find(l => l.id === listingId);
    if (!listing) return;

    if (listing.status === 'Available Soon') {
      toast({
        title: 'Pending review',
        description: 'Units cannot be updated until the listing is approved.',
      });
      return;
    }

    if (listing.status === 'Occupied') {
      toast({
        variant: 'destructive',
        title: 'Listing rejected',
        description: 'Please update the listing and request another review before modifying units.',
      });
      return;
    }

    const totalUnits = listing.totalUnits ?? 1;
    const currentAvailable = listing.availableUnits ?? 0;
    const newAvailable = Math.max(0, Math.min(totalUnits, currentAvailable + adjustment));
    const newStatus: Listing['status'] = newAvailable === 0 ? 'Occupied' : 'Vacant';

    if (newAvailable === currentAvailable && listing.status === newStatus) {
      return;
    }

    setUpdatingUnitsId(listingId);

    try {
      await updateDoc(doc(db, 'listings', listingId), {
        availableUnits: newAvailable,
        status: newStatus,
      });

      toast({
        title: 'Units updated',
        description: `${newAvailable} of ${totalUnits} units now available.`,
      });
    } catch (error) {
      console.error('Error updating units:', error);
      toast({
        variant: 'destructive',
        title: 'Update failed',
        description: 'Could not update available units. Please try again.',
      });
    } finally {
      setUpdatingUnitsId(null);
    }
  };

  const getStatusLabel = (status: Listing['status']) => {
    switch (status) {
      case 'Vacant':
        return 'Vacant';
      case 'Occupied':
        return 'Fully Rented';
      case 'Available Soon':
        return 'Available Soon';
      default:
        return status;
    }
  };

  const getStatusIcon = (status: Listing['status']) => {
    switch (status) {
      case 'Vacant':
        return <CheckCircle2 className="mr-1.5 h-4 w-4" />;
      case 'Occupied':
        return <Building2 className="mr-1.5 h-4 w-4" />;
      case 'Available Soon':
        return <Hourglass className="mr-1.5 h-4 w-4" />;
      default:
        return null;
    }
  };

  if (isUserLoading || profileLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header onPostClick={() => {}} />
        <main className="flex flex-1 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
        <Footer />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (!isLandlord) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header onPostClick={() => {}} />
        <main className="flex-grow max-w-3xl mx-auto py-12 px-4 sm:px-6 lg:px-8 w-full">
          <div className="space-y-6">
            <h1 className="text-3xl font-bold text-foreground">Landlord Verification Required</h1>
            {!profile?.accountType || profile.accountType !== 'landlord' ? (
              <Alert>
                <AlertTitle className="flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4" />
                  Become a Landlord
                </AlertTitle>
                <AlertDescription className="space-y-4">
                  <p>
                    You&apos;re currently registered as a renter. Switch your account to landlord from the profile editor to unlock listing tools.
                  </p>
                  <Button asChild>
                    <Link href="/landlord/payment-schedule">Learn how to list</Link>
                  </Button>
                </AlertDescription>
              </Alert>
            ) : (
              <Alert>
                <AlertTitle className="flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4" />
                  Landlord Tools Locked
                </AlertTitle>
                <AlertDescription>
                  Update your profile to select landlord and start creating property listings.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <>
    <div className="flex flex-col min-h-screen">
      <Header onPostClick={() => setIsModalOpen(true)} />
      <main className="flex-grow max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 w-full">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-foreground">My Listings</h1>
          <Button onClick={() => setIsModalOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add New Listing
          </Button>
        </div>

        <Tabs defaultValue="listings" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="listings">
              <LayoutGrid className="mr-2 h-4 w-4" />
              Listings
            </TabsTrigger>
            <TabsTrigger value="analytics">
              <BarChart3 className="mr-2 h-4 w-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="listings">
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {Array.from({ length: 3 }).map((_, i) => (
                  <ListingSkeleton key={i} />
                ))}
              </div>
            ) : listings.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {listings.map(listing => {
              const totalUnits = listing.totalUnits ?? 1;
              const availableUnits = listing.availableUnits ?? 0;
              const isMultiUnit = totalUnits > 1;
              const isPendingStatus = listing.status === 'Available Soon';
              const isRejectedStatus = listing.status === 'Occupied';
              const canAdjustUnits = !isPendingStatus && !isRejectedStatus;
              const canToggleStatus = ['Vacant', 'Occupied'].includes(listing.status);

              return (
              <Card key={listing.id} className="overflow-hidden flex flex-col h-full">
                <Link href={`/listings/${listing.id}`} className="block">
                  <div className="relative w-full h-56 flex-shrink-0 overflow-hidden bg-muted">
                    {listing.images && listing.images.length > 0 ? (
                      <Image
                        src={listing.images[0]}
                        alt={listing.name || listing.type}
                        fill
                        className="object-cover w-full h-full"
                        unoptimized
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <DefaultPlaceholder type={listing.type} />
                      </div>
                    )}
                    <Badge
                      className={cn(
                        "absolute top-3 right-3 text-sm z-10",
                        getStatusClass(listing.status)
                      )}
                    >
                      {getStatusIcon(listing.status)}
                      {getStatusLabel(listing.status)}
                    </Badge>
                  </div>
                </Link>
                <CardHeader className="flex-grow p-4">
                   {listing.name && (
                    <CardTitle className="text-lg font-semibold truncate">
                      {listing.name}
                    </CardTitle>
                  )}
                  <p className="text-xl font-bold text-foreground">
                    Ksh {listing.price.toLocaleString()}/month
                  </p>
                   <div className="flex items-center justify-between text-sm text-muted-foreground pt-2">
                    <p className="font-semibold flex items-center gap-2">
                      <MapPin className="w-4 h-4" /> {listing.location}
                    </p>
                    <p className="font-semibold flex items-center gap-2">
                      {getPropertyIcon(listing.type)} {listing.type}
                    </p>
                  </div>
                  {listing.status === 'Available Soon' && (
                    <p className="mt-3 flex items-center gap-2 text-sm font-medium text-amber-600">
                      <Hourglass className="h-4 w-4" /> Awaiting admin approval
                    </p>
                  )}
                  {listing.status === 'Occupied' && (
                    <p className="mt-3 flex items-center gap-2 text-sm font-medium text-destructive">
                      <XCircle className="h-4 w-4" /> Listing currently occupied
                    </p>
                  )}
                  {/* Multi-unit indicator */}
                  {listing.totalUnits && listing.totalUnits > 1 && (
                    <div className="mt-3 pt-3 border-t">
                      <Badge variant="secondary" className="gap-1">
                        <Building2 className="h-3 w-3" />
                        {availableUnits} of {totalUnits} units available
                      </Badge>
                    </div>
                  )}
                </CardHeader>
                <CardFooter className="border-t p-4 mt-auto flex flex-col gap-3">
                  {/* Multi-unit controls */}
                  {isMultiUnit ? (
                    <div className="flex items-center justify-between w-full gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAdjustUnits(
                          listing.id,
                          -1
                        )}
                        disabled={
                          updatingUnitsId === listing.id ||
                          availableUnits <= 0 ||
                          !canAdjustUnits
                        }
                      >
                        {updatingUnitsId === listing.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Minus className="h-4 w-4" />
                        )}
                      </Button>
                      <div className="flex-1 text-center">
                        <p className="text-sm font-semibold">
                          {availableUnits} / {totalUnits} available
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {getStatusLabel(listing.status)}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAdjustUnits(
                          listing.id,
                          1
                        )}
                        disabled={
                          updatingUnitsId === listing.id ||
                          availableUnits >= totalUnits ||
                          !canAdjustUnits
                        }
                      >
                        {updatingUnitsId === listing.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Plus className="h-4 w-4" />
                        )}
                      </Button>
                      <DeleteListingDialog onConfirm={() => handleDelete(listing.id)} />
                    </div>
                  ) : (
                    /* Single-unit controls */
                    <div className="flex items-center gap-2 w-full">
                      <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() => handleToggleAvailability(listing)}
                          disabled={
                            updatingStatusId === listing.id ||
                            !canToggleStatus
                          }
                      >
                        {updatingStatusId === listing.id ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : listing.status === 'Vacant' ? (
                          <XCircle className="mr-2 h-4 w-4" />
                        ) : (
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                        )}
                        {listing.status === 'Vacant' ? 'Mark as rented' : 'Mark as available'}
                      </Button>
                      <DeleteListingDialog onConfirm={() => handleDelete(listing.id)} />
                    </div>
                  )}
                </CardFooter>
              </Card>
              );
            })}
          </div>
            ) : (
              <div className="text-center py-20 bg-card rounded-xl border border-dashed">
                <h2 className="text-xl font-semibold text-foreground">
                  You haven&apos;t posted any listings yet.
                </h2>
                <p className="text-muted-foreground mt-2">
                  Click the button below to add your first property!
                </p>
                <Button onClick={() => setIsModalOpen(true)} className="mt-6">
                    <PlusCircle className="mr-2 h-4 w-4" /> Post a Listing
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="analytics">
            <LandlordAnalytics listings={listings} />
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
       {isModalOpen && (
        <AddListingModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </div>
    </>
  );
}
