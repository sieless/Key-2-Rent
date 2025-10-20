'use client';

export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { Button } from '@/components/ui/button';

export default function BecomeLandlordPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header onPostClick={() => {}} />
      <main className="flex-1 bg-muted/20 py-12">
        <div className="mx-auto flex max-w-4xl flex-col gap-6 px-6 text-center">
          <span className="text-xs font-semibold uppercase tracking-[0.4em] text-primary">
            Landlord Resource
          </span>
          <h1 className="text-4xl font-bold">List properties without extra steps</h1>
          <p className="text-muted-foreground">
            Landlord verification is no longer required. Review the landlord guide to understand listing types,
            what information to collect, and how vacant property payments work.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link href="/landlord/payment-schedule">Open landlord guide</Link>
            </Button>
            <Button asChild size="lg" variant="ghost">
              <Link href="/my-listings">Go to my listings</Link>
            </Button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
