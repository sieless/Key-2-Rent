"use client";

import dynamic from 'next/dynamic';

const AddListingModal = dynamic(() => import('@/components/add-listing-modal').then(mod => mod.AddListingModal), {
  ssr: false,
});

export function LandlordListingForm() {
  return <AddListingModal renderInline />;
}
