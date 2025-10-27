import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { ThemeProvider } from '@/components/theme-provider';
import { ErrorBoundary } from '@/components/error-boundary';
import { InactivityWarningDialog } from '@/components/inactivity-warning-dialog';
import { Analytics } from '@vercel/analytics/next';

export const metadata: Metadata = {
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
};

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
            </FirebaseClientProvider>
            <Toaster />
            <Analytics />
          </ErrorBoundary>
        </ThemeProvider>
      </body>
    </html>
  );
}
