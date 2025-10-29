import { cache } from 'react';
import { getAdminFirestore } from '@/lib/firebase-admin';

export type ListingSummary = {
  name?: string;
  type?: string;
  location?: string;
  price?: number;
  salePrice?: number;
  status?: string;
  images?: string[];
};

export const getListingSummary = cache(async (id: string): Promise<ListingSummary | null> => {
  if (!id) return null;

  try {
    const firestore = getAdminFirestore();
    const snapshot = await firestore.collection('listings').doc(id).get();
    if (!snapshot.exists) {
      return null;
    }

    const data = snapshot.data() as ListingSummary | undefined;
    if (!data) {
      return null;
    }

    return {
      name: data.name,
      type: data.type,
      location: data.location,
      price: typeof data.price === 'number' ? data.price : undefined,
      salePrice: typeof data.salePrice === 'number' ? data.salePrice : undefined,
      status: data.status,
      images: Array.isArray(data.images) ? data.images.filter((item): item is string => typeof item === 'string') : undefined,
    };
  } catch (error) {
    console.error('Failed to load listing metadata', error);
    return null;
  }
});

export function buildListingSummaryMessage(listing: ListingSummary | null) {
  if (!listing) {
    return {
      title: 'Timelaine | Find Your Perfect Home in Kenya',
      description: 'Discover rental listings across Kenya including bedsitters, single rooms, apartments, and business spaces.',
    };
  }

  const typeLabel = listing.type || 'Property';
  const locationLabel = listing.location || 'Kenya';
  const isForSale = listing.status === 'For Sale';
  const price = isForSale ? listing.salePrice : listing.price;
  const priceLabel = typeof price === 'number'
    ? `Ksh ${price.toLocaleString()}${isForSale ? '' : ' per month'}`
    : null;

  const title = `${typeLabel} in ${locationLabel} | Timelaine`;
  const description = [
    priceLabel ? `${typeLabel} available at ${priceLabel}.` : `${typeLabel} available now.`,
    'Browse more rentals on Timelaine.',
  ].join(' ');

  return { title, description };
}
