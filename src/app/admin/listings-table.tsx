'use client';

import { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { type Listing } from '@/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Trash2, Search, Loader2, Eye, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import Link from 'next/link';

export function ListingsManagementTable() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [filteredListings, setFilteredListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const db = useFirestore();
  const { toast } = useToast();

  const fetchListings = useCallback(async () => {
    if (!db) {
      console.warn('ListingsTable: Firestore unavailable.');
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const listingsSnap = await getDocs(collection(db, 'listings'));
      const listingsData = listingsSnap.docs.map((docSnap) => {
        const data = docSnap.data() as Listing;
        return {
          adminListingId: data.adminListingId ?? docSnap.id,
          ...data,
          id: docSnap.id,
        } satisfies Listing;
      });
      setListings(listingsData);
      setFilteredListings(listingsData);
    } catch (error) {
      console.error('Error fetching listings:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch listings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [db, toast]);

  useEffect(() => {
    void fetchListings();
  }, [fetchListings]);

  useEffect(() => {
    let filtered = listings;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (listing) =>
          listing.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          listing.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
          listing.type.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter((listing) => listing.type === typeFilter);
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((listing) => listing.status === statusFilter);
    }

    setFilteredListings(filtered);
  }, [searchTerm, typeFilter, statusFilter, listings]);

  async function handleDeleteListing(listing: Listing) {
    setActionLoading(true);
    try {
      if (!db) {
        throw new Error('Firestore not available');
      }

      await deleteDoc(doc(db, 'listings', listing.id));

      toast({
        title: 'Success',
        description: `Listing deleted successfully`,
      });

      // Refresh listings list
      await fetchListings();
    } catch (error) {
      console.error('Error deleting listing:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete listing',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
      setDeleteDialogOpen(false);
      setSelectedListing(null);
    }
  }

  async function handleApproveListing(listing: Listing) {
    setActionLoading(true);
    try {
      if (!db) {
        throw new Error('Firestore not available');
      }

      await updateDoc(doc(db, 'listings', listing.id), {
        approvalStatus: 'approved',
        adminFeedback: null,
        paymentStatus: 'paid',
        visibilityStatus: 'visible',
      });

      toast({
        title: 'Listing approved',
        description: `${listing.name || listing.type} is now visible to renters.`,
      });

      await fetchListings();
    } catch (error) {
      console.error('Error approving listing:', error);
      toast({
        title: 'Approval failed',
        description: 'Could not publish listing. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRejectListing(listing: Listing) {
    const reason = window.prompt(
      'Provide a rejection reason for this listing:',
      listing.adminFeedback || ''
    );

    if (reason === null) {
      return;
    }

    setActionLoading(true);
    try {
      if (!db) {
        throw new Error('Firestore not available');
      }

      await updateDoc(doc(db, 'listings', listing.id), {
        status: 'rejected',
        rejectionReason: reason.trim() || 'No reason provided',
      });

      toast({
        title: 'Listing rejected',
        description: `${listing.name || listing.type} has been marked as rejected.`,
      });

      await fetchListings();
    } catch (error) {
      console.error('Error rejecting listing:', error);
      toast({
        title: 'Rejection failed',
        description: 'Could not reject listing. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  }

  function formatDate(timestamp: Listing['createdAt'] | Date | undefined | null) {
    if (!timestamp) return 'N/A';
    if (timestamp instanceof Date) {
      return timestamp.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    }
    if ('toDate' in timestamp && typeof timestamp.toDate === 'function') {
      return timestamp
        .toDate()
        .toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    }
    return 'N/A';
  }

  const pendingListings = listings.filter((listing) => listing.approvalStatus === 'pending');
  const uniqueTypes = Array.from(new Set(listings.map((l) => l.type)));

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Listings Management</CardTitle>
          <CardDescription>Loading listings...</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {pendingListings.length > 0 && (
        <Card className="mb-6 border-amber-200 bg-amber-50/40">
          <CardHeader>
            <CardTitle className="text-amber-800">Pending Listing Approvals</CardTitle>
            <CardDescription>Review and approve new listings submitted by landlords</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {pendingListings.map((listing) => (
              <div
                key={listing.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-lg border border-amber-200 bg-white p-4"
              >
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-amber-900">
                    {listing.name || `${listing.type} in ${listing.location}`}
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-mono">{listing.adminListingId ?? listing.id}</span>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(listing.adminListingId ?? listing.id);
                            toast({
                              title: 'Copied!',
                              description: 'Property ID copied to clipboard.',
                            });
                          } catch {
                            toast({
                              title: 'Copy failed',
                              description: 'Could not copy property ID. Try again.',
                              variant: 'destructive',
                            });
                          }
                        }}
                        className="inline-flex items-center gap-1 text-primary hover:underline"
                      >
                        <Copy className="h-3 w-3" />
                        Copy ID
                      </button>
                    </div>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Submitted on {formatDate(listing.createdAt)} · Ksh {listing.price.toLocaleString()} / month
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => handleRejectListing(listing)}
                    disabled={actionLoading}
                  >
                    Reject
                  </Button>
                  <Button
                    onClick={() => handleApproveListing(listing)}
                    disabled={actionLoading}
                  >
                    Publish
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Listings Management</CardTitle>
          <CardDescription>Manage property listings across the platform</CardDescription>
          <div className="flex flex-col sm:flex-row gap-4 mt-4">
            <div className="flex items-center gap-2 flex-1">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search listings..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {uniqueTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending_approval">Pending Approval</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="rented">Rented</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="md:hidden space-y-4">
            {filteredListings.length === 0 ? (
              <div className="rounded-lg border border-dashed bg-muted/20 p-4 text-center text-sm text-muted-foreground">
                No listings found
              </div>
            ) : (
              filteredListings.map((listing) => (
                <div key={listing.id} className="rounded-lg border bg-card/40 p-4 space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-base font-semibold text-foreground">
                        {listing.name || `${listing.type} in ${listing.location}`}
                      </p>
                      <p className="text-xs text-muted-foreground">{formatDate(listing.createdAt)}</p>
                    </div>
                    <span
                      className={cn(
                        'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold',
                        listing.visibilityStatus === 'visible'
                          ? 'bg-secondary text-secondary-foreground'
                          : 'text-foreground'
                      )}
                    >
                      {listing.status}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">{listing.location}</span>
                    <span className="text-xs uppercase tracking-wide text-muted-foreground/80">{listing.type}</span>
                    <span className="font-semibold text-foreground">
                      Ksh {listing.price.toLocaleString()}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-mono break-all">
                      {listing.adminListingId ?? listing.id}
                    </span>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(listing.adminListingId ?? listing.id);
                          toast({ title: 'Copied!', description: 'Property ID copied to clipboard.' });
                        } catch {
                          toast({ title: 'Copy failed', description: 'Try again.', variant: 'destructive' });
                        }
                      }}
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                    >
                      <Copy className="h-3 w-3" />
                      Copy ID
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/listings/${listing.id}`} target="_blank">
                        <Eye className="mr-1 h-3 w-3" />
                        View
                      </Link>
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        setSelectedListing(listing);
                        setDeleteDialogOpen(true);
                      }}
                      disabled={actionLoading}
                    >
                      <Trash2 className="mr-1 h-3 w-3" />
                      Delete
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="hidden md:block rounded-md border overflow-x-auto">
            <Table className="min-w-[720px] text-sm">
              <TableHeader>
                <TableRow>
                  <TableHead>Property</TableHead>
                  <TableHead>Admin ID</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Posted</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredListings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      No listings found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredListings.map((listing) => (
                    <TableRow key={listing.id}>
                      <TableCell className="font-medium">
                        {listing.name || `${listing.type} in ${listing.location}`}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <span className="font-mono">{listing.adminListingId ?? listing.id}</span>
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                await navigator.clipboard.writeText(listing.adminListingId ?? listing.id);
                                toast({ title: 'Copied!', description: 'Property ID copied to clipboard.' });
                              } catch {
                                toast({ title: 'Copy failed', description: 'Try again.', variant: 'destructive' });
                              }
                            }}
                            className="inline-flex items-center gap-1 text-primary hover:underline"
                          >
                            <Copy className="h-3 w-3" />
                            Copy
                          </button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium text-muted-foreground">
                          {listing.type}
                        </span>
                      </TableCell>
                      <TableCell>{listing.location}</TableCell>
                      <TableCell>Ksh {listing.price.toLocaleString()}</TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold',
                            listing.visibilityStatus === 'visible'
                              ? 'bg-secondary text-secondary-foreground'
                              : 'text-foreground'
                          )}
                        >
                          {listing.status}
                        </span>
                      </TableCell>
                      <TableCell>{formatDate(listing.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/listings/${listing.id}`} target="_blank">
                              <Eye className="mr-1 h-3 w-3" />
                              View
                            </Link>
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                              setSelectedListing(listing);
                              setDeleteDialogOpen(true);
                            }}
                            disabled={actionLoading}
                          >
                            <Trash2 className="mr-1 h-3 w-3" />
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <div className="mt-4 text-sm text-muted-foreground">
            Showing {filteredListings.length} of {listings.length} listings
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Listing?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the listing{' '}
              <strong>{selectedListing?.name || selectedListing?.type}</strong> in{' '}
              {selectedListing?.location}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedListing && handleDeleteListing(selectedListing)}
              disabled={actionLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {actionLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Listing'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
