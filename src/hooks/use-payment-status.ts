/**
 * Payment Status Hook
 * Checks if user has active contact access subscription
 */

import { useState, useEffect } from 'react';
import { doc, getDoc, Timestamp } from 'firebase/firestore';
import { useFirestore, useUser } from '@/firebase';

interface PaymentStatus {
  canViewContacts: boolean;
  contactAccessExpiresAt: Date | null;
  daysRemaining: number;
  needsRenewal: boolean;
  loading: boolean;
}

export function usePaymentStatus(): PaymentStatus {
  const { user } = useUser();
  const db = useFirestore();
  const [status, setStatus] = useState<PaymentStatus>({
    canViewContacts: false,
    contactAccessExpiresAt: null,
    daysRemaining: 0,
    needsRenewal: false,
    loading: true,
  });

  useEffect(() => {
    if (!user || !db) {
      setStatus({
        canViewContacts: false,
        contactAccessExpiresAt: null,
        daysRemaining: 0,
        needsRenewal: false,
        loading: false,
      });
      return;
    }

    async function checkPaymentStatus() {
      try {
        const firestore = db;
        if (!firestore) {
          throw new Error('Database unavailable');
        }

        if (!user) {
          return;
        }

        const userDoc = await getDoc(doc(firestore, 'users', user.uid));

        if (!userDoc.exists()) {
          setStatus({
            canViewContacts: false,
            contactAccessExpiresAt: null,
            daysRemaining: 0,
            needsRenewal: false,
            loading: false,
          });
          return;
        }

        const userData = userDoc.data();
        const canViewContacts = userData.canViewContacts || false;
        const expiresAtTimestamp = userData.contactAccessExpiresAt as Timestamp | undefined;

        if (!canViewContacts || !expiresAtTimestamp) {
          setStatus({
            canViewContacts: false,
            contactAccessExpiresAt: null,
            daysRemaining: 0,
            needsRenewal: true,
            loading: false,
          });
          return;
        }

        const expiresAt = expiresAtTimestamp.toDate();
        const now = new Date();
        const daysRemaining = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        // Check if expired
        if (daysRemaining <= 0) {
          setStatus({
            canViewContacts: false,
            contactAccessExpiresAt: expiresAt,
            daysRemaining: 0,
            needsRenewal: true,
            loading: false,
          });
          return;
        }

        setStatus({
          canViewContacts: true,
          contactAccessExpiresAt: expiresAt,
          daysRemaining,
          needsRenewal: daysRemaining <= 3, // Show renewal prompt if 3 days or less
          loading: false,
        });

      } catch (error) {
        console.error('Error checking payment status:', error);
        setStatus({
          canViewContacts: false,
          contactAccessExpiresAt: null,
          daysRemaining: 0,
          needsRenewal: false,
          loading: false,
        });
      }
    }

    checkPaymentStatus();
  }, [user, db]);

  return status;
}
