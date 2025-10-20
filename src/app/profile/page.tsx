'use client';

export const dynamic = 'force-dynamic';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { useCurrentUserProfile } from '@/hooks/use-user-profile';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Mail, Phone, MapPin, Building2, Bell } from 'lucide-react';
import Link from 'next/link';

export default function ProfilePage() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const { profile, isLoading } = useCurrentUserProfile();

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.replace('/login');
    }
  }, [isUserLoading, user, router]);

  if (!user) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-10 px-4 max-w-2xl">
        <div className="text-center py-12">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading your profile…</p>
        </div>
      </div>
    );
  }

  const displayName = profile?.name || user.displayName || 'Unnamed user';
  const email = profile?.email || user.email || 'Not provided';
  const phone = profile?.phoneNumber || profile?.landlordSettings?.contactPhone || user.phoneNumber || 'Not provided';
  const county = profile?.preferredCounty || 'Not set';
  const accountType = profile?.accountType || 'tenant';
  const experienceLevel = profile?.experienceLevel || 'new';

  return (
    <div className="container mx-auto py-10 px-4 max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">My Profile</h1>
          <p className="text-muted-foreground">Manage how you appear on Key-2-Rent.</p>
        </div>
        <Button asChild>
          <Link href="/profile/edit">Edit profile</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-semibold">Account overview</CardTitle>
          <CardDescription>Your personal information and contact details.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2">
            <span className="text-sm text-muted-foreground">Name</span>
            <span className="text-lg font-medium">{displayName}</span>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-sm text-muted-foreground flex items-center gap-2">
              <Mail className="h-4 w-4" /> Email
            </span>
            <span>{email}</span>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-sm text-muted-foreground flex items-center gap-2">
              <Phone className="h-4 w-4" /> Phone number
            </span>
            <span>{phone}</span>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-sm text-muted-foreground flex items-center gap-2">
              <MapPin className="h-4 w-4" /> Preferred county
            </span>
            <span>{county}</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" /> Landlord status
            </CardTitle>
            <CardDescription>Your current landlord access level.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Badge className="bg-primary/10 text-primary">{accountType}</Badge>
            <p className="text-sm text-muted-foreground">
              Experience level: <span className="font-medium capitalize">{experienceLevel}</span>
            </p>
            <Button asChild variant="outline" className="w-full">
              <Link href="/landlord/payment-schedule">Landlord guide</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" /> Notifications
            </CardTitle>
            <CardDescription>Your communication preferences.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Listing alerts: <span className="font-medium">{profile?.notificationPreferences?.listingAlerts ? 'Enabled' : 'Disabled'}</span>
            </p>
            <p className="text-sm text-muted-foreground">
              Payment reminders: <span className="font-medium">{profile?.notificationPreferences?.paymentReminders ? 'Enabled' : 'Disabled'}</span>
            </p>
            <p className="text-sm text-muted-foreground">
              Marketing updates: <span className="font-medium">{profile?.notificationPreferences?.marketingUpdates ? 'Enabled' : 'Disabled'}</span>
            </p>
            <Button asChild variant="outline" className="w-full">
              <Link href="/profile/edit#notifications">Update preferences</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
