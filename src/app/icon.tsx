import { ImageResponse } from 'next/og'

const ICON_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAB/UlEQVR4nO2VMUsDQRSE99CAFtY2KiJYCJb+F1t7azs7LcQfIHZ21v4PW8FCEFFsbC2MRBK/N7BLLtm97F6CscjAMm9m5723HgErN2csHjDVAwagApStkdXMngEksE89WMEzYMsvRVYTu2xZj9NhT4U0HZYia7oEWQ3M1wIP9oz1EVGGq7G7JmSFma3hBuYne4gdOeduOI25YUwMMXQACcxM5omFHySlepDSTWgMMCd7ENF9Yg+UAlq9oIu/CkeRHEy/BtCczHgQ3SP2CKsnBu6jc6JmKdgbPn8MXCfvo2YJmJ0cnoPWjQZ2T7Xc0LqZ3VMvNxQNYOcy1GNvUV8TkoNYNvqLXmfvBzxTJB/wVwj/WDz4K+VB2Y8jHs1jR/1hhEuyE8Mp0Nq6NzQxQ0OgE+QlpdXes6+0w3lGei0gpSEx1jvlBqXVhk/OGmfbOffCnc8JFUfA0xDKUENJJuYox/JIwxXyGBl8qMZk1K8BBjxdUoYaGuUfaBmWJiogpSEb3OdcIxsfABnfhSGloPmVGVuUAXjneKfwBfKL0+F8453BNZDRI1o/YFb4Xw/gq+zyUZ5gfR4s81RDYqxh7wB5T2m19zyvQF24T8b6NjlveFYH1ARh32w/Jv1KKVV7YMmD1Eupe6T5t5RLlIew7qjNV8aAVJ9HTcwDiwfM/QG/7j5s2RSaXz0AAAAASUVORK5CYII='

// Image metadata
export const size = {
  width: 32,
  height: 32,
}
export const contentType = 'image/png'

// Image generation
export default function Icon() {
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
          src={ICON_DATA_URL}
          alt="Timelaine favicon"
          style={{ width: '90%', height: '90%', objectFit: 'contain' }}
        />
      </div>
    ),
    {
      ...size,
      background: 'transparent',
    }
  )
}
