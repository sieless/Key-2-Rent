'use client';

import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { type PlatformSettings } from '@/types';
import { getDefaultSettings } from '@/services/platform-settings';

/**
 * Hook to access platform settings with real-time updates
 *
 * Returns:
 * - settings: Current platform settings (or null while loading)
 * - loading: Boolean indicating if initial load is in progress
 * - error: Error object if fetch failed
 *
 * Usage:
 * ```tsx
 * const { settings, loading, error } = usePlatformSettings();
 *
 * if (loading) return <Spinner />;
 * if (error) return <Error />;
 * if (settings?.contactPaymentEnabled) {
 *   // Show payment prompt
 * }
 * ```
 */
export function usePlatformSettings() {
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const db = useFirestore();

  useEffect(() => {
    if (!db) {
      setSettings(getDefaultSettings());
      setLoading(false);
      return;
    }

    const settingsRef = doc(db, 'platformSettings/config');

    const unsubscribe = onSnapshot(
      settingsRef,
      (snapshot) => {
        try {
          if (snapshot.exists()) {
            setSettings(snapshot.data() as PlatformSettings);
          } else {
            // Initialize with defaults if doesn't exist
            setSettings(getDefaultSettings());
          }
          setLoading(false);
          setError(null);
        } catch (err) {
          console.error('Error processing platform settings:', err);
          setError(err as Error);
          setSettings(getDefaultSettings()); // Fallback to defaults
          setLoading(false);
        }
      },
      (err) => {
        console.error('Error listening to platform settings:', err);
        setError(err as Error);
        setSettings(getDefaultSettings()); // Fallback to defaults
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [db]);

  return { settings, loading, error };
}

/**
 * Hook to check if a specific payment feature is enabled
 * Convenience wrapper around usePlatformSettings
 *
 * Usage:
 * ```tsx
 * const contactPaymentEnabled = useFeatureEnabled('contact');
 * if (contactPaymentEnabled) {
 *   // Show payment gate
 * }
 * ```
 */
export function useFeatureEnabled(feature: 'contact' | 'featured' | 'boosted'): boolean {
  const { settings } = usePlatformSettings();

  if (!settings) return false;

  const featureMap = {
    contact: settings.contactPaymentEnabled,
    featured: settings.featuredListingsEnabled,
    boosted: settings.boostedVacancyEnabled,
  };

  return featureMap[feature];
}
