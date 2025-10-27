import type { Listing } from '@/types';

const COUNTRY_CODE = '254';

function normalizePhoneNumber(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const digits = raw.replace(/[^0-9]/g, '');
  if (!digits) return null;

  if (digits.startsWith(COUNTRY_CODE)) {
    return digits;
  }

  if (digits.startsWith('0') && digits.length === 10) {
    return `${COUNTRY_CODE}${digits.slice(1)}`;
  }

  return digits.length >= 9 ? digits : null;
}

function buildMessage(listing: Pick<Listing, 'name' | 'type' | 'location' | 'price' | 'status' | 'salePrice'>): string {
  const propertyLabel = listing.name?.trim() || `${listing.type} in ${listing.location}`;
  const isForSale = listing.status === 'For Sale';

  const priceValue = isForSale
    ? typeof listing.salePrice === 'number' ? listing.salePrice : undefined
    : Number.isFinite(listing.price) ? listing.price : undefined;

  let formattedPrice = '';
  if (typeof priceValue === 'number') {
    const priceText = `Ksh ${priceValue.toLocaleString()}`;
    formattedPrice = isForSale
      ? ` listed for sale at ${priceText}`
      : ` listed at ${priceText} per month`;
  }

  const closing = isForSale
    ? 'I am very interested—could we discuss the purchase details and schedule a viewing?'
    : 'I\'m very interested—could we discuss the rental terms and schedule a viewing?';

  return `Hello! I came across your ${propertyLabel} on Timelaine and wanted to confirm if it is still available${formattedPrice}. ${closing}`;
}

export function getListingWhatsAppLink(listing: Listing): string | null {
  const phone = normalizePhoneNumber(listing.contact);
  if (!phone) return null;
  const message = buildMessage(listing);
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

export function getListingWhatsAppMessage(listing: Listing): string {
  return buildMessage(listing);
}
