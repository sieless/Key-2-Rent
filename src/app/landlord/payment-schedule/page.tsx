import Link from 'next/link';
import { Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { LandlordListingForm } from '@/components/landlord-listing-form';

export default function LandlordGuidePage() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-12 space-y-12">
      <header className="space-y-3 text-center">
        <p className="text-sm uppercase tracking-widest text-primary">Landlord Resource</p>
        <h1 className="text-4xl font-bold">Become a Confident Landlord</h1>
        <p className="text-muted-foreground max-w-3xl mx-auto">
          Learn how Key-2-Rent listings work, what details you need, and when payments are required. Posting is free for occupied or soon-to-be available properties.
        </p>
      </header>

      <section className="grid gap-6 lg:grid-cols-3">
        <article className="rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="text-2xl font-semibold">Listing Types</h2>
          <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
            <li><strong>Vacant:</strong> Move-in ready homes. Requires a 10% activation payment.</li>
            <li><strong>Occupied:</strong> Already tenanted but collecting leads. Free to publish.</li>
            <li><strong>Available Soon:</strong> Opening up shortly. Free to publish.</li>
          </ul>
        </article>
        <article className="rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="text-2xl font-semibold">Checklist</h2>
          <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
            <li>Property name (optional) and house type</li>
            <li>Estate/location and monthly rent</li>
            <li>Landlord contact phone number</li>
            <li>Clear photos (first image is cover)</li>
            <li>Deposit terms or business rules if needed</li>
          </ul>
        </article>
        <article className="rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="text-2xl font-semibold">Vacant Fees</h2>
          <div className="mt-4 space-y-3 text-sm text-muted-foreground">
            <p><strong>Amount:</strong> 10% of monthly rent (auto-calculated).</p>
            <p><strong>M-Pesa Till:</strong> <span className="font-semibold">6046866</span> (Name: TITUS KIPKIRUI).</p>
            <p><strong>Proof:</strong> Paste the confirmation text or upload a screenshot when prompted.</p>
            <p className="text-xs">After proof review, your listing becomes visible automatically.</p>
          </div>
        </article>
      </section>

      <section className="rounded-xl border bg-muted/20 p-6 lg:p-10 space-y-6">
        <div className="text-center space-y-3">
          <h2 className="text-3xl font-semibold">Create Your Listing</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Fill out the form below. If you mark the property as Vacant, you will be guided through the payment proof submission immediately after posting.
          </p>
        </div>
        <Suspense fallback={<Button disabled>Loading form…</Button>}>
          <LandlordListingForm />
        </Suspense>
      </section>

      <footer className="text-center text-sm text-muted-foreground">
        Need help? <Link className="text-primary underline" href="/contact">Chat with support</Link> for listing tips or payment assistance.
      </footer>
    </div>
  );
}
