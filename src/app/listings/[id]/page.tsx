// Force dynamic rendering (disable static generation)
export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import ListingDetailClient from './listing-detail-client';
import { buildListingSummaryMessage, getListingSummary } from './listing-metadata';

const BASE_URL = 'https://timelaine.com';

type PageParams = Promise<{ id: string }> | { id: string };

export async function generateMetadata({ params }: { params: PageParams }): Promise<Metadata> {
  const { id } = await params;
  const listing = await getListingSummary(id);
  const { title, description } = buildListingSummaryMessage(listing);
  const canonical = `${BASE_URL}/listings/${id}`;
  const openGraphImages: { url: string }[] = [];

  if (listing?.images?.[0]) {
    openGraphImages.push({ url: listing.images[0] });
  } else {
    openGraphImages.push({ url: 'https://res.cloudinary.com/droibarvx/image/upload/w_1200,h_630/key2rent/logo-og.png' });
  }

  return {
    title,
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: 'Timelaine',
      type: 'article',
      images: openGraphImages,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: openGraphImages.map(image => image.url),
    },
  };
}

export default function ListingDetailPage({ params }: { params: { id: string } }) {
  return <ListingDetailClient listingId={params.id} />;
}
