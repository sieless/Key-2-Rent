'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Building2, 
  Users, 
  TrendingUp, 
  Calendar, 
  MessageSquare, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Plus,
  Eye,
  Edit,
  Settings
} from 'lucide-react';
import { type Listing } from '@/types';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { cn } from '@/lib/utils';

// Mock tenant data - in real app this would come from applications/conversations
interface Tenant {
  id: string;
  name: string;
  email: string;
  phone: string;
  listingId: string;
  listingName: string;
  moveInDate: string;
  leaseEndDate: string;
  monthlyRent: number;
  status: 'active' | 'pending' | 'expired';
  lastContact: string;
}

interface DashboardStats {
  totalListings: number;
  publishedListings: number;
  rentedListings: number;
  totalTenants: number;
  monthlyRevenue: number;
  occupancyRate: number;
  pendingApplications: number;
  maintenanceRequests: number;
}

export default function LandlordDashboard() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const db = useFirestore();

  const [listings, setListings] = useState<Listing[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalListings: 0,
    publishedListings: 0,
    rentedListings: 0,
    totalTenants: 0,
    monthlyRevenue: 0,
    occupancyRate: 0,
    pendingApplications: 0,
    maintenanceRequests: 0,
  });
  const [loading, setLoading] = useState(true);

  // Mock tenant data - replace with real data
  const mockTenants: Tenant[] = [
    {
      id: '1',
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+254712345678',
      listingId: 'listing1',
      listingName: 'Machakos Apartments - 2BR',
      moveInDate: '2024-01-15',
      leaseEndDate: '2024-12-15',
      monthlyRent: 25000,
      status: 'active',
      lastContact: '2024-10-08',
    },
    {
      id: '2',
      name: 'Jane Smith',
      email: 'jane@example.com',
      phone: '+254723456789',
      listingId: 'listing2',
      listingName: 'Kenya Israel - Bedsitter',
      moveInDate: '2024-09-01',
      leaseEndDate: '2025-08-31',
      monthlyRent: 8500,
      status: 'active',
      lastContact: '2024-10-10',
    },
  ];

  useEffect(() => {
    if (isUserLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }

    // Fetch user's listings
    const listingsQuery = query(
      collection(db, 'listings'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(listingsQuery, (snapshot) => {
      const userListings = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Listing[];

      setListings(userListings);

      // Calculate stats
      const published = userListings.filter(l => l.status === 'published').length;
      const rented = userListings.filter(l => l.status === 'rented').length;
      const activeForRevenue = userListings.filter(l => l.status === 'published' || l.status === 'rented');
      const totalRevenue = activeForRevenue.reduce((sum, l) => sum + l.price, 0);
      const denominator = published + rented;
      const occupancyRate = denominator > 0 ? (rented / denominator) * 100 : 0;

      setStats({
        totalListings: userListings.length,
        publishedListings: published,
        rentedListings: rented,
        totalTenants: mockTenants.length, // Replace with real tenant count
        monthlyRevenue: totalRevenue,
        occupancyRate,
        pendingApplications: 3, // Mock data
        maintenanceRequests: 1, // Mock data
      });

      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, isUserLoading, db, router]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'bg-green-100 text-green-800 border-green-200';
      case 'rented': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'pending_approval': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

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

  const getTenantStatusColor = (status: Tenant['status']) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'expired': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 w-full">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Landlord Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Welcome back! Here's an overview of your properties.
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => router.push('/my-listings')}>
              <Building2 className="mr-2 h-4 w-4" />
              Manage Properties
            </Button>
            <Button onClick={() => router.push('/profile/edit')} variant="outline">
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Properties</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalListings}</div>
              <p className="text-xs text-muted-foreground">
                {stats.publishedListings} published, {stats.rentedListings} rented
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Tenants</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalTenants}</div>
              <p className="text-xs text-muted-foreground">
                Across all properties
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">KES {stats.monthlyRevenue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Potential earnings
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Occupancy Rate</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.occupancyRate.toFixed(1)}%</div>
              <Progress value={stats.occupancyRate} className="mt-2" />
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="properties">Properties</TabsTrigger>
            <TabsTrigger value="tenants">Tenants</TabsTrigger>
            <TabsTrigger value="applications">Applications</TabsTrigger>
            <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button className="h-auto p-4 flex flex-col items-center gap-2" onClick={() => router.push('/my-listings')}>
                    <Plus className="h-6 w-6" />
                    <span>Add New Property</span>
                  </Button>
                  <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2">
                    <MessageSquare className="h-6 w-6" />
                    <span>Contact Tenants</span>
                  </Button>
                  <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2">
                    <Calendar className="h-6 w-6" />
                    <span>Schedule Maintenance</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium">New application received</p>
                      <p className="text-sm text-muted-foreground">For Machakos Town - 1BR • 2 hours ago</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                    <div>
                      <p className="font-medium">Maintenance request</p>
                      <p className="text-sm text-muted-foreground">Plumbing issue at Kenya Israel • 1 day ago</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                    <Clock className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="font-medium">Lease ending soon</p>
                      <p className="text-sm text-muted-foreground">John Doe's lease expires in 2 months</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="properties" className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Your Properties</h3>
              <Button onClick={() => router.push('/my-listings')}>
                <Plus className="mr-2 h-4 w-4" />
                Add Property
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {listings.map((listing) => (
                <Card key={listing.id} className="overflow-hidden">
                  <div className="aspect-video bg-muted relative">
                    {listing.images && listing.images.length > 0 ? (
                      <img
                        src={listing.images[0]}
                        alt={listing.name || listing.type}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Building2 className="h-12 w-12 text-muted-foreground" />
                      </div>
                    )}
                    <Badge 
                      className={cn("absolute top-2 right-2", getStatusColor(listing.status))}
                    >
                      {getStatusLabel(listing.status)}
                    </Badge>
                  </div>
                  <CardHeader>
                    <CardTitle className="text-lg">
                      {listing.name || `${listing.type} in ${listing.location}`}
                    </CardTitle>
                    <p className="text-2xl font-bold text-primary">
                      KES {listing.price.toLocaleString()}/month
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between text-sm text-muted-foreground mb-4">
                      <span>{listing.type}</span>
                      <span>{listing.location}</span>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="flex-1">
                        <Eye className="mr-2 h-4 w-4" />
                        View
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1">
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="tenants" className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Current Tenants</h3>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Tenant
              </Button>
            </div>

            <div className="space-y-4">
              {mockTenants.map((tenant) => (
                <Card key={tenant.id}>
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <h4 className="font-semibold text-lg">{tenant.name}</h4>
                          <Badge className={getTenantStatusColor(tenant.status)}>
                            {tenant.status}
                          </Badge>
                        </div>
                        <p className="text-muted-foreground">{tenant.listingName}</p>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="font-medium">Email: </span>
                            <span>{tenant.email}</span>
                          </div>
                          <div>
                            <span className="font-medium">Phone: </span>
                            <span>{tenant.phone}</span>
                          </div>
                          <div>
                            <span className="font-medium">Monthly Rent: </span>
                            <span>KES {tenant.monthlyRent.toLocaleString()}</span>
                          </div>
                          <div>
                            <span className="font-medium">Lease Ends: </span>
                            <span>{new Date(tenant.leaseEndDate).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          <MessageSquare className="mr-2 h-4 w-4" />
                          Contact
                        </Button>
                        <Button size="sm" variant="outline">
                          <Eye className="mr-2 h-4 w-4" />
                          Details
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="applications" className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Pending Applications</h3>
              <Badge>{stats.pendingApplications} pending</Badge>
            </div>

            <div className="text-center py-12 bg-muted/30 rounded-lg">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No pending applications</h3>
              <p className="text-muted-foreground">
                Applications for your properties will appear here.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="maintenance" className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Maintenance Requests</h3>
              <Badge>{stats.maintenanceRequests} active</Badge>
            </div>

            <div className="text-center py-12 bg-muted/30 rounded-lg">
              <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No maintenance requests</h3>
              <p className="text-muted-foreground">
                Maintenance requests from tenants will appear here.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
}