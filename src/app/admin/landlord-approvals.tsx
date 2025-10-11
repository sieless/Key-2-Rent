'use client';

import { useEffect, useState } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  query,
  updateDoc,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { useFirestore, useUser } from '@/firebase';
import { type LandlordApplication } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ShieldCheck, XCircle } from 'lucide-react';

export function LandlordApprovalsPanel() {
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const [applications, setApplications] = useState<LandlordApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  useEffect(() => {
    if (!db) return;

    const q = query(collection(db, 'landlordApplications'), where('status', '==', 'pending_approval'));

    const unsubscribe = onSnapshot(q, snapshot => {
      const pending = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as LandlordApplication) }));
      setApplications(pending);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [db]);

  const handleApprove = async (application: LandlordApplication) => {
    if (!db) return;

    setActionLoadingId(application.id);
    try {
      await updateDoc(doc(db, 'landlordApplications', application.id), {
        status: 'approved',
        reviewedAt: serverTimestamp(),
        reviewedBy: user?.email ?? 'system',
      });

      await updateDoc(doc(db, 'users', application.userId), {
        role: 'landlord',
        landlordApplicationStatus: 'approved',
        landlordApplicationId: application.id,
      });

      toast({
        title: 'Landlord approved',
        description: `${application.userName} can now publish listings.`,
      });
    } catch (error) {
      console.error('Error approving landlord', error);
      toast({
        variant: 'destructive',
        title: 'Approval failed',
        description: 'Could not approve this landlord. Please try again.',
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (application: LandlordApplication) => {
    if (!db) return;

    const reason = window.prompt('Provide a rejection reason:', application.notes || '');
    if (reason === null) return;

    setActionLoadingId(application.id);
    try {
      await updateDoc(doc(db, 'landlordApplications', application.id), {
        status: 'rejected',
        reviewedAt: serverTimestamp(),
        reviewedBy: user?.email ?? 'system',
        notes: reason.trim() || 'No reason provided',
      });

      await updateDoc(doc(db, 'users', application.userId), {
        landlordApplicationStatus: 'rejected',
        role: 'renter',
      });

      toast({
        title: 'Application rejected',
        description: `${application.userName} has been notified of the decision.`,
      });
    } catch (error) {
      console.error('Error rejecting landlord', error);
      toast({
        variant: 'destructive',
        title: 'Rejection failed',
        description: 'Could not reject this application. Please try again.',
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pending Landlord Verifications</CardTitle>
        <CardDescription>Review landlord verification payments and approve trusted landlords.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : applications.length === 0 ? (
          <p className="text-sm text-muted-foreground">No pending landlord applications at the moment.</p>
        ) : (
          applications.map(application => (
            <div
              key={application.id}
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-lg border p-4"
            >
              <div className="space-y-1">
                <p className="text-sm font-semibold">{application.userName}</p>
                <p className="text-sm text-muted-foreground">{application.userEmail}</p>
                <p className="text-sm text-muted-foreground">Transaction: {application.paymentTransactionId}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleReject(application)}
                  disabled={actionLoadingId === application.id}
                >
                  <XCircle className="mr-2 h-4 w-4" /> Reject
                </Button>
                <Button
                  onClick={() => handleApprove(application)}
                  disabled={actionLoadingId === application.id}
                >
                  <ShieldCheck className="mr-2 h-4 w-4" /> Approve
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
