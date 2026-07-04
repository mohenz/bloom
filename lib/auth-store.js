import { auth, db } from './firebase-store.js';
import admin from 'firebase-admin';

export function isAuthStoreConfigured() {
  return Boolean(process.env.FIREBASE_PROJECT_ID || 'bloom-universe');
}

export async function fetchUserByEmail(email) {
  try {
    const userRecord = await auth.getUserByEmail(email);
    const userDoc = await db.collection('users').doc(userRecord.uid).get();
    const displayName = userDoc.exists ? userDoc.data().displayName : userRecord.displayName;
    return {
      id: userRecord.uid,
      email: userRecord.email,
      display_name: displayName || userRecord.email.split('@')[0],
      status: 'active',
    };
  } catch (error) {
    console.warn('Failed to fetch user by email:', error.message);
    return null;
  }
}

export async function fetchUserById(id) {
  try {
    const userRecord = await auth.getUser(id);
    const userDoc = await db.collection('users').doc(id).get();
    const displayName = userDoc.exists ? userDoc.data().displayName : userRecord.displayName;
    return {
      id: userRecord.uid,
      email: userRecord.email,
      display_name: displayName || userRecord.email.split('@')[0],
      status: 'active',
    };
  } catch (error) {
    console.warn('Failed to fetch user by id:', error.message);
    return null;
  }
}

export async function updateUserLastLogin(userId) {
  try {
    await db.collection('users').doc(userId).set({
      lastLoginAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
  } catch (error) {
    console.error('Failed to update user last login:', error.message);
  }
}

export async function updateUserPassword(userId, plainPassword) {
  // Firebase Auth securely hashes the password internally
  await auth.updateUser(userId, {
    password: plainPassword,
  });
}

export async function revokeAllSessionsForUser(userId) {
  try {
    await auth.revokeRefreshTokens(userId);
  } catch (error) {
    console.error('Failed to revoke all sessions:', error.message);
  }
}













