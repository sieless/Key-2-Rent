'use client';

// Force dynamic rendering (disable static generation)
export const dynamic = 'force-dynamic';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  addDoc,
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { useFirestore, useUser } from '@/firebase';
import { useUserProfile } from '@/hooks/use-user-profile';
import { type LandlordApplication } from '@/types';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, Hourglass, XCircle, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function BecomeLandlordPage() {
  const { user, isUserLoading } = useUser();
  const { profile, loading: profileLoading } = useUserProfile();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [transactionId, setTransactionId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [latestApplication, setLatestApplication] = useState<LandlordApplication | null>(null);
  const [isLoadingApplication, setIsLoadingApplication] = useState(true);

  useEffect(() => {
    if (isUserLoading || profileLoading) return;
    if (!user) {
      router.push('/login');
    }
  }, [user, isUserLoading, profileLoading, router]);

  useEffect(() => {
    if (!user || !db) return;

    const q = query(
      collection(db, 'landlordApplications'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(1)
    );

    const unsubscribe = onSnapshot(q, snapshot => {
      if (snapshot.empty) {
        setLatestApplication(null);
        setIsLoadingApplication(false);
        return;
      }

      const docSnap = snapshot.docs[0];
      setLatestApplication({ id: docSnap.id, ...(docSnap.data() as LandlordApplication) });
      setIsLoadingApplication(false);
    });

    return () => unsubscribe();
  }, [user, db]);

  const canSubmitApplication = useMemo(() => {
    if (!profile) return false;
    if (profile.landlordApplicationStatus === 'approved') return false;
    if (profile.landlordApplicationStatus === 'pending') return false;
    return true;
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !db || !profile) return;

    if (!transactionId.trim()) {
      toast({
        variant: 'destructive',
        title: 'Transaction required',
        description: 'Enter the M-Pesa or payment transaction ID to proceed.',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const applicationsRef = collection(db, 'landlordApplications');
      const appPayload = {
        userId: user.uid,
        userName: profile.name,
        userEmail: profile.email,
        paymentTransactionId: transactionId.trim(),
        status: 'pending_approval' as const,
        createdAt: serverTimestamp(),
      };

      const docRef = await addDoc(applicationsRef, appPayload);

      await updateDoc(doc(db, 'users', user.uid), {
        role: 'landlord',
        landlordApplicationStatus: 'pending',
        landlordApplicationId: docRef.id,
      });

      toast({
        title: 'Application submitted',
        description: 'Our admin team will review your verification within 24 hours.',
      });

      setTransactionId('');
    } catch (error) {
      console.error('Failed to submit landlord application', error);
      toast({
        variant: 'destructive',
        title: 'Submission failed',
        description: 'We could not submit your verification request. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isUserLoading || profileLoading || isLoadingApplication) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header onPostClick={() => {}} />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
        <Footer />
      </div>
    );
  }

  if (!user || !profile) {
    return null;
  }

  const status = profile.landlordApplicationStatus ?? 'none';

  return (
    <div className="flex flex-col min-h-screen">
      <Header onPostClick={() => {}} />
      <main className="flex-1 max-w-3xl mx-auto w-full py-12 px-4 sm:px-6 lg:px-8 space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Landlord Verification</h1>
          <p className="text-muted-foreground mt-2">
            Complete a one-time verification to unlock the full landlord dashboard and publish listings on Key-2-Rent.
          </p>
        </div>

        {status === 'approved' && (
          <Alert>
            <AlertTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              You are verified
            </AlertTitle>
            <AlertDescription>
              Your landlord verification is complete. You can now manage your properties from the dashboard.
            </AlertDescription>
          </Alert>
        )}

        {status === 'pending' && (
          <Alert>
            <AlertTitle className="flex items-center gap-2">
              <Hourglass className="h-4 w-4" />
              Verification in progress
            </AlertTitle>
            <AlertDescription>
              We&apos;re reviewing your application. We&apos;ll notify you via email once the process is complete.
            </AlertDescription>
          </Alert>
        )}

        {status === 'rejected' && (
          <Alert variant="destructive">
            <AlertTitle className="flex items-center gap-2">
              <XCircle className="h-4 w-4" />
              Previous application rejected
            </AlertTitle>
            <AlertDescription>
              Please review the feedback sent to your email and resubmit your verification request.
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Verification Requirements</CardTitle>
            <CardDescription>
              Pay the one-time verification fee via M-Pesa and submit your transaction ID. Our team will review your details within 24 hours.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-3">
              <Badge variant="secondary" className="w-fit gap-2">
                <Shield className="h-4 w-4" /> Secure landlord verification
              </Badge>
              <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                <li>Send the one-time verification fee to Paybill <strong>123456</strong>, Account <strong>KEY2RENT</strong>.</li>
                <li>Copy the M-Pesa transaction ID from the confirmation SMS.</li>
                <li>Enter the transaction ID below and submit for admin approval.</li>
              </ol>
            </div>

            <form onSubmit={handleSubmit} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="transactionId">Payment Transaction ID</Label>
                <Input
                  id="transactionId"
                  placeholder="e.g. QGR12345ABC"
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  disabled={!canSubmitApplication || isSubmitting}
                  required
                />
              </div>
              <Button
                type="submit"
                disabled={!canSubmitApplication || isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Verification Request'
                )}
              </Button>
            </form>

            {latestApplication && (
              <div className="rounded-lg border p-4">
                <h3 className="text-sm font-semibold mb-2">Latest submission</h3>
                <p className="text-sm text-muted-foreground">Transaction ID: {latestApplication.paymentTransactionId}</p>
                <p className="text-sm text-muted-foreground">Status: {getStatusLabel(latestApplication.status)}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}

function getStatusLabel(status: LandlordApplication['status']): string {
  switch (status) {
    case 'pending_approval':
      return 'Pending Approval';
    case 'approved':
      return 'Approved';
    case 'rejected':
      return 'Rejected';
    default:
      return status;
  }
}
