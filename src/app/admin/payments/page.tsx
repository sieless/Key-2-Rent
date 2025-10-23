/**
 * Admin Payment Dashboard
 * View all transactions, revenue analytics, and payment statistics
 */

'use client';

// Force dynamic rendering (disable static generation)
export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, getDocs, where, Timestamp } from 'firebase/firestore';
import { useFirestore, useUser } from '@/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DollarSign, TrendingUp, Users, CreditCard, Download, RefreshCcw } from 'lucide-react';
import { isAdmin } from '@/lib/admin';
import { useRouter } from 'next/navigation';
import type { Transaction, TransactionStatus } from '@/types';

interface PaymentStats {
  totalRevenue: number;
  totalTransactions: number;
  successfulPayments: number;
  failedPayments: number;
  pendingPayments: number;
  totalUsers: number;
  todayRevenue: number;
  weekRevenue: number;
  monthRevenue: number;
}

export default function AdminPaymentsPage() {
  const { user } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const [transactions, setTransactions] = useState<(Transaction & { id: string })[]>([]);
  const [stats, setStats] = useState<PaymentStats>({
    totalRevenue: 0,
    totalTransactions: 0,
    successfulPayments: 0,
    failedPayments: 0,
    pendingPayments: 0,
    totalUsers: 0,
    todayRevenue: 0,
    weekRevenue: 0,
    monthRevenue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | TransactionStatus>('all');

  // Check admin access
  useEffect(() => {
    if (user && !isAdmin(user.email)) {
      router.push('/');
    }
  }, [user, router]);

  // Fetch transactions and calculate stats
  useEffect(() => {
    async function fetchData() {
      if (!user || !db) return;

      try {
        setLoading(true);

        // Fetch all transactions
        const transactionsRef = collection(db, 'transactions');
        const transactionsQuery = query(transactionsRef, orderBy('createdAt', 'desc'), limit(100));
        const transactionsSnapshot = await getDocs(transactionsQuery);

        const transactionsData = transactionsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as (Transaction & { id: string })[];

        setTransactions(transactionsData);

        // Calculate statistics
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        const statsCalc = transactionsData.reduce((acc, txn) => {
          const createdAt = (txn.createdAt as Timestamp)?.toDate();

          if (txn.status === 'SUCCESS') {
            acc.totalRevenue += txn.amount;
            acc.successfulPayments += 1;

            if (createdAt >= todayStart) {
              acc.todayRevenue += txn.amount;
            }
            if (createdAt >= weekStart) {
              acc.weekRevenue += txn.amount;
            }
            if (createdAt >= monthStart) {
              acc.monthRevenue += txn.amount;
            }
          }

          if (txn.status === 'FAILED') acc.failedPayments += 1;
          if (txn.status === 'PENDING') acc.pendingPayments += 1;

          acc.totalTransactions += 1;
          return acc;
        }, {
          totalRevenue: 0,
          totalTransactions: 0,
          successfulPayments: 0,
          failedPayments: 0,
          pendingPayments: 0,
          todayRevenue: 0,
          weekRevenue: 0,
          monthRevenue: 0,
        } as Omit<PaymentStats, 'totalUsers'>);

        // Get unique user count
        const uniqueUsers = new Set(transactionsData.map(t => t.userId)).size;

        setStats({ ...statsCalc, totalUsers: uniqueUsers });
      } catch (error) {
        console.error('Error fetching payment data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [user, db]);

  const getStatusBadge = (status: TransactionStatus) => {
    const variants = {
      SUCCESS: 'default',
      FAILED: 'destructive',
      PENDING: 'secondary',
      CANCELLED: 'outline',
    };

    return (
      <Badge variant={variants[status] as any}>
        {status}
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

  const filteredTransactions = filter === 'all'
    ? transactions
    : transactions.filter(t => t.status === filter);

  const exportToCSV = () => {
    const headers = ['Date', 'Transaction ID', 'User Email', 'Type', 'Amount', 'Status', 'Receipt Number'];
    const rows = transactions.map(txn => [
      (txn.createdAt as Timestamp)?.toDate().toLocaleDateString(),
      txn.transactionId,
      txn.userEmail || 'N/A',
      getTypeLabel(txn.type),
      txn.amount,
      txn.status,
      txn.mpesaReceiptNumber || 'N/A',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `timelaine-payments-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (!user || !isAdmin(user.email)) {
    return null;
  }

  return (
    <div className="container mx-auto py-10 px-4">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Payment Dashboard</h1>
          <p className="text-muted-foreground">Monitor transactions and revenue analytics</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.location.reload()}>
            <RefreshCcw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button onClick={exportToCSV}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">KES {stats.totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              From {stats.successfulPayments} successful payments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">KES {stats.monthRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Week: KES {stats.weekRevenue.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paying Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              Unique users
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transactions</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTransactions}</div>
            <p className="text-xs text-muted-foreground">
              {stats.pendingPayments} pending
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>View and manage all payment transactions</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
            <TabsList>
              <TabsTrigger value="all">All ({transactions.length})</TabsTrigger>
              <TabsTrigger value="SUCCESS">Success ({stats.successfulPayments})</TabsTrigger>
              <TabsTrigger value="PENDING">Pending ({stats.pendingPayments})</TabsTrigger>
              <TabsTrigger value="FAILED">Failed ({stats.failedPayments})</TabsTrigger>
            </TabsList>

            <TabsContent value={filter} className="space-y-4">
              {loading ? (
                <div className="text-center py-8">
                  <RefreshCcw className="h-8 w-8 animate-spin mx-auto mb-2 text-muted-foreground" />
                  <p className="text-muted-foreground">Loading transactions...</p>
                </div>
              ) : filteredTransactions.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No transactions found</p>
                </div>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Receipt</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTransactions.map((txn) => (
                        <TableRow key={txn.id}>
                          <TableCell className="whitespace-nowrap">
                            {(txn.createdAt as Timestamp)?.toDate().toLocaleDateString()}
                            <br />
                            <span className="text-xs text-muted-foreground">
                              {(txn.createdAt as Timestamp)?.toDate().toLocaleTimeString()}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{txn.userName || 'Unknown'}</div>
                            <div className="text-xs text-muted-foreground">{txn.userEmail}</div>
                          </TableCell>
                          <TableCell>{getTypeLabel(txn.type)}</TableCell>
                          <TableCell className="font-semibold">KES {txn.amount.toLocaleString()}</TableCell>
                          <TableCell className="text-sm">{txn.phoneNumber}</TableCell>
                          <TableCell className="text-xs">{txn.mpesaReceiptNumber || '-'}</TableCell>
                          <TableCell>{getStatusBadge(txn.status)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
