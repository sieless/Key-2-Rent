import { initializeApp, getApps, App, ServiceAccount } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

// Firebase Admin SDK configuration
const firebaseAdminConfig: ServiceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

let adminApp: App | null = null;

// Initialize Firebase Admin SDK only once
export function getFirebaseAdmin() {
  try {
    // Check if already initialized
    const existingApps = getApps();
    if (existingApps.length > 0) {
      adminApp = existingApps[0];
      return adminApp;
    }

    // Validate required environment variables
    if (!firebaseAdminConfig.projectId || !firebaseAdminConfig.clientEmail || !firebaseAdminConfig.privateKey) {
      console.warn('Firebase Admin configuration incomplete - some server features may not work');
      return null;
    }

    // Initialize the app
    adminApp = initializeApp({
      credential: firebaseAdminConfig,
      projectId: firebaseAdminConfig.projectId,
    });

    console.log('Firebase Admin SDK initialized successfully');
    return adminApp;
  } catch (error) {
    console.error('Failed to initialize Firebase Admin SDK:', error);
    return null;
  }
}

// Get Admin Firestore instance
export function getAdminFirestore() {
  const app = getFirebaseAdmin();
  if (!app) {
    throw new Error('Firebase Admin not initialized');
  }
  return getFirestore(app);
}

// Get Admin Auth instance
export function getAdminAuth() {
  const app = getFirebaseAdmin();
  if (!app) {
    throw new Error('Firebase Admin not initialized');
  }
  return getAuth(app);
}

// Helper to verify if admin is available
export function isAdminAvailable() {
  return !!adminApp || getApps().length > 0;
}