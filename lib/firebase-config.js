import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Validate Firebase configuration
function validateConfig() {
  const requiredKeys = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
  const missingKeys = requiredKeys.filter(key => !firebaseConfig[key]);
  
  if (missingKeys.length > 0) {
    console.warn('Missing Firebase configuration keys:', missingKeys);
    return false;
  }
  return true;
}

// Initialize Firebase only once and only on client side
let app;
let auth;
let db;
let storage;
let initialized = false;

// Check if we're on the client side and have valid config
const isClientWithConfig = typeof window !== 'undefined' && validateConfig();

if (isClientWithConfig) {
  try {
    // Check if app already exists
    const apps = getApps();
    if (apps.length === 0) {
      app = initializeApp(firebaseConfig);
    } else {
      app = apps[0]; // Use first existing app
    }
    
    // Initialize services
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
    
    // Connect to emulators in development
    if (process.env.NODE_ENV === 'development' && !process.env.NEXT_PUBLIC_USE_EMULATOR_DISABLED) {
      try {
        if (auth._delegate?._config?.emulator === undefined) {
          connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
        }
        if (db._delegate?._settings?.host?.includes('localhost') === false) {
          connectFirestoreEmulator(db, 'localhost', 8080);
        }
        if (storage._delegate?._host?.includes('localhost') === false) {
          connectStorageEmulator(storage, 'localhost', 9199);
        }
      } catch (emulatorError) {
        // Emulator connection failed - not critical
        console.warn('Failed to connect to emulators:', emulatorError.message);
      }
    }
    
    initialized = true;
    console.log('Firebase initialized successfully');
  } catch (error) {
    console.error('Firebase initialization error:', error);
    // Don't throw - let the app work without Firebase
  }
}

// Helper function to check if Firebase is ready
export const isFirebaseInitialized = () => initialized && !!app && !!auth && !!db;

// Helper function to get Firebase configuration status
export const getFirebaseStatus = () => ({
  initialized,
  hasApp: !!app,
  hasAuth: !!auth,
  hasDb: !!db,
  hasStorage: !!storage,
  configValid: validateConfig()
});

// Helper function to wait for Firebase
export const waitForFirebase = () => {
  return new Promise((resolve) => {
    if (initialized) {
      resolve(true);
    } else {
      // Check every 100ms for up to 5 seconds
      let attempts = 0;
      const checkInterval = setInterval(() => {
        attempts++;
        if (initialized || attempts > 50) {
          clearInterval(checkInterval);
          resolve(initialized);
        }
      }, 100);
    }
  });
};

// Safe getters for Firebase services
export const getFirebaseApp = () => app;
export const getAuth = () => auth;
export const getFirestore = () => db;
export const getStorage = () => storage;

export { app, auth, db, storage };
