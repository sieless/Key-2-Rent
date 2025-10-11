'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, query, where, orderBy, limit, Timestamp } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UsersManagementTable } from './users-table';
import { ListingsManagementTable } from './listings-table';
import { PaymentSettingsPanel } from './payment-settings';
import { LandlordApprovalsPanel } from './landlord-approvals';
import { Users, Home, TrendingUp, MapPin, Building2, Activity, DollarSign } from 'lucide-react';
import { type AdminStats } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';

export function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const db = useFirestore();

  const statusLabelMap: Record<string, string> = {
    pending_approval: 'Pending Approval',
    published: 'Published',
    rented: 'Rented',
    rejected: 'Rejected',
  };

  const getStatusLabel = (status: string) => statusLabelMap[status] ?? status;

  useEffect(() => {
    async function fetchStats() {
      try {
        // Fetch users
        const usersSnap = await getDocs(collection(db, 'users'));
        const users = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Fetch listings
        const listingsSnap = await getDocs(collection(db, 'listings'));
        const listings = listingsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Calculate stats
        const listingsByType: Record<string, number> = {};
        const listingsByLocation: Record<string, number> = {};
        const listingsByStatus: Record<string, number> = {};

        listings.forEach((listing: any) => {
          listingsByType[listing.type] = (listingsByType[listing.type] || 0) + 1;
          listingsByLocation[listing.location] = (listingsByLocation[listing.location] || 0) + 1;
          listingsByStatus[listing.status] = (listingsByStatus[listing.status] || 0) + 1;
        });

        // Recent counts (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const recentUsers = users.filter((user: any) => {
          if (!user.createdAt) return false;
          const createdAt = user.createdAt.toDate ? user.createdAt.toDate() : new Date(user.createdAt);
          return createdAt >= sevenDaysAgo;
        }).length;

        const recentListings = listings.filter((listing: any) => {
          if (!listing.createdAt) return false;
          const createdAt = listing.createdAt.toDate ? listing.createdAt.toDate() : new Date(listing.createdAt);
          return createdAt >= sevenDaysAgo;
        }).length;

        setStats({
          totalUsers: users.length,
          totalListings: listings.length,
          listingsByType,
          listingsByLocation,
          listingsByStatus,
          recentUsers,
          recentListings,
        });
      } catch (error) {
        console.error('Error fetching admin stats:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, [db]);

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="mb-8">
          <Skeleton className="h-10 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-foreground mb-2">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Manage users, listings, and monitor platform activity
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
            <p className="text-xs text-muted-foreground">
              +{stats?.recentUsers || 0} in last 7 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Listings</CardTitle>
            <Home className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalListings || 0}</div>
            <p className="text-xs text-muted-foreground">
              +{stats?.recentListings || 0} in last 7 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Published Listings</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.listingsByStatus['published'] || 0}</div>
            <p className="text-xs text-muted-foreground">Live and visible to renters</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Location</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.listingsByLocation
                ? Object.entries(stats.listingsByLocation).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'
                : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.listingsByLocation
                ? Object.entries(stats.listingsByLocation).sort((a, b) => b[1] - a[1])[0]?.[1] || 0
                : 0}{' '}
              properties
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="mb-8">
        <LandlordApprovalsPanel />
      </div>

      {/* Breakdown Cards */}
      <div className="grid gap-4 md:grid-cols-2 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Listings by Type</CardTitle>
            <CardDescription>Distribution of property types</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats?.listingsByType &&
                Object.entries(stats.listingsByType)
                  .sort((a, b) => b[1] - a[1])
                  .map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between">
                      <span className="text-sm font-medium">{type}</span>
                      <span className="text-sm text-muted-foreground">{count}</span>
                    </div>
                  ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Listings by Status</CardTitle>
            <CardDescription>Current availability status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats?.listingsByStatus &&
                Object.entries(stats.listingsByStatus).map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between">
                    <span className="text-sm font-medium">{getStatusLabel(status)}</span>
                    <span className="text-sm text-muted-foreground">{count}</span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Management Tables */}
      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users">
            <Users className="mr-2 h-4 w-4" />
            Users Management
          </TabsTrigger>
          <TabsTrigger value="listings">
            <Home className="mr-2 h-4 w-4" />
            Listings Management
          </TabsTrigger>
          <TabsTrigger value="payments">
            <DollarSign className="mr-2 h-4 w-4" />
            Payment Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <UsersManagementTable />
        </TabsContent>

        <TabsContent value="listings" className="space-y-4">
          <ListingsManagementTable />
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <PaymentSettingsPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
