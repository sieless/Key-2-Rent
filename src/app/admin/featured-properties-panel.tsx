'use client';

import { useEffect, useState } from 'react';
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  type Firestore,
} from 'firebase/firestore';
import { useAuth, useFirestore } from '@/firebase';
import type { FeaturedDisplayMode, FeaturedProperty, Listing } from '@/types';
import {
  FEATURED_DEFAULT_DURATION_DAYS,
  FEATURED_PROPERTIES_COLLECTION,
  FEATURED_BILLING_RATE,
  createFeaturedProperty,
  removeFeaturedProperty,
  renewFeaturedProperty,
  updateFeaturedProperty,
} from '@/lib/featured-properties';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeftRight, Loader2, Plus, RefreshCw, Trash2, Copy } from 'lucide-react';
import Link from 'next/link';

type FeaturedRow = {
  record: FeaturedProperty;
  listing: Listing | null;
};

const daysRemaining = (record: FeaturedProperty) => {
  const endMillis = record.endDate?.toMillis?.();
  if (!endMillis) return 0;
  const diff = endMillis - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
};

const isExpired = (record: FeaturedProperty) => daysRemaining(record) === 0 || record.status === 'expired';

type FirestoreListing = Omit<Listing, 'id'>;

async function loadListing(db: Firestore | null, listingId: string) {
  if (!db) return null;
  const listingRef = doc(db, 'listings', listingId);
  const snapshot = await getDoc(listingRef);
  if (!snapshot.exists()) return null;
  const data = snapshot.data() as FirestoreListing;
  return { id: snapshot.id, ...data };
}

export function FeaturedPropertiesAdminPanel() {
  const db = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();

  const [rows, setRows] = useState<FeaturedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [replaceOpen, setReplaceOpen] = useState(false);
  const [targetId, setTargetId] = useState<string | null>(null);
  const [listingIdInput, setListingIdInput] = useState('');
  const [agreementChecked, setAgreementChecked] = useState(false);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [monthlyCharge, setMonthlyCharge] = useState<number | null>(null);
  const [displayMode, setDisplayMode] = useState<FeaturedDisplayMode>('single');
  const [modeUpdating, setModeUpdating] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [showRemove, setShowRemove] = useState(false);

  useEffect(() => {
    if (addOpen) {
      setListingIdInput('');
      setAgreementChecked(false);
      setSelectedListing(null);
      setMonthlyCharge(null);
    }
  }, [addOpen]);

  useEffect(() => {
    if (!replaceOpen) {
      setTargetId(null);
      setListingIdInput('');
      setAgreementChecked(false);
      setSelectedListing(null);
      setMonthlyCharge(null);
    }
  }, [replaceOpen]);

  useEffect(() => {
    if (!db) {
      return;
    }

    const featuredRef = collection(db, FEATURED_PROPERTIES_COLLECTION);
    const featuredQuery = query(featuredRef, orderBy('startDate', 'asc'));

    const unsubscribe = onSnapshot(featuredQuery, async snapshot => {
      setLoading(true);
      const docs = snapshot.docs.map(docSnap => ({
        record: { ...(docSnap.data() as FeaturedProperty), id: docSnap.id },
        listing: null,
      }));

      const hydrated = await Promise.all(
        docs.map(async entry => ({
          ...entry,
          listing: await loadListing(db, entry.record.listingId),
        })),
      );

      setRows(hydrated);
      if (hydrated.length > 0) {
        setDisplayMode(hydrated[0].record.displayMode ?? 'single');
      }
      setLoading(false);
    });

    return unsubscribe;
  }, [db]);

  const computeMonthlyCharge = (listing: Listing | null) => {
    if (!listing?.price) return null;
    return Math.round(listing.price * FEATURED_BILLING_RATE);
  };

  const lookupListing = async (id: string) => {
    if (!db || !id.trim()) return null;
    try {
      const ref = doc(db, 'listings', id.trim());
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        return null;
      }
      const data = snap.data() as Listing;
      return { ...data, id: snap.id } satisfies Listing;
    } catch (error) {
      console.error('Failed to load listing for featured program', error);
      return null;
    }
  };

  const handlePreviewListing = async (id: string) => {
    if (!db) return;
    const listing = await lookupListing(id);
    setSelectedListing(listing);
    setMonthlyCharge(computeMonthlyCharge(listing));
    if (!listing) {
      toast({
        title: 'Listing not found',
        description: 'Ensure the listing ID is correct before featuring.',
        variant: 'destructive',
      });
    }
  };

  const handleAdd = async () => {
    if (!db || !auth?.currentUser?.email) return;
    if (!listingIdInput.trim()) {
      toast({ title: 'Listing ID required', variant: 'destructive' });
      return;
    }

    const listing = selectedListing ?? (await lookupListing(listingIdInput));
    if (!listing) {
      toast({
        title: 'Listing not found',
        description: 'Provide a valid listing ID before featuring.',
        variant: 'destructive',
      });
      return;
    }

    if (!listing.price || listing.price <= 0) {
      toast({
        title: 'Missing rent amount',
        description: 'Featured listings require a monthly rent to calculate the 25% charge.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setActionLoading(true);
      await createFeaturedProperty(db, {
        listingId: listingIdInput.trim(),
        featuredBy: auth.currentUser.email,
        displayMode,
        agreementVerified: agreementChecked,
        durationDays: FEATURED_DEFAULT_DURATION_DAYS,
        monthlyRent: listing.price,
      });
      toast({ title: 'Featured property added' });
      setListingIdInput('');
      setAgreementChecked(false);
      setSelectedListing(null);
      setMonthlyCharge(null);
      setAddOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to add featured property.';
      toast({ title: 'Failed to add', description: message, variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRenew = async (id: string) => {
    if (!db) return;
    try {
      setActionLoading(true);
      await renewFeaturedProperty(db, id, FEATURED_DEFAULT_DURATION_DAYS);
      toast({ title: 'Featured property renewed' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to renew featured property.';
      toast({ title: 'Failed to renew', description: message, variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  const openReplaceDialog = (id: string) => {
    setTargetId(id);
    const current = rows.find(row => row.record.id === id);
    setListingIdInput(current?.record.listingId ?? '');
    setAgreementChecked(false);
    setSelectedListing(current?.listing ?? null);
    setMonthlyCharge(computeMonthlyCharge(current?.listing ?? null));
    setReplaceOpen(true);
  };

  const handleReplace = async () => {
    if (!db || !auth?.currentUser?.email || !targetId) return;
    if (!listingIdInput.trim()) {
      toast({ title: 'Listing ID required', variant: 'destructive' });
      return;
    }

    const listing = selectedListing ?? (await lookupListing(listingIdInput));
    if (!listing) {
      toast({
        title: 'Listing not found',
        description: 'Provide a valid listing ID before updating.',
        variant: 'destructive',
      });
      return;
    }

    if (!listing.price || listing.price <= 0) {
      toast({
        title: 'Missing rent amount',
        description: 'Featured listings require a monthly rent to calculate the 25% charge.',
        variant: 'destructive',
      });
      return;
    }
    try {
      setActionLoading(true);
      await updateFeaturedProperty(db, targetId, {
        listingId: listingIdInput.trim(),
        agreementVerified: agreementChecked,
        featuredBy: auth.currentUser.email,
        displayMode,
        durationDays: FEATURED_DEFAULT_DURATION_DAYS,
        monthlyRent: listing.price,
      });
      toast({ title: 'Featured property updated' });
      setReplaceOpen(false);
      setTargetId(null);
      setListingIdInput('');
      setAgreementChecked(false);
      setSelectedListing(null);
      setMonthlyCharge(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to update featured property.';
      toast({ title: 'Update failed', description: message, variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  const confirmRemove = (id: string) => {
    setTargetId(id);
    setShowRemove(true);
  };

  const handleRemove = async () => {
    if (!db || !targetId) return;
    try {
      setActionLoading(true);
      await removeFeaturedProperty(db, targetId);
      toast({ title: 'Featured property removed' });
      setShowRemove(false);
      setTargetId(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to remove featured property.';
      toast({ title: 'Removal failed', description: message, variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDisplayModeChange = async (mode: FeaturedDisplayMode) => {
    if (!db) return;
    setDisplayMode(mode);
    if (rows.length === 0) return;

    try {
      setModeUpdating(true);
      await Promise.all(
        rows.map(row =>
          updateDoc(doc(db, FEATURED_PROPERTIES_COLLECTION, row.record.id), {
            displayMode: mode,
            updatedAt: serverTimestamp(),
          }),
        ),
      );
      toast({ title: 'Display mode updated' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to update display mode.';
      toast({ title: 'Update failed', description: message, variant: 'destructive' });
    } finally {
      setModeUpdating(false);
    }
  };

  const disableActions = !agreementChecked || actionLoading || monthlyCharge === null;

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle>Featured Properties</CardTitle>
          <CardDescription>Manage premium billboard listings independent of the public feed.</CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Select value={displayMode} onValueChange={value => handleDisplayModeChange(value as FeaturedDisplayMode)}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Select display mode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="single">Mode A – Single spotlight</SelectItem>
              <SelectItem value="double">Mode B – Dual showcase</SelectItem>
            </SelectContent>
          </Select>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> Add Featured Property
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add to Featured Billboard</DialogTitle>
                <DialogDescription>
                  Promote a listing for {FEATURED_DEFAULT_DURATION_DAYS} days. Agreement verification is required before publishing.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label htmlFor="listing-id" className="text-sm font-medium text-foreground">
                    Listing ID
                  </label>
                  <div className="flex gap-2">
                    <Input
                      id="listing-id"
                      placeholder="Enter listing document ID"
                      value={listingIdInput}
                      onChange={event => {
                        setListingIdInput(event.target.value);
                        setSelectedListing(null);
                        setMonthlyCharge(null);
                      }}
                      onBlur={event => handlePreviewListing(event.target.value)}
                    />
                    <Button type="button" variant="secondary" onClick={() => handlePreviewListing(listingIdInput)}>
                      Preview
                    </Button>
                  </div>
                  {selectedListing ? (
                    <div className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground space-y-1">
                      <p className="font-medium text-foreground">{selectedListing.name ?? selectedListing.type}</p>
                      <p>
                        Monthly rent: <strong>KES {selectedListing.price.toLocaleString()}</strong>
                      </p>
                      {monthlyCharge !== null && (
                        <div className="rounded-md bg-primary/5 p-2 text-primary text-xs font-medium">
                          Featured billing (25%): KES {monthlyCharge.toLocaleString()} every 30 days
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Enter a listing ID and click preview to verify rent & billing amount.
                    </p>
                  )}
                </div>
                <div className="flex items-start gap-3 rounded-md border p-3">
                  <Checkbox
                    id="agreement"
                    checked={agreementChecked}
                    onCheckedChange={checked => setAgreementChecked(Boolean(checked))}
                  />
                  <label htmlFor="agreement" className="text-sm text-muted-foreground">
                    I confirm that the advertising agreement for this property has been reviewed and verified.
                  </label>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleAdd} disabled={disableActions}>
                  {actionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                  Feature Listing
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {modeUpdating && (
          <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Updating display mode across featured items...
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-md border border-dashed bg-muted/40 p-8 text-center text-sm text-muted-foreground">
            No featured properties yet. Use the button above to promote a listing.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Listing</TableHead>
                  <TableHead>Featured By</TableHead>
                  <TableHead>Start</TableHead>
                  <TableHead>End</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expires In</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(({ record, listing }) => {
                  const expired = isExpired(record);
                  const days = daysRemaining(record);
                  return (
                    <TableRow key={record.id} className={expired ? 'opacity-70' : ''}>
                      <TableCell className="max-w-xs">
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground">
                            {listing?.name || listing?.type || 'Unknown listing'}
                          </span>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>ID: {record.listingId}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2"
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(record.listingId);
                              toast({ title: 'Copied!', description: 'Property ID copied to clipboard.' });
                            } catch (error) {
                              toast({
                                title: 'Copy failed',
                                description: 'Could not copy property ID. Try again.',
                                variant: 'destructive',
                              });
                            }
                          }}
                        >
                          <Copy className="h-3.5 w-3.5" />
                          Copy ID
                        </Button>
                      </div>
                      {record.monthlyCharge ? (
                        <span className="mt-2 text-xs text-muted-foreground">
                          Billing: KES {record.monthlyCharge.toLocaleString()} / 30 days
                        </span>
                      ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{record.featuredBy}</TableCell>
                      <TableCell>{record.startDate?.toDate?.().toLocaleDateString?.() ?? '—'}</TableCell>
                      <TableCell>{record.endDate?.toDate?.().toLocaleDateString?.() ?? '—'}</TableCell>
                      <TableCell>
                        <Badge variant={expired ? 'outline' : 'default'} className={expired ? 'bg-muted text-muted-foreground' : ''}>
                          {expired ? 'Expired' : 'Active'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <span>{expired ? 'Expired' : `${days} day${days === 1 ? '' : 's'}`}</span>
                          {record.billingEnd && (
                            <span className="block text-xs text-muted-foreground">
                              Billing ends {record.billingEnd.toDate().toLocaleDateString?.()}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="space-y-2 text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => handleRenew(record.id)} disabled={actionLoading || expired}>
                            <RefreshCw className="mr-2 h-4 w-4" /> Renew
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => openReplaceDialog(record.id)} disabled={actionLoading}>
                            <ArrowLeftRight className="mr-2 h-4 w-4" /> Replace
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => confirmRemove(record.id)} disabled={actionLoading}>
                            <Trash2 className="mr-2 h-4 w-4" /> Remove
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <Dialog open={replaceOpen} onOpenChange={setReplaceOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Replace featured listing</DialogTitle>
            <DialogDescription>
              Swap the billboard content with a different listing. The new listing will run for {FEATURED_DEFAULT_DURATION_DAYS} days.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="replace-listing" className="text-sm font-medium text-foreground">
                Listing ID
              </label>
              <div className="flex gap-2">
                <Input
                  id="replace-listing"
                  value={listingIdInput}
                  onChange={event => {
                    setListingIdInput(event.target.value);
                    setSelectedListing(null);
                    setMonthlyCharge(null);
                  }}
                  onBlur={event => handlePreviewListing(event.target.value)}
                />
                <Button type="button" variant="secondary" onClick={() => handlePreviewListing(listingIdInput)}>
                  Preview
                </Button>
              </div>
              {selectedListing && (
                <div className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground space-y-1">
                  <p className="font-medium text-foreground">{selectedListing.name ?? selectedListing.type}</p>
                  <p>
                    Monthly rent: <strong>KES {selectedListing.price.toLocaleString()}</strong>
                  </p>
                  {monthlyCharge !== null && (
                    <div className="rounded-md bg-primary/5 p-2 text-primary text-xs font-medium">
                      Featured billing (25%): KES {monthlyCharge.toLocaleString()} every 30 days
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-start gap-3 rounded-md border p-3">
              <Checkbox
                id="replace-agreement"
                checked={agreementChecked}
                onCheckedChange={checked => setAgreementChecked(Boolean(checked))}
              />
              <label htmlFor="replace-agreement" className="text-sm text-muted-foreground">
                Agreement verified for the replacement listing.
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleReplace} disabled={disableActions || !targetId}>
              {actionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowLeftRight className="mr-2 h-4 w-4" />}
              Replace Listing
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showRemove} onOpenChange={setShowRemove}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove featured property?</AlertDialogTitle>
            <AlertDialogDescription>
              This property will be removed from the premium billboard immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemove} disabled={actionLoading}>
              {actionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
