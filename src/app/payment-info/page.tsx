'use client';

import Link from 'next/link';

export default function PaymentInfoPage() {
  const supportContact = process.env.NEXT_PUBLIC_VACANCY_SUPPORT_CONTACT ?? '0708674665';

  return (
    <div className="max-w-4xl mx-auto px-6 py-12 space-y-10">
      <header className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight">Featured Listings &amp; Vacancy Payments</h1>
        <p className="text-muted-foreground">
          Understand how premium placement works and what proof is required before your listing goes live.
        </p>
      </header>

      <section className="rounded-lg border bg-card/50 p-6 space-y-4">
        <h2 className="text-xl font-semibold">Billing overview</h2>
        <ul className="space-y-2 text-sm leading-6 text-muted-foreground">
          <li>• Featured listings, billed at <strong>25% of monthly rent per month</strong>, appear in the premium billboard carousel.</li>
          <li>• Vacancy listings pay a <strong>one-time 10% of monthly rent</strong> activation fee before renters can view them.</li>
          <li>• Admins verify every proof submission. Listings stay hidden until the charge is marked as <strong>verified</strong>.</li>
          <li>• A clear screenshot or forward of the M-Pesa message helps the team approve faster.</li>
        </ul>
      </section>

      <section className="rounded-lg border p-6 space-y-4">
        <h2 className="text-xl font-semibold">Submitting proof</h2>
        <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
          <li>Open the payment modal and fill in the text field with your transaction code.</li>
          <li>Upload a screenshot or PDF (max 5MB) that clearly shows the amount and listing ID.</li>
          <li>Submit and wait for an email confirmation once the admins approve.</li>
          <li>Need to nudge us? Contact support with your listing ID and payment reference.</li>
        </ol>
      </section>

      <section className="rounded-lg border bg-muted/40 p-6 space-y-3">
        <h2 className="text-xl font-semibold">Support</h2>
        <p className="text-sm text-muted-foreground">
          Call or WhatsApp <span className="font-semibold text-foreground">{supportContact}</span> if you need direct help.
        </p>
        <div className="flex flex-wrap gap-3 text-sm">
          <Link
            href={`https://wa.me/${supportContact}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-md border border-primary px-4 py-2 font-medium text-primary hover:bg-primary/10"
          >
            Message on WhatsApp
          </Link>
          <Link
            href={`tel:${supportContact}`}
            className="rounded-md border px-4 py-2 font-medium text-foreground hover:bg-muted"
          >
            Call support
          </Link>
        </div>
      </section>
    </div>
  );
}
