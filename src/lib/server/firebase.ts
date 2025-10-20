import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';

const appInstances = new Map<string, FirebaseApp>();

function getOrCreateApp(name: string): FirebaseApp {
  if (!getApps().length) {
    const defaultApp = initializeApp(firebaseConfig);
    appInstances.set('[DEFAULT]', defaultApp);
  }

  if (name === '[DEFAULT]') {
    return getApp();
  }

  const existing = appInstances.get(name);
  if (existing) {
    return existing;
  }

  const defaultApp = getApp();
  if (defaultApp.name === name) {
    return defaultApp;
  }

  const newApp = initializeApp(firebaseConfig, name);
  appInstances.set(name, newApp);
  return newApp;
}

export function getServerFirestore(name = '[DEFAULT]'): Firestore {
  const app = getOrCreateApp(name);
  return getFirestore(app);
}
