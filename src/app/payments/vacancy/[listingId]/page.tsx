'use client';

// Force dynamic rendering for live payment instructions.
export const dynamic = 'force-dynamic';

import { use, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Phone, MessageSquare } from 'lucide-react';

type VacancyPaymentPageProps = {
  params: {
    listingId: string;
  };
};

const SUPPORT_CONTACT = process.env.NEXT_PUBLIC_VACANCY_SUPPORT_CONTACT ?? '0708674665';

export default function VacancyPaymentPage({ params }: VacancyPaymentPageProps) {
  const { listingId } = use(params);
  // Prepare contextual details for the landlord dashboard.
  const supportActions = useMemo(
    () => [
      {
        label: 'Message on WhatsApp',
        href: `https://wa.me/${SUPPORT_CONTACT}?text=${encodeURIComponent('Hi, I have submitted a vacancy listing on Key-2-Rent and would like to confirm payment for publishing.')}`,
        icon: MessageSquare,
      },
      {
        label: 'Call support',
        href: `tel:${SUPPORT_CONTACT}`,
        icon: Phone,
      },
    ],
    []
  );

  return (
    <div className="min-h-screen bg-muted/30 py-12">
      <div className="max-w-3xl mx-auto px-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Vacancy payment required</CardTitle>
            <CardDescription>
              Listing <Badge variant="secondary" className="ml-2">{listingId}</Badge> is waiting for payment confirmation before it goes live to renters.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>
              Pay the vacancy activation fee using the official M-Pesa Buy Goods till{' '}
              <strong>6046866</strong> (Account name: <strong>TITUS KIPKIRUI</strong>). After payment, share your transaction code with landlord support so we can verify and publish the listing.
            </p>
            <Alert>
              <AlertDescription>
                Keep this page open until you confirm the payment with our team. Once verified, the listing automatically moves to the admin queue for final approval.
              </AlertDescription>
            </Alert>
            <div className="space-y-2">
              <p className="font-semibold text-foreground">Need assistance?</p>
              <div className="grid sm:grid-cols-2 gap-2">
                {supportActions.map(({ label, href, icon: Icon }) => (
                  <Button key={label} asChild variant="outline" className="justify-start gap-2">
                    <Link href={href} target="_blank" rel="noreferrer">
                      <Icon className="h-4 w-4" />
                      {label}
                    </Link>
                  </Button>
                ))}
              </div>
            </div>
            <p>
              Want to review the pricing structure again?{' '}
              <Link href="/landlord/payment-schedule" className="underline">
                View the vacancy payment schedule
              </Link>
              .
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Button asChild>
                <Link href="/my-listings">Return to My Listings</Link>
              </Button>
              <Button asChild variant="secondary">
                <Link href="/admin">Contact admin team</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
