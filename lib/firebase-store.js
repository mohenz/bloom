import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

if (getApps().length === 0) {
  const projectId = process.env.FIREBASE_PROJECT_ID || 'bloom-universe';
  
  if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    initializeApp({
      credential: cert({
        projectId,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
      projectId,
    });
  } else {
    // Automatically picks up project ID and handles Emulator connections
    initializeApp({
      projectId,
    });
  }
}

export const db = getFirestore();
export const auth = getAuth();

/**
 * Helper to convert Firestore timestamps to ISO 8601 string format
 * for consistency with the frontend expectations.
 */
export function formatTimestamp(timestamp) {
  if (!timestamp) return null;
  if (typeof timestamp.toDate === 'function') {
    return timestamp.toDate().toISOString();
  }
  if (timestamp._seconds !== undefined) {
    return new Date(timestamp._seconds * 1000).toISOString();
  }
  return timestamp;
}
