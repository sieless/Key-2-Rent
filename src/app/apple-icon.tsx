import { ImageResponse } from 'next/og'

const APPLE_ICON_DATA_URL =
  'data:image/png;base64,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'

// Image metadata
export const size = {
  width: 180,
  height: 180,
}
export const contentType = 'image/png'

// Image generation
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'transparent',
        }}
      >
        <img
          src={APPLE_ICON_DATA_URL}
          alt="Timelaine app icon"
          style={{ width: '92%', height: '92%', objectFit: 'contain' }}
        />
      </div>
    ),
    {
      ...size,
      background: 'transparent',
    }
  )
}
