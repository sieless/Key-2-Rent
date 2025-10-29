import { ImageResponse } from 'next/og';
import { buildListingSummaryMessage, getListingSummary } from './listing-metadata';

export const runtime = 'edge';

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = 'image/png';

export default async function ListingOpenGraphImage({ params }: { params: { id: string } }) {
  const listing = await getListingSummary(params.id);
  const { title, description } = buildListingSummaryMessage(listing);

  const typeLabel = listing?.type || 'Rental Property';
  const locationLabel = listing?.location || 'Across Kenya';
  const isForSale = listing?.status === 'For Sale';
  const priceValue = isForSale ? listing?.salePrice : listing?.price;
  const priceLabel = typeof priceValue === 'number'
    ? `Ksh ${priceValue.toLocaleString()}${isForSale ? '' : ' / month'}`
    : 'Price on request';

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          width: '100%',
          height: '100%',
          padding: '60px',
          background: 'linear-gradient(135deg, #0f172a 15%, #1e3a8a 85%)',
          color: '#f8fafc',
          fontFamily: 'Inter, Segoe UI, sans-serif',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 48, fontWeight: 700 }}>Timelaine</div>
          <div
            style={{
              padding: '8px 22px',
              borderRadius: 999,
              border: '1px solid rgba(248, 250, 252, 0.3)',
              backgroundColor: 'rgba(15, 23, 42, 0.35)',
              fontSize: 24,
              fontWeight: 600,
            }}
          >
            {isForSale ? 'For Sale' : 'For Rent'}
          </div>
        </div>

        <div style={{ marginTop: 40 }}>
          <div style={{ fontSize: 28, opacity: 0.85, marginBottom: 12 }}>Featured {typeLabel}</div>
          <div style={{ fontSize: 64, fontWeight: 800, lineHeight: 1.05 }}>{title}</div>
          <div style={{ fontSize: 30, marginTop: 24 }}>{locationLabel}</div>
          <div style={{ fontSize: 36, fontWeight: 700, marginTop: 16, color: '#facc15' }}>{priceLabel}</div>
          <div style={{ fontSize: 24, opacity: 0.8, marginTop: 24 }}>{description}</div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 24, opacity: 0.9 }}>
          <span>Explore more rentals at timelaine.com</span>
          <span style={{ fontWeight: 600 }}>#FindYourNextHome</span>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
