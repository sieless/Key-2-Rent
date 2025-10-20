'use client';

import { Firestore, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { type PlatformSettings, type PaymentFeature } from '@/types';
import { Timestamp } from 'firebase/firestore';

const SETTINGS_DOC_PATH = 'platformSettings/config';

/**
 * Get default platform settings (all features disabled)
 */
export function getDefaultSettings(): PlatformSettings {
  return {
    contactPaymentEnabled: false,
    contactPaymentAmount: 100,
    featuredListingsEnabled: false,
    featuredListingPrice: 500,
    boostedVacancyEnabled: false,
    boostedVacancyPrice: 300,
    lastUpdated: Timestamp.now(),
    updatedBy: 'system',
    totalRevenue: 0,
    paidUsers: 0,
    featuredListingsCount: 0,
  };
}

/**
 * Get current platform settings from Firestore
 * Returns default settings if document doesn't exist
 */
export async function getPlatformSettings(db: Firestore): Promise<PlatformSettings> {
  try {
    const settingsRef = doc(db, SETTINGS_DOC_PATH);
    const settingsSnap = await getDoc(settingsRef);

    if (!settingsSnap.exists()) {
      // Initialize with defaults if doesn't exist
      const defaults = getDefaultSettings();
      await setDoc(settingsRef, defaults);
      return defaults;
    }

    return settingsSnap.data() as PlatformSettings;
  } catch (error) {
    console.error('Error fetching platform settings:', error);
    return getDefaultSettings();
  }
}

/**
 * Initialize platform settings with defaults (if not exists)
 * Safe to call multiple times - won't overwrite existing settings
 */
export async function initializePlatformSettings(db: Firestore): Promise<void> {
  try {
    const settingsRef = doc(db, SETTINGS_DOC_PATH);
    const settingsSnap = await getDoc(settingsRef);

    if (!settingsSnap.exists()) {
      const defaults = getDefaultSettings();
      await setDoc(settingsRef, defaults);
      console.log('Platform settings initialized with defaults');
    }
  } catch (error) {
    console.error('Error initializing platform settings:', error);
  }
}

/**
 * Update a specific payment feature toggle
 * Client-side function - use API route in production for security
 */
export async function updateFeatureToggle(
  db: Firestore,
  feature: PaymentFeature,
  enabled: boolean,
  adminEmail: string
): Promise<void> {
  const settingsRef = doc(db, SETTINGS_DOC_PATH);

  const fieldMap: Record<PaymentFeature, keyof PlatformSettings> = {
    contact: 'contactPaymentEnabled',
    featured: 'featuredListingsEnabled',
    boosted: 'boostedVacancyEnabled',
  };

  await updateDoc(settingsRef, {
    [fieldMap[feature]]: enabled,
    lastUpdated: Timestamp.now(),
    updatedBy: adminEmail,
  });
}

/**
 * Update pricing for a specific feature
 * Client-side function - use API route in production for security
 */
export async function updateFeaturePrice(
  db: Firestore,
  feature: PaymentFeature,
  amount: number,
  adminEmail: string
): Promise<void> {
  const settingsRef = doc(db, SETTINGS_DOC_PATH);

  const fieldMap: Record<PaymentFeature, keyof PlatformSettings> = {
    contact: 'contactPaymentAmount',
    featured: 'featuredListingPrice',
    boosted: 'boostedVacancyPrice',
  };

  await updateDoc(settingsRef, {
    [fieldMap[feature]]: amount,
    lastUpdated: Timestamp.now(),
    updatedBy: adminEmail,
  });
}

/**
 * Helper: Check if platform is in paid mode (any payment feature enabled)
 */
export function isPaidMode(settings: PlatformSettings): boolean {
  return (
    settings.contactPaymentEnabled ||
    settings.featuredListingsEnabled ||
    settings.boostedVacancyEnabled
  );
}

/**
 * Helper: Get platform mode label
 */
export function getPlatformModeLabel(settings: PlatformSettings): 'FREE' | 'PAID' {
  return isPaidMode(settings) ? 'PAID' : 'FREE';
}

/**
 * Helper: Get feature-specific labels and descriptions
 */
export function getFeatureMetadata(feature: PaymentFeature) {
  const metadata = {
    contact: {
      title: 'Contact Payment System',
      icon: '💰',
      description: 'Require users to pay before viewing landlord contact information',
      enabledMessage: 'Users must pay to view contacts',
      disabledMessage: 'All users can view contacts for free',
    },
    featured: {
      title: 'Featured Listings',
      icon: '⭐',
      description: 'Allow landlords to pay for top placement in search results',
      enabledMessage: 'Landlords can feature their listings',
      disabledMessage: 'Featured listings not available',
    },
    boosted: {
      title: 'Boosted Vacancy',
      icon: '🚀',
      description: 'Priority placement for vacant properties',
      enabledMessage: 'Landlords can boost vacant properties',
      disabledMessage: 'Boosted listings not available',
    },
  };

  return metadata[feature];
}
