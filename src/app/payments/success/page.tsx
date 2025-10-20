'use client';

import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';

export default function PaymentSuccessPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 px-6 py-12">
      <div className="w-full max-w-md space-y-6 rounded-2xl border bg-card p-8 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <CheckCircle2 className="h-8 w-8 text-primary" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">Payment confirmation received</h1>
          <p className="text-sm text-muted-foreground">
            Thanks for confirming your listing payment. Our team will verify the transaction and activate the listing shortly.
          </p>
        </div>
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>Your listing will appear as public once verification is complete. You can monitor the status from your dashboard.</p>
          <p>
            Need to review the policy again?{' '}
            <Link href="/payment-info" className="font-semibold text-primary underline">
              Read payment rules
            </Link>
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Link
            href="/my-listings"
            className="flex-1 rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            Back to My Listings
          </Link>
          <Link
            href="/admin"
            className="flex-1 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Contact support
          </Link>
        </div>
      </div>
    </div>
  );
}
