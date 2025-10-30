"use client";

import { useCallback, useEffect, useState } from "react";
import { collection, getDoc, getDocs, orderBy, query, updateDoc, doc, Timestamp, type DocumentData } from "firebase/firestore";
import { useFirestore } from "@/firebase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Check, X, RotateCw, Loader2 } from "lucide-react";
import Image from "next/image";

type VacantPaymentRecord = {
  id: string;
  listingId: string;
  userId: string;
  amount: number;
  paymentStatus?: "pending" | "paid" | "verified" | "rejected";
  confirmationText?: string | null;
  proofUploadUrl?: string | null;
  visibilityStatus?: "hidden" | "visible";
  listingName?: string;
  name?: string;
  landlordName?: string;
  type?: string;
  location?: string;
  price?: number;
  amountDue?: number | null;
  createdAt?: Timestamp | Date | null;
  status?: string;
};

const getCreatedAtDate = (value: VacantPaymentRecord["createdAt"]) => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (value instanceof Timestamp) return value.toDate();
  return null;
};

const formatCreatedAt = (value: VacantPaymentRecord["createdAt"]) => {
  const date = getCreatedAtDate(value);
  return date ? date.toLocaleString() : null;
};

export function VacantPaymentsPanel() {
  const db = useFirestore();
  const { toast } = useToast();
  const [records, setRecords] = useState<VacantPaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);

  const resolveLandlordNames = useCallback(async (items: VacantPaymentRecord[]) => {
    if (!db || items.length === 0) {
      return items;
    }

    const uniqueIds = Array.from(
      new Set(
        items
          .map((item) => item.userId)
          .filter((userId): userId is string => Boolean(userId))
      )
    );

    if (uniqueIds.length === 0) {
      return items;
    }

    const landlordMap = new Map<string, string>();

    await Promise.all(
      uniqueIds.map(async (userId) => {
        try {
          const userSnap = await getDoc(doc(db, "users", userId));
          if (!userSnap.exists()) {
            return;
          }

          const data = userSnap.data() as Record<string, unknown>;
          const displayName =
            (typeof data.fullName === "string" && data.fullName.trim()) ||
            (typeof data.name === "string" && data.name.trim()) ||
            (typeof data.displayName === "string" && data.displayName.trim()) ||
            (typeof data.email === "string" && data.email.trim()) ||
            userId;

          landlordMap.set(userId, displayName);
        } catch (error) {
          console.error(`Failed to resolve landlord name for ${userId}`, error);
        }
      })
    );

    return items.map((item) => {
      if (item.landlordName && item.landlordName !== "Unknown" && item.landlordName !== "Unknown landlord") {
        return item;
      }

      const resolvedName = item.userId ? landlordMap.get(item.userId) : undefined;

      return {
        ...item,
        landlordName: resolvedName ?? item.landlordName ?? "Unknown landlord",
      };
    });
  }, [db]);

  useEffect(() => {
    if (!db) return;

    async function loadRecords() {
      setLoading(true);
      try {
        if (!db) {
          throw new Error('Firestore not available');
        }

        const q = query(collection(db, "listings"), orderBy("createdAt", "desc"));
        const snap = await getDocs(q);
        const data = snap.docs
          .map((docSnap) => {
            const raw = docSnap.data() as Record<string, unknown>;
            const amount = typeof raw.amount === 'number' ? raw.amount : 0;
            const amountDue = typeof raw.amountDue === 'number' ? raw.amountDue : null;

            return {
              id: docSnap.id,
              listingId: docSnap.id,
              userId: typeof raw.userId === 'string' ? raw.userId : '',
              amount,
              paymentStatus: raw.paymentStatus as VacantPaymentRecord['paymentStatus'],
              confirmationText: (raw.confirmationText as string | null) ?? null,
              proofUploadUrl: (raw.proofUploadUrl as string | null) ?? null,
              visibilityStatus: raw.visibilityStatus as VacantPaymentRecord['visibilityStatus'],
              listingName: raw.listingName as string | undefined,
              name: raw.name as string | undefined,
              landlordName: raw.landlordName as string | undefined,
              type: raw.type as string | undefined,
              location: raw.location as string | undefined,
              price: typeof raw.price === 'number' ? raw.price : undefined,
              amountDue,
              createdAt: raw.createdAt as Timestamp | Date | null | undefined,
              status: raw.status as string | undefined,
            } satisfies VacantPaymentRecord;
          })
          .filter((item) => item.status === "Vacant" && typeof item.amountDue === 'number');
        const withLandlords = await resolveLandlordNames(data);
        setRecords(withLandlords);
      } catch (error) {
        console.error("Failed to load vacant payments", error);
        toast({ title: "Fetch failed", description: "Could not load vacant payment records", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    }

    loadRecords();
  }, [db, toast, resolveLandlordNames]);

  const updateListing = async (
    listingId: string,
    updates: Partial<VacantPaymentRecord> & { visibilityStatus?: "hidden" | "visible" }
  ) => {
    if (!db) return;
    setActionId(listingId);
    try {
      if (!db) {
        throw new Error('Firestore not available');
      }

      await updateDoc(doc(db, "listings", listingId), updates as DocumentData);
      setRecords((prev) => prev.map((item) => (item.id === listingId ? { ...item, ...updates } : item)));
      toast({ title: "Update saved" });
    } catch (error) {
      console.error("Failed to update listing", error);
      toast({ title: "Update failed", description: "Try again later", variant: "destructive" });
    } finally {
      setActionId(null);
    }
  };

  const actionButtons = (record: VacantPaymentRecord) => {
    const disabled = actionId === record.id;

    return (
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={disabled}
          onClick={() =>
            updateListing(record.id, {
              paymentStatus: "paid",
              visibilityStatus: "visible",
            })
          }
        >
          {disabled ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Verify
        </Button>
        <Button
          size="sm"
          variant="destructive"
          disabled={disabled}
          onClick={() =>
            updateListing(record.id, {
              paymentStatus: "rejected",
              visibilityStatus: "hidden",
            })
          }
        >
          <X className="h-4 w-4" /> Reject
        </Button>
        <Button
          size="sm"
          variant="secondary"
          disabled={disabled}
          onClick={() =>
            updateListing(record.id, {
              paymentStatus: "pending",
              visibilityStatus: "hidden",
            })
          }
        >
          <RotateCw className="h-4 w-4" /> Refund
        </Button>
      </div>
    );
  };

  const statusBadge = (status?: string) => {
    switch (status) {
      case "paid":
      case "verified":
        return <Badge className="bg-green-600 text-white">Paid</Badge>;
      case "pending":
        return <Badge className="bg-amber-500 text-white">Pending</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vacant Listing Payments</CardTitle>
        <CardDescription>
          Review M-Pesa confirmations, verify screenshots, and manage listing visibility. Refund returns access to pending, hides contacts, and signals tenants to upload a new proof.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="md:hidden space-y-4">
          {loading ? (
            <div className="rounded-lg border border-dashed bg-muted/20 p-4 text-center text-sm text-muted-foreground">
              Loading payments...
            </div>
          ) : records.length === 0 ? (
            <div className="rounded-lg border border-dashed bg-muted/20 p-4 text-center text-sm text-muted-foreground">
              No vacant listing payments submitted yet.
            </div>
          ) : (
            records.map((record) => {
              const amountPaid = typeof record.amountDue === 'number' ? record.amountDue : record.amount;
              const amountDisplay = typeof amountPaid === 'number' ? amountPaid.toLocaleString() : '—';
              const submittedDate = formatCreatedAt(record.createdAt);

              return (
                <div key={record.id} className="rounded-lg border bg-card/40 p-4 space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-base font-semibold text-foreground">{record.name || record.listingName || 'Untitled listing'}</p>
                      <p className="text-xs text-muted-foreground">
                        {submittedDate ? `Submitted ${submittedDate}` : 'Submission date unavailable'}
                      </p>
                    </div>
                    {statusBadge(record.paymentStatus)}
                  </div>

                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground/80">Listing ID</p>
                    <p className="font-mono break-all text-foreground/80">{record.listingId}</p>
                    <p><span className="font-medium text-foreground">Landlord:</span> {record.landlordName || 'Unknown landlord'}</p>
                    <p><span className="font-medium text-foreground">Location:</span> {record.location || 'Unknown'}</p>
                    <p><span className="font-medium text-foreground">Amount:</span> Ksh {amountDisplay}</p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground/80">Payment Confirmation</p>
                    {record.confirmationText ? (
                      <p className="text-xs text-muted-foreground border rounded p-2 bg-muted/40 whitespace-pre-wrap">
                        {record.confirmationText}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">No M-Pesa message provided.</p>
                    )}

                    {record.proofUploadUrl ? (
                      <div className="space-y-2">
                        <div className="relative h-32 w-full overflow-hidden rounded border">
                          <Image
                            src={record.proofUploadUrl}
                            alt="Payment proof"
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        </div>
                        <Button asChild size="sm" variant="link" className="px-0 text-xs">
                          <a href={record.proofUploadUrl} target="_blank" rel="noopener noreferrer">
                            View full payment screenshot
                          </a>
                        </Button>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">No payment screenshot uploaded.</p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={record.visibilityStatus === 'visible' ? 'default' : 'outline'}>
                      {record.visibilityStatus === 'visible' ? 'Visible' : 'Hidden'}
                    </Badge>
                    {actionButtons(record)}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="hidden md:block rounded-md border overflow-x-auto">
          <Table className="min-w-[900px] text-sm">
            <TableHeader>
              <TableRow>
                <TableHead>Listing</TableHead>
                <TableHead>Payment Confirmation</TableHead>
                <TableHead>Property Details</TableHead>
                <TableHead>Amount (KES)</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Visibility</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                    <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin" /> Loading payments...
                  </TableCell>
                </TableRow>
              ) : records.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No vacant listing payments submitted yet.
                  </TableCell>
                </TableRow>
              ) : (
                records.map((record) => {
                  const amountPaid = typeof record.amountDue === 'number' ? record.amountDue : record.amount;
                  const amountDisplay = typeof amountPaid === 'number' ? amountPaid.toLocaleString() : '—';
                  const submittedDate = formatCreatedAt(record.createdAt);

                  return (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">
                      <div className="flex flex-col">
                        <span>{record.name || record.listingName || "Untitled listing"}</span>
                        <span className="text-xs text-muted-foreground">{record.listingId}</span>
                        <span className="text-xs text-muted-foreground">Landlord: {record.landlordName || "Unknown landlord"}</span>
                        {submittedDate && (
                          <span className="text-xs text-muted-foreground">
                            Submitted {submittedDate}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-2">
                        {record.confirmationText ? (
                          <p className="text-xs text-muted-foreground border rounded p-2 bg-muted/40 whitespace-pre-wrap">
                            {record.confirmationText}
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground">No M-Pesa message provided.</p>
                        )}
                        {record.proofUploadUrl ? (
                          <div className="space-y-2">
                            <div className="relative h-20 w-32 overflow-hidden rounded border">
                              <Image
                                src={record.proofUploadUrl}
                                alt="Payment proof"
                                fill
                                className="object-cover"
                                unoptimized
                              />
                            </div>
                            <Button asChild size="sm" variant="link" className="px-0 text-xs">
                              <a href={record.proofUploadUrl} target="_blank" rel="noopener noreferrer">
                                View payment screenshot
                              </a>
                            </Button>
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground">No payment screenshot uploaded.</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <div>Type: <span className="font-semibold text-foreground">{record.type || 'Unknown'}</span></div>
                        <div>Location: <span className="font-semibold text-foreground">{record.location || 'Unknown'}</span></div>
                        <div>Price: <span className="font-semibold text-foreground">Ksh {record.price?.toLocaleString() ?? '0'}</span></div>
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold">{amountDisplay}</TableCell>
                    <TableCell>{statusBadge(record.paymentStatus)}</TableCell>
                    <TableCell>
                      <Badge variant={record.visibilityStatus === "visible" ? "default" : "outline"}>
                        {record.visibilityStatus === "visible" ? "Visible" : "Hidden"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{actionButtons(record)}</TableCell>
                  </TableRow>
                )})
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
