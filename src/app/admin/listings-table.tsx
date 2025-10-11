'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, deleteDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useFirestore, useUser } from '@/firebase';
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
import { Badge } from '@/components/ui/badge';
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
import { Trash2, ExternalLink, Search, Loader2, Eye } from 'lucide-react';
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
  const { user } = useUser();

  const getStatusLabel = (status: Listing['status']) => {
    switch (status) {
      case 'pending_approval':
        return 'Pending Approval';
      case 'published':
        return 'Published';
      case 'rented':
        return 'Rented';
      case 'rejected':
        return 'Rejected';
      default:
        return status;
    }
  };

  const statusOptions: Listing['status'][] = ['pending_approval', 'published', 'rented', 'rejected'];

  useEffect(() => {
    fetchListings();
  }, []);

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

  async function fetchListings() {
    try {
      const listingsSnap = await getDocs(collection(db, 'listings'));
      const listingsData = listingsSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Listing[];
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
  }

  async function handleDeleteListing(listing: Listing) {
    setActionLoading(true);
    try {
      await deleteDoc(doc(db, 'listings', listing.id));

      toast({
        title: 'Success',
        description: `Listing deleted successfully`,
      });

      // Refresh listings list
      fetchListings();
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

  async function handleUpdateStatus(listingId: string, newStatus: Listing['status']) {
    setActionLoading(true);
    try {
      await updateDoc(doc(db, 'listings', listingId), {
        status: newStatus,
      });

      toast({
        title: 'Success',
        description: `Listing status updated to ${newStatus}`,
      });

      // Refresh listings list
      fetchListings();
    } catch (error) {
      console.error('Error updating listing:', error);
      toast({
        title: 'Error',
        description: 'Failed to update listing status',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleApproveListing(listing: Listing) {
    setActionLoading(true);
    try {
      const totalUnits = listing.totalUnits ?? 1;
      const availableUnits = listing.availableUnits ?? 0;
      const approvedUnits = availableUnits > 0 ? availableUnits : totalUnits;

      await updateDoc(doc(db, 'listings', listing.id), {
        status: 'published',
        availableUnits: approvedUnits,
        approvedAt: serverTimestamp(),
        approvedBy: user?.email ?? 'system',
        rejectionReason: null,
      });

      toast({
        title: 'Listing published',
        description: `${listing.name || listing.type} is now live on the marketplace.`,
      });

      fetchListings();
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
      listing.rejectionReason || ''
    );

    if (reason === null) {
      return;
    }

    setActionLoading(true);
    try {
      await updateDoc(doc(db, 'listings', listing.id), {
        status: 'rejected',
        rejectionReason: reason.trim() || 'No reason provided',
      });

      toast({
        title: 'Listing rejected',
        description: `${listing.name || listing.type} has been marked as rejected.`,
      });

      fetchListings();
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

  function formatDate(timestamp: any) {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  const pendingListings = listings.filter((listing) => listing.status === 'pending_approval');
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
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Property</TableHead>
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
                      <TableCell>
                        <Badge variant="outline">{listing.type}</Badge>
                      </TableCell>
                      <TableCell>{listing.location}</TableCell>
                      <TableCell>Ksh {listing.price.toLocaleString()}</TableCell>
                      <TableCell>
                        <Select
                          value={listing.status}
                          onValueChange={(value) =>
                            handleUpdateStatus(listing.id, value as Listing['status'])
                          }
                          disabled={actionLoading}
                        >
                          <SelectTrigger className="w-[140px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {statusOptions.map(option => (
                              <SelectItem key={option} value={option}>
                                {getStatusLabel(option)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
