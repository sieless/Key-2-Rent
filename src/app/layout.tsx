import type { Metadata } from 'next';
import './globals.css';
import Script from 'next/script';
import { Toaster } from "@/components/ui/toaster";
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { ThemeProvider } from '@/components/theme-provider';
import { ErrorBoundary } from '@/components/error-boundary';
import { InactivityWarningDialog } from '@/components/inactivity-warning-dialog';
import { Analytics } from '@vercel/analytics/next';
import { PwaInstallPrompt } from '@/components/pwa-install-prompt';

export const metadata: Metadata = {
  metadataBase: new URL('https://timelaine.com'),
  title: 'Timelaine | Find Your Perfect Home in Kenya',
  description: 'Discover rental properties across Kenya. Browse bedsitters, apartments, houses, and commercial spaces in all 47 counties. Connect directly with landlords. Free to search!',
  keywords: ['Kenya rentals', 'property Kenya', 'houses for rent', 'apartments Kenya', 'bedsitter Kenya', 'rental homes', 'Nairobi rentals', 'Machakos rentals', 'Mombasa rentals'],
  authors: [{ name: 'Timelaine' }],
  // Icons are now handled by icon.tsx and apple-touch-icon.tsx
  // Next.js will automatically generate favicons from these files
  manifest: '/manifest.json',
  openGraph: {
    title: 'Timelaine - Property Rentals Across Kenya',
    description: 'Find your perfect rental home in Kenya. Search across all 47 counties.',
    type: 'website',
    url: 'https://timelaine.com',
    siteName: 'Timelaine',
    images: [
      {
        url: 'https://res.cloudinary.com/droibarvx/image/upload/w_1200,h_630/key2rent/logo-og.png',
        width: 1200,
        height: 630,
        alt: 'Timelaine - Find Your Perfect Home in Kenya',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Timelaine - Property Rentals Across Kenya',
    description: 'Find your perfect rental home in Kenya. Search across all 47 counties.',
    images: ['https://res.cloudinary.com/droibarvx/image/upload/w_1200,h_630/key2rent/logo-og.png'],
  },
  alternates: {
    canonical: '/',
  },
};

const localBusinessSchema = {
  '@context': 'https://schema.org',
  '@type': 'RealEstateAgent',
  '@id': 'https://maps.google.com/?cid=10310265339563092206',
  name: 'Timelaine',
  url: 'https://timelaine.com',
  image: 'https://res.cloudinary.com/droibarvx/image/upload/w_1200,h_630/key2rent/logo-og.png',
  telephone: '+254708674665',
  email: 'info@timelaine.com',
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Kimutwa Building, Opp Kpipes (Lau Junction)',
    addressLocality: 'Machakos',
    addressRegion: 'Machakos County',
    addressCountry: 'KE',
  },
  areaServed: {
    '@type': 'City',
    name: 'Machakos, Kenya',
  },
  openingHoursSpecification: [
    {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: [
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
        'Sunday',
      ],
      opens: '00:00',
      closes: '23:59',
    },
  ],
  sameAs: ['https://maps.google.com/?cid=10310265339563092206'],
  contactPoint: [
    {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      email: 'info@timelaine.com',
      telephone: '+254708674665',
    },
    {
      '@type': 'ContactPoint',
      contactType: 'business inquiries',
      email: 'ceo@timelaine.com',
    },
  ],
  priceRange: 'KSh',
} as const;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ErrorBoundary>
            <FirebaseClientProvider>
              {children}
              <InactivityWarningDialog />
              <PwaInstallPrompt />
            </FirebaseClientProvider>
            <Toaster />
            <Analytics />
          </ErrorBoundary>
        </ThemeProvider>
        <Script id="local-business-schema" type="application/ld+json">
          {JSON.stringify(localBusinessSchema)}
        </Script>
      </body>
    </html>
  );
}
