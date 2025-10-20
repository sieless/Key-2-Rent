'use client';

import { useEffect, useState, useCallback } from 'react';
import { db, isFirebaseInitialized, getFirebaseStatus } from '@/lib/firebase-config';
import { collection, query, onSnapshot, QueryConstraint, doc, getDoc, DocumentReference } from 'firebase/firestore';

interface FirestoreHookResult<T = any> {
  data: T[];
  loading: boolean;
  error: Error | null;
  retry: () => void;
}

interface FirestoreDocResult<T = any> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  retry: () => void;
}

export function useFirestoreCollection<T = any>(
  collectionName: string,
  constraints: QueryConstraint[] = [],
  enabled: boolean = true
): FirestoreHookResult<T> {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const retry = useCallback(() => {
    setRetryCount(prev => prev + 1);
    setError(null);
    setLoading(true);
  }, []);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    const status = getFirebaseStatus();
    if (!status.initialized || !status.hasDb || !db) {
      setLoading(false);
      if (status.configValid === false) {
        setError(new Error('Firebase configuration is invalid'));
      }
      return;
    }

    let unsubscribe: (() => void) | null = null;
    let retryTimeout: NodeJS.Timeout;

    const setupListener = () => {
      try {
        const q = query(collection(db, collectionName), ...constraints);
        
        unsubscribe = onSnapshot(
          q,
          (snapshot) => {
            const items = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            })) as T[];
            setData(items);
            setLoading(false);
            setError(null);
          },
          (err) => {
            console.error(`Error fetching ${collectionName}:`, err);
            setError(err);
            setLoading(false);
            
            // Retry logic for network errors
            if (err.code === 'unavailable' && retryCount < 3) {
              retryTimeout = setTimeout(() => {
                console.log(`Retrying ${collectionName} listener...`);
                setRetryCount(prev => prev + 1);
              }, Math.min(1000 * Math.pow(2, retryCount), 10000));
            }
          }
        );
      } catch (err) {
        console.error(`Error setting up ${collectionName} listener:`, err);
        setError(err as Error);
        setLoading(false);
      }
    };

    setupListener();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
    };
  }, [collectionName, enabled, retryCount]);

  return { data, loading, error, retry };
}

export function useFirestoreDoc<T = any>(
  docRef: DocumentReference | string,
  enabled: boolean = true
): FirestoreDocResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const retry = useCallback(() => {
    setRetryCount(prev => prev + 1);
    setError(null);
    setLoading(true);
  }, []);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    const status = getFirebaseStatus();
    if (!status.initialized || !status.hasDb || !db) {
      setLoading(false);
      if (status.configValid === false) {
        setError(new Error('Firebase configuration is invalid'));
      }
      return;
    }

    const fetchDoc = async () => {
      try {
        const docReference = typeof docRef === 'string' ? doc(db, docRef) : docRef;
        const docSnap = await getDoc(docReference);
        
        if (docSnap.exists()) {
          setData({ id: docSnap.id, ...docSnap.data() } as T);
        } else {
          setData(null);
        }
        setLoading(false);
        setError(null);
      } catch (err) {
        console.error('Error fetching document:', err);
        setError(err as Error);
        setLoading(false);
      }
    };

    fetchDoc();
  }, [docRef, enabled, retryCount]);

  return { data, loading, error, retry };
}
