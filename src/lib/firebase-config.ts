import type { FirebaseApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import type { FirebaseStorage } from 'firebase/storage';

type FirebaseExports = typeof import('../../lib/firebase-config');

const firebase = require('../../lib/firebase-config') as FirebaseExports;

export const app: FirebaseApp | undefined = (firebase.app as FirebaseApp | undefined);
export const auth: Auth | undefined = (firebase.auth as Auth | undefined);
export const db: Firestore | undefined = (firebase.db as Firestore | undefined);
export const storage: FirebaseStorage | undefined = (firebase.storage as FirebaseStorage | undefined);

export const isFirebaseInitialized = firebase.isFirebaseInitialized;
export const getFirebaseStatus = firebase.getFirebaseStatus;
export const waitForFirebase = firebase.waitForFirebase;
export const getFirebaseApp = firebase.getFirebaseApp;
export const getAuth = firebase.getAuth;
export const getFirestore = firebase.getFirestore as () => Firestore | undefined;
export const getStorage = firebase.getStorage;
