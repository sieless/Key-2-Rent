import { useEffect, useState } from 'react';
import { doc, onSnapshot, type FirestoreError } from 'firebase/firestore';
import { useFirestore, useUser } from '@/firebase';
import { type UserProfile } from '@/types';

type UserProfileHookState = {
  profile: UserProfile | null;
  loading: boolean;
  error: FirestoreError | null;
};

export function useUserProfile(): UserProfileHookState {
  const { user } = useUser();
  const db = useFirestore();
  const [state, setState] = useState<UserProfileHookState>({
    profile: null,
    loading: !!user,
    error: null,
  });

  useEffect(() => {
    if (!user || !db) {
      setState({ profile: null, loading: false, error: null });
      return;
    }

    const userRef = doc(db, 'users', user.uid);

    const unsubscribe = onSnapshot(
      userRef,
      snapshot => {
        if (!snapshot.exists()) {
          setState({ profile: null, loading: false, error: null });
          return;
        }

        const data = snapshot.data() as Partial<UserProfile>;
        const normalized: UserProfile = {
          id: snapshot.id,
          email: data.email ?? '',
          name: data.name ?? '',
          listings: data.listings ?? [],
          canViewContacts: data.canViewContacts ?? false,
          accountType: data.accountType ?? 'tenant',
          experienceLevel: data.experienceLevel,
          phoneNumber: data.phoneNumber,
          preferredCounty: data.preferredCounty,
          createdAt: data.createdAt,
          suspended: data.suspended,
        };

        setState({ profile: normalized, loading: false, error: null });
      },
      error => {
        setState({ profile: null, loading: false, error });
      }
    );

    return () => unsubscribe();
  }, [user, db]);

  return state;
}

export const useCurrentUserProfile = useUserProfile;
