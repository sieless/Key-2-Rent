import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  type DocumentData,
  type Firestore,
  type QueryDocumentSnapshot,
  type Unsubscribe,
} from 'firebase/firestore';
import type {
  FeaturedDisplayMode,
  FeaturedProperty,
  Listing,
} from '@/types';

export const FEATURED_PROPERTIES_COLLECTION = 'featured_properties';
export const FEATURED_DEFAULT_DURATION_DAYS = 30;

export type FeaturedPropertyCreateInput = {
  listingId: string;
  featuredBy: string;
  displayMode: FeaturedDisplayMode;
  agreementVerified: boolean;
  durationDays?: number;
  monthlyRent: number;
};

export type FeaturedPropertyUpdateInput = {
  listingId?: string;
  displayMode?: FeaturedDisplayMode;
  featuredBy: string;
  agreementVerified: boolean;
  durationDays?: number;
  monthlyRent?: number;
};

const toFeaturedProperty = (
  snapshot: QueryDocumentSnapshot<DocumentData>,
): FeaturedProperty => ({
  id: snapshot.id,
  ...(snapshot.data() as Omit<FeaturedProperty, 'id'>),
});

const buildEndDate = (days = FEATURED_DEFAULT_DURATION_DAYS) => {
  const end = new Date();
  end.setDate(end.getDate() + days);
  return Timestamp.fromDate(end);
};

const toTimestamp = (date: Date | null) => (date ? Timestamp.fromDate(date) : null);

export const FEATURED_BILLING_RATE = 0.25;

const calculateBillingWindow = (start: Timestamp | null) => {
  if (!start) {
    const now = new Date();
    const billingEnd = new Date(now);
    billingEnd.setMonth(billingEnd.getMonth() + 1);
    return { billingStart: Timestamp.fromDate(now), billingEnd: Timestamp.fromDate(billingEnd) };
  }
  const startDate = start.toDate();
  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + 1);
  return { billingStart: toTimestamp(startDate), billingEnd: toTimestamp(endDate) };
};

export function subscribeToFeaturedProperties(
  db: Firestore,
  handler: (items: FeaturedProperty[]) => void,
): Unsubscribe {
  const featuredRef = collection(db, FEATURED_PROPERTIES_COLLECTION);
  const featuredQuery = query(featuredRef, orderBy('startDate', 'asc'));
  return onSnapshot(featuredQuery, snapshot => {
    const entries = snapshot.docs.map(toFeaturedProperty);
    handler(entries);
  });
}

export async function createFeaturedProperty(
  db: Firestore,
  input: FeaturedPropertyCreateInput,
) {
  if (!input.agreementVerified) {
    throw new Error('Agreement must be verified before featuring a property.');
  }

  const featuredRef = collection(db, FEATURED_PROPERTIES_COLLECTION);
  const nowEndDate = buildEndDate(input.durationDays);
  const monthlyCharge = Math.round(input.monthlyRent * FEATURED_BILLING_RATE);
  const billingWindow = calculateBillingWindow(null);
  await addDoc(featuredRef, {
    listingId: input.listingId,
    featuredBy: input.featuredBy,
    startDate: serverTimestamp(),
    endDate: nowEndDate,
    status: 'active',
    agreementVerified: true,
    displayMode: input.displayMode,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    monthlyRent: input.monthlyRent,
    monthlyCharge,
    billingStart: billingWindow.billingStart,
    billingEnd: billingWindow.billingEnd,
  });
}

export async function renewFeaturedProperty(
  db: Firestore,
  featuredId: string,
  durationDays = FEATURED_DEFAULT_DURATION_DAYS,
) {
  const docRef = doc(db, FEATURED_PROPERTIES_COLLECTION, featuredId);
  await updateDoc(docRef, {
    endDate: buildEndDate(durationDays),
    status: 'active',
    updatedAt: serverTimestamp(),
    billingStart: serverTimestamp(),
    billingEnd: buildEndDate(durationDays),
  });
}

export async function updateFeaturedProperty(
  db: Firestore,
  featuredId: string,
  input: FeaturedPropertyUpdateInput,
) {
  if (!input.agreementVerified) {
    throw new Error('Agreement must be verified before updating a featured property.');
  }

  const docRef = doc(db, FEATURED_PROPERTIES_COLLECTION, featuredId);
  const updates: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
    featuredBy: input.featuredBy,
    agreementVerified: true,
  };

  if (input.listingId) {
    updates.listingId = input.listingId;
    updates.startDate = serverTimestamp();
  }

  if (input.displayMode) {
    updates.displayMode = input.displayMode;
  }

  if (typeof input.monthlyRent === 'number') {
    updates.monthlyRent = input.monthlyRent;
    updates.monthlyCharge = Math.round(input.monthlyRent * FEATURED_BILLING_RATE);
    const billingWindow = calculateBillingWindow(null);
    updates.billingStart = billingWindow.billingStart;
    updates.billingEnd = billingWindow.billingEnd;
  }

  updates.endDate = buildEndDate(input.durationDays);
  updates.status = 'active';
  await updateDoc(docRef, updates);
}

export async function removeFeaturedProperty(db: Firestore, featuredId: string) {
  const docRef = doc(db, FEATURED_PROPERTIES_COLLECTION, featuredId);
  await deleteDoc(docRef);
}

export async function expireFeaturedProperty(
  db: Firestore,
  featuredId: string,
) {
  const docRef = doc(db, FEATURED_PROPERTIES_COLLECTION, featuredId);
  await updateDoc(docRef, {
    status: 'expired',
    updatedAt: serverTimestamp(),
  });
}
