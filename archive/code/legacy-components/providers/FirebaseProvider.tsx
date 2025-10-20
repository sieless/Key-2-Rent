'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { auth, db, storage, isFirebaseInitialized, waitForFirebase, getFirebaseStatus } from '@/lib/firebase-config';
import { User } from 'firebase/auth';

interface FirebaseContextType {
  user: User | null;
  loading: boolean;
  error: Error | null;
  isInitialized: boolean;
  services: {
    auth: any;
    db: any;
    storage: any;
  } | null;
}

const FirebaseContext = createContext<FirebaseContextType>({
  user: null,
  loading: true,
  error: null,
  isInitialized: false,
  services: null,
});

export const useFirebase = () => useContext(FirebaseContext);

// Compatibility hook for existing code
export const useFirebaseCompat = () => {
  const context = useContext(FirebaseContext);
  return {
    ...context,
    auth: context.services?.auth || null,
    db: context.services?.db || null,
    storage: context.services?.storage || null,
  };
};

export function FirebaseProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [services, setServices] = useState<any>(null);

  useEffect(() => {
    const initializeFirebase = async () => {
      try {
        // Wait for Firebase to be ready
        const ready = await waitForFirebase();
        const status = getFirebaseStatus();
        
        if (!ready || !status.configValid) {
          console.warn('Firebase could not be initialized - running in offline mode');
          setLoading(false);
          return;
        }

        setIsInitialized(true);
        setServices({ auth, db, storage });

        // Set up auth listener
        if (auth) {
          const unsubscribe = auth.onAuthStateChanged(
            (user) => {
              setUser(user);
              setLoading(false);
            },
            (error) => {
              console.error('Auth state change error:', error);
              setError(error);
              setLoading(false);
            }
          );

          return () => unsubscribe();
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.error('Firebase initialization error:', err);
        setError(err as Error);
        setLoading(false);
      }
    };

    initializeFirebase();
  }, []);

  return (
    <FirebaseContext.Provider value={{ user, loading, error, isInitialized, services }}>
      {children}
    </FirebaseContext.Provider>
  );
}
