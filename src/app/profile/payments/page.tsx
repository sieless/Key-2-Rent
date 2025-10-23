/**
 * User Payment History Page
 * View payment history, access status, and renew subscriptions
 */

'use client';

// Force dynamic rendering (disable static generation)
export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { collection, query, where, orderBy, getDocs, Timestamp } from 'firebase/firestore';
import { useFirestore, useUser } from '@/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar, CreditCard, AlertCircle, CheckCircle, Clock, Download } from 'lucide-react';
import { usePaymentStatus } from '@/hooks/use-payment-status';
import { PaymentModal } from '@/components/payment-modal';
import { useRouter } from 'next/navigation';
import type { Transaction, TransactionStatus } from '@/types';

export default function PaymentHistoryPage() {
  const { user } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const paymentStatus = usePaymentStatus();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRenewModal, setShowRenewModal] = useState(false);

  // Redirect if not logged in
  useEffect(() => {
    if (!user && !loading) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Fetch user transactions
  useEffect(() => {
    async function fetchTransactions() {
      if (!user || !db) return;

      try {
        setLoading(true);

        const transactionsRef = collection(db, 'transactions');
        const q = query(
          transactionsRef,
          where('userId', '==', user.uid),
          orderBy('createdAt', 'desc')
        );

        const snapshot = await getDocs(q);
        const transactionsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Transaction[];

        setTransactions(transactionsData);
      } catch (error) {
        console.error('Error fetching transactions:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchTransactions();
  }, [user, db]);

  const getStatusBadge = (status: TransactionStatus) => {
    const config = {
      SUCCESS: { variant: 'default', icon: CheckCircle, text: 'Success' },
      FAILED: { variant: 'destructive', icon: AlertCircle, text: 'Failed' },
      PENDING: { variant: 'secondary', icon: Clock, text: 'Pending' },
      CANCELLED: { variant: 'outline', icon: AlertCircle, text: 'Cancelled' },
    };

    const { variant, icon: Icon, text } = config[status];

    return (
      <Badge variant={variant as any} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {text}
      </Badge>
    );
  };

  const getTypeLabel = (type: string) => {
    const labels = {
      'CONTACT_ACCESS': 'Contact Access',
      'FEATURED_LISTING': 'Featured Listing',
      'BOOSTED_LISTING': 'Boosted Listing',
      'VACANCY_LISTING': 'Vacancy Listing',
    };
    return labels[type as keyof typeof labels] || type;
  };

  const handleRenewSuccess = () => {
    setShowRenewModal(false);
    window.location.reload();
  };

  const downloadReceipt = (txn: Transaction) => {
    const receiptText = `
TIMELAINE PAYMENT RECEIPT
=========================

Receipt Number: ${txn.mpesaReceiptNumber || 'N/A'}
Transaction ID: ${txn.transactionId}
Date: ${(txn.createdAt as Timestamp)?.toDate().toLocaleString()}
Amount: KES ${txn.amount.toLocaleString()}
Type: ${getTypeLabel(txn.type)}
Status: ${txn.status}
Phone Number: ${txn.phoneNumber}

Thank you for using Timelaine!
    `.trim();

    const blob = new Blob([receiptText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receipt-${txn.transactionId}.txt`;
    a.click();
  };

  if (!user) {
    return null;
  }

  const totalSpent = transactions
    .filter(t => t.status === 'SUCCESS')
    .reduce((sum, t) => sum + t.amount, 0);

  const successfulPayments = transactions.filter(t => t.status === 'SUCCESS').length;

  return (
    <div className="container mx-auto py-10 px-4 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Payment History</h1>
        <p className="text-muted-foreground">View your transactions and subscription status</p>
      </div>

      {/* Access Status Card */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Contact Access Subscription
          </CardTitle>
          <CardDescription>Unlimited access to landlord contact information</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {paymentStatus.loading ? (
              <div className="text-center py-4">
                <p className="text-muted-foreground">Loading subscription status...</p>
              </div>
            ) : paymentStatus.canViewContacts ? (
              <div className="space-y-4">
                <Alert>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription>
                    <strong>Active Subscription</strong>
                    <p className="mt-1">
                      Your contact access expires on{' '}
                      <strong>{paymentStatus.contactAccessExpiresAt?.toLocaleDateString()}</strong>
                      {' '}({paymentStatus.daysRemaining} days remaining)
                    </p>
                  </AlertDescription>
                </Alert>

                {paymentStatus.needsRenewal && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Renewal Needed</strong>
                      <p className="mt-1">
                        Your subscription expires soon. Renew now to continue accessing landlord contacts.
                      </p>
                      <Button
                        onClick={() => setShowRenewModal(true)}
                        className="mt-3"
                        size="sm"
                      >
                        Renew for KES 100
                      </Button>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            ) : (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>No Active Subscription</strong>
                  <p className="mt-1">
                    You don't have an active subscription. Subscribe now to access landlord contacts.
                  </p>
                  <Button
                    onClick={() => setShowRenewModal(true)}
                    className="mt-3"
                    size="sm"
                  >
                    Subscribe for KES 100
                  </Button>
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Payment Summary */}
      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Spent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">KES {totalSpent.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Successful Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{successfulPayments}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{transactions.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Transaction History
          </CardTitle>
          <CardDescription>All your payment transactions</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Loading transactions...</p>
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8">
              <CreditCard className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">No transactions yet</p>
              <Button
                onClick={() => router.push('/')}
                variant="outline"
                className="mt-4"
              >
                Browse Listings
              </Button>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Receipt</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((txn) => (
                    <TableRow key={txn.id}>
                      <TableCell className="whitespace-nowrap">
                        {(txn.createdAt as Timestamp)?.toDate().toLocaleDateString()}
                        <br />
                        <span className="text-xs text-muted-foreground">
                          {(txn.createdAt as Timestamp)?.toDate().toLocaleTimeString()}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{getTypeLabel(txn.type)}</div>
                        {txn.statusMessage && (
                          <div className="text-xs text-muted-foreground">{txn.statusMessage}</div>
                        )}
                      </TableCell>
                      <TableCell className="font-semibold">KES {txn.amount.toLocaleString()}</TableCell>
                      <TableCell className="text-xs font-mono">
                        {txn.mpesaReceiptNumber || '-'}
                      </TableCell>
                      <TableCell>{getStatusBadge(txn.status)}</TableCell>
                      <TableCell>
                        {txn.status === 'SUCCESS' && txn.mpesaReceiptNumber && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => downloadReceipt(txn)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Renew Subscription Modal */}
      <PaymentModal
        open={showRenewModal}
        onOpenChange={setShowRenewModal}
        amount={100}
        type="CONTACT_ACCESS"
        onSuccess={handleRenewSuccess}
        title="Renew Contact Access"
        description="Get 30 more days of unlimited access to landlord contacts"
      />
    </div>
  );
}
