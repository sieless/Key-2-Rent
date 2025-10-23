/**
 * User Location Detection Hook
 * Detects user's location using browser Geolocation API
 * Stores in localStorage for persistence
 */

import { useState, useEffect } from 'react';

interface UserLocation {
  county: string | null;
  coords: {
    latitude: number;
    longitude: number;
  } | null;
  loading: boolean;
  error: string | null;
}

export function useUserLocation() {
  const [location, setLocation] = useState<UserLocation>({
    county: null,
    coords: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    // Check localStorage first
    const savedCounty = localStorage.getItem('userCounty');
    const savedCoords = localStorage.getItem('userCoords');

    if (savedCounty && savedCoords) {
      setLocation({
        county: savedCounty,
        coords: JSON.parse(savedCoords),
        loading: false,
        error: null,
      });
      return;
    }

    // Request location from browser
    if (!navigator.geolocation) {
      setLocation({
        county: null,
        coords: null,
        loading: false,
        error: 'Geolocation is not supported by your browser',
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const coords = { latitude, longitude };

        try {
          // Reverse geocode to get county
          const county = await reverseGeocode(latitude, longitude);

          // Save to localStorage
          localStorage.setItem('userCounty', county);
          localStorage.setItem('userCoords', JSON.stringify(coords));

          setLocation({
            county,
            coords,
            loading: false,
            error: null,
          });
        } catch (error) {
          console.error('Reverse geocoding failed:', error);
          setLocation({
            county: null,
            coords,
            loading: false,
            error: 'Failed to determine county',
          });
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        setLocation({
          county: null,
          coords: null,
          loading: false,
          error: error.message,
        });
      }
    );
  }, []);

  const setManualCounty = (county: string) => {
    localStorage.setItem('userCounty', county);
    setLocation(prev => ({ ...prev, county }));
  };

  const clearLocation = () => {
    localStorage.removeItem('userCounty');
    localStorage.removeItem('userCoords');
    setLocation({
      county: null,
      coords: null,
      loading: false,
      error: null,
    });
  };

  return {
    ...location,
    setCounty: setManualCounty,
    clearLocation,
  };
}

/**
 * Reverse geocode coordinates to Kenyan county
 * Uses OpenStreetMap Nominatim API (free, no API key required)
 */
async function reverseGeocode(lat: number, lon: number): Promise<string> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=en`,
      {
        headers: {
          'User-Agent': 'Timelaine-App',
        },
      }
    );

    if (!response.ok) {
      throw new Error('Geocoding request failed');
    }

    const data = await response.json();

    // Extract county from address components
    const address = data.address;

    // Try different fields that might contain county info
    let county = address.county || address.state || address.province;

    if (!county) {
      // Fallback: Try to extract from display_name
      const parts = data.display_name.split(',').map((p: string) => p.trim());
      county = parts.find((p: string) => p.includes('County')) || parts[parts.length - 2];
    }

    // Clean up county name (remove "County" suffix if present)
    county = county?.replace(/ County$/i, '').trim();

    return county || 'Unknown';
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return 'Unknown';
  }
}

/**
 * Calculate distance between two coordinates (in kilometers)
 * Uses Haversine formula
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance * 10) / 10; // Round to 1 decimal place
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}
