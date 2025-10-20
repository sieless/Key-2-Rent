'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
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
import { type PaymentFeature } from '@/types';
import { useFirestore, useUser } from '@/firebase';
import { isAdmin } from '@/lib/admin';
import { DollarSign, Star, Zap, AlertCircle, Loader2 } from 'lucide-react';
import { usePlatformSettings } from '@/hooks/use-platform-settings';
import { updateFeatureToggle, updateFeaturePrice, getPlatformModeLabel } from '@/services/platform-settings';

type ConfirmDialogState = {
  open: boolean;
  feature: PaymentFeature;
  action: boolean;
  featureName: string;
} | null;

export function PaymentSettingsPanel() {
  const { settings, loading: settingsLoading } = usePlatformSettings();
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>(null);
  const [updating, setUpdating] = useState<PaymentFeature | null>(null);
  const [prices, setPrices] = useState({
    contact: 100,
    featured: 500,
    boosted: 300,
  });

  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  // Update local price state when settings load
  useEffect(() => {
    if (settings) {
      setPrices({
        contact: settings.contactPaymentAmount,
        featured: settings.featuredListingPrice,
        boosted: settings.boostedVacancyPrice,
      });
    }
  }, [settings]);

  if (!user || !isAdmin(user.email)) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
        <p className="text-lg font-semibold">Access Denied</p>
        <p className="text-muted-foreground">Only administrators can access payment settings.</p>
      </div>
    );
  }

  if (settingsLoading || !settings) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-3 text-lg">Loading payment settings...</span>
      </div>
    );
  }

  const handleToggleChange = (feature: PaymentFeature, checked: boolean, featureName: string) => {
    setConfirmDialog({ open: true, feature, action: checked, featureName });
  };

  const confirmToggle = async () => {
    if (!confirmDialog || !user?.email) return;
    if (!db) {
      toast({
        title: 'Update Failed',
        description: 'Database connection unavailable.',
        variant: 'destructive',
      });
      return;
    }

    setUpdating(confirmDialog.feature);

    try {
      await updateFeatureToggle(db, confirmDialog.feature, confirmDialog.action, user.email);

      toast({
        title: confirmDialog.action ? 'Feature Enabled ✓' : 'Feature Disabled',
        description: `${confirmDialog.featureName} has been ${confirmDialog.action ? 'activated' : 'deactivated'}.`,
      });
    } catch (error) {
      console.error('Error updating feature toggle:', error);
      toast({
        title: 'Update Failed',
        description: 'Failed to update settings. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setUpdating(null);
      setConfirmDialog(null);
    }
  };

  const handlePriceUpdate = async (feature: PaymentFeature) => {
    if (!user?.email) return;
    if (!db) {
      toast({
        title: 'Update Failed',
        description: 'Database connection unavailable.',
        variant: 'destructive',
      });
      return;
    }

    setUpdating(feature);

    try {
      await updateFeaturePrice(db, feature, prices[feature], user.email);

      toast({
        title: 'Price Updated',
        description: `${feature} price has been updated to KES ${prices[feature]}.`,
      });
    } catch (error) {
      console.error('Error updating price:', error);
      toast({
        title: 'Update Failed',
        description: 'Failed to update price. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setUpdating(null);
    }
  };

  const platformMode = getPlatformModeLabel(settings);

  return (
    <div className="space-y-6">
      {/* Platform Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Platform Status</span>
            <Badge
              variant={platformMode === 'FREE' ? 'default' : 'destructive'}
              className="text-lg px-4 py-1"
            >
              {platformMode === 'FREE' ? '🟢' : '🔴'} {platformMode}
            </Badge>
          </CardTitle>
          <CardDescription>
            Last updated:{' '}
            {settings.lastUpdated
              ? new Date(settings.lastUpdated.toDate()).toLocaleString()
              : 'Never'}
            {settings.updatedBy && settings.updatedBy !== 'system' && ` by ${settings.updatedBy}`}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Contact Payment Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Contact Payment System
          </CardTitle>
          <CardDescription>
            Require users to pay before viewing landlord contact information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <Label htmlFor="contact-payment-toggle" className="flex flex-col gap-1 cursor-pointer">
              <span className="font-semibold text-base">Enable Contact Payments</span>
              <span className="text-sm text-muted-foreground font-normal">
                {settings.contactPaymentEnabled
                  ? 'Users must pay to view contacts'
                  : 'All users can view contacts for free'}
              </span>
            </Label>
            <Switch
              id="contact-payment-toggle"
              checked={settings.contactPaymentEnabled}
              onCheckedChange={(checked) =>
                handleToggleChange('contact', checked, 'Contact Payments')
              }
              disabled={updating === 'contact'}
            />
          </div>

          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Label htmlFor="contact-price" className="text-sm font-medium mb-2 block">
                Price per contact (KES/month)
              </Label>
              <Input
                id="contact-price"
                type="number"
                min="1"
                value={prices.contact}
                onChange={(e) => setPrices({ ...prices, contact: Number(e.target.value) })}
                className="w-32"
              />
            </div>
            {prices.contact !== settings.contactPaymentAmount && (
              <Button
                onClick={() => handlePriceUpdate('contact')}
                disabled={updating === 'contact'}
                size="sm"
                className="mt-6"
              >
                {updating === 'contact' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Price'
                )}
              </Button>
            )}
          </div>

          <div className="text-sm bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 p-3 rounded">
            <p className="font-medium text-blue-900 dark:text-blue-100 mb-1">
              💡 How it works:
            </p>
            <p className="text-blue-800 dark:text-blue-200">
              When enabled, users will see a "Pay KES {settings.contactPaymentAmount} to unlock
              contacts" button instead of the phone number.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Featured Listings Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-primary" />
            Featured Listings
          </CardTitle>
          <CardDescription>
            Allow landlords to pay for top placement in search results
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <Label htmlFor="featured-toggle" className="flex flex-col gap-1 cursor-pointer">
              <span className="font-semibold text-base">Enable Featured Listings</span>
              <span className="text-sm text-muted-foreground font-normal">
                {settings.featuredListingsEnabled
                  ? 'Landlords can feature their listings'
                  : 'Featured listings not available'}
              </span>
            </Label>
            <Switch
              id="featured-toggle"
              checked={settings.featuredListingsEnabled}
              onCheckedChange={(checked) =>
                handleToggleChange('featured', checked, 'Featured Listings')
              }
              disabled={updating === 'featured'}
            />
          </div>

          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Label htmlFor="featured-price" className="text-sm font-medium mb-2 block">
                Price per week (KES)
              </Label>
              <Input
                id="featured-price"
                type="number"
                min="1"
                value={prices.featured}
                onChange={(e) => setPrices({ ...prices, featured: Number(e.target.value) })}
                className="w-32"
              />
            </div>
            {prices.featured !== settings.featuredListingPrice && (
              <Button
                onClick={() => handlePriceUpdate('featured')}
                disabled={updating === 'featured'}
                size="sm"
                className="mt-6"
              >
                {updating === 'featured' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Price'
                )}
              </Button>
            )}
          </div>

          <div className="text-sm bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 p-3 rounded">
            <p className="font-medium text-blue-900 dark:text-blue-100 mb-1">
              ⭐ What it does:
            </p>
            <p className="text-blue-800 dark:text-blue-200">
              Featured listings appear at the top of search results and category pages with a
              special badge.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Boosted Vacancy Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Boosted Vacancy
          </CardTitle>
          <CardDescription>Priority placement for vacant properties</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <Label htmlFor="boosted-toggle" className="flex flex-col gap-1 cursor-pointer">
              <span className="font-semibold text-base">Enable Boosted Vacancy</span>
              <span className="text-sm text-muted-foreground font-normal">
                {settings.boostedVacancyEnabled
                  ? 'Landlords can boost vacant properties'
                  : 'Boosted listings not available'}
              </span>
            </Label>
            <Switch
              id="boosted-toggle"
              checked={settings.boostedVacancyEnabled}
              onCheckedChange={(checked) =>
                handleToggleChange('boosted', checked, 'Boosted Vacancy')
              }
              disabled={updating === 'boosted'}
            />
          </div>

          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Label htmlFor="boosted-price" className="text-sm font-medium mb-2 block">
                Price per week (KES)
              </Label>
              <Input
                id="boosted-price"
                type="number"
                min="1"
                value={prices.boosted}
                onChange={(e) => setPrices({ ...prices, boosted: Number(e.target.value) })}
                className="w-32"
              />
            </div>
            {prices.boosted !== settings.boostedVacancyPrice && (
              <Button
                onClick={() => handlePriceUpdate('boosted')}
                disabled={updating === 'boosted'}
                size="sm"
                className="mt-6"
              >
                {updating === 'boosted' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Price'
                )}
              </Button>
            )}
          </div>

          <div className="text-sm bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 p-3 rounded">
            <p className="font-medium text-blue-900 dark:text-blue-100 mb-1">🚀 What it does:</p>
            <p className="text-blue-800 dark:text-blue-200">
              Boosted vacant properties appear higher in search results, helping landlords fill
              vacancies faster.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Revenue Stats (only show in paid mode) */}
      {platformMode === 'PAID' && (
        <Card>
          <CardHeader>
            <CardTitle>Revenue Statistics</CardTitle>
            <CardDescription>Track earnings from payment features</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Total Revenue</p>
                <p className="text-3xl font-bold text-foreground">
                  KES {settings.totalRevenue.toLocaleString()}
                </p>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Paid Users</p>
                <p className="text-3xl font-bold text-foreground">{settings.paidUsers}</p>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Featured Listings</p>
                <p className="text-3xl font-bold text-foreground">
                  {settings.featuredListingsCount}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Confirmation Dialog */}
      {confirmDialog && (
        <AlertDialog open={confirmDialog.open} onOpenChange={() => setConfirmDialog(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-500" />
                {confirmDialog.action ? 'Activate' : 'Deactivate'} {confirmDialog.featureName}?
              </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            {confirmDialog.action ? (
              <div className="space-y-2">
                <p>
                  This will immediately enable <strong>{confirmDialog.featureName}</strong> for
                  all users.
                </p>
                <p className="text-yellow-600 dark:text-yellow-500 font-medium">
                  ⚠️ This may affect user experience. Make sure payment systems are ready.
                </p>
              </div>
            ) : (
              <p>
                This will make <strong>{confirmDialog.featureName}</strong> free again for all
                users.
              </p>
            )}
          </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmToggle}>
                {confirmDialog.action ? 'Activate Now' : 'Deactivate'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
