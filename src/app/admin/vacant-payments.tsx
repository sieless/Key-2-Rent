"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, orderBy, query, updateDoc, doc } from "firebase/firestore";
import { useFirestore } from "@/firebase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Eye, Check, X, RotateCw, Loader2 } from "lucide-react";
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
  createdAt?: any;
};

export function VacantPaymentsPanel() {
  const db = useFirestore();
  const { toast } = useToast();
  const [records, setRecords] = useState<VacantPaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);

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
          .map((docSnap) => ({
            id: docSnap.id,
            listingId: docSnap.id,
            ...(docSnap.data() as any),
          }))
          .filter((item) => item.status === "Vacant" && item.amountDue);
        setRecords(data);
      } catch (error) {
        console.error("Failed to load vacant payments", error);
        toast({ title: "Fetch failed", description: "Could not load vacant payment records", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    }

    loadRecords();
  }, [db, toast]);

  const updateListing = async (listingId: string, updates: Partial<VacantPaymentRecord> & { visibilityStatus?: "hidden" | "visible" }) => {
    if (!db) return;
    setActionId(listingId);
    try {
      if (!db) {
        throw new Error('Firestore not available');
      }

      await updateDoc(doc(db, "listings", listingId), updates as any);
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
        <CardDescription>Review payment proofs and manage listing visibility.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Listing</TableHead>
                <TableHead>Landlord</TableHead>
                <TableHead>Property Details</TableHead>
                <TableHead>Amount (KES)</TableHead>
                <TableHead>Payment Proof</TableHead>
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
                  const submittedDate = record.createdAt?.toDate?.() ? record.createdAt.toDate().toLocaleString() : null;

                  return (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">
                      <div className="flex flex-col">
                        <span>{record.name || record.listingName || "Untitled listing"}</span>
                        <span className="text-xs text-muted-foreground">{record.listingId}</span>
                        {submittedDate && (
                          <span className="text-xs text-muted-foreground">
                            Submitted {submittedDate}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col text-sm">
                        <span>{record.landlordName || "Unknown landlord"}</span>
                        <span className="text-xs text-muted-foreground">{record.userId}</span>
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
                    <TableCell>
                      <div className="space-y-2">
                        {record.confirmationText && (
                          <p className="text-xs text-muted-foreground border rounded p-2 bg-muted/40 whitespace-pre-wrap">
                            {record.confirmationText}
                          </p>
                        )}
                        {record.proofUploadUrl && (
                          <div className="relative h-20 w-32 overflow-hidden rounded border">
                            <Image
                              src={record.proofUploadUrl}
                              alt="Payment proof"
                              fill
                              className="object-cover"
                              unoptimized
                            />
                          </div>
                        )}
                      </div>
                    </TableCell>
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
