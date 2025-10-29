// Force dynamic rendering (disable static generation)
export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import ListingDetailClient from './listing-detail-client';
import { buildListingSummaryMessage, getListingSummary } from './listing-metadata';

const BASE_URL = 'https://timelaine.com';

type PageProps = {
  params: {
    id: string;
  };
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const listing = await getListingSummary(params.id);
  const { title, description } = buildListingSummaryMessage(listing);
  const canonical = `${BASE_URL}/listings/${params.id}`;

  const ogImagePath = `/listings/${params.id}/opengraph-image`;
  const openGraphImages = [{ url: ogImagePath }];

  if (listing?.images?.[0]) {
    openGraphImages.push({ url: listing.images[0] });
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
      images: [ogImagePath],
    },
  };
}

export default function ListingDetailPage({ params }: PageProps) {
  return <ListingDetailClient listingId={params.id} />;
}
