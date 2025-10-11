'use client';

import { type Listing } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Eye,
  Phone,
  TrendingUp,
  MapPin,
  DollarSign,
  Home,
  Calendar,
  Star,
} from 'lucide-react';

type AnalyticsProps = {
  listings: Listing[];
};

/**
 * Landlord Analytics Component
 *
 * Displays statistics and insights about landlord's listings:
 * - Total listings count
 * - Listings by status (published/rented/pending approval)
 * - Average price
 * - Most common location
 * - Featured/boosted count
 * - Total revenue potential
 *
 * Future enhancements:
 * - View tracking (when implemented)
 * - Contact click tracking
 * - Conversion rates
 */
export function LandlordAnalytics({ listings }: AnalyticsProps) {
  // Calculate statistics
  const totalListings = listings.length;

  const publishedCount = listings.filter(l => l.status === 'published').length;
  const rentedCount = listings.filter(l => l.status === 'rented').length;
  const pendingApprovalCount = listings.filter(l => l.status === 'pending_approval').length;

  const averagePrice = totalListings > 0
    ? Math.round(listings.reduce((sum, l) => sum + l.price, 0) / totalListings)
    : 0;

  const totalMonthlyRevenuePotential = listings
    .filter(l => l.status === 'rented')
    .reduce((sum, l) => sum + l.price, 0);

  const featuredCount = listings.filter(l => l.isFeatured).length;
  const boostedCount = listings.filter(l => l.isBoosted).length;

  // Most common location
  const locationCounts: Record<string, number> = {};
  listings.forEach(l => {
    locationCounts[l.location] = (locationCounts[l.location] || 0) + 1;
  });
  const mostCommonLocation = Object.entries(locationCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

  // Most common property type
  const typeCounts: Record<string, number> = {};
  listings.forEach(l => {
    typeCounts[l.type] = (typeCounts[l.type] || 0) + 1;
  });
  const mostCommonType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

  if (totalListings === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">
            Analytics will appear here once you post your first listing.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Listings</CardTitle>
            <Home className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalListings}</div>
            <div className="flex gap-2 mt-2">
              <Badge variant="secondary" className="text-xs">
                {publishedCount} Published
              </Badge>
              <Badge variant="outline" className="text-xs">
                {rentedCount} Rented
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Average Price</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              KES {averagePrice.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">per month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              KES {totalMonthlyRevenuePotential.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">from rented units</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Most Common</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold truncate">{mostCommonLocation}</div>
            <p className="text-xs text-muted-foreground mt-1">{mostCommonType}</p>
          </CardContent>
        </Card>
      </div>

      {/* Status Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Listing Status Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="font-medium">Published</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold">{publishedCount}</span>
                <span className="text-sm text-muted-foreground">
                  ({totalListings > 0 ? Math.round((publishedCount / totalListings) * 100) : 0}%)
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span className="font-medium">Rented</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold">{rentedCount}</span>
                <span className="text-sm text-muted-foreground">
                  ({totalListings > 0 ? Math.round((rentedCount / totalListings) * 100) : 0}%)
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                <span className="font-medium">Pending Approval</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold">{pendingApprovalCount}</span>
                <span className="text-sm text-muted-foreground">
                  ({totalListings > 0 ? Math.round((pendingApprovalCount / totalListings) * 100) : 0}%)
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Premium Features */}
      {(featuredCount > 0 || boostedCount > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500" />
              Premium Features
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {featuredCount > 0 && (
                <div className="flex items-center justify-between">
                  <Badge className="bg-yellow-500 text-black">Featured Listings</Badge>
                  <span className="text-2xl font-bold">{featuredCount}</span>
                </div>
              )}
              {boostedCount > 0 && (
                <div className="flex items-center justify-between">
                  <Badge className="bg-purple-500">Boosted Listings</Badge>
                  <span className="text-2xl font-bold">{boostedCount}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Future Analytics Placeholder */}
      <Card className="border-dashed">
        <CardContent className="py-8 text-center">
          <Eye className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-medium mb-1">More Analytics Coming Soon</p>
          <p className="text-xs text-muted-foreground">
            View tracking, contact clicks, and conversion rates will be added in future updates.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
