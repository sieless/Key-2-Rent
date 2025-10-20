'use client';

import React, { useMemo, useState, useEffect, type ReactNode } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

// Global singleton to ensure Firebase is only initialized once
let firebaseServices: ReturnType<typeof initializeFirebase> | null = null;
let initializationPromise: Promise<ReturnType<typeof initializeFirebase> | null> | null = null;

async function getFirebaseServices(): Promise<ReturnType<typeof initializeFirebase> | null> {
  // Return cached services if already initialized
  if (firebaseServices) {
    return firebaseServices;
  }

  // Return existing promise if initialization is in progress
  if (initializationPromise) {
    return initializationPromise;
  }

  // Create new initialization promise
  initializationPromise = new Promise((resolve) => {
    try {
      // Detect React Strict Mode double rendering in development
      const isDev = process.env.NODE_ENV === 'development';
      if (isDev) {
        console.log('FirebaseClientProvider: Development mode detected - ensuring singleton initialization');
      }
      
      console.log('FirebaseClientProvider: Attempting to initialize Firebase...');
      const services = initializeFirebase();
      firebaseServices = services;
      console.log('FirebaseClientProvider: Firebase initialized successfully');
      resolve(services);
    } catch (error) {
      console.error('FirebaseClientProvider: Failed to initialize Firebase:', error);
      
      // Check if it's a configuration error
      if (error instanceof Error && error.message.includes('Missing required Firebase configuration')) {
        console.error('FirebaseClientProvider: Please check your .env.local file');
      }
      
      initializationPromise = null; // Reset promise on error to allow retry
      resolve(null); // Don't reject to allow app to continue
    }
  });

  return initializationPromise;
}

export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  const [isClient, setIsClient] = useState(false);
  const [services, setServices] = useState<ReturnType<typeof initializeFirebase> | null>(null);

  // Only initialize Firebase on the client side
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Initialize Firebase services once client-side
  useEffect(() => {
    if (isClient && typeof window !== 'undefined') {
      getFirebaseServices().then(setServices);
    }
  }, [isClient]);

  const memoizedServices = useMemo(() => {
    return services;
  }, [services]);

  // Always render with FirebaseProvider, even if services aren't ready
  // The provider will handle null services gracefully
  return (
    <FirebaseProvider
      firebaseApp={memoizedServices?.firebaseApp || null as any}
      auth={memoizedServices?.auth || null as any}
      firestore={memoizedServices?.firestore || null as any}
    >
      {children}
    </FirebaseProvider>
  );
}